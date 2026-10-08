import {chromium} from 'playwright';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';import {createHash} from 'node:crypto';
import {measureLines} from './physical-network-line-geometry.mjs';import {lessons} from '../labs/physical-network-lessons.js';
const root=resolve(import.meta.dirname,'..'),out=root+'/test-results/line-continuity';await mkdir(out,{recursive:true});
let base=process.env.BASE_URL,server;
if(!base){server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'}[extname(path)]||'text/plain'));res.end(await readFile(root+path));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const rows=[],errors=[],hashes=[];
async function check(p,label){await p.waitForTimeout(40);await p.clock.runFor(80);await p.waitForTimeout(40);await p.clock.runFor(80);const r=await p.evaluate(measureLines);assert.equal(r.mode,'continuous',label);assert.deepEqual(r.issues,[],label);assert.equal(r.overflow,false,label);return r;}
async function snapshot(p,name){await p.evaluate(()=>scrollTo(0,0));await p.clock.runFor(80);const bounds=await p.locator('.physical-map').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});await writeFile(out+'/'+name+'.json',JSON.stringify(bounds));await p.screenshot({path:out+'/'+name+'.png',fullPage:true});}
try{
 if(process.env.BASE_URL){for(const f of ['labs/physical-network-simulator.html','labs/physical-network-simulator-links.js','labs/physical-network-simulator-links.css','labs/physical-network-model.js','labs/physical-network-lessons.js','labs/physical-network-simulator.js','labs/physical-network.html','labs/physical-network-topology.js']){const r=await fetch(base+'/'+f+'?qa='+Date.now());assert.equal(r.status,200,f);const hash=b=>createHash('sha256').update(b).digest('hex');const actual=hash(Buffer.from(await r.arrayBuffer()));assert.equal(actual,hash(await readFile(root+'/'+f)),f);hashes.push({file:f,sha256:actual});}}
 const sizes=process.env.BASELINE?[[360,800],[1366,768]]:[[360,800],[800,360],[768,1024],[900,900],[901,900],[1366,768],[1920,1080]];
 for(const [width,height]of sizes){
  const c=await browser.newContext({viewport:{width,height}}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  await p.goto(base+'/labs/physical-network-simulator.html?qa='+Date.now(),{waitUntil:'networkidle'});await p.clock.install();
  if(process.env.BASELINE){const r=await p.evaluate(measureLines);assert.equal(r.mode,'legacy');assert.ok(r.gaps.some(g=>g.inlet>1||g.outlet>1));rows.push({width,height,...r});await snapshot(p,'before-'+width);await c.close();continue;}
  for(let i=0;i<4;i++){
   await p.locator(`[data-lesson="${i}"]`).click();await p.locator('#resetBtn').click();const initial=await check(p,`${width}/${i}/initial`);
   assert.ok(initial.rows.every(r=>!r.broken));await p.locator(`[data-prediction="${lessons[i].answer}"]`).click();await p.locator('#runBtn').click();await check(p,'first event');await p.clock.runFor(12000);
   const final=await check(p,`${width}/${i}/final`);assert.match(await p.locator('#verdictTitle').innerText(),/정답입니다/);
   assert.deepEqual(final.rows.filter(r=>r.broken).map(r=>r.id),[[],['utp1'],['sfpa'],['fibera']][i]);
   assert.deepEqual(final.rows.map(r=>r.d),initial.rows.map(r=>r.d),'state must not move geometry');
   const score=await p.locator('#scoreText').innerText();await snapshot(p,`${lessons[i].id}-${width}`);
   await p.locator('#reviewPanel summary').click();for(let n=lessons[i].events.length-2;n>=0;n--){await p.locator('#prevEvent').click();await check(p,'previous step');}
   for(let n=1;n<lessons[i].events.length;n++){await p.locator('#nextEvent').click();await check(p,'next step');}
   assert.equal(await p.locator('#scoreText').innerText(),score);await p.locator('#resetBtn').click();const reset=await check(p,'reset');assert.ok(reset.rows.every(r=>!r.broken));
  }
  await p.locator('[data-prediction="0"]').click();await p.locator('#runBtn').click();await p.clock.runFor(100);await p.locator('#playbackBtn').click();const paused=await check(p,'pause');await p.clock.runFor(12000);assert.deepEqual((await check(p,'pause holds')).rows,paused.rows);
  await p.locator('#resetBtn').click();await p.clock.runFor(12000);assert.ok((await check(p,'cancel')).rows.every(r=>!r.broken));
  await p.locator('#practiceGroup').selectOption('1');assert.equal(await p.locator('#physicalTopology').isVisible(),false);await p.locator('#practiceGroup').selectOption('0');await check(p,'hidden/visible');
  await p.setViewportSize({width:width<=900?1366:360,height});await check(p,'orientation change');await p.setViewportSize({width,height});await check(p,'orientation restore');
  if(width===360){
   await p.evaluate(()=>{const es=[...document.querySelectorAll('body *')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);for(const[e,n]of es)e.style.setProperty('font-size',n*2+'px','important');});await check(p,'200% text');await snapshot(p,'text-200');
   await p.reload({waitUntil:'networkidle'});await p.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await check(p,'forced colors');await p.locator('[data-lesson="1"]').click();await p.locator('[data-prediction="0"]').click();await p.locator('#runBtn').click();await p.clock.runFor(12000);await check(p,'forced colors failure');await snapshot(p,'forced-colors');
  }
  rows.push({width,height,fourScenarios:'PASS',endpointsAndTextClearance:'PASS',failureAndReset:'PASS',geometryStability:'PASS',resizeAndVisibility:'PASS'});await c.close();console.log(width,'PASS');
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/'+(process.env.BASELINE?'before':process.env.BASE_URL?'public':'local')+'-result.json',JSON.stringify({base,checkedAt:new Date().toISOString(),rows,errors,hashes,networkLabExecuted:false},null,2));
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
