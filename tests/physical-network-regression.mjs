import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(path)]||'text/plain'));res.end(await readFile(root+path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let proxy;if(process.env.BASE_URL&&process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);proxy={server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})};}
const base=process.env.BASE_URL||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-gpu'],...(proxy?{proxy}:{})});
const rows=[],errors=[],out=root+'/test-results/physical-network-regression';await mkdir(out,{recursive:true});
async function check(name,fn){try{await fn();rows.push({name,result:'PASS'});}catch(e){rows.push({name,result:'FAIL',reason:e.message});}}
try{
 const p=await browser.newPage({viewport:{width:1366,height:768},ignoreHTTPSErrors:Boolean(proxy)});
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/labs/physical-network-simulator.html');await p.clock.install();
 async function run(i,answer){await p.locator(`[data-lesson="${i}"]`).click();await p.locator(`[data-prediction="${answer}"]`).click();await p.locator('#runBtn').click();}
 await check('guide component names',async()=>{for(const [part,name] of [['sfpa','SFP A'],['sfpb','SFP B'],['fdf','FDF A']])assert.equal(await p.locator(`[data-part="${part}"] strong`).innerText(),name);});
 await check('pre-run answer is not exposed by the normal baseline',async()=>{assert.equal(await p.locator('#uplinkStatus').innerText(),'관찰 전');assert.doesNotMatch(await p.locator('#ap1Status').innerText(),/정상/);assert.equal(await p.locator('#resultArea').isVisible(),false);});
 await run(2,1);
 await check('run focus stays on playback',async()=>assert.equal(await p.evaluate(()=>document.activeElement.id),'playbackBtn'));
 await p.clock.runFor(12000);
 await p.locator('#reviewPanel summary').click();await p.locator('#prevEvent').click();await p.locator('#prevEvent').click();
 await check('review hides final feedback on baseline scene',async()=>{assert.match(await p.locator('#uplinkStatus').innerText(),/정상/);assert.equal(await p.locator('#resultArea').isVisible(),false);assert.match(await p.locator('#liveEventKind').innerText(),/복습/);});
 await p.locator('#nextEvent').click();await p.locator('#nextEvent').click();
 await check('review final scene restores feedback without rescoring',async()=>{assert.equal(await p.locator('#resultArea').isVisible(),true);assert.match(await p.locator('#scoreText').innerText(),/관찰 1 · 정답 1/);});
 await run(0,0);await p.clock.runFor(12000);await run(1,0);await p.clock.runFor(12000);
 await p.locator('[data-lesson="0"]').click();await p.locator('#nextBtn').click();
 await check('next skips completed scenarios',async()=>assert.equal(await p.locator('#coachTitle').innerText(),'Fiber 분리'));
 await p.reload();await p.clock.runFor(100);
 await run(1,1);await p.clock.runFor(12000);
 await check('completion keyboard focus',async()=>assert.equal(await p.evaluate(()=>document.activeElement.id),'verdictTitle'));
 await p.locator('#playbackBtn').click();await p.clock.runFor(3000);await p.locator('#resetBtn').click();await p.clock.runFor(15000);
 await check('reset removes old active and failure state',async()=>{assert.equal(await p.locator('.phy-element.active,.phy-element.disconnected').count(),0);assert.equal(await p.locator('#resultArea').isVisible(),false);assert.match(await p.locator('#courseCount').innerText(),/0 \/ 4/);});
 // Sequential learning, mixed grade summary, wrong-answer review and explicit retry.
 await p.reload();await p.clock.runFor(100);
 for(let i=0;i<4;i++){await p.locator(`[data-prediction="${[0,1,1,1][i]}"]`).click();await p.locator('#runBtn').click();await p.clock.runFor(12000);await p.locator('#nextBtn').click();}
 await check('sequential path and mixed summary',async()=>{assert.equal(await p.locator('#courseComplete').isVisible(),true);assert.match(await p.locator('#completionScore').innerText(),/정답 3 · 오답 1/);assert.equal(await p.locator('.physical-summary.incorrect').count(),1);});
 await p.getByRole('button',{name:'오답 해설 보기',exact:true}).click();await p.locator('#resetBtn').click();await p.locator('[data-prediction="0"]').click();await p.locator('#runBtn').click();await p.clock.runFor(12000);await p.locator('#nextBtn').click();
 await check('retry returns directly to summary',async()=>{assert.equal(await p.locator('#courseComplete').isVisible(),true);assert.match(await p.locator('#completionScore').innerText(),/정답 4 · 오답 0/);});
 for(const [w,h]of [[360,800],[768,1024],[1366,768],[1920,1080]]){await p.setViewportSize({width:w,height:h});await p.reload();await p.locator('[data-prediction="0"]').waitFor();await p.screenshot({path:`${out}/initial-${w}.png`,fullPage:true});await p.locator('.physical-map').screenshot({path:`${out}/map-${w}.png`});await check(`unique accessible cable names ${w}`,async()=>{const names=await p.locator('.phy-cable').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));assert.ok(names.every(Boolean));assert.equal(new Set(names).size,names.length);});await check(`compact map height budget ${w}`,async()=>{if(w<=900){const r=await p.locator('.physical-map').boundingBox();assert.ok(r.height<650,`map height ${r.height}`);}});}
 await writeFile(out+(process.env.BASELINE?'/before.json':process.env.BASE_URL?'/public.json':'/local.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,rows,errors},null,2));console.log(JSON.stringify(rows,null,2));if(!process.env.BASELINE)assert.ok(rows.every(r=>r.result==='PASS')&&!errors.length);
}finally{await browser.close();server.close();}
