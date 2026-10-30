import fs from 'node:fs';
import assert from 'node:assert/strict';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Box3,Vector3} from 'three';
import {Exploder} from '../src/explode.js';
export async function validateModel(dir){
 const read=name=>JSON.parse(fs.readFileSync(dir+'/'+name));const manifest=read('manifest.json'),annotations=read('annotations.json'),lesson=read('lesson.json');
 const bytes=fs.readFileSync(dir+'/model.glb');assert.equal(bytes.readUInt32LE(8),bytes.length);
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');scene.rotation.set(...manifest.rotation);scene.updateMatrixWorld(true);
 const nodes=new Map();let triangles=0,meshes=0;scene.traverse(o=>{if(o.userData.componentId){assert(!nodes.has(o.userData.componentId),'Duplicate component ID');nodes.set(o.userData.componentId,o)}if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert(o.geometry.attributes.position.count>0)}});
 assert.equal(meshes,manifest.stats.meshCount);assert.equal(triangles,manifest.stats.triangles);assert(triangles>1000);const bounds=new Box3().setFromObject(scene);assert(bounds.getSize(new Vector3()).toArray().every(v=>Number.isFinite(v)&&v>0));
 for(const a of annotations){const obj=nodes.get(a.componentId);assert(obj,'Missing annotation target '+a.componentId);if(a.sourceName)assert.equal(obj.userData.sourceName,a.sourceName,'Annotation identity mismatch');assert.equal(a.anchor.length,3);assert(a.anchor.every(Number.isFinite));const position=obj.localToWorld(new Vector3(...a.anchor));assert(new Box3().setFromObject(obj).expandByScalar(0.001).containsPoint(position),'Anchor outside its target');}
 for(const step of lesson.steps){for(const id of [step.componentId,...(step.inspectTargets||[]).map(t=>t.componentId)].filter(Boolean))assert(nodes.has(id),'Missing lesson target '+id);if(step.quiz)assert(step.quiz.correct>=0&&step.quiz.correct<step.quiz.options.length);}
 const groups=manifest.explodeGroups.map(id=>nodes.get(id));assert(groups.every(Boolean));for(const a of groups)for(const b of groups)if(a!==b)for(let p=b.parent;p;p=p.parent)assert.notEqual(p,a,'Nested explosion groups');
 const originals=groups.map(g=>g.position.clone());const descendants=new Map();for(const g of groups)g.traverse(o=>{if(o!==g)descendants.set(o,o.position.clone())});
 const controller=new Exploder(groups,scene,manifest.explode);controller.target=1;for(let i=0;i<200;i++)controller.update(false);assert(groups.every((g,i)=>g.position.distanceTo(originals[i])>0));for(const [o,p] of descendants)assert(o.position.equals(p),'Internal component moved');controller.target=0;for(let i=0;i<200;i++)controller.update(false);assert(groups.every((g,i)=>g.position.equals(originals[i])),'Assembly did not exactly restore');
 return {nodes:nodes.size,meshes,triangles,bytes:bytes.length};
}
if(process.argv[1]?.endsWith('validate-model.mjs'))console.log(await validateModel(process.argv[2]||'public/models/hopper'));
