import {MeshBVH, acceleratedRaycast} from 'three-mesh-bvh';

// Per-model, per-unique-geometry trees. Indirect indices leave CAD geometry intact.
export async function accelerateModel(root,isCurrent=()=>true) {
 const geometries=new Set(),meshes=[];
 root.traverse(o=>{if(o.isMesh){meshes.push(o);geometries.add(o.geometry)}});
 const start=performance.now();let cpuMs=0,bytes=0,count=0,slice=start;
 for(const geometry of geometries) {
  if(!isCurrent()) break;
  const triangles=(geometry.index?.count||geometry.attributes.position.count)/3;
  if(triangles<100) continue;
  const begin=performance.now();
  geometry.boundsTree=new MeshBVH(geometry,{indirect:true,targetLeafSize:10});
  cpuMs+=performance.now()-begin;count++;
  for(const buffer of geometry.boundsTree._roots) bytes+=buffer.byteLength;
  bytes+=geometry.boundsTree._indirectBuffer?.byteLength||0;
  if(performance.now()-slice>12){await new Promise(resolve=>setTimeout(resolve,0));slice=performance.now();}
 }
 for(const mesh of meshes) mesh.raycast=acceleratedRaycast;
 return {cpuMs,elapsedMs:performance.now()-start,bytes,geometries:count};
}
