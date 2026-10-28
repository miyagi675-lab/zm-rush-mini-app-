import {modelAssets} from './model-assets.js?v=2';
// Share downloads, keep successful buffers in memory, and reuse persistent data.
const pending=new Map(),cacheName='zm-rush-models-v1';
let cachePromise,prefetching=false;
const queued=new Set();
const cacheStore=()=>cachePromise??=(async()=>{try{return await caches.open(cacheName);}catch{return null;}})();
export function loadModel(file,{priority='high',onProgress}={}){
 let task=pending.get(file);
 if(!task){
  task={listeners:new Set()};
  task.promise=read(file,priority,progress=>{task.progress=progress;for(const fn of task.listeners)fn(progress);}).catch(error=>{pending.delete(file);throw error;});
  pending.set(file,task);
 }
 if(onProgress){task.listeners.add(onProgress);if(task.progress)onProgress(task.progress);}
 return task.promise.finally(()=>{if(onProgress)task.listeners.delete(onProgress);});
}
async function read(file,priority,progress){
 const packed=typeof DecompressionStream!=='undefined';
 const url=new URL('assets/'+(packed?(modelAssets[file]||file+'.gz'):file),import.meta.url).href;
 const cache=await cacheStore();
 let cached;try{cached=await cache?.match(url);}catch{}
 const decode=response=>packed?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():response.arrayBuffer();
 if(cached){try{return await decode(cached);}catch{try{await cache?.delete(url);}catch{}}}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(url,{priority,signal:controller.signal});
  if(!response.ok)throw Error('Не удалось загрузить '+file);
  const total=Number(response.headers.get('content-length'))||0,reader=response.body?.getReader();
  const chunks=[];let received=0,last=-1;
  if(reader){while(true){const {value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.length;const percent=total?Math.min(100,Math.floor(received/total*10)*10):0;if(percent!==last){last=percent;progress({received,total,percent});}}}
  else chunks.push(new Uint8Array(await response.arrayBuffer()));
  const body=new Blob(chunks),buffer=await decode(new Response(body));
  if(cache)cache.put(url,new Response(body)).catch(()=>{});
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
