// Stage, validate, archive, then activate locally. Never reconverts Hero.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
function within(relative){const resolved=path.resolve(root,relative);if(!resolved.startsWith(root+path.sep))throw Error('Output must stay inside the project');return resolved;}
const input=path.resolve(process.argv[2]||'CAD/Hopper.step');
if(!/\.(step|stp)$/i.test(input))throw Error('Supply a STEP file path.');
const raw=fs.readFileSync(input),hash=crypto.createHash('sha256').update(raw).digest('hex');
const archive=within('.local/model-revisions/hopper');fs.mkdirSync(archive,{recursive:true});
const sourceSnapshot=path.join(archive,hash+'.step');if(!fs.existsSync(sourceSnapshot))fs.writeFileSync(sourceSnapshot,raw,{flag:'wx'});
const tag=new Date().toISOString().replace(/[:.]/g,'-')+'-'+hash.slice(0,8);
const stage=within('.local/hopper-builds/'+tag);fs.mkdirSync(stage,{recursive:true});
const python=['.local/python/python.exe','.local/python/Scripts/python.exe'].find(p=>fs.existsSync(p))||'python';
const commands=[[python,['tools/convert.py',input,stage]],[process.execPath,['tools/inspect-glb.mjs',stage,'--legacy-gbk']],[process.execPath,['tools/optimize.mjs',stage]],[process.execPath,['tools/inspect-glb.mjs',stage,'--legacy-gbk']],[process.execPath,['tools/curate-hopper.mjs',stage]],[process.execPath,['tools/validate-model.mjs',stage]]];
for(const [command,args] of commands){const r=spawnSync(command,args,{stdio:'inherit'});if(r.error||r.status!==0){console.error('Conversion stopped. Active Hopper unchanged. Staged files:',stage);if(r.error)console.error(r.error);process.exit(r.status||1);}}
if(crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex')!==hash)throw Error('Input changed during conversion; active model not replaced.');
const active=within('public/models/hopper');let previous;
if(fs.existsSync(active)){previous=path.join(archive,tag+'-previous-assets');fs.renameSync(active,previous);}
try{fs.renameSync(stage,active);}catch(error){if(previous)fs.renameSync(previous,active);throw error;}
console.log('Hopper is ready in public/models/hopper.');
if(previous)console.log('Previous assets and editable educational content preserved at:',previous);
console.log('Read-only source snapshot:',sourceSnapshot);
console.log('Review annotations and camera in the browser after every CAD revision.');
