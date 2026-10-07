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
    await check(`acl guide ${viewport.width}x${viewport.height}`,async()=>{
      const page=await browser.newPage({viewport}),errors=errorsFor(page);
      try{
        const response=await page.goto(base+'/labs/acl.html',{waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        const body=await readLearningText(page);
        assert.ok(body.includes('First Match'));
        assert.ok(body.includes('Implicit Deny'));
        assert.ok(body.includes('ORIGINAL EXPECTED · FAIL PRESERVED'));
        assert.ok(body.includes('Echo Request만 Deny'));
        assert.equal(await page.locator('.cg-primary[href="acl-simulator.html"]').count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'guide horizontal document overflow');
        assert.deepEqual(errors,[]);
      }finally{await page.close();}
    });

    await check(`acl simulator ${viewport.width}x${viewport.height}`,async()=>{
      const page=await browser.newPage({viewport}),errors=errorsFor(page);
      try{
        const response=await page.goto(base+'/labs/acl-simulator.html',{waitUntil:'networkidle'});
        assert.equal(response.status(),200);
        assert.equal(await page.locator('.lesson-tab').count(),6);
        assert.equal(await page.locator('#runBtn').isDisabled(),true);
        assert.equal(await page.locator('.choice').count(),3);
        for(const id of ['r1','r2','r3','link12','link23','policyMeta','aceList','resultBox']) assert.equal(await page.locator('#'+id).count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'simulator horizontal document overflow');
        if(viewport.width===360) assert.equal(await page.locator('.topology-scroll').evaluate(el=>el.scrollWidth>el.clientWidth),true);
        assert.deepEqual(errors,[]);
      }finally{await page.close();}
    });
  }

  await check('acl six-claim interaction with compare and recovery gates',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=errorsFor(page);
    try{
      await page.goto(base+'/labs/acl-simulator.html',{waitUntil:'networkidle'});

      // ACL-01
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.equal(await page.locator('#feedbackBadge').innerText(),'예상 적중');
      assert.ok((await page.locator('#resultBox').innerText()).includes('ICMP STOP'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('1 / 6'));

      // ACL-02
      await page.locator('.lesson-tab').nth(1).click();
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.ok((await page.locator('#resultBox').innerText()).includes('TCP/23 STOP'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));

      // ACL-03 must compare order before complete
      await page.locator('.lesson-tab').nth(2).click();
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.ok((await page.locator('#eventKind').innerText()).includes('FIRST MATCH A'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('2 / 6'));
      await page.locator('#compareBtn').click();
      assert.ok((await page.locator('#eventKind').innerText()).includes('FIRST MATCH B'));
      assert.ok((await page.locator('#aceList').innerText()).includes('+0'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('3 / 6'));

      // ACL-04
      await page.locator('.lesson-tab').nth(3).click();
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.ok((await page.locator('#aceList').innerText()).includes('implicit deny'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));

      // ACL-05 wrong vs correct direction
      await page.locator('.lesson-tab').nth(4).click();
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.ok((await page.locator('#policyMeta').innerText()).includes('OUT'));
      assert.ok((await page.locator('#resultBox').innerText()).includes('Ping 3/3'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('4 / 6'));
      await page.locator('#compareBtn').click();
      assert.ok((await page.locator('#policyMeta').innerText()).includes('IN'));
      assert.ok((await page.locator('#resultBox').innerText()).includes('Ping 0/3'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));

      // ACL-06 corrected one-way -> bidirectional -> recovery
      await page.locator('.lesson-tab').nth(5).click();
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
      assert.ok((await page.locator('#resultBox').innerText()).includes('Forward 0/3 · Reverse 3/3'));
      assert.ok((await page.locator('#scopeNote').innerText()).includes('원래 FAIL 보존'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));
      await page.locator('#compareBtn').click();
      assert.ok((await page.locator('#resultBox').innerText()).includes('Reverse 0/3'));
      assert.equal(await page.locator('#recoverBtn').isVisible(),true);
      assert.ok((await page.locator('#progressCount').innerText()).includes('5 / 6'));
      await page.locator('#recoverBtn').click();
      assert.ok((await page.locator('#resultBox').innerText()).includes('Forward 3/3 · Reverse 3/3'));
      assert.ok((await page.locator('#progressCount').innerText()).includes('6 / 6'));
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });

  await check('acl reset gate and reduced motion',async()=>{
    const page=await browser.newPage({viewport:{width:360,height:800}}),errors=errorsFor(page);
    try{
      await page.emulateMedia({reducedMotion:'reduce'});
      await page.goto(base+'/labs/acl-simulator.html',{waitUntil:'networkidle'});
      await page.locator('.choice').nth(0).click(); await page.locator('#runBtn').click();
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
