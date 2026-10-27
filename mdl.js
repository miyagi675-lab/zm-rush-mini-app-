import * as T from './vendor/three.module.js';
// GoldSrc Studio v10. Coordinates remain Z-up for named-bone merging.
export function parseMDL(buffer, targetBones=null, sequence=0, body={}) {
 const d=new DataView(buffer),bytes=new Uint8Array(buffer);
 const i=o=>d.getInt32(o,true),f=o=>d.getFloat32(o,true),s=o=>d.getInt16(o,true),u=o=>d.getUint16(o,true);
 const str=(o,n)=>new TextDecoder().decode(bytes.subarray(o,o+n)).split('\0')[0];
 if(str(0,4)!=='IDST'||i(4)!==10||i(72)!==buffer.byteLength)throw Error('Неподдерживаемый или повреждённый MDL');
 const group=new T.Group(),bones=new Map(),mats=[],variants=[],world=[];
 const seq=i(168)+Math.min(sequence,i(164)-1)*176;
 const anim=i(164)>0&&i(seq+156)===0?i(seq+124):0;
 for(let b=0;b<i(140);b++){
  const o=i(144)+112*b,name=str(o,32),parent=i(o+32),v=[];
  for(let k=0;k<6;k++){let x=f(o+64+k*4);if(anim){const a=anim+b*12,offset=u(a+k*2);if(offset&&bytes[a+offset]>0)x+=s(a+offset+2)*f(o+88+k*4);}v.push(x);}
  const matrix=new T.Matrix4().makeRotationFromEuler(new T.Euler(v[3],v[4],v[5],'ZYX'));matrix.setPosition(v[0],v[1],v[2]);
  if(targetBones?.has(name))matrix.copy(targetBones.get(name));else if(parent>=0)matrix.premultiply(world[parent]);
  world.push(matrix);bones.set(name,matrix);
 }
 for(let t=0;t<i(180);t++){
  const o=i(184)+t*80,flags=i(o+64),w=i(o+68),h=i(o+72),offset=i(o+76),palette=offset+w*h;
  if(w<1||h<1||palette+768>bytes.length)throw Error('Некорректная текстура');
  const rgba=new Uint8Array(w*h*4);
  for(let p=0;p<w*h;p++){const c=bytes[offset+p];rgba.set([bytes[palette+c*3],bytes[palette+c*3+1],bytes[palette+c*3+2],(flags&64)&&c===255?0:255],p*4);}
  const map=new T.DataTexture(rgba,w,h);map.colorSpace=T.SRGBColorSpace;map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  const material=new T.MeshStandardMaterial({map,roughness:0.88,side:T.DoubleSide,alphaTest:flags&64?0.5:0});material.userData={w,h,name:str(o,64)};mats.push(material);
 }
 if(!mats.length)throw Error('Не найдены встроенные текстуры');
 let triangles=0;
 for(let part=0;part<i(204);part++){
  const p=i(208)+part*76,count=i(p+64),first=i(p+72),names=Array.from({length:count},(_,k)=>str(first+k*112,64));
  if(count>1)variants.push({part,names});
  const m=first+Math.min(body[part]||0,count-1)*112;
  for(let mesh=0;mesh<i(m+72);mesh++){
   const o=i(m+76)+mesh*20,tex=s(i(200)+i(o+8)*2),material=mats[tex];if(!material)throw Error('Не найдена текстура поверхности');
   const positions=[],normals=[],uv=[],{w,h}=material.userData;let cursor=i(o+4),guard=0;
   const emit=v=>{const vi=v[0],ni=v[1],vo=i(m+88)+vi*12,no=i(m+100)+ni*12;const bone=world[bytes[i(m+84)+vi]],nbone=world[bytes[i(m+96)+ni]];const point=new T.Vector3(f(vo),f(vo+4),f(vo+8)).applyMatrix4(bone),normal=new T.Vector3(f(no),f(no+4),f(no+8)).transformDirection(nbone);positions.push(...point.toArray());normals.push(...normal.toArray());uv.push(v[2]/w,v[3]/h);};
   while(true){const n=s(cursor);cursor+=2;if(!n)break;if(++guard>50000)throw Error('Повреждённая геометрия');const vertices=[];for(let k=0;k<Math.abs(n);k++){vertices.push([s(cursor),s(cursor+2),s(cursor+4),s(cursor+6)]);cursor+=8;}for(let k=2;k<vertices.length;k++){const ids=n<0?[0,k-1,k]:k%2?[k-1,k-2,k]:[k-2,k-1,k];ids.forEach(j=>emit(vertices[j]));triangles++;}}
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.computeBoundingSphere();const object=new T.Mesh(geometry,material);object.name=str(m,64);group.add(object);
  }
 }
 group.userData={bones,variants,triangles,materials:mats};return group;
}
export function disposeMDL(group){group.traverse(o=>o.geometry?.dispose());for(const m of group.userData.materials||[]){m.map?.dispose();m.dispose();}}
