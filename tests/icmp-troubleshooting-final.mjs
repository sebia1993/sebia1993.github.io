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
const pages=[
  ['guide','/labs/icmp-troubleshooting.html'],
  ['simulator','/labs/icmp-troubleshooting-simulator.html'],
  ['validation','/learning/foundations/icmp-troubleshooting/cisco-validation-2026-10-03.html']
];

try{
  for(const viewport of viewports){
    for(const [name,path] of pages){
      await check(`${name} ${viewport.width}x${viewport.height}`,async()=>{
        const page=await browser.newPage({viewport}),errors=errorsFor(page);
        try{
          const response=await page.goto(base+path,{waitUntil:'networkidle'});
          assert.equal(response.status(),200);
          assert.ok((await page.locator('body').innerText()).length>250);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal document overflow');
          if(name==='guide'){
            const body=await page.locator('body').innerText();
            assert.ok(body.includes('Ping은 “응답이 돌아오는가”'));
            assert.ok(body.includes('Code 0 · Network Unreachable'));
            assert.ok(body.includes('Code 1 · Host Unreachable'));
            assert.equal(await page.locator('a[href="icmp-troubleshooting-simulator.html"]').count(),1);
          }
          if(name==='simulator'){
            assert.equal(await page.locator('.lesson-tab').count(),5);
            assert.equal(await page.locator('#runBtn').isDisabled(),true);
            assert.equal(await page.locator('#choices .choice').count(),3);
            assert.equal(await page.locator('#summaryPanel').isVisible(),false);
          }
          if(name==='validation'){
            const body=await page.locator('body').innerText();
            assert.ok(body.includes('4 PASS / 1 FAIL'));
            assert.ok(body.includes('ORIGINAL FAIL'));
            assert.ok(body.includes('RESOLVED IMPLEMENTATION DIFFERENCE'));
          }
          assert.deepEqual(errors,[]);
        }finally{await page.close();}
      });
    }
  }

  await check('five-question sequential flow with wrong answer and retry',async()=>{
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=errorsFor(page);
    try{
      await page.goto(base+'/labs/icmp-troubleshooting-simulator.html',{waitUntil:'networkidle'});
      const answers=['reply','255','time','time','host'];
      const expectedVerdicts=['✓ 정답입니다','✕ 오답입니다','✓ 정답입니다','✓ 정답입니다','✓ 정답입니다'];
      for(let i=0;i<5;i++){
        assert.equal(await page.locator('#runBtn').isDisabled(),true,'run must require prediction');
        await page.locator(`#choices [data-choice="${answers[i]}"]`).click();
        assert.equal(await page.locator('#runBtn').isEnabled(),true);
        await page.locator('#runBtn').click();
        assert.equal(await page.locator('#feedbackBadge').innerText(),expectedVerdicts[i]);
        assert.equal(await page.locator('#observation').isVisible(),true);
        const beforeCount=await page.locator('#courseCount').innerText();
        const currentStep=await page.locator('#stepCount').innerText();
        if(!currentStep.startsWith('1 /')){
          await page.locator('#prevStepBtn').click();
          assert.notEqual(await page.locator('#stepCount').innerText(),currentStep);
          assert.equal(await page.locator('#courseCount').innerText(),beforeCount,'manual replay must not change grading');
        }
        await page.locator('#nextLessonBtn').click();
        if(i<4) assert.equal(await page.locator('#coachIcon').innerText(),String(i+2));
      }
      assert.equal(await page.locator('#summaryPanel').isVisible(),true);
      assert.equal(await page.locator('#submittedCount').innerText(),'5');
      assert.equal(await page.locator('#correctCount').innerText(),'4');
      assert.equal(await page.locator('#wrongCount').innerText(),'1');
      assert.equal(await page.locator('#pendingCount').innerText(),'0');
      assert.equal(await page.locator('.summary-card.incorrect').count(),1);
      assert.equal(await page.locator('.summary-card.correct').count(),4);

      await page.locator('[data-review="1"]').click();
      assert.equal(await page.locator('#coachIcon').innerText(),'2');
      assert.equal(await page.locator('#feedbackBadge').innerText(),'✕ 오답입니다');
      await page.locator('#retryBtn').click();
      assert.equal(await page.locator('#runBtn').isDisabled(),true);
      await page.locator('#choices [data-choice="254"]').click();
      await page.locator('#runBtn').click();
      assert.equal(await page.locator('#feedbackBadge').innerText(),'✓ 정답입니다');
      await page.locator('#nextLessonBtn').click();
      assert.equal(await page.locator('#summaryPanel').isVisible(),true);
      assert.equal(await page.locator('#correctCount').innerText(),'5');
      assert.equal(await page.locator('#wrongCount').innerText(),'0');
      assert.equal(await page.locator('.summary-card.correct').count(),5);
      assert.deepEqual(errors,[]);
    }finally{await page.close();}
  });

  await check('360px quick action and details access',async()=>{
    const page=await browser.newPage({viewport:{width:360,height:800}}),errors=errorsFor(page);
    try{
      await page.goto(base+'/labs/icmp-troubleshooting-simulator.html',{waitUntil:'networkidle'});
      await page.locator('#choices [data-choice="reply"]').click();
      assert.equal(await page.locator('#quickNext').isVisible(),true);
      assert.ok((await page.locator('#quickBtn').innerText()).includes('실행'));
      await page.locator('.scope-details summary').click();
      assert.equal(await page.locator('.scope-details').evaluate(el=>el.open),true);
      assert.equal(await page.locator('.scope-details a').count(),1);
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