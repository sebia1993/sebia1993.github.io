import {readLearningText} from './concept-evidence-helper.mjs';
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
const failures=[];let assertions=0;
async function check(name,fn){try{await fn();assertions++;console.log('PASS '+name);}catch(e){failures.push({name,message:e.message});console.error('FAIL '+name+': '+e.message);}}
function errorsFor(page){
  const errors=[];
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push('console: '+m.text());});
  page.on('response',r=>{try{const u=new URL(r.url()),b=new URL(base);if(u.origin===b.origin&&r.status()>=400)errors.push(`http ${r.status()} ${u.pathname}`);}catch{}});
  return errors;
}
const viewports=[{width:360,height:800},{width:768,height:1024},{width:1366,height:768},{width:1920,height:1080}];

try{
  for(const viewport of viewports){
    await check(`ospf guide ${viewport.width}x${viewport.height}`,async()=>{
      const page=await browser.newPage({viewport}),errors=errorsFor(page);
      try{
        const response=await page.goto(base+'/labs/ospf.html',{waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        const body=await readLearningText(page);
        assert.ok(body.includes('Hello → Neighbor → LSA / LSDB → SPF'));
        assert.ok(body.includes('R1 → R2 → R3 = Cost 21'));
        assert.ok(body.includes('EXSTART'));
        assert.equal(await page.locator('.cg-primary[href="ospf-simulator.html"]').count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'guide horizontal document overflow');
        assert.deepEqual(errors,[]);
      }finally{await page.close();}
    });

    await check(`ospf simulator ${viewport.width}x${viewport.height}`,async()=>{
      const page=await browser.newPage({viewport}),errors=errorsFor(page);
      try{
        const response=await page.goto(base+'/labs/ospf-simulator.html',{waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        assert.equal(await page.locator('.lesson-tab').count(),6);
        assert.equal(await page.locator('#runBtn').isDisabled(),true);
        assert.equal(await page.locator('.choice').count(),3);
        for(const id of ['r1','r2','r3','link12','link23','link13','adj12','adj23','adj13']) assert.equal(await page.locator('#'+id).count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'simulator horizontal document overflow');
        if(viewport.width===360) assert.equal(await page.locator('.topology-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),true);
        assert.deepEqual(errors,[]);
      }finally{await page.close();}
    });
  }

  await check('ospf six-claim flow and recovery gates',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=errorsFor(page);
    try{
      await page.goto(base+'/labs/ospf-simulator.html',{waitUntil:'networkidle'});

      await page.locator('.choice').nth(0).click();
      await page.locator('#runBtn').click();
      assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
      assert.ok((await page.locator('#eventKind').innerText()).includes('HELLO'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('1 / 6'));

      await page.locator('.lesson-tab').nth(1).click();
      await page.locator('.choice').nth(0).click();
      await page.locator('#runBtn').click();
      assert.equal(await page.locator('.lsa.active').count(),3);
      assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));

      await page.locator('.lesson-tab').nth(2).click();
      await page.locator('.choice').nth(0).click();
      await page.locator('#runBtn').click();
      assert.ok((await page.locator('#link12').getAttribute('class')).includes('selected'));
      assert.ok((await page.locator('#link23').getAttribute('class')).includes('selected'));
      assert.ok((await page.locator('#link13').getAttribute('class')).includes('backup'));
      assert.ok((await page.locator('#routePanel').innerText()).includes('Metric 21'));

      await page.locator('.lesson-tab').nth(3).click();
      await page.locator('.choice').nth(1).click();
      await page.locator('#runBtn').click();
      assert.ok((await page.locator('#adj12').innerText()).includes('NO NEIGHBOR'));
      assert.ok((await page.locator('#link13').getAttribute('class')).includes('selected'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('3 / 6'),'area fault is not complete before recovery');
      await page.locator('#recoverBtn').click();
      assert.equal(await page.locator('#adj12').innerText(),'FULL');
      assert.ok((await page.locator('#routePanel').innerText()).includes('Metric 21'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));

      await page.locator('.lesson-tab').nth(4).click();
      await page.locator('.choice').nth(1).click();
      await page.locator('#runBtn').click();
      assert.equal(await page.locator('#adj12').innerText(),'EXSTART');
      assert.ok((await page.locator('#neighborPanel').innerText()).includes('1400 / 1500'));
      assert.ok((await page.locator('#scopeNote').innerText()).includes('MTU'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));
      await page.locator('#recoverBtn').click();
      assert.equal(await page.locator('#adj12').innerText(),'FULL');
      assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));

      await page.locator('.lesson-tab').nth(5).click();
      await page.locator('.choice').nth(1).click();
      await page.locator('#runBtn').click();
      assert.equal(await page.locator('#adj12').innerText(),'DOWN');
      assert.ok((await page.locator('#routePanel').innerText()).includes('Metric 51'));
      assert.ok((await page.locator('#link13').getAttribute('class')).includes('selected'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));
      await page.locator('#recoverBtn').click();
      assert.equal(await page.locator('#adj12').innerText(),'FULL');
      assert.ok((await page.locator('#routePanel').innerText()).includes('Metric 21'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('6 / 6'));
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });

  await check('ospf reset gate and reduced motion',async()=>{
    const page=await browser.newPage({viewport:{width:360,height:800}}),errors=errorsFor(page);
    try{
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.goto(base+'/labs/ospf-simulator.html',{waitUntil:'networkidle'});
      await page.locator('.lesson-tab').nth(2).click();
      assert.equal(await page.locator('#runBtn').isDisabled(),true);
      await page.locator('.choice').nth(0).click();
      await page.locator('#runBtn').click();
      const animation=await page.locator('#link12').evaluate(el=>getComputedStyle(el).animationName);
      assert.equal(animation,'none');
      await page.locator('#resetBtn').click();
      assert.equal(await page.locator('#runBtn').isDisabled(),true);
      assert.equal(await page.locator('#feedback').isVisible(),false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(await page.locator('.topology-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),true);
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });
}finally{
  await browser.close();
  if(server)await new Promise(r=>server.close(r));
}

console.log(JSON.stringify({assertions,failures},null,2));
assert.equal(failures.length,0,JSON.stringify(failures,null,2));
