import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync, gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {parseMDL, disposeMDL} from '../mdl.js';

// Browser-only derived assets. The source manifest is a local JSON array of
// {id, source, currentFile, uniformScale?}; paths resolve against --root.
// Preserve the currently fitted meshes, palettes, bone defaults and dimensions.
// Only sequence descriptors and their first-blend RLE streams are appended.
const site=fileURLToPath(new URL('../',import.meta.url));
const workspace=path.resolve(site,'../../');
const argument=name=>{const at=process.argv.indexOf(name);return at<0?null:process.argv[at+1];};
const root=path.resolve(argument('--root')||workspace);
const manifest=argument('--sources');
const output=path.resolve(argument('--output')||path.join(site,'assets/player-motion-v1'));
const reportFile=path.resolve(argument('--report')||path.join(root,'motion-upgrade-20261118/report.json'));
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const digest=b=>createHash('sha256').update(b).digest('hex');
const text=(b,at,length)=>b.toString('utf8',at,at+length).split('\0')[0];
const sequenceName=name=>name.trim().toLowerCase();
const wanted=/^(?:idle|idle1|walk|run|run2|crouch_idle|crouchrun|jump|longjump|swim|treadwater|gut_flinch|head_flinch|death[123]|crouch_die|ref_(?:aim|shoot|reload)_(?:carbine|onehanded|dualpistols|rifle|mp5|shotgun|m249|ak47|knife))$/;
// Verified standard CS activity IDs for the first ten locomotion slots. Some
// authors replace sequence labels with credits, while retaining the activity.
const locomotionByActivity=new Map([[1,'idle1'],[18,'crouch_idle'],[3,'walk'],[4,'run'],[17,'crouchrun'],[7,'jump'],[8,'longjump'],[6,'swim'],[50,'treadwater']]);
function sequences(b){const base=b.readInt32LE(168);return Array.from({length:b.readInt32LE(164)},(_,index)=>{const at=base+index*176;return {index,at,name:text(b,at,32),frames:b.readInt32LE(at+56),fps:b.readFloatLE(at+32),anim:b.readInt32LE(at+124),group:b.readInt32LE(at+156)};});}
function checked(b,at,length){assert(Number.isSafeInteger(at)&&Number.isSafeInteger(length)&&at>=0&&length>=0&&at+length<=b.length,'Invalid MDL range');return b.subarray(at,at+length);}
function animationBytes(source,sequence,bones){
 const start=sequence.anim;assert.equal(sequence.group,0,'External animation unavailable');
 if(!start)return null;
 let end=start+bones*12;checked(source,start,bones*12);
 for(let bone=0;bone<bones;bone++)for(let channel=0;channel<6;channel++){
  const record=start+bone*12,relative=source.readUInt16LE(record+channel*2);
  if(!relative)continue;
  let cursor=record+relative,remaining=sequence.frames,guard=0;
  while(remaining>0){
   checked(source,cursor,2);const valid=source[cursor],total=source[cursor+1];
   assert(total>0&&valid<=total&&++guard<10000,'Invalid animation RLE: '+sequence.name);
   const bytes=2+valid*2;checked(source,cursor,bytes);end=Math.max(end,cursor+bytes);
   remaining-=total;cursor+=bytes;
  }
 }
 return checked(source,start,end-start);
}
function bonesOnly(bytes){const copy=Buffer.from(bytes);copy.writeInt32LE(0,204);return parseMDL(ab(copy),null,0,{},1,{indexed:true});}
function matrixDifference(a,b){let max=0;for(const [name,matrix]of a.userData.bones){const other=b.userData.bones.get(name);assert(other);for(let i=0;i<16;i++)max=Math.max(max,Math.abs(matrix.elements[i]-other.elements[i]));}return max;}

export function expandMotions(current,source,{uniformScale=1}={}){
 assert.equal(text(current,0,4),'IDST');assert.equal(text(source,0,4),'IDST');
 assert.equal(current.readInt32LE(72),current.length);assert.equal(source.readInt32LE(72),source.length);
 const boneCount=current.readInt32LE(140),currentBoneAt=current.readInt32LE(144),sourceBoneAt=source.readInt32LE(144);
 assert.equal(boneCount,source.readInt32LE(140),'Skeleton bone count changed');
 for(let bone=0;bone<boneCount;bone++){
  const to=currentBoneAt+bone*112,from=sourceBoneAt+bone*112;
  assert(current.subarray(to,to+64).equals(source.subarray(from,from+64)),'Bone names/order/controllers changed');
  for(let component=0;component<12;component++){
   const currentValue=current.readFloatLE(to+64+component*4),sourceValue=source.readFloatLE(from+64+component*4);
   const scaled=[0,1,2,6,7,8].includes(component)?Math.fround(sourceValue*uniformScale):sourceValue;
   assert(Math.abs(currentValue-scaled)<=1e-6*Math.max(1,Math.abs(scaled)),'Unexpected bind/animation scale change');
  }
 }
 const old=sequences(current),original=sequences(source);
 const oldByOriginal=new Map();
 if(old.length===original.length)old.forEach(s=>oldByOriginal.set(s.index,s));
 else for(const seq of old){
  const match=seq.index<2?original[seq.index]:original.find(s=>sequenceName(s.name)===sequenceName(seq.name)&&s.frames===seq.frames&&s.fps===seq.fps);
  assert(match,'Could not map existing preview sequence '+seq.name);oldByOriginal.set(match.index,seq);
 }
 // Retain the first ten authored locomotion slots, including occasional author
 // aliases, together with every currently selected preview clip.
 const selected=original.filter(seq=>seq.index<10||wanted.test(sequenceName(seq.name))||['idle','idle1','walk','run'].includes(sequenceName(oldByOriginal.get(seq.index)?.name||'')));
 if(original.length===1)return {buffer:Buffer.from(current),changed:false,clips:selected.map(s=>({name:s.name,originalIndex:s.index,index:s.index})),sourcePoseSamples:0,retainedPoseSamples:0};
 const prefix=Buffer.from(current),chunks=[prefix];let length=prefix.length;
 function append(bytes){const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}const at=length;chunks.push(bytes);length+=bytes.length;return at;}
 const table=Buffer.concat(selected.map(seq=>Buffer.from(checked(source,seq.at,176))));
 prefix.writeInt32LE(selected.length,164);prefix.writeInt32LE(append(table),168);
 const copied=new Map(),clips=[];
 for(const [index,seq]of selected.entries()){
  const at=index*176,previous=oldByOriginal.get(seq.index);
  if(previous){table.fill(0,at,at+32);Buffer.from(previous.name).copy(table,at,0,31);}
  const semanticName=seq.index>0&&seq.index<10?locomotionByActivity.get(source.readInt32LE(seq.at+40)):null;
  if(semanticName){table.fill(0,at,at+32);Buffer.from(semanticName).copy(table,at,0,31);}
  for(const field of [48,52,60,64,88,92,156,160,164,168,172])table.writeInt32LE(0,at+field);
  table.writeInt32LE(1,at+120);
  if(uniformScale!==1)for(const field of [76,96,108])for(let axis=0;axis<3;axis++)table.writeFloatLE(table.readFloatLE(at+field+axis*4)*uniformScale,at+field+axis*4);
  const key=seq.anim+':'+seq.frames;
  let start=copied.get(key);
  if(start===undefined){const bytes=animationBytes(source,seq,boneCount);start=bytes?append(bytes):0;copied.set(key,start);}
  table.writeInt32LE(start,at+124);
  clips.push({index,originalIndex:seq.index,name:text(table,at,32),sourceName:seq.name,frames:seq.frames});
 }
 prefix.writeInt32LE(length,72);
 const result=Buffer.concat(chunks);
 assert(result.subarray(244,current.length).equals(current.subarray(244)),'Existing fitted model data changed');
 // These are the only header fields the restoration owns.
 for(let at=0;at<244;at++)if(![72,73,74,75,164,165,166,167,168,169,170,171].includes(at))assert.equal(result[at],current[at],'Unexpected header change');
 const expectedSource=Buffer.from(source);
 current.subarray(currentBoneAt,currentBoneAt+boneCount*112).copy(expectedSource,sourceBoneAt);
 const expected=bonesOnly(expectedSource),actual=bonesOnly(result),before=bonesOnly(current);
 let sourcePoseSamples=0,retainedPoseSamples=0;
 try{
  for(const clip of clips){const seq=original[clip.originalIndex],duration=Math.max(0,(seq.frames-1)/seq.fps);
   for(const time of [...new Set([0,.43,Math.min(2.1,duration),duration*.7])]){
    expected.userData.updatePose(clip.originalIndex,time);actual.userData.updatePose(clip.index,time);
    assert.equal(matrixDifference(expected,actual),0,'Restored pose changed: '+clip.name);sourcePoseSamples++;
   }
   const previous=oldByOriginal.get(clip.originalIndex);
   if(previous&&(previous.index<2||['idle','idle1','walk','run'].includes(sequenceName(previous.name)))){
    for(const time of [0,.43,2.1]){before.userData.updatePose(previous.index,time);actual.userData.updatePose(clip.index,time);assert.equal(matrixDifference(before,actual),0,'Existing preview motion changed: '+clip.name);retainedPoseSamples++;}
   }
  }
 }finally{disposeMDL(expected);disposeMDL(actual);disposeMDL(before);}
 return {buffer:result,changed:true,clips,sourcePoseSamples,retainedPoseSamples};
}

if(manifest){
 const rows=JSON.parse(fs.readFileSync(path.resolve(root,manifest),'utf8')),reports=[],mapping={};
 fs.mkdirSync(output,{recursive:true});
 for(const row of rows){
  const currentPath=path.join(site,'assets',row.currentFile),oldPacked=fs.readFileSync(currentPath),current=gunzipSync(oldPacked);
  const source=fs.readFileSync(path.resolve(root,row.source));
  const result=expandMotions(current,source,{uniformScale:row.uniformScale||1});
  let packed=oldPacked;
  if(result.changed){packed=gzipSync(result.buffer,{level:9});assert(gunzipSync(packed).equals(result.buffer));fs.writeFileSync(path.join(output,row.id+'.mdl.gz'),packed);mapping[row.id]='player-motion-v1/'+row.id+'.mdl.gz';}
  reports.push({id:row.id,currentFile:row.currentFile,source:row.source,sourceHash:digest(source),currentHash:digest(current),resultHash:digest(result.buffer),beforeBytes:oldPacked.length,gzipBytes:packed.length,rawBytes:result.buffer.length,changed:result.changed,sourcePoseSamples:result.sourcePoseSamples,retainedPoseSamples:result.retainedPoseSamples,clips:result.clips});
 }
 const summary={models:reports.length,updated:reports.filter(r=>r.changed).length,beforeBytes:reports.reduce((n,r)=>n+r.beforeBytes,0),gzipBytes:reports.reduce((n,r)=>n+r.gzipBytes,0),sourcePoseSamples:reports.reduce((n,r)=>n+r.sourcePoseSamples,0),retainedPoseSamples:reports.reduce((n,r)=>n+r.retainedPoseSamples,0),mapping,reports};
 fs.mkdirSync(path.dirname(reportFile),{recursive:true});fs.writeFileSync(reportFile,JSON.stringify(summary,null,2));
 console.log(JSON.stringify({...summary,mapping:undefined,reports:undefined}));
}
