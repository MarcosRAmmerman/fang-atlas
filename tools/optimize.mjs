import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {weld,simplify,dedup,prune} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const file=(process.argv[2]||'public/models/hero')+'/model.glb';const io=new NodeIO();const doc=await io.read(file);await MeshoptSimplifier.ready;
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:0.32,error:0.0005}),dedup(),prune());
await io.write(file,doc);console.log('Optimized bytes:',fs.statSync(file).size);
