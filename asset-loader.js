import {modelAssets} from './model-assets.js?v=9';
// Share downloads, keep successful buffers in memory, and reuse persistent data.
const pending=new Map(),cacheName='zm-rush-models-v1';
const maxCachedModels = 60;
let cachePromise,prefetching=false;
const queued=new Set();
function trimBuffers(){let bytes=0,count=0;for(const t of pending.values())if(t.done){bytes+=t.bytes;count++;}for(const [file,t] of pending){if(count<=8&&bytes<=24*1024*1024)break;if(t.done&&count>1){pending.delete(file);bytes-=t.bytes;count--;}}}
const cacheStore=()=>cachePromise??=(async()=>{try{return await caches.open(cacheName);}catch{return null;}})();
// Disk caching is optional. A slow/unavailable storage API must not hold up a fit.
function cachedResponse(url) {
 return new Promise(resolve=>{
  let settled=false;
  const finish=response=>{if(settled)return;settled=true;clearTimeout(timer);resolve(response);};
  const timer=setTimeout(()=>finish(null),150);
  cacheStore().then(cache=>cache?.match(url)).then(response=>finish(response||null),()=>finish(null));
 });
}
export function loadModel(file,{priority='high',onProgress}={}){
 let task=pending.get(file);
 if(!task){
  task={listeners:new Set()};
  task.promise=read(file,priority,progress=>{task.progress=progress;for(const fn of task.listeners)fn(progress);}).then(buffer=>{task.done=true;task.bytes=buffer.byteLength;trimBuffers();return buffer;}).catch(error=>{pending.delete(file);throw error;});
  pending.set(file,task);
 }
 pending.delete(file);pending.set(file,task);
 if(onProgress){task.listeners.add(onProgress);if(task.progress)onProgress(task.progress);}
 return task.promise.finally(()=>{if(onProgress)task.listeners.delete(onProgress);});
}
async function read(file,priority,progress){
 const packed=typeof DecompressionStream!=='undefined'||file.startsWith('players-v1/')||file.startsWith('weapons-v1/');
 const url=new URL('assets/'+(packed?(modelAssets[file]||file+'.gz'):file),import.meta.url).href;
 const cached=await cachedResponse(url);
 const decode=async response=>{if(!packed)return response.arrayBuffer();if(typeof DecompressionStream!=='undefined')return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();const {gunzipSync}=await import('./vendor/fflate.js');return gunzipSync(new Uint8Array(await response.arrayBuffer())).buffer;};
 if(cached){try{return await decode(cached);}catch{cacheStore().then(cache=>cache?.delete(url)).catch(()=>{});}}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(url,{priority,signal:controller.signal});
  if(!response.ok)throw Error('Не удалось загрузить '+file);
  const total=Number(response.headers.get('content-length'))||0,reader=response.body?.getReader();
  const chunks=[];let received=0,last=-1;
  if(reader){while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.length;const percent=total?Math.min(100,Math.floor(received/total*10)*10):0;if(percent!==last){last=percent;progress({received,total,percent});}}}
  else chunks.push(new Uint8Array(await response.arrayBuffer()));
  const body=new Blob(chunks),buffer=await decode(new Response(body));
  cacheStore().then(cache=>{
    if (!cache) return;
    return cache.put(url, new Response(body))
      .then(() => cache.keys())
      .then(keys => Promise.all(
        keys.slice(0, -maxCachedModels).map(request => cache.delete(request))
      ))
      .catch(() => {});
  }).catch(()=>{});
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
