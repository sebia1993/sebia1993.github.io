import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8','.ico':'image/x-icon'};
let server,base=process.env.BASE_URL;
if(!base){
  server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=resolve(repo,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(resolve(repo)+sep)){res.writeHead(403).end();return;}
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(await readFile(file));
    }catch{res.writeHead(404).end('Not found');}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  base=`http://127.0.0.1:${server.address().port}`;
}

const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
const failures=[]; let assertions=0;
async function check(name,fn){
  try{await fn();assertions++;console.log(`PASS ${name}`);}
  catch(error){failures.push({name,message:error.message});console.error(`FAIL ${name}: ${error.message}`);}
}
function collectErrors(page){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push('console: '+m.text());});
  page.on('response',r=>{try{const u=new URL(r.url());const b=new URL(base);if(u.origin===b.origin&&r.status()>=400)errors.push(`http ${r.status()} ${u.pathname}`);}catch{}});
  return errors;
}

const viewports=[
  {width:360,height:800},
  {width:768,height:1024},
  {width:1366,height:768},
  {width:1920,height:1080}
];
const pages=[
  ['guide','/labs/ethernet-mac-table.html'],
  ['simulator','/labs/ethernet-mac-table-simulator.html'],
  ['validation','/learning/foundations/ethernet-mac-table/cisco-validation-2026-10-03.html'],
  ['roadmap','/roadmap.html']
];

try{
  for(const viewport of viewports){
    for(const [name,path] of pages){
      await check(`${name} ${viewport.width}x${viewport.height} layout`,async()=>{
        const page=await browser.newPage({viewport});
        const errors=collectErrors(page);
        try{
          const response=await page.goto(base+path,{waitUntil:'networkidle'});
          assert.equal(response.status(),200);
          assert.ok((await page.locator('body').innerText()).length>200);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'unexpected horizontal document overflow');
          if(name==='guide'){
            assert.equal(await page.locator('a[href*="cisco-validation-2026-10-03.html"]').count(),1);
            assert.ok((await page.locator('body').innerText()).includes('핵심 동작 6개'));
          }
          if(name==='simulator'){
            assert.equal(await page.locator('#runBtn').isDisabled(),true,'run must be gated by prediction');
            const domText=await page.locator('body').textContent();
            assert.ok(domText.includes('시뮬레이터 Aging 기준 = 300초'));
            assert.ok(domText.includes('Same-port Filtering'));
          }
          if(name==='validation'){
            const body=await page.locator('body').innerText();
            assert.ok(body.includes('6/6 PASS'));
            for(let i=1;i<=6;i++) assert.equal(await page.locator(`#ethmac-0${i}`).count(),1);
          }
          if(name==='roadmap'){
            assert.ok((await page.locator('#current').innerText()).includes('Ethernet / MAC Table'));
          }
          assert.deepEqual(errors,[]);
        }finally{await page.close();}
      });
    }
  }

  await check('Ethernet simulator five-lesson validated flow',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    const errors=collectErrors(page);
    try{
      assert.equal((await page.goto(base+'/labs/ethernet-mac-table-simulator.html',{waitUntil:'networkidle'})).status(),200);
      const answers=['source','p2','flood','broadcast','flood'];
      const anchors=['ethmac-01','ethmac-02','ethmac-03','ethmac-04','ethmac-05'];
      for(let i=0;i<5;i++){
        if(i>0){await page.locator('.lesson-tab').nth(i).click();await page.waitForTimeout(50);}
        assert.equal(await page.locator('#runBtn').isDisabled(),true);
        await page.locator(`#predictionOptions [data-prediction="${answers[i]}"]`).click();
        if(i===4){
          assert.equal(await page.locator('#runBtn').isDisabled(),true,'aging lesson requires time advance');
          await page.locator('#ageBtn').click();
          await page.waitForFunction(()=>document.querySelector('#runBtn')?.disabled===false);
        }else{
          assert.equal(await page.locator('#runBtn').isEnabled(),true);
        }
        assert.ok((await page.locator('#evidenceLink').getAttribute('href')).includes(anchors[i]));
        await page.locator('#runBtn').click();
        await page.locator('#lessonBadge').filter({hasText:'완료'}).waitFor({timeout:10000});
        const verdict=await page.locator('#verdictBox').innerText();
        assert.ok(verdict.includes('완료'));
        if(i===0){
          assert.ok(verdict.includes('Source MAC'));
          assert.equal(verdict.includes('Neighbor 상태'),false,'lesson 1 must not claim unobserved neighbor-state learning');
        }
      }
      assert.equal(await page.locator('#courseCount').innerText(),'5 / 5 완료');
      assert.equal(await page.locator('#courseComplete').evaluate(el=>el.classList.contains('show')),true);
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });

  await check('Ethernet simulator 360px prediction and quick action',async()=>{
    const page=await browser.newPage({viewport:{width:360,height:800}});
    const errors=collectErrors(page);
    try{
      await page.goto(base+'/labs/ethernet-mac-table-simulator.html',{waitUntil:'networkidle'});
      assert.equal(await page.locator('#runBtn').isDisabled(),true);
      await page.locator('#predictionOptions [data-prediction="source"]').click();
      assert.equal(await page.locator('#runBtn').isEnabled(),true);
      assert.equal(await page.locator('#quickNextBar').isVisible(),true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });
}finally{
  await browser.close();
  if(server) await new Promise(r=>server.close(r));
}
console.log(JSON.stringify({assertions,failures},null,2));
assert.equal(failures.length,0,JSON.stringify(failures,null,2));
