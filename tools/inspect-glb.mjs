import fs from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
const directory=process.argv[2]||'public/models/hero';const file=directory+'/model.glb';const b=fs.readFileSync(file);const len=b.readUInt32LE(12);const doc=JSON.parse(b.subarray(20,20+len));
// Never reuse another robot's occurrence map. A caller may explicitly supply one.
const legacyGBK=process.argv.includes('--legacy-gbk');
const mapPath=process.argv.slice(3).find(a=>!a.startsWith('--'))||directory+'/name-map.json';
const mapping=fs.existsSync(mapPath)?JSON.parse(fs.readFileSync(mapPath,'utf8')):{};
for(const [i,n] of doc.nodes.entries()){const occurrence=n.extras?.occurrence||n.name;n.name=mapping[occurrence]||doc.meshes[n.mesh]?.name||n.name||'Solid '+i;
 if(legacyGBK&&/[\u0080-\u00ff]/.test(n.name)&&[...n.name].every(c=>c.charCodeAt(0)<=255)){try{const repaired=new TextDecoder('gb18030',{fatal:true}).decode(Uint8Array.from(n.name,c=>c.charCodeAt(0)));n.extras={...n.extras,originalSourceName:n.name};n.name=repaired;}catch{/* Preserve undecodable original names. */}}
 n.extras={...n.extras,occurrence,componentId:n.extras?.componentId||'node-'+i,sourceName:n.name};}
// Names and identifiers are stable for a fixed converter and source file.
const data=Buffer.from(JSON.stringify(doc)),pad=Buffer.alloc((4-data.length%4)%4,32),tail=b.subarray(20+len);const header=Buffer.from(b.subarray(0,20));header.writeUInt32LE(20+data.length+pad.length+tail.length,8);header.writeUInt32LE(data.length+pad.length,12);fs.writeFileSync(file,Buffer.concat([header,data,pad,tail]));
const bytes=fs.readFileSync(file);const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');gltf.scene.updateMatrixWorld(true);let triangles=0,meshCount=0;const nodes=[];gltf.scene.traverse(o=>{if(o.isMesh){triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;meshCount++;}if(o.userData.componentId){const box=new Box3().setFromObject(o);nodes.push({id:o.userData.componentId,name:o.name,parent:o.parent?.userData.componentId,children:o.children.map(c=>c.userData.componentId).filter(Boolean),min:box.min.toArray(),max:box.max.toArray(),center:box.getCenter(new Vector3()).toArray()});}});
if(!triangles)throw Error('Empty geometry');
const bounds=new Box3().setFromObject(gltf.scene);fs.writeFileSync(directory+'/conversion.json',JSON.stringify({meshCount,triangles,bytes:bytes.length,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},nodes},null,2));console.log(JSON.stringify({meshCount,triangles,bytes:bytes.length,bounds}));console.log(nodes.filter(n=>n.children.length).map(n=>`${n.id} ${n.name} (${n.children.length}) ${n.center.map(v=>v.toFixed(3))}`).join('\n'));
