import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {accelerateModel} from '../src/acceleration.js';

test('BVH reuses shared geometry and preserves indices, transforms, identifiers and first hits',async()=>{
 const root=new T.Group(),geometry=new T.SphereGeometry(1,32,24),material=new T.MeshStandardMaterial({side:T.DoubleSide});
 const a=new T.Mesh(geometry,material),b=new T.Mesh(geometry,material);b.position.x=4;a.userData.componentId='original';root.add(a,b);root.updateMatrixWorld(true);
 const indices=geometry.index.array.slice(),ray=new T.Raycaster(new T.Vector3(0,0,5),new T.Vector3(0,0,-1));const before=ray.intersectObjects([a,b])[0];
 const stats=await accelerateModel(root);ray.firstHitOnly=true;const after=ray.intersectObjects([a,b])[0];
 assert.equal(stats.geometries,1);assert.ok(stats.bytes>0);assert.equal(after.object,before.object);assert.ok(Math.abs(after.distance-before.distance)<1e-6);
 assert.deepEqual(geometry.index.array,indices);assert.equal(a.userData.componentId,'original');assert.equal(b.position.x,4);
});
