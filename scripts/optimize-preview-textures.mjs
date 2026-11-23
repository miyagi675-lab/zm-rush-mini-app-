// Rebuild a lightweight preview without changing geometry, bones or animations.
// node scripts/optimize-preview-textures.mjs input.mdl.gz output.mdl.gz [maxSize]
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';

export function optimizePreviewTextures(original,maxSize=256){
 assert(Number.isInteger(maxSize)&&maxSize>0);
 const b=Buffer.from(original);
 const i=o=>b.readInt32LE(o),w=(o,v)=>b.writeInt32LE(v,o);const scales=new Map();let oldPixels=0,newPixels=0;
 for(let n=0;n<i(180);n++){const t=i(184)+80*n,oldW=i(t+68),oldH=i(t+72),offset=i(t+76);oldPixels+=oldW*oldH;const ratio=Math.max(1,Math.ceil(Math.max(oldW,oldH)/maxSize)),newW=Math.ceil(oldW/ratio),newH=Math.ceil(oldH/ratio);newPixels+=newW*newH;if(ratio===1)continue;b.fill(0,offset,offset+oldW*oldH+768);for(let y=0;y<newH;y++)for(let x=0;x<newW;x++){const sy=Math.min(oldH-1,y*ratio+Math.floor(ratio/2)),sx=Math.min(oldW-1,x*ratio+Math.floor(ratio/2));b[offset+y*newW+x]=original[offset+sy*oldW+sx];}original.copy(b,offset+newW*newH,offset+oldW*oldH,offset+oldW*oldH+768);w(t+68,newW);w(t+72,newH);scales.set(n,[newW/oldW,newH/oldH]);}
 const commands=new Map();for(let p=0;p<i(204);p++){const part=i(208)+p*76;for(let n=0;n<i(part+64);n++){const m=i(part+72)+n*112;for(let k=0;k<i(m+72);k++){const mesh=i(m+76)+k*20,tex=b.readInt16LE(i(200)+i(mesh+8)*2),start=i(mesh+4);assert(!commands.has(start)||commands.get(start)===tex);commands.set(start,tex);}}}
 for(const [start,tex] of commands){const scale=scales.get(tex);if(!scale)continue;let cursor=start;while(b.readInt16LE(cursor)){const count=Math.abs(b.readInt16LE(cursor));cursor+=2;for(let v=0;v<count;v++,cursor+=8){b.writeInt16LE(Math.round(b.readInt16LE(cursor+4)*scale[0]),cursor+4);b.writeInt16LE(Math.round(b.readInt16LE(cursor+6)*scale[1]),cursor+6);}}}

 return b;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const [source,target,size='256']=process.argv.slice(2);
 if(!source||!target)throw Error('Expected input.mdl.gz output.mdl.gz [maxSize]');
 const packed=gzipSync(optimizePreviewTextures(gunzipSync(await readFile(source)),Number(size)),{level:9});
 await mkdir(dirname(resolve(target)),{recursive:true});
 await writeFile(target,packed);
 console.log(packed.length+' bytes');
}
