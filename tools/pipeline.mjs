import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
const python=fs.existsSync('.local/python/python.exe')?'.local/python/python.exe':fs.existsSync('.local/python/Scripts/python.exe')?'.local/python/Scripts/python.exe':'python';
const heroSource=JSON.parse(fs.readFileSync('public/models/hero/source-report.json')).source;
const stamp=new Date().toISOString().replace(/[:.]/g,'-');const stage='.local/hero-builds/'+stamp;fs.mkdirSync(stage,{recursive:true});
for(const [cmd,args] of [[python,['tools/convert.py','CAD/'+heroSource,stage]],[python,['tools/names.py','CAD/'+heroSource,'.local/hero-name-map.json']],[process.execPath,['tools/inspect-glb.mjs',stage,'.local/hero-name-map.json']],[process.execPath,['tools/optimize.mjs',stage]],[process.execPath,['tools/inspect-glb.mjs',stage,'.local/hero-name-map.json']],[process.execPath,['tools/curate-hero.mjs',stage]],[process.execPath,['tools/validate-model.mjs',stage]]]){
 const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
}
const archive='.local/model-revisions/hero/'+stamp;fs.mkdirSync('.local/model-revisions/hero',{recursive:true});fs.renameSync('public/models/hero',archive);try{fs.renameSync(stage,'public/models/hero');}catch(error){fs.renameSync(archive,'public/models/hero');throw error;}console.log('Previous Hero assets preserved:',archive);
