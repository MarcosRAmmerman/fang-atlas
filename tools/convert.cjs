// Local-only OpenCascade STEP tessellation. Never writes to the input file.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function find(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?find(path.join(dir,e.name)):/\.(step|stp)$/i.test(e.name)?[path.join(dir,e.name)]:[])}
const input=process.argv[2]||find('CAD')[0];
if(!input)throw Error('No STEP file under CAD. Pass an input path.');
const out=process.argv[3]||'public/models/hero';fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(input);console.log('Importing',input,source.length,'bytes');
require('occt-import-js')().then(occt=>{
 const result=occt.ReadStepFile(source,{linearUnit:'millimeter',linearDeflectionType:'absolute_value',linearDeflection:1,angularDeflection:0.5});
 if(!result.success)throw Error('OpenCascade import failed');
 console.log('Imported',result.meshes.length,'meshes');
 const gltf={asset:{version:'2.0',generator:'FANG Atlas / OpenCascade'},scene:0,scenes:[{nodes:[0]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[{byteLength:0}]};
 const chunks=[];let offset=0,triangles=0;
 function accessor(array,type,componentType,min,max){const b=Buffer.from(array.buffer);const pad=Buffer.alloc((4-b.length%4)%4);gltf.bufferViews.push({buffer:0,byteOffset:offset,byteLength:b.length});chunks.push(b,pad);offset+=b.length+pad.length;const a={bufferView:gltf.bufferViews.length-1,componentType,count:array.length/(type==='VEC3'?3:1),type};if(min){a.min=min;a.max=max}gltf.accessors.push(a);return gltf.accessors.length-1}
 const names=[];
 for(const [i,m] of result.meshes.entries()){
  const p=new Float32Array(m.attributes.position.array.map(v=>v/1000)),n=m.attributes.normal?.array,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(let j=0;j<p.length;j++){min[j%3]=Math.min(min[j%3],p[j]);max[j%3]=Math.max(max[j%3],p[j])}
  const attributes={POSITION:accessor(p,'VEC3',5126,min,max)};if(n)attributes.NORMAL=accessor(new Float32Array(n),'VEC3',5126);
  const indices=accessor(new Uint32Array(m.index.array),'SCALAR',5125);triangles+=m.index.array.length/3;
  gltf.materials.push({name:'CAD material '+i,pbrMetallicRoughness:{baseColorFactor:[...(m.color||[0.5,0.54,0.59]),1],metallicFactor:0.35,roughnessFactor:0.42},doubleSided:true});
  gltf.meshes.push({name:m.name,primitives:[{attributes,indices,material:i}]});names.push({id:'part-'+i,name:m.name,min,max,triangles:m.index.array.length/3});
 }
 let serial=0;
 function node(src){const id=gltf.nodes.length;const item={name:src.name||'Assembly',extras:{componentId:'assembly-'+serial++},children:[]};gltf.nodes.push(item);for(const mi of src.meshes){item.children.push(gltf.nodes.length);gltf.nodes.push({name:result.meshes[mi].name||'Part '+mi,mesh:mi,extras:{componentId:'part-'+mi}})}for(const child of src.children)item.children.push(node(child));return id}
 if(!triangles)throw Error('Import produced no triangles. No usable model was exported.');
 node(result.root);gltf.buffers[0].byteLength=offset;
 const json=Buffer.from(JSON.stringify(gltf)),jp=Buffer.alloc((4-json.length%4)%4,32),bin=Buffer.concat(chunks);const head=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+json.length+jp.length+bin.length,8);jh.writeUInt32LE(json.length+jp.length);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length);bh.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(path.join(out,'model.glb'),Buffer.concat([head,jh,json,jp,bh,bin]));
 const report={source:path.basename(input),sourceBytes:source.length,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),units:'meter',linearDeflection:0.001,angularDeflection:0.5,triangles,meshCount:names.length,hierarchy:result.root,parts:names};fs.writeFileSync(path.join(out,'conversion.json'),JSON.stringify(report,null,2));console.log('Complete',triangles,'triangles;',offset,'geometry bytes');
});
