import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const browser = await chromium.launch({channel:'chrome',headless:true});
try { for (const viewport of [{width:1440,height:1000},{width:844,height:390}]) {
const page=await browser.newPage({viewport,hasTouch:viewport.width<900});page.setDefaultTimeout(10000);
await page.goto('http://127.0.0.1:3000/tests/manor-preview.html');
await page.locator('.world-canvas[data-ready=true]').waitFor();

  const frame = () =>
    page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
  await frame();
  const hitPoint = async (type, id) =>
    page.evaluate(
      ({ type, id }) => {
        const r = window.manorRenderer,
          c = r.canvas,
          b = c.getBoundingClientRect();
        const candidates = r.hits.filter(
          (h) => h.selection.type === type && h.selection.id === id,
        );
        for (const h of candidates)
          for (let y = h.y + 3; y < h.y + h.h - 3; y += 3)
            for (let x = h.x + 3; x < h.x + h.w - 3; x += 3) {
              const local = {
                  x: r.origin.x + x * r.scale,
                  y: r.origin.y + y * r.scale,
                },
                client = { x: b.left + local.x, y: b.top + local.y };
              if (document.elementFromPoint(client.x, client.y) !== c) continue;
              if (
                [
                  [0, 0],
                  [-2, 0],
                  [2, 0],
                  [0, -2],
                  [0, 2],
                ].every(([dx, dy]) => {
                  const s = r.hit({ x: local.x + dx, y: local.y + dy });
                  return s?.type === type && s.id === id;
                })
              )
                return client;
            }
        throw Error(`No visible hit point ${type} ${id}`);
      },
      { type, id },
    );
  const clickSelection = async (type, id) => {
    if (type === 'lot') {
      await page.evaluate(id => window.manorRenderer.focusLot(id), id);
      await frame();
    }
    const p = await hitPoint(type, id);
    await page.mouse.click(p.x, p.y);
    await frame();
  };

await page.evaluate(()=>{const l=window.manorState.lots[6]; l.level=1;l.upgrading={kind:'hq',targetLevel:2,duration:60,remaining:50};});
await clickSelection('lot',6);
const cancel=page.getByRole('button',{name:'Annuler l’amélioration',exact:true});await cancel.scrollIntoViewIfNeeded();
assert.equal(await cancel.innerText(),'Annuler');
const rect=await cancel.boundingBox(),scroll=await page.locator('.selection-scroll').boundingBox();
assert.ok(rect.height>=44 && rect.x>=scroll.x && rect.x+rect.width<=scroll.x+scroll.width);
await page.screenshot({path:join(tmpdir(),'evil-selection-'+viewport.width+'.png')});
await cancel.click();assert.equal(await page.evaluate(()=>window.manorState.lots[6].upgrading),undefined);
const padding=await page.locator('.selection-name').evaluate(e=>getComputedStyle(e).paddingRight);assert.equal(padding,'0px');
await page.close();console.log(viewport,'cancel touch target, bounds, action and centered heading OK');
}} finally {await browser.close();}
