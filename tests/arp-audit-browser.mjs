import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=resolve(process.env.ARP_AUDIT_OUTPUT||resolve(root,'test-results/arp-audit'));
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
    const file=resolve(root,'.'+pathname);
    if(!file.startsWith(root)){res.writeHead(403).end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html; charset=utf-8','.css':'text/css','.svg':'image/svg+xml'}[extname(file)]||'text/plain'));
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
const url=`http://127.0.0.1:${server.address().port}/labs/arp-default-gateway-simulator.html`;
const errors=[],results=[];
async function finished(page){
  await page.clock.runFor(40000);
  assert.equal(await page.evaluate(()=>state.busy),false);
  assert.equal(await page.locator('#pingBtn').isEnabled(),true);
}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
try{
  for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]].filter(([w])=>!process.env.ARP_AUDIT_VIEWPORT||w===Number(process.env.ARP_AUDIT_VIEWPORT))){
    let allFive=null,realTempoMs=null;
    const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(`${width}: ${e.message}`));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
    await page.goto(url,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__arpMobileFollowLoadedV2);
    assert.equal(await page.locator('#pingBtn').isDisabled(),true);
    assert.equal(await page.locator('.hero a[href="arp-default-gateway.html"]').isVisible(),true);
    assert.equal(await page.locator('#mobileFollowToggle').innerText(),'OFF');
    await noOverflow(page);
    await page.screenshot({path:resolve(out,`initial-${width}.png`),fullPage:true});
    await page.locator(width<=720?'#mobileTopology':'#topology').screenshot({path:resolve(out,`topology-${width}.png`)});
    await page.clock.install();

    await page.locator('[data-lesson="2"]').click();
    await page.locator('[data-prediction="badgw"]').click();
    await page.locator('#pingBtn').click();
    await finished(page);
    assert.deepEqual(await page.evaluate(()=>checklistState().map(x=>x[2])),[true,false,false]);
    assert.equal(await page.evaluate(()=>state.last.ok),false);
    assert.match(await page.locator('#verdictBox').innerText(),/개념 확인 완료/);
    await page.locator('#predictionFeedback').screenshot({path:resolve(out,`failure-${width}.png`)});

    await page.locator('[data-view-mode="advanced"]').click();
    await page.locator('#advancedPanel > summary').click();
    await page.locator('#gwInput').fill('192.168.10.1');
    await page.locator('#applyBtn').click();
    assert.deepEqual(await page.evaluate(()=>checklistState().map(x=>x[2])),[true,true,false]);
    assert.equal(await page.evaluate(()=>state.predictionChoice),null);
    assert.equal(await page.locator('#predictionFeedback').isVisible(),false);
    await page.locator('#pingBtn').click();await finished(page);
    assert.equal(await page.evaluate(()=>state.last.ok&&state.recovered[2]),true);
    await noOverflow(page);
    await page.locator('#checkList').screenshot({path:resolve(out,`recovery-${width}.png`)});

    await page.locator('#resetBtn').click();
    await page.locator('[data-view-mode="basic"]').click();
    assert.equal(await page.evaluate(()=>state.completed[2]||state.recovered[2]||state.failureSeen[2]),false);
    assert.equal(await page.locator('#predictionFeedback').isVisible(),false);
    assert.equal(await page.locator('#pingBtn').isDisabled(),true);

    // A destination change cancels the current animation and removes its answer.
    await page.locator('[data-lesson="0"]').click();
    if(width>720)await page.locator('[data-view-mode="advanced"]').click();
    await page.locator('[data-prediction="pc3"]').click();await page.locator('#pingBtn').click();
    await page.clock.runFor(800);
    await page.locator(width<=720?'[data-m-dest="pc2"]':'.dest-btn[data-dest="pc2"]').click();
    await page.clock.runFor(40000);
    assert.equal(await page.evaluate(()=>state.last),null);
    assert.equal(await page.evaluate(()=>state.experiment&&!state.predictionChoice&&!state.busy),true);
    await page.locator('#pingBtn').click();await finished(page);
    assert.equal(await page.evaluate(()=>state.last.ok&&!state.completed[0]&&!state.answers[0]),true);
    assert.equal(await page.locator('#predictionFeedback').isVisible(),false);

    // Reset while running remains reset beyond the old run's full duration.
    await page.locator('#resetBtn').click();
    await page.locator('[data-view-mode="basic"]').click();
    await page.locator('[data-prediction="pc3"]').click();await page.locator('#pingBtn').click();
    await page.clock.runFor(1600);await page.locator('#resetBtn').click();await page.clock.runFor(40000);
    assert.equal(await page.evaluate(()=>state.last===null&&!state.busy&&!state.completed[0]&&state.snapshots.length===0),true);
    assert.equal(await page.locator('#pingBtn').isDisabled(),true);
    await noOverflow(page);
    if(width===1366){
      await page.locator('[data-lesson="1"]').click();
      await page.locator('[data-view-mode="advanced"]').click();
      await page.locator('#advancedPanel > summary').click();
      await page.locator('[data-prediction="gw"]').click();await page.locator('#pingBtn').click();
      await page.clock.runFor(1500);
      await page.locator('#gwInput').fill('192.168.10.254');await page.locator('#applyBtn').click();
      await page.clock.runFor(40000);
      assert.equal(await page.evaluate(()=>state.last===null&&!state.busy&&!state.predictionChoice&&state.experiment),true);
      await page.locator('[data-lesson="0"]').click();
      await page.locator('[data-prediction="pc3"]').click();await page.locator('#pingBtn').click();
      await page.clock.runFor(1600);await page.locator('[data-lesson="4"]').click();await page.clock.runFor(40000);
      assert.equal(await page.evaluate(()=>state.lesson===4&&state.last===null&&!state.busy&&!state.completed[0]&&!state.failureSeen[4]),true);
      await page.locator('[data-view-mode="basic"]').click();
      await page.locator('[data-lesson="0"]').click();

      // Complete every basic lesson through the real UI; no repair is performed.
      const choices=['pc3','gw','badgw','pc2','noreply'];
      allFive=[];
      for(let i=0;i<choices.length;i++){
        await page.locator(`[data-lesson="${i}"]`).click();
        await page.locator('#resetBtn').click();
        await page.locator(`[data-prediction="${choices[i]}"]`).click();
        await page.locator('#pingBtn').click();await finished(page);
        const observed=await page.evaluate(()=>({lesson:state.lesson,ok:state.last.ok,correct:state.answers[state.lesson]?.correct,completed:state.completed.filter(Boolean).length,recovered:state.recovered.filter(Boolean).length,checks:checklistState().map(x=>x[2])}));
        assert.equal(observed.lesson,i);assert.equal(observed.ok,i<2);
        assert.equal(observed.correct,true);assert.equal(observed.completed,i+1);assert.equal(observed.recovered,0);
        if(i>=2)assert.deepEqual(observed.checks,[true,false,false]);
        assert.match(await page.locator('#predictionFeedback').innerText(),/예상이 맞았습니다/);
        assert.equal(await page.locator('#courseCount').innerText(),`${i+1} / 5 완료`);
        allFive.push(observed);
      }
      assert.equal(await page.locator('#courseComplete').isVisible(),true);
      const courseCopy=await page.locator('#completionSummary').innerText();
      assert.match(courseCopy,/선택 복구 실습: 0 \/ 3/);
      assert.doesNotMatch(courseCopy,/직접 확인하고 복구했습니다|모두 복구/);
      await page.locator('#courseComplete').screenshot({path:resolve(out,'all-five-complete-1366.png')});

      // One unaccelerated browser run verifies that the approved animation tempo
      // remains a real progression, independently of the virtual-clock sweep.
      const realContext=await browser.newContext({viewport:{width,height}});
      const realPage=await realContext.newPage();
      realPage.on('pageerror',e=>errors.push(`real-tempo: ${e.message}`));
      await realPage.goto(url,{waitUntil:'networkidle'});
      await realPage.waitForFunction(()=>window.__arpMobileFollowLoadedV2);
      await realPage.locator('[data-prediction="pc3"]').click();
      await realPage.locator('#pingBtn').click();const started=Date.now();
      assert.equal(await realPage.evaluate(()=>state.busy),true);
      await realPage.waitForFunction(()=>!state.busy&&state.last?.ok,null,{timeout:60000});
      realTempoMs=Date.now()-started;
      assert.ok(realTempoMs>5000&&realTempoMs<60000,`unaccelerated animation ${realTempoMs}ms`);
      assert.equal(await realPage.evaluate(()=>state.answers[0].correct&&state.completed[0]),true);
      await realContext.close();
      await page.locator('[data-lesson="0"]').click();await page.locator('#resetBtn').click();
    }
    const names=await page.locator(width<=720?'#mobileTopology':'#topology').textContent();
    for(const name of ['PC A','PC B','PC C','Router B','Switch A','Switch B'])assert.ok(names.includes(name),name);
    assert.doesNotMatch(names,/\b(?:PC[123]|R2|SW[12])\b/);
    await page.screenshot({path:resolve(out,`reset-${width}.png`),fullPage:true});
    results.push({width,height,initial:true,failure:true,recovery:true,conditionInvalidation:true,cancel:true,overflow:false,autoFollow:'OFF',...(allFive?{allFive,realTempoMs}: {})});
    await context.close();
  }
  assert.deepEqual(errors,[]);
  await writeFile(resolve(out,'results.json'),JSON.stringify({results,errors},null,2));
  console.log(JSON.stringify({results,errors,output:out},null,2));
}finally{
  await browser.close();await new Promise(r=>server.close(r));
}
