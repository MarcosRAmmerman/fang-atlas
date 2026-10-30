import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateModel} from '../tools/validate-model.mjs';
test('Hopper geometry, annotations, lesson and animated reassembly',async()=>{const report=await validateModel('public/models/hopper');assert(report.nodes>2000);assert(report.triangles>100000);});
test('Hopper is default and all original CAD/Hero assets are unchanged',()=>{const catalog=JSON.parse(fs.readFileSync('public/models/catalog.json'));assert.equal(catalog.default,'hopper');assert.deepEqual(catalog.models.map(m=>m.id),['hopper','hero']);for(const [path,hash] of Object.entries(JSON.parse(fs.readFileSync('tests/fixtures/original-assets.json'))))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),hash,path+' changed');});
