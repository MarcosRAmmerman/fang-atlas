import {test,expect} from '@playwright/test';

async function state(page) {
 return page.evaluate(async()=>{
  const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);
  const faded=v.meshes.filter(m=>v.xray.isFaded(m));
  return {faded:faded.map(m=>m.uuid),selectedOpaque:v.meshes.filter(m=>v.contains(v.selected,m)).every(m=>[m.material].flat().every(mat=>mat.opacity===1&&mat.depthWrite)),
   wrong:faded.some(m=>v.contains(v.selected,m)),opacities:faded.map(m=>m.material.opacity),states:v.xray.states.size,
   restored:v.meshes.every((m,i)=>m.material===window.originalMaterials[i]),total:v.meshes.length};
 });
}
for(const model of ['hopper','hero']) test(`${model}: dynamic X-Ray follows camera and restores original materials`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?model='+model);await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(async()=>{const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);window.originalMaterials=v.meshes.map(m=>m.material)});
 await page.getByRole('button',{name:model==='hopper'?'Wheel drive motor':'Drive motor',exact:true}).click();
 await expect.poll(async()=>(await state(page)).faded.length).toBeGreaterThan(0);
 await page.waitForTimeout(1500);const before=await state(page);expect(before.selectedOpaque).toBe(true);expect(before.wrong).toBe(false);expect(before.faded.length).toBeLessThan(before.total/2);
 expect(await page.evaluate(async()=>{
  const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);const T=await import('/node_modules/three/build/three.module.js');
  const box=new T.Box3().setFromObject(v.selected),center=box.getCenter(new T.Vector3()).project(v.camera);
  const rect=v.container.getBoundingClientRect();
  for(let x=-5;x<=5;x++)for(let y=-5;y<=5;y++){
   const px=center.x+x*.02,py=center.y+y*.02;v.ray.setFromCamera(new T.Vector2(px,py),v.camera);
   const raw=v.ray.intersectObjects(v.meshes.filter(m=>v.visible(m)),false)[0]?.object;
   const hit=v.hit({clientX:rect.left+(px+1)*rect.width/2,clientY:rect.top+(1-py)*rect.height/2});
   if(raw&&v.xray.isFaded(raw)&&v.contains(v.selected,hit))return true;
  }return false;
 })).toBe(true);
 await page.screenshot({path:`.local/${model}-xray.png`});
 await page.locator('#xray-opacity').fill('15');await expect.poll(async()=>Math.max(...(await state(page)).opacities)).toBeCloseTo(.15,2);
 // Large orbit makes previously foreground parts move behind the actual target.
 await page.evaluate(async()=>{const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);v.orbit(Math.PI)});
 await expect.poll(async()=>{const s=await state(page);return before.faded.some(id=>!s.faded.includes(id))}).toBe(true);
 await page.waitForTimeout(1800);
 const rotated=await state(page);expect(rotated.selectedOpaque).toBe(true);expect(rotated.wrong).toBe(false);expect(rotated.faded).not.toEqual(before.faded);
 // Verify faded meshes really intersect target rays from the new camera direction.
 expect(await page.evaluate(async()=>{const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);const actual=v.xray.findBlockers(v.camera,v.selected);return [...v.xray.blockers].every(m=>actual.has(m))})).toBe(true);
 await page.screenshot({path:`.local/${model}-xray-rotated.png`});
 await page.locator('#xray-toggle').click();await expect(page.locator('#xray-toggle')).toHaveText('Auto X-Ray: OFF');
 await expect.poll(async()=>(await state(page)).restored).toBe(true);
 await page.locator('#xray-toggle').click();await page.locator('#isolate').click();await expect.poll(async()=>(await state(page)).faded.length).toBe(0);
 await page.locator('#restore').click();await page.locator('#reset').click();await expect.poll(async()=>(await state(page)).restored).toBe(true);
 await page.getByRole('button',{name:model==='hopper'?'Wheel drive motor':'Drive motor',exact:true}).click();await expect.poll(async()=>(await state(page)).faded.length).toBeGreaterThan(0);
 await page.keyboard.press('Escape');await expect.poll(async()=>(await state(page)).restored).toBe(true);expect(errors).toEqual([]);
});

test('mobile X-Ray controls are usable and reduced motion restores immediately',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
 await page.getByRole('button',{name:'Wheel drive motor',exact:true}).click();await expect(page.locator('#xray-toggle')).toBeVisible();await page.locator('#xray-opacity').fill('25');
 await expect.poll(()=>page.evaluate(async()=>{const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);return [...v.xray.blockers].length})).toBeGreaterThan(0);
 await page.screenshot({path:'.local/hopper-xray-mobile.png'});await page.locator('#xray-toggle').click();
 expect(await page.evaluate(async()=>{const {viewer:v}=await import(document.querySelector('script[src*="/src/main.js"]').src);return v.xray.states.size})).toBe(0);
});
