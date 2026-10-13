// Browser regression for the standalone IP and Ethernet playback owners.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {lessons} from '../labs/ip-subnetting-model.js';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'test-results/stage0-standalone');await mkdir(out,{recursive:true});
let server,base=process.env.BASE_URL;
if(!base){server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://x').pathname;res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'}[extname(name)]||'text/plain'));res.end(await readFile(root+name));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],results=[];let checks=0;
const eq=(value,expected,label)=>{assert.deepEqual(value,expected,label);checks++;};
async function finish(p,owner){for(let i=0;i<100;i++){if(await p.locator(owner).getAttribute('data-state')==='COMPLETED')return;await p.clock.runFor(1000);}throw new Error(owner+' did not complete');}
async function layout(p){eq(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no document overflow');}
async function pauseCheck(p,owner,visual){await p.clock.runFor(400);await p.locator('#playbackBtn').click();eq(await p.locator(owner).getAttribute('data-state'),'PAUSED','paused');const before=await p.locator(visual).innerHTML();await p.clock.runFor(5000);eq(await p.locator(visual).innerHTML(),before,'pause freezes visual');await p.locator('#playbackBtn').click();await finish(p,owner);}
try{
 for(const [width,height] of [[360,800],[768,1024],[1366,768],[1920,1080]]){
  const p=await browser.newPage({viewport:{width,height}});p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(r.status()+' '+r.url());});
  await p.clock.install();await p.goto(base+'/labs/ip-subnetting-simulator.html');
  eq(await p.locator('#runBtn').isDisabled(),true,'IP prediction gate');eq(await p.locator('#networkSurface').isVisible(),true,'IP starts with topology');eq(await p.locator('#resultArea').isVisible(),false,'IP initial result hidden');await layout(p);
  const order=[6,0,1,2,3,4,5];
  for(const i of order){
   await p.locator(`[data-lesson="${i}"]`).click();await p.locator(`[data-prediction="${lessons[i].answer}"]`).click();
   eq(await p.evaluate(()=>document.activeElement?.getAttribute('data-prediction')),lessons[i].answer,'IP selected focus survives rerender');
   await p.locator('#runBtn').click();eq(await p.locator('#resultArea').isVisible(),false,'IP no early result');
   if(i===0)await pauseCheck(p,'#ipLab','#modelObservation');else await finish(p,'#ipLab');
   eq(await p.locator('#verdictTitle').innerText(),'✓ 정답입니다','IP current answer grade');await layout(p);
   if(i===6){await p.locator('#nextBtn').click();eq(await p.locator('#courseComplete').isVisible(),false,'IP last-only must not complete');eq(await p.locator('[data-lesson="0"]').getAttribute('aria-current'),'step','IP next wraps to unfinished');}
   if(i===0){const score=await p.locator('#scoreText').innerText();await p.locator('#reviewPanel summary').click();await p.locator('#prevEvent').click();eq(await p.locator('#resultArea').isVisible(),false,'IP intermediate review hides final verdict');await p.locator('#nextEvent').click();eq(await p.locator('#resultArea').isVisible(),true,'IP final review restores verdict');await p.locator('#playbackBtn').click();await finish(p,'#ipLab');eq(await p.locator('#scoreText').innerText(),score,'IP replay preserves score');}
  }
  await p.locator('#nextBtn').click();eq(await p.locator('#courseComplete').isVisible(),true,'IP full completion');eq(await p.locator('#courseCount').innerText(),'7 / 7 완료','IP count');
  await p.locator('#restartBtn').click();await p.locator('[data-prediction]').first().click();await p.locator('#runBtn').click();await p.clock.runFor(500);await p.locator('#resetBtn').click();await p.clock.runFor(30000);eq(await p.locator('#ipLab').getAttribute('data-state'),'IDLE','IP reset cancels playback');eq(await p.locator('#resultArea').isVisible(),false,'IP no stale result');
  await p.screenshot({path:resolve(out,`ip-${width}.png`),fullPage:true});
  await p.goto(base+'/labs/ethernet-mac-table-simulator.html');
  eq(await p.locator('#runBtn').isDisabled(),true,'Ethernet prediction gate');eq(await p.locator('#predictionFeedback').isVisible(),false,'Ethernet initial result hidden');await layout(p);
  const answers=['source','p2','flood','broadcast','flood'];
  for(const i of [4,0,1,2,3]){
   await p.locator(`[data-lesson="${i}"]`).click();
   if(i===4){eq(await p.locator('#ageBtn').isEnabled(),false,'no Aging before prediction');eq(await p.locator('#fdbBody').innerText().then(t=>t.includes('299s')),true,'Aging starts from known entry');}
   await p.locator(`[data-prediction="${answers[i]}"]`).click();await p.locator('#runBtn').click();eq(await p.locator('#predictionFeedback').isVisible(),false,'Ethernet no early verdict');
   if(i===4)await pauseCheck(p,'#macLab','#macTopology');else await finish(p,'#macLab');
   eq((await p.locator('#predictionFeedback').innerText()).includes('예상이 맞았습니다.'),true,'Ethernet correct grading');
   if(i===4){eq((await p.locator('#eventTimeline').innerText()).includes('FDB Aging'),true,'one run includes Aging');eq((await p.locator('#fdbBody').innerText()).includes('00:50:79:66:68:01'),true,'reply relearns destination');eq((await p.locator('#switchAction').innerText()).includes('Known'),true,'final request returns Known Unicast');await p.locator('#nextBtn').click();eq(await p.locator('[data-lesson="0"]').getAttribute('class').then(s=>s.includes('active')),true,'Ethernet next wraps unfinished');eq(await p.locator('#courseComplete').isVisible(),false,'Ethernet last-only no full completion');}
   if(i===0){const count=await p.locator('#courseCount').innerText();await p.locator('#reviewPanel summary').click();await p.locator('#prevEvent').click();eq(await p.locator('#predictionFeedback').isVisible(),false,'Ethernet review hides final result');await p.locator('#nextEvent').click();eq(await p.locator('#predictionFeedback').isVisible(),true,'Ethernet final review restores result');await p.locator('#playbackBtn').click();await finish(p,'#macLab');eq(await p.locator('#courseCount').innerText(),count,'Ethernet replay not double count');}
   await layout(p);
  }
  eq(await p.locator('#courseCount').innerText(),'5 / 5 완료','Ethernet full count');eq(await p.locator('#courseComplete').isVisible(),true,'Ethernet complete only after all');
  await p.locator('[data-lesson="4"]').click();await p.locator('[data-prediction="flood"]').click();await p.locator('#runBtn').click();await p.clock.runFor(3000);await p.locator('#resetBtn').click();await p.clock.runFor(30000);eq(await p.locator('#macLab').getAttribute('data-state'),'IDLE','Ethernet reset cancels old callbacks');eq(await p.locator('#predictionFeedback').isVisible(),false,'Ethernet reset clears grade');eq((await p.locator('#fdbBody').innerText()).includes('299s'),true,'Ethernet reset restores baseline');
  await p.locator('[data-prediction="flood"]').click();await p.locator('#runBtn').click();await p.locator('[data-lesson="1"]').click();await p.clock.runFor(30000);eq(await p.locator('#macLab').getAttribute('data-state'),'IDLE','Ethernet scenario switch cancels old callbacks');eq((await p.locator('#fdbBody').innerText()).includes('12s'),true,'new Known scenario baseline intact');
  await p.screenshot({path:resolve(out,`ethernet-${width}.png`),fullPage:true});
  results.push({width,height,ip:'PASS',ethernet:'PASS'});await p.close();console.log(`${width}: PASS`);
 }
 eq(errors,[],'runtime/assets');await writeFile(resolve(out,'summary.json'),JSON.stringify({checks,results,errors,hardware:'NOT_RUN'},null,2));
}finally{await browser.close();server?.close();}
