import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const origin='https://sebia1993.github.io';
await mkdir(resolve(repo,'test-results/vrf-public'),{recursive:true});
const browser=await chromium.launch();

async function waitForPublished(path, expected){
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  let last='';
  try{
    for(let i=0;i<24;i++){
      try{
        const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
        const body=await page.locator('body').innerText();
        last='status='+(response?.status()??'none')+' body='+body.slice(0,180);
        if(response && response.ok() && body.includes(expected)) return page;
      }catch(e){ last=String(e); }
      await page.waitForTimeout(5000);
    }
    throw new Error('Published content did not become ready: '+path+' '+last);
  }catch(e){ await page.close(); throw e; }
}

try{
  let page=await waitForPublished('/labs/vrf.html','VRF Context → 그 VRF의 Routing Table → 출력 경로');
  assert.ok((await page.locator('body').innerText()).includes('원래 BLUE Ping은 0/3'));
  await page.screenshot({path:resolve(repo,'test-results/vrf-public/concept-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/labs/vrf-simulator.html','VRF · Context → Table → Path');
  assert.equal(await page.locator('.lesson-tab').count(),6);
  assert.equal(await page.locator('#runBtn').isDisabled(),true);
  await page.locator('.lesson-tab').nth(5).click();
  await page.locator('.choice').nth(1).click();
  await page.locator('#runBtn').click();
  assert.ok((await page.locator('#states').innerText()).includes('Outbound Request'));
  assert.ok((await page.locator('#states').innerText()).includes('0/3'));
  assert.ok((await page.locator('#scopeNote').innerText()).includes('양방향 Reachability 성공으로 표시하지 않습니다'));
  await page.screenshot({path:resolve(repo,'test-results/vrf-public/simulator-1366.png'),fullPage:true});
  await page.close();

  page=await waitForPublished('/roadmap.html','VRF');
  const roadmap=await page.locator('body').innerText();
  assert.ok(roadmap.includes('VRF'));
  assert.ok(await page.locator('a[href="./labs/vrf.html"]').count()>=1);
  assert.ok(await page.locator('a[href="./labs/vrf-simulator.html"]').count()>=1);
  await page.close();

  for(const path of ['/labs/vrf.html','/labs/vrf-simulator.html']){
    page=await browser.newPage({viewport:{width:360,height:800}});
    const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:30000});
    assert.ok(response && response.ok(),path+' public response');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,path+' public 360 overflow');
    await page.screenshot({path:resolve(repo,'test-results/vrf-public/'+(path.includes('simulator')?'simulator':'concept')+'-360.png'),fullPage:true});
    await page.close();
  }
} finally {
  await browser.close();
}
console.log('PASS VRF public GitHub Pages QA');
