import {modelAssets} from './model-assets.js?v=9';
// Share downloads, keep successful buffers in memory, and reuse persistent data.
const pending=new Map(),cacheName='zm-rush-models-v1';
const maxCachedModels = 60;
let cachePromise,prefetching=false;
const queued=new Set();
const cacheWrites = new Map();
const invalidated = new Map();
function trimBuffers(){let bytes=0,count=0;for(const t of pending.values())if(t.done){bytes+=t.bytes;count++;}for(const [file,t] of pending){if(count<=8&&bytes<=24*1024*1024)break;if(t.done&&count>1){pending.delete(file);bytes-=t.bytes;count--;}}}
const cacheStore=()=>cachePromise??=(async()=>{try{return await caches.open(cacheName);}catch{return null;}})();
// Disk caching is optional. A slow/unavailable storage API must not hold up a fit.
function cacheDeadline(operation) {
  let timer;
  const timeout = new Promise(resolve => {timer = setTimeout(() => resolve(null), 150);});
  return Promise.race([operation.catch(() => null), timeout]).finally(() => clearTimeout(timer));
}
function cachedResponse(url) {
  return cacheDeadline(cacheStore().then(cache => cache?.match(url)));
}
export function modelAssetPaths(file) {
  return {
    packed: 'assets/' + (modelAssets[file] || file + '.gz'),
    raw: /^(?:players|weapons)-v1\//.test(file) ? null : 'assets/' + file,
  };
}
function modelRequest(file) {
  const {packed, raw} = modelAssetPaths(file);
  const useGzip = !raw || typeof DecompressionStream !== 'undefined';
  return {url: new URL(useGzip ? packed : raw, import.meta.url).href, useGzip};
}
export function validateModelHeader(buffer) {
  const header = new DataView(buffer);
  const invalid = () => Error('Неподдерживаемый или повреждённый MDL');
  if (header.byteLength < 244 || header.getUint32(0) !== 0x49445354 ||
      header.getInt32(4, true) !== 10 || header.getInt32(72, true) !== header.byteLength) {
    throw invalid();
  }

  // The parser uses these offset/count pairs before reading mesh and animation data.
  for (const [countAt, offsetAt, stride] of [
    [140, 144, 112], [164, 168, 176], [180, 184, 80], [192, 200, 2], [204, 208, 76],
  ]) {
    const count = header.getInt32(countAt, true);
    const offset = header.getInt32(offsetAt, true);
    if (count < 1 || offset < 244 || offset + count * stride > header.byteLength) throw invalid();
  }
  return buffer;
}
function writeCache(url, operation) {
  // Keep invalidation behind an earlier put and ahead of a replacement put.
  const next = (cacheWrites.get(url) || Promise.resolve())
    .then(() => cacheDeadline(cacheStore()))
    .then(cache => cache && operation(cache))
    .catch(() => {});
  cacheWrites.set(url, next);
  next.then(() => {if (cacheWrites.get(url) === next) cacheWrites.delete(url);});
}
function invalidateDisk(url) {
  const version = {};
  invalidated.set(url, version);
  writeCache(url, cache => cache.delete(url));
  return version;
}
export async function invalidateModel(file, rejectedBuffer) {
  const task = pending.get(file);
  if (rejectedBuffer && task && task.buffer !== rejectedBuffer) return;
  pending.delete(file);
  invalidateDisk(modelRequest(file).url);
}
export function loadModel(file,{priority='high',onProgress}={}){
 let task=pending.get(file);
 if(!task){
  task={listeners:new Set()};
  task.promise = read(file, priority, progress => {
    task.progress = progress;
    for (const fn of task.listeners) fn(progress);
  }).then(buffer => {
    task.done = true;
    task.bytes = buffer.byteLength;
    task.buffer = buffer;
    trimBuffers();
    return buffer;
  }).catch(error => {
    if (pending.get(file) === task) pending.delete(file);
    throw error;
  });
  pending.set(file,task);
 }
 pending.delete(file);pending.set(file,task);
 if(onProgress){task.listeners.add(onProgress);if(task.progress)onProgress(task.progress);}
 return task.promise.finally(()=>{if(onProgress)task.listeners.delete(onProgress);});
}
async function read(file,priority,progress){
 const {url, useGzip} = modelRequest(file);
 let recovery = invalidated.get(url);
 const cached = recovery ? null : await cachedResponse(url);
 const decode = async response => {
   if (!useGzip) return validateModelHeader(await response.arrayBuffer());
   if (typeof DecompressionStream !== 'undefined') {
     const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
     return validateModelHeader(await new Response(stream).arrayBuffer());
   }
   const {gunzipSync} = await import('./vendor/fflate.js');
   const bytes = gunzipSync(new Uint8Array(await response.arrayBuffer()));
   return validateModelHeader(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
 };
 if (cached) {
   try {return await decode(cached);}
   catch {recovery = invalidateDisk(url);}
 }
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response = await fetch(url, {priority, signal:controller.signal, ...(recovery ? {cache:'reload'} : {})});
  if(!response.ok)throw Error('Не удалось загрузить '+file);
  const total=Number(response.headers.get('content-length'))||0,reader=response.body?.getReader();
  const chunks=[];let received=0,last=-1;
  if(reader){while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.length;const percent=total?Math.min(100,Math.floor(received/total*10)*10):0;if(percent!==last){last=percent;progress({received,total,percent});}}}
  else chunks.push(new Uint8Array(await response.arrayBuffer()));
  const body = new Blob(chunks);
  let buffer;
  try {buffer = await decode(new Response(body));}
  catch (error) {invalidateDisk(url);throw error;}
  writeCache(url, async cache => {
    await cache.put(url, new Response(body));
    if (recovery && invalidated.get(url) === recovery) invalidated.delete(url);
    const keys = await cache.keys();
    await Promise.all(keys.slice(0, -maxCachedModels).map(request => cache.delete(request)));
  });
  return buffer;
 }finally{clearTimeout(timeout);}
}
// Only one speculative low-priority request; never flood the connection on hover.
export function prefetchModel(file){
 if(pending.has(file)||navigator.connection?.saveData)return;
 if(queued.size<2)queued.add(file);
 if(prefetching)return;prefetching=true;
 const run=async()=>{try{while(queued.size){const file=queued.values().next().value;queued.delete(file);await loadModel(file,{priority:'low'}).catch(()=>{});}}finally{prefetching=false;}};
 if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:1500});else setTimeout(run,200);
}
