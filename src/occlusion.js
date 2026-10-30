import * as T from 'three';

const materials = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
const visible = mesh => { for (let p=mesh;p;p=p.parent) if (!p.visible) return false; return true; };
const contains = (parent, mesh) => { for (let p=mesh;p;p=p.parent) if (p===parent) return true; return false; };

/** Camera-dependent, geometry-tested transparency. Never mutates source materials. */
export class OcclusionTransparency {
 constructor() {
  this.enabled=true; this.opacity=0.2; this.duration=320; this.interval=250;this.budgetMs=12;
  this.meshes=[]; this.states=new Map(); this.blockers=new Set(); this.lastSeen=new Map();
  this.ray=new T.Raycaster();this.ray.firstHitOnly=true;
  this.selectedMeshes=new Set();this.cache=new Map();this.entries=[];this.targets=[];this.hits=[];this.candidates=[];this.samples=Array.from({length:34},()=>new T.Vector2());this.point=new T.Vector3();this.targetBox=new T.Box3();
  this.checkedPosition=new T.Vector3(Infinity,0,0);this.checkedQuaternion=new T.Quaternion();this.observedPosition=new T.Vector3(Infinity,0,0);this.observedQuaternion=new T.Quaternion();this.projection=new T.Matrix4();this.lastMotion=-Infinity;this.finalPending=false;this.settledOnly=false;this.slowChecks=0;this.metrics={checks:0,lastMs:0}; this.lastCheck=-Infinity; this.dirty=true; this.pendingRelease=false;
 }
 setMeshes(meshes) { this.dispose(); this.meshes=meshes; this.dirty=true; }
 invalidate() { this.dirty=true; }
 setEnabled(enabled) { this.enabled=enabled; this.invalidate(); }
 setOpacity(opacity) { this.opacity=T.MathUtils.clamp(opacity,0.15,0.25); }
 isFaded(mesh) { return this.states.get(mesh)?.value < 0.55 && this.blockers.has(mesh); }
 restoreMesh(mesh,state) { mesh.material=state.original; mesh.renderOrder=state.order; this.states.delete(mesh); }
 dispose() {
  for (const [mesh,state] of this.states) this.restoreMesh(mesh,state);
  for(const state of this.cache.values()) state.clones.forEach(m=>m.dispose());this.cache.clear();this.entries=[];this.selectedMeshes.clear();this.settledOnly=false;this.slowChecks=0;this.finalPending=false;
  this.blockers.clear(); this.lastSeen.clear(); this.meshes=[]; this.selection=null; this.pendingRelease=false; this.lastCheck=-Infinity;
 }
 state(mesh) {
  let state=this.states.get(mesh);
  if (!state) {
   const cached=this.cache.get(mesh);
   const original=mesh.material, clones=cached?.clones||materials(mesh).map(m=>{const copy=m.clone();copy.transparent=true;copy.forceSinglePass=true;return copy;});
   state={original,clones,order:mesh.renderOrder,value:1,from:1,to:1,start:0,selected:false};
   mesh.material=Array.isArray(original)?clones:clones[0]; this.states.set(mesh,state);this.cache.set(mesh,state);
  }
  return state;
 }
 update(camera,selection,now=performance.now(),reduced=false,motionKey=0) {
  const selectionChanged=selection!==this.selection;
  if (selectionChanged) {
   this.selection=selection;this.selectedMeshes.clear();
   for(const mesh of this.meshes)if(contains(selection,mesh))this.selectedMeshes.add(mesh);
   this.blockers.clear();this.lastSeen.clear();this.pendingRelease=false;this.dirty=true;
   if(this.settledOnly)this.onModeChange?.('dynamic');this.settledOnly=false;this.slowChecks=0;
  }
  camera.updateMatrixWorld();
  const active=this.enabled&&selection;
  const scale=Math.max(camera.near*1000,0.01);
  const moved=this.observedPosition.distanceToSquared(camera.position)>scale*scale*1e-12||this.observedQuaternion.angleTo(camera.quaternion)>1e-6||Math.abs((this.observedMotionKey||0)-motionKey)>1e-6;
  if(moved){this.lastMotion=now;this.finalPending=true;this.observedPosition.copy(camera.position);this.observedQuaternion.copy(camera.quaternion);this.observedMotionKey=motionKey;}
  const meaningful=this.checkedPosition.distanceToSquared(camera.position)>(scale*.003)**2||this.checkedQuaternion.angleTo(camera.quaternion)>.012||Math.abs((this.checkedMotionKey||0)-motionKey)>.005||!this.projection.equals(camera.projectionMatrix);
  const settled=now-this.lastMotion>=180;
  const finalCheck=this.finalPending&&settled;
  if (!active) { this.blockers.clear(); this.lastSeen.clear(); }
  else if (this.dirty||selectionChanged||((now-this.lastCheck>=this.interval)&&((meaningful&&!this.settledOnly)||finalCheck||this.pendingRelease&&settled))) {
   const started=performance.now();const hits=this.findBlockers(camera,selection);
   const elapsed=performance.now()-started;this.metrics.checks++;this.metrics.lastMs=elapsed;
   if(elapsed>this.budgetMs)this.slowChecks++;else this.slowChecks=0;
   if(this.slowChecks>=2&&!this.settledOnly){this.settledOnly=true;this.onModeChange?.('settled');}
   for (const mesh of hits) this.lastSeen.set(mesh,now);
   for (const [mesh,time] of this.lastSeen) if (!visible(mesh)||now-time>220) this.lastSeen.delete(mesh);
   this.blockers=new Set(this.lastSeen.keys());
   this.pendingRelease=[...this.blockers].some(mesh=>!hits.has(mesh));
   this.lastCheck=now;this.dirty=false;
   this.checkedPosition.copy(camera.position);this.checkedQuaternion.copy(camera.quaternion);this.checkedMotionKey=motionKey;this.projection.copy(camera.projectionMatrix);
   if(settled)this.finalPending=false;
  }
  const selected=active?this.selectedMeshes:[];
  for (const mesh of this.blockers) this.state(mesh);
  // Imported transparent parts must also remain fully opaque when selected.
  for (const mesh of selected) if (this.blockers.size||materials(mesh).some(m=>m.opacity!==1||m.transparent)||this.states.has(mesh)) this.state(mesh);
  for (const [mesh,state] of this.states) {
   const isSelected=!!active&&this.selectedMeshes.has(mesh);
   const target=isSelected?1:this.blockers.has(mesh)?this.opacity:1;
   if (state.to!==target) { state.from=state.value; state.to=target; state.start=now; }
   const t=reduced||isSelected?1:Math.min(1,(now-state.start)/this.duration);
   state.value=t===1?state.to:T.MathUtils.lerp(state.from,state.to,t*t*(3-2*t));
   state.selected=isSelected;
   if (state.value===1&&state.to===1&&!isSelected) { this.restoreMesh(mesh,state); continue; }
   const originals=Array.isArray(state.original)?state.original:[state.original];
   state.clones.forEach((m,i)=>{
    const source=originals[i], transparent=true;
    if(m.transparent!==transparent) {m.transparent=transparent;m.needsUpdate=true;}
    m.opacity=isSelected?1:source.opacity*state.value;
    m.depthWrite=isSelected?true:false;
    m.blending=isSelected?T.NoBlending:source.blending;
   });
   // Draw the opaque selection after faded shells, with depth testing still on:
   // unrelated opaque geometry continues to occlude it normally.
   mesh.renderOrder=isSelected?10000:state.order;
  }
 }
 findBlockers(camera,selection) {
  const entries=this.entries, selected=this.targets, targetBox=this.targetBox;
  selected.length=0;targetBox.makeEmpty();
  if(entries.length!==this.meshes.length){entries.length=0;for(const mesh of this.meshes)entries.push({mesh,box:new T.Box3(),matrix:new T.Matrix4().set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0),visible:false});}
  for (const entry of entries) {
   const mesh=entry.mesh;entry.visible=visible(mesh);if(!entry.visible)continue;
   mesh.updateWorldMatrix(true,false);
   if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   if(!entry.matrix.equals(mesh.matrixWorld)){entry.box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);entry.matrix.copy(mesh.matrixWorld);}
   if(contains(selection,mesh)){selected.push(entry);targetBox.union(entry.box);}
  }
  if(!selected.length) return new Set();
  const points=[targetBox.getCenter(new T.Vector3())];
  // A projected 5x5 grid covers off-center geometry; actual surface hits below
  // reject empty regions of an assembly's box and geometry behind the target.
  const min=new T.Vector2(Infinity,Infinity),max=new T.Vector2(-Infinity,-Infinity);
  for(const x of [targetBox.min.x,targetBox.max.x]) for(const y of [targetBox.min.y,targetBox.max.y]) for(const z of [targetBox.min.z,targetBox.max.z]) {
   const p=new T.Vector3(x,y,z).project(camera);min.min(p);max.max(p);
  }
  const samples=this.samples;let sampleCount=0;
  for(const x of [0.1,0.3,0.5,0.7,0.9]) for(const y of [0.1,0.3,0.5,0.7,0.9]) samples[sampleCount++].set(T.MathUtils.lerp(min.x,max.x,x),T.MathUtils.lerp(min.y,max.y,y));
  // Centers supplement the grid for small, sparse, or nested assemblies.
  const stride=Math.max(1,Math.ceil(selected.length/8));
  for(let i=0;i<selected.length;i+=stride) points.push(selected[i].box.getCenter(new T.Vector3()));
  for(const p of points) {p.project(camera);samples[sampleCount++].set(p.x,p.y);}
  const result=new Set(),selectedSet=new Set(selected.map(e=>e.mesh)),point=this.point;
  for(let sampleIndex=0;sampleIndex<sampleCount;sampleIndex++) {
   const sample=samples[sampleIndex];
   if(sample.x < -1 || sample.x > 1 || sample.y < -1 || sample.y > 1) continue;
   this.ray.setFromCamera(sample,camera);this.ray.near=camera.near;this.ray.far=camera.far;
   const targets=this.candidates;targets.length=0;for(const entry of selected)if(this.ray.ray.intersectsBox(entry.box))targets.push(entry.mesh);
   this.hits.length=0;const hit=this.ray.intersectObjects(targets,false,this.hits)[0];
   if(!hit) continue;
   this.ray.far=hit.distance-Math.max(1e-6,hit.distance*1e-5);
   const candidates=this.candidates;candidates.length=0;
   for(const e of entries) {
    if(!e.visible||selectedSet.has(e.mesh)||result.has(e.mesh)) continue;
    if(e.box.containsPoint(this.ray.ray.origin)||(this.ray.ray.intersectBox(e.box,point)&&point.distanceTo(this.ray.ray.origin)<=this.ray.far)) candidates.push(e.mesh);
   }
   this.hits.length=0;for(const obstruction of this.ray.intersectObjects(candidates,false,this.hits)) result.add(obstruction.object);
  }
  return result;
 }
}
