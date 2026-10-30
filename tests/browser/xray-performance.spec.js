import {test,expect} from '@playwright/test';

test('Jetson keeps one render pass, settles, throttles rotation and releases model resources',async({page})=>{
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(async()=>{window.v=(await import(document.querySelector('script[src*="/src/main.js"]').src)).viewer;});
 await page.getByRole('button',{name:'Onboard computing assembly',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>v.xray.blockers.size)).toBeGreaterThan(0);
 await page.waitForTimeout(3000);
 expect(await page.evaluate(()=>[...v.xray.states.values()].every(s=>s.clones.every(m=>m.forceSinglePass)))).toBe(true);
 const checks=await page.evaluate(()=>v.xray.metrics.checks);
 await page.waitForTimeout(600);expect(await page.evaluate(()=>v.xray.metrics.checks)).toBe(checks);
 const calls=await page.evaluate(()=>v.renderer.info.render.calls);
 await page.locator('#xray-toggle').click();await page.waitForTimeout(500);
 expect(await page.evaluate(()=>v.renderer.info.render.calls)).toBe(calls);
 await page.locator('#xray-toggle').click();
 const rotation=await page.evaluate(async()=>{
  const before=v.xray.metrics.checks;const start=performance.now();v.transition=null;
  await new Promise(resolve=>{function frame(t){const offset=v.camera.position.clone().sub(v.controls.target);offset.applyAxisAngle(v.camera.up,.015);v.camera.position.copy(offset.add(v.controls.target));if(t-start<1500)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame)});
  return v.xray.metrics.checks-before;
 });expect(rotation).toBeGreaterThan(1);expect(rotation).toBeLessThanOrEqual(7);
 await page.evaluate(()=>{window.oldGeometry=v.meshes.find(m=>m.geometry.boundsTree).geometry;window.oldCache=v.xray.cache;});
 await page.locator('#robot-select').selectOption('hero');await expect(page.locator('#loading')).toBeHidden();
 expect(await page.evaluate(()=>oldGeometry.boundsTree===null&&oldCache.size===0)).toBe(true);
});

test('expensive visibility checks visibly fall back to updates on pause without disabling X-Ray',async({page})=>{
 await page.goto('/');await expect(page.locator('#loading')).toBeHidden();
 await page.evaluate(async()=>{window.v=(await import(document.querySelector('script[src*="/src/main.js"]').src)).viewer;v.xray.budgetMs=-1;});
 await page.getByRole('button',{name:'Onboard computing assembly',exact:true}).click();
 await expect(page.locator('#xray-toggle')).toHaveText('Auto X-Ray: ON (on pause)');
 await page.waitForTimeout(3000);const before=await page.evaluate(()=>v.xray.metrics.checks);
 await page.locator('#rotate-right').click();await page.waitForTimeout(500);
 expect(await page.evaluate(()=>v.xray.metrics.checks)).toBe(before);
 await expect.poll(()=>page.evaluate(()=>v.xray.metrics.checks),{timeout:5000}).toBeGreaterThan(before);
 expect(await page.evaluate(()=>v.xray.enabled)).toBe(true);
 await page.locator('#reset').click();await expect(page.locator('#xray-toggle')).toHaveText('Auto X-Ray: ON');
});
