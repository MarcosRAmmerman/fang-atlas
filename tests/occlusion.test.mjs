import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OcclusionTransparency} from '../src/occlusion.js';

function fixture() {
 const scene=new T.Scene(),shared=new T.MeshStandardMaterial({color:0x123456});
 const mesh=(x,z)=>{const m=new T.Mesh(new T.BoxGeometry(1,1,0.2),shared);m.position.set(x,0,z);scene.add(m);return m;};
 const target=mesh(0,0),front=mesh(0,2),back=mesh(0,-2),side=mesh(3,2);
 const parent=new T.Group();scene.add(parent);parent.attach(target);
 const camera=new T.PerspectiveCamera(45,1,.01,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
 const xray=new OcclusionTransparency();xray.setMeshes([target,front,back,side]);
 return {xray,camera,scene,target,parent,front,back,side,shared};
}
test('surface rays exclude descendants, unrelated geometry and geometry behind the selected surface',()=>{
 const {xray,camera,parent,front}=fixture();assert.deepEqual([...xray.findBlockers(camera,parent)],[front]);
});
test('fade is smooth, clones shared materials, reverses with camera, and restores exact references',()=>{
 const {xray,camera,parent,front,back,side,shared}=fixture();front.renderOrder=7;
 xray.update(camera,parent,0);xray.update(camera,parent,160);
 assert.ok(front.material.opacity>.2&&front.material.opacity<1);assert.equal(side.material,shared);assert.equal(shared.opacity,1);
 xray.update(camera,parent,400);assert.equal(front.material.opacity,.2);assert.equal(front.material.depthWrite,false);
 camera.position.z=-5;camera.lookAt(0,0,0);xray.update(camera,parent,600);xray.update(camera,parent,900);xray.update(camera,parent,1250);
 assert.equal(front.material,shared);assert.equal(front.renderOrder,7);assert.equal(back.material.opacity,.2);
 xray.update(camera,null,1300);xray.update(camera,null,1700);assert.equal(back.material,shared);assert.equal(xray.states.size,0);
});
test('transparent material arrays, selection changes, disable and model disposal restore exactly',()=>{
 const {xray,camera,target,parent,front,shared}=fixture();const glass=shared.clone();glass.transparent=true;glass.opacity=.65;glass.depthWrite=false;
 target.geometry.groups.forEach(g=>g.materialIndex%=2);target.material=[glass,shared];const originals=target.material;
 xray.update(camera,parent,0,true);assert.ok(target.material.every(m=>m.opacity===1&&m.blending===T.NoBlending&&m.depthWrite));
 xray.update(camera,front,150,true);assert.equal(target.material,originals);assert.equal(front.material.opacity,1);
 xray.setEnabled(false);xray.update(camera,front,300,true);assert.equal(front.material,shared);assert.equal(glass.opacity,.65);assert.equal(glass.depthWrite,false);
 xray.setEnabled(true);xray.update(camera,parent,500,true);xray.dispose();assert.equal(target.material,originals);assert.equal(front.material,shared);
});
test('hidden parts and isolation do not obstruct; checks are throttled',()=>{
 const {xray,camera,parent,front}=fixture();let checks=0;const find=xray.findBlockers.bind(xray);xray.findBlockers=(...args)=>{checks++;return find(...args)};
 xray.update(camera,parent,0,true);xray.update(camera,parent,30,true);assert.equal(checks,1);
 front.visible=false;xray.invalidate();xray.update(camera,parent,150,true);assert.equal(xray.blockers.size,0);assert.equal(front.material.opacity,1);
});

test('stationary cameras stop checking; meaningful motion is throttled with a final settle check',()=>{
 const {xray,camera,parent}=fixture();let checks=0;const find=xray.findBlockers.bind(xray);xray.findBlockers=(...args)=>{checks++;return find(...args)};
 xray.update(camera,parent,0,true);xray.update(camera,parent,250,true);const settledChecks=checks;
 for(let t=300;t<2000;t+=16)xray.update(camera,parent,t,true);
 assert.equal(checks,settledChecks);
 for(let t=2000;t<3000;t+=16){camera.position.x+=.005;xray.update(camera,parent,t,true);}
 assert.ok(checks-settledChecks<=4);
 const movingChecks=checks;xray.update(camera,parent,3300,true);assert.equal(checks,movingChecks+1);
 xray.setOpacity(.15);xray.update(camera,parent,3600,true);assert.equal(checks,movingChecks+1);
});

test('expensive checks retain cached blockers during movement, then update on pause',()=>{
 const {xray,camera,parent}=fixture();xray.budgetMs=-1;let mode;
 xray.onModeChange=value=>mode=value;
 xray.update(camera,parent,0,true);camera.position.x=.1;xray.update(camera,parent,250,true);
 assert.equal(mode,'settled');assert.equal(xray.settledOnly,true);const count=xray.metrics.checks;
 for(let t=300;t<2000;t+=16){camera.position.x+=.01;xray.update(camera,parent,t,true);}
 assert.equal(xray.metrics.checks,count);
 xray.update(camera,parent,2300,true);assert.equal(xray.metrics.checks,count+1);assert.equal(xray.enabled,true);
});

test('material clones are single-pass, reused across selections, and disposed with the model',()=>{
 const {xray,camera,parent,front,shared}=fixture();xray.update(camera,parent,0,true);
 const clone=front.material;assert.equal(clone.forceSinglePass,true);
 xray.update(camera,null,500,true);assert.equal(front.material,shared);
 xray.update(camera,parent,1000,true);assert.equal(front.material,clone);
 let disposed=0;clone.addEventListener('dispose',()=>disposed++);xray.dispose();assert.equal(disposed,1);assert.equal(front.material,shared);assert.equal(xray.cache.size,0);
});
