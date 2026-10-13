/** Post-deploy smoke audit, also runnable against a temporary local server.
 * BASE_URL=https://sebia1993.github.io BROWSER_EXECUTABLE=/path/chromium node tests/public-roadmap-audit.mjs
 * QA_PROXY_PRIVATE_CA=1 is an explicit opt-in for a known private proxy CA only.
 * This does not run real equipment or revalidate the historical domain evidence.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
import {finishPlayback} from './roadmap-playback-assertions.mjs';
import {lessons as ipLessons} from '../labs/ip-subnetting-model.js';
import {scenarios as physicalScenarios} from '../labs/physical-network-model.js';

const root=resolve(import.meta.dirname,'..');
const fixtures=JSON.parse(await readFile(resolve(root,'tests/fixtures/roadmap-simulator-models.json'),'utf8'));
const expectedVersion=process.env.LAB_UI_VERSION||'20261013-audit-v1';
const viewports=[[360,800],[768,1024],[1366,768],[1920,1080]];
const output=resolve(process.env.PUBLIC_AUDIT_OUTPUT||resolve(root,'test-results/public-roadmap-audit'));
await mkdir(output,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){
  server=createServer(async(req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
      const file=resolve(root,'.'+pathname);
      if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
      res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream'));
      res.setHeader('Cache-Control','no-store');res.end(await readFile(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
}
base=base.replace(/\/$/,'');
const remote=!['localhost','127.0.0.1','[::1]'].includes(new URL(base).hostname);
const proxyURL=remote&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);
let proxy;
if(proxyURL){const u=new URL(proxyURL);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
const privateProxyCA=Boolean(proxy)&&process.env.QA_PROXY_PRIVATE_CA==='1';
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'],...(proxy?{proxy}:{})});
async function newContext(){
  const context=await browser.newContext({viewport:{width:1366,height:768},ignoreHTTPSErrors:privateProxyCA});
  context.setDefaultTimeout(15000);context.setDefaultNavigationTimeout(remote?60000:20000);return context;
}
const context=await newContext();
const report={target:remote?'public':'local',base,checkedAt:new Date().toISOString(),browser:browser.version(),expectedVersion,transport:{proxy:Boolean(proxy),privateProxyCA},classification:'Browser teaching-simulation regression',hardware:'NOT_RUN',assetContentHashes:'NOT_RUN_SEPARATE_DEPLOYMENT_GATE',checks:0,pages:[],failures:[],totals:{topics:0,pages:0,viewportChecks:0,commonLabs:0,rawScenarios:0,representativeRuns:0}};
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);report.checks++;};
const ok=(a,label)=>{assert.ok(a,label);report.checks++;};
const save=()=>writeFile(resolve(output,remote?'public.json':'local.json'),JSON.stringify(report,null,2));
const urlFor=path=>new URL(path,base+'/').href;
function watch(page){
  const errors=[];
  page.on('pageerror',e=>errors.push({kind:'pageerror',message:e.message}));
  page.on('response',r=>{if(new URL(r.url()).origin===new URL(base).origin&&r.status()>=400)errors.push({kind:'asset-http',status:r.status(),url:r.url()});});
  page.on('requestfailed',r=>{if(r.url().startsWith(base+'/'))errors.push({kind:'asset-network',url:r.url(),message:r.failure()?.errorText});});
  return errors;
}
async function layoutMatrix(page,row){
  for(const [width,height] of viewports){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const dimensions=await page.evaluate(()=>({client:innerWidth,document:document.documentElement.scrollWidth}));
    eq(dimensions.document<=dimensions.client+1,true,`${row.topic} ${row.kind} ${width}px document overflow: ${dimensions.document}px`);
    row.viewports.push({width,height,status:'PASS'});report.totals.viewportChecks++;
  }
  await page.setViewportSize({width:1366,height:768});
  eq(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length===new Set(ids).size;}),true,'unique DOM IDs');
}
async function stpResizeRegression(page,row){
  row.resizeRegression=[];
  for(const [width,height] of [[1366,768],[360,800],[768,1024],[1366,768]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const geometry=await page.evaluate(()=>{
      const stage=document.querySelector('#topologyStage').getBoundingClientRect();
      const outside=[...document.querySelectorAll('#topologyStage .stp-node,#topologyStage .link-label')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width&&(r.left<stage.left-1||r.right>stage.right+1||r.top<stage.top-1||r.bottom>stage.bottom+1);
      }).map(e=>e.id);
      return {document:document.documentElement.scrollWidth,viewport:innerWidth,outside};
    });
    eq(geometry.document<=geometry.viewport+1,true,'STP real-clock resize document remains contained');
    eq(geometry.outside,[],'STP resized device and label coordinates remain inside stage');
    row.resizeRegression.push({width,height,status:'PASS'});
  }
}
async function initial(page,topic){
  const common=Boolean(fixtures[topic]);
  if(common)await page.waitForFunction(()=>window.networkLessonModel?.length&&document.querySelectorAll('#simOptions button').length);
  else if(topic==='arp-default-gateway')await page.waitForFunction(()=>window.__arpMobileFollowLoadedV2&&document.querySelectorAll('[data-prediction]').length);
  else await page.locator('[data-prediction]').first().waitFor();
  const run=common?'#simRun':topic==='arp-default-gateway'?'#pingBtn':'#runBtn';
  const result=common?'#simResult':topic==='arp-default-gateway'||topic==='ethernet-mac-table'?'#predictionFeedback':'#resultArea';
  eq(await page.locator(run).isDisabled(),true,'initial prediction gate');
  eq(await page.locator(result).isVisible(),false,'no initial grading');
  return {gate:'PASS',resultHidden:'PASS'};
}
async function beginClock(page){await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));}
async function finishStandalone(page,owner){
  for(let i=0;i<100;i++){if(await page.locator(owner).getAttribute('data-state')==='COMPLETED')return;await page.clock.runFor(1000);}
  throw Error(owner+' did not complete');
}
async function commonFlow(page,topic,row){
  eq(await page.locator('meta[name="lab-ui-version"]').getAttribute('content'),expectedVersion,'common UI version');
  const data=await page.evaluate(()=>({raw:window.networkLessonSource,lessons:window.networkLessonModel}));
  eq(createHash('sha256').update(JSON.stringify(data.raw)).digest('hex'),fixtures[topic].hash,'original scenario/evidence fixture hash');
  eq(data.raw.length,data.lessons.length,'one presentation per original scenario');
  row.rawScenarios=data.raw.length;row.rawHash='PASS';report.totals.rawScenarios+=data.raw.length;report.totals.commonLabs++;
  await beginClock(page);
  const last=data.lessons.length-1,lesson=data.lessons[last];
  await page.locator(`[data-lesson="${last}"]`).click();
  const answer=lesson.choices.findIndex(([key])=>key===lesson.correctKey);ok(answer>=0,'last scenario has correct choice');
  await page.locator('#simOptions button').nth(answer).click();await page.locator('#simRun').click();
  eq(await page.locator('#simResult').isVisible(),false,'no grading during playback');
  await finishPlayback(page,{eq});report.totals.representativeRuns++;
  eq(await page.locator('#simVerdict').innerText(),'✓ 정답입니다','last-only correct grade');
  eq(await page.locator('#simCount').innerText(),`1 / ${data.lessons.length} 완료`,'last-only completion count');
  await page.locator('#simNext').click();
  eq(await page.locator('#simSummary').isVisible(),false,'last-only cannot open course summary');
  eq(await page.locator('#simNumber').innerText(),'1','Next wraps to first unfinished scenario');
  eq(await page.locator('#simRun').isDisabled(),true,'new question requires its own prediction');
  row.flow='last-only → correct result → first unfinished';
}
async function standaloneFlow(page,topic,row){
  await beginClock(page);
  if(topic==='ip-subnetting'){
    const i=ipLessons.length-1;await page.locator(`[data-lesson="${i}"]`).click();
    await page.locator(`[data-prediction="${ipLessons[i].answer}"]`).click();await page.locator('#runBtn').click();
    await finishStandalone(page,'#ipLab');report.totals.representativeRuns++;
    eq(await page.locator('#verdictTitle').innerText(),'✓ 정답입니다','IP last-only grade');
    eq(await page.locator('#courseCount').innerText(),'1 / 7 완료','IP one observed');
    await page.locator('#nextBtn').click();eq(await page.locator('#courseComplete').isVisible(),false,'IP no premature summary');
    eq(await page.locator('[data-lesson="0"]').getAttribute('aria-current'),'step','IP Next unfinished');
    row.flow='last-only → first unfinished';
  }else if(topic==='ethernet-mac-table'){
    await page.locator('[data-lesson="4"]').click();eq(await page.locator('#ageBtn').isEnabled(),false,'Aging cannot bypass prediction');
    await page.locator('[data-prediction="flood"]').click();await page.locator('#runBtn').click();
    await finishStandalone(page,'#macLab');report.totals.representativeRuns++;
    ok((await page.locator('#predictionFeedback').innerText()).includes('예상이 맞았습니다.'),'Aging correct result');
    ok((await page.locator('#eventTimeline').innerText()).includes('FDB Aging'),'one run includes Aging');
    ok((await page.locator('#switchAction').innerText()).includes('Known'),'one run ends at Known Unicast');
    eq(await page.locator('#courseCount').innerText(),'1 / 5 완료','Aging only completes one question');
    await page.locator('#nextBtn').click();eq(await page.locator('#courseComplete').isVisible(),false,'Ethernet no premature summary');
    row.flow='prediction → Aging → flood → relearn → Known';
  }else if(topic==='physical-network'){
    await page.locator(`[data-prediction="${physicalScenarios[0].answer}"]`).click();await page.locator('#runBtn').click();
    await finishStandalone(page,'#physicalLab');report.totals.representativeRuns++;
    ok((await page.locator('#verdictTitle').innerText()).includes('정답입니다'),'physical normal grade');
    ok((await page.locator('#ap1Status').innerText()).includes('정상'),'physical normal state observed');
    const count=await page.locator('#courseCount').innerText();await page.locator('#playbackBtn').click();await finishStandalone(page,'#physicalLab');
    eq(await page.locator('#courseCount').innerText(),count,'physical Replay no duplicate completion');
    row.flow='normal prediction → result → Replay';
  }else if(topic==='arp-default-gateway'){
    for(const [i,answer] of [[2,'badgw'],[4,'noreply']]){
      await page.locator(`[data-lesson="${i}"]`).click();await page.locator(`[data-prediction="${answer}"]`).click();await page.locator('#pingBtn').click();
      await page.clock.runFor(40000);report.totals.representativeRuns++;
      eq(await page.evaluate(()=>state.busy),false,'ARP failure playback complete');
      eq(await page.evaluate(()=>state.last.ok),false,'ARP expected failure observed');
      eq(await page.evaluate(()=>checklistState().map(x=>Boolean(x[2]))),[true,false,false],'failure does not claim recovery or successful re-Ping');
      ok((await page.locator('#verdictBox').innerText()).includes('개념 확인 완료'),'ARP failure concept only');
    }
    await page.locator('[data-lesson="0"]').click();await page.locator('[data-prediction="pc3"]').click();await page.locator('#pingBtn').click();
    await page.clock.runFor(1600);await page.locator('#resetBtn').click();await page.clock.runFor(40000);
    eq(await page.evaluate(()=>state.last===null&&!state.busy&&!state.completed[0]&&state.snapshots.length===0),true,'ARP Reset cancels old run');
    eq(await page.locator('#pingBtn').isDisabled(),true,'ARP Reset requires prediction');
    row.flow='two failure cases keep recovery pending; in-flight Reset';
  }else throw Error('Missing standalone coverage: '+topic);
}

try{
  const manifest=await context.request.get(urlFor('learning-data.json'));eq(manifest.status(),200,'learning-data HTTP status');
  const data=await manifest.json(),topics=data.topics.filter(t=>t.status==='completed'||t.contentStatus==='completed');
  eq(topics.length,26,'published completed topic inventory');report.totals.topics=topics.length;
  for(const topic of topics){
    for(const kind of ['concept','lab']){
      const path=kind==='concept'?topic.detailUrl:`labs/${topic.id}-simulator.html`;
      const row={topic:topic.id,kind,url:urlFor(path),status:'PASS',viewports:[]};
      // Playwright's virtual clock affects the whole browser context. Each URL
      // gets a fresh context so the previous lab cannot freeze its layout RAF.
      const pageContext=await newContext(),page=await pageContext.newPage(),errors=watch(page),before=report.checks;
      try{
        if(kind==='lab'&&topic.id==='stp')await page.setViewportSize({width:360,height:800});
        const response=await page.goto(row.url,{waitUntil:'networkidle'});eq(response.status(),200,'page HTTP status');row.httpStatus=response.status();
        if(kind==='lab')row.initial=await initial(page,topic.id);
        ok((await page.locator('body').innerText()).length>200,'page content initialized');
        await layoutMatrix(page,row);
        if(kind==='lab'&&topic.id==='stp')await stpResizeRegression(page,row);
        if(kind==='lab'){
          if(fixtures[topic.id])await commonFlow(page,topic.id,row);else await standaloneFlow(page,topic.id,row);
          eq(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'post-interaction document overflow');
        }
        eq(errors,[],'page and asset errors');
      }catch(error){row.status='FAIL';row.error=error.stack;report.failures.push({topic:topic.id,kind,message:error.message});}
      finally{row.errors=errors;row.checks=report.checks-before;report.pages.push(row);report.totals.pages++;await pageContext.close();await save();}
      console.log(`${row.status} ${topic.id} ${kind} (${row.viewports.length} viewports)`);
    }
  }
  eq(report.totals.pages,52,'all concept/lab URLs checked');
  eq(report.totals.viewportChecks,208,'all four viewport resizes checked');
  eq(report.totals.commonLabs,22,'all common controller consumers');
  eq(report.totals.rawScenarios,120,'all original common scenarios covered by raw hashes');
}catch(error){report.failures.push({kind:'audit',message:error.stack});}
finally{
  report.status=report.failures.length?'FAIL':'PASS';report.finishedAt=new Date().toISOString();await save();
  await context.close();await browser.close();if(server)await new Promise(r=>server.close(r));
}
console.log(JSON.stringify({status:report.status,checks:report.checks,totals:report.totals,failures:report.failures,report:resolve(output,remote?'public.json':'local.json')}));
assert.equal(report.failures.length,0,'Roadmap public/local audit failures');
