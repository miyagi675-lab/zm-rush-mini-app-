// Versioned persistent cache; failures never poison the in-memory cache.
const pending=new Map();
const cacheName='zm-rush-models-v1';
export function loadModel(file){
 if(!pending.has(file))pending.set(file,read(file).catch(error=>{pending.delete(file);throw error;}));
 return pending.get(file);
}
async function read(file){
 const packed=typeof DecompressionStream!=='undefined';
 const url=new URL('assets/'+file+(packed?'.gz':''),import.meta.url).href;
 let cache;try{cache=await caches.open(cacheName);}catch{}
 let response=await cache?.match(url);
 if(!response){
  response=await fetch(url,{priority:'high'});
  if(!response.ok)throw Error('Не удалось загрузить '+file);
  if(cache)cache.put(url,response.clone()).catch(()=>{});
 }
 return packed?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():response.arrayBuffer();
}
