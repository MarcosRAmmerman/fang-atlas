import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {Exploder} from './explode.js';
import {OcclusionTransparency} from './occlusion.js';
import {accelerateModel} from './acceleration.js';
export class Viewer {
 constructor(container,onSelect){
  this.container=container;this.onSelect=onSelect;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(36,1,0.005,100);this.renderer=new T.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=0.82;container.append(this.renderer.domElement);this.renderer.domElement.tabIndex=0;this.renderer.domElement.setAttribute('aria-label','Interactive robot. Drag to orbit, scroll to zoom, right drag to pan. Keyboard camera controls are below.');
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=!this.reduced;this.controls.dampingFactor=0.07;this.controls.addEventListener('start',()=>this.transition=null);this.ray=new T.Raycaster();this.ray.firstHitOnly=true;this.pointer=new T.Vector2();this.meshes=[];this.xray=new OcclusionTransparency();this.nodes=new Map();this.selected=null;this.hover=null;
  const env=new RoomEnvironment();const pmrem=new T.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(env,0.04).texture;env.dispose();pmrem.dispose();this.scene.add(new T.HemisphereLight(0xe5efff,0x302319,0.5));const light=new T.DirectionalLight(0xffe6cc,1.8);light.position.set(2,4,3);this.scene.add(light);
  this.floor=new T.Mesh(new T.CircleGeometry(2,96),new T.MeshBasicMaterial({color:0x13191c}));this.floor.visible=false;this.floor.rotation.x=-Math.PI/2;this.scene.add(this.floor);const grid=new T.GridHelper(4,40,0x323638,0x202528);grid.material.transparent=true;grid.material.opacity=0.08;grid.position.y=0.001;this.scene.add(grid);this.grid=grid;
  container.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||!this.root)return;e.preventDefault();if(e.shiftKey){const amount=this.size*0.04;const delta=new T.Vector3(e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0,e.key==='ArrowUp'?amount:e.key==='ArrowDown'?-amount:0,0).applyQuaternion(this.camera.quaternion);this.move(this.camera.position.clone().add(delta),this.controls.target.clone().add(delta));}else if(e.key==='ArrowLeft'||e.key==='ArrowRight')this.orbit(e.key==='ArrowLeft'?-0.2:0.2);else this.zoom(e.key==='ArrowUp'?0.9:1.1)});let down;container.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);container.addEventListener('pointerup',e=>{if(e.button===0&&down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const mesh=this.hit(e);if(mesh){let part=mesh;while(!part.userData.componentId&&part.parent)part=part.parent;this.onSelect(part)}else this.onSelect(null)}});container.addEventListener('pointermove',e=>{if(e.buttons)return;this.hover=this.hit(e);container.style.cursor=this.hover?'pointer':'grab'});container.addEventListener('pointerleave',()=>this.hover=null);new ResizeObserver(()=>this.resize()).observe(container);this.resize();this.animate();
 }
 setPanelOpen(open){this.panelOpen=open;this.resize();}
 resize(){const {clientWidth:w,clientHeight:h}=this.container;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.setViewOffset(w,h,w>1050?(this.panelOpen?w*0.10:-w*0.10):0,(w<=650?-h*0.05:h*0.07),w,h);this.camera.updateProjectionMatrix();}
 disposeModel(root){if(!root)return;const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>{g.boundsTree=null;g.dispose()});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
 async load(manifest,onProgress,isCurrent=()=>true){
  const gltf=await new GLTFLoader().loadAsync(manifest.asset,onProgress);
  if(!isCurrent()){this.disposeModel(gltf.scene);return null;}
  const accelerationStats=await accelerateModel(gltf.scene,isCurrent);
  if(!isCurrent()){this.disposeModel(gltf.scene);return null;}
  const next=gltf.scene;next.rotation.set(...(manifest.rotation||[0,0,0]));next.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(next);if(box.isEmpty()){this.disposeModel(next);throw Error('The model contains no renderable geometry.');}
  const found=new Set();next.traverse(o=>{if(o.userData.componentId)found.add(o.userData.componentId)});
  for(const id of [...(manifest.explodeGroups||[]),...(manifest.requiredComponents||[])])if(!found.has(id)){this.disposeModel(next);throw Error('Missing explosion component: '+id);}
  this.xray.dispose();this.onFrame=null;this.transition=null;this.selected=null;this.hover=null;
  if(this.root){this.scene.remove(this.root);this.disposeModel(this.root);}
  this.meshes=[];this.nodes.clear();this.accelerationStats=accelerationStats;this.manifest=manifest;this.root=next;this.scene.add(next);
  const center=box.getCenter(new T.Vector3());next.position.sub(new T.Vector3(center.x,box.min.y,center.z));next.updateMatrixWorld(true);
  const originals=new Set();next.traverse(o=>{if(o.userData.componentId)this.nodes.set(o.userData.componentId,o);if(o.isMesh){const clone=m=>{originals.add(m);const copy=m.clone();copy.color?.multiplyScalar(0.42);copy.metalness=0.48;copy.roughness=0.42;copy.envMapIntensity=0.7;return copy};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);this.meshes.push(o)}});originals.forEach(m=>m.dispose());this.xray.setMeshes(this.meshes);
  this.bounds=new T.Box3().setFromObject(next);this.size=this.bounds.getSize(new T.Vector3()).length();this.camera.near=this.size/1000;this.camera.far=this.size*50;this.camera.updateProjectionMatrix();this.controls.minDistance=this.size*0.025;this.controls.maxDistance=this.size*5;this.floor.scale.setScalar(this.size);this.grid.scale.setScalar(this.size);
  this.exploder=new Exploder((manifest.explodeGroups||[]).map(id=>this.nodes.get(id)),next,manifest.explode);this.reset();return next;
 }
 hit(e){const rect=this.container.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);return this.ray.intersectObjects(this.meshes.filter(m=>this.visible(m)&&!this.xray.isFaded(m)),false)[0]?.object;}
 visible(obj){for(let o=obj;o;o=o.parent)if(!o.visible)return false;return true;}
 contains(parent,obj){for(let o=obj;o;o=o.parent)if(o===parent)return true;return false;}
 select(obj,focus=true){this.selected=obj;this.xray.invalidate();if(obj&&focus)this.focus(obj);}
 focus(obj){const b=new T.Box3().setFromObject(obj);if(b.isEmpty())return;const center=b.getCenter(new T.Vector3()),size=b.getSize(new T.Vector3());const radius=Math.max(size.length()/2,this.size*0.06);const distance=radius/Math.sin(T.MathUtils.degToRad(this.camera.fov/2))*1.2/Math.min(1,this.camera.aspect);const direction=this.camera.position.clone().sub(this.controls.target).normalize();if(direction.length()<0.1)direction.set(1,0.6,1).normalize();this.move(center.clone().addScaledVector(direction,distance),center);}
 move(position,target){this.transition={position,target};if(this.reduced){this.camera.position.copy(position);this.controls.target.copy(target);this.transition=null;}}
 reset(){if(!this.root)return;this.restore();this.select(null,false);this.exploder.target=0;const target=this.bounds.getCenter(new T.Vector3());const distance=this.size*(this.manifest.camera?.distanceScale||1.62)/Math.min(1,this.camera.aspect);this.move(target.clone().add(new T.Vector3(...(this.manifest.camera?.direction||[0.95,0.55,1.2])).normalize().multiplyScalar(distance)),target);}
 setExplode(value){this.exploder.target=value;const box=this.exploder.targetBounds(value);const target=box.getCenter(new T.Vector3());const direction=this.camera.position.clone().sub(this.controls.target).normalize();const distance=box.getSize(new T.Vector3()).length()*1.45/Math.min(1,this.camera.aspect);this.move(target.clone().addScaledVector(direction,distance),target);}
 restore(){this.xray.invalidate();this.meshes.forEach(m=>m.visible=true);}
 isolate(obj){this.xray.invalidate();this.meshes.forEach(m=>m.visible=this.contains(obj,m));this.focus(obj);}
 hide(obj){this.xray.invalidate();obj.traverse(o=>{if(o.isMesh)o.visible=false});}
 orbit(angle){const p=this.camera.position.clone().sub(this.controls.target);p.applyAxisAngle(new T.Vector3(0,1,0),angle);this.move(p.add(this.controls.target),this.controls.target.clone());}
 zoom(factor){this.move(this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor).add(this.controls.target),this.controls.target.clone());}
 animate(){this.renderer.setAnimationLoop(()=>{this.exploder?.update(this.reduced);if(this.transition){this.camera.position.lerp(this.transition.position,0.08);this.controls.target.lerp(this.transition.target,0.08);if(this.camera.position.distanceTo(this.transition.position)<0.0001)this.transition=null;}this.controls.update();this.xray.update(this.camera,this.selected,performance.now(),this.reduced,this.exploder?.value||0);for(const m of this.meshes){const sel=this.selected&&this.contains(this.selected,m);for(const material of Array.isArray(m.material)?m.material:[m.material]){material.emissive?.setHex(sel?0xff650f:m===this.hover?0xffa15a:0);material.emissiveIntensity=sel?0.28:m===this.hover?0.18:0;}}this.onFrame?.();this.renderer.render(this.scene,this.camera);});}
}
