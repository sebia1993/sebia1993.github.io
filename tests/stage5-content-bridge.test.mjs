import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const repo=fileURLToPath(new URL('../',import.meta.url));
const topics=['wifi-rf','wlan-association','dot1x-radius','roaming-wlan-troubleshooting'];
const fixtures=JSON.parse(fs.readFileSync(`${repo}/tests/fixtures/roadmap-simulator-models.json`));
function load(topic){
 let adapter;
 vm.runInNewContext(fs.readFileSync(`${repo}/labs/${topic}-model.js`,'utf8'),{NetworkSimulator:{mount(value){adapter=value;}}});
 return adapter;
}

test('Stage 5 teaching overlays preserve every original scenario and evidence record',()=>{
 for(const topic of topics){
  const adapter=load(topic);
  assert.equal(createHash('sha256').update(JSON.stringify(adapter.raw)).digest('hex'),fixtures[topic].hash,topic);
  for(let i=0;i<adapter.raw.length;i++){
   const raw=adapter.raw[i],ui=adapter.presentation.lessons[i];
   const choices=ui.choices??raw.options.map((text,key)=>[key,text]);
   const correct=ui.correctKey??raw.correct;
   assert.equal(choices.filter(([key])=>key===correct).length,1,`${topic} question ${i+1}: one correct key`);
   assert.equal(correct,raw.correct,`${topic} question ${i+1}: original answer identity`);
   assert.ok(adapter.buildPlan(i).length>1,`${topic} question ${i+1}: progressive observation remains`);
  }
 }
});

test('WLAN display refinements preserve native message ordering and timing',()=>{
 const adapter=load('wlan-association');
 for(let i=0;i<adapter.raw.length;i++){
  const raw=adapter.raw[i],plan=adapter.buildPlan(i);
  assert.equal(plan.length,raw.steps.length);
  for(let k=0;k<plan.length;k++){
   assert.equal(plan[k].modelStepIndex,k);
   const direction=raw.steps[k].direction;
   const expected=direction==='both'?2070:['to-ap','to-sta'].includes(direction)?1650:1470;
   assert.equal(plan[k].duration,expected,`${i+1}/${k+1}: no protocol order or tempo change`);
  }
 }
});

test('RF channel diagrams use consistent proportional geometry',()=>{
 const spectrum=fs.readFileSync(`${repo}/labs/wifi-rf-spectrum.svg`,'utf8');
 const widths=[...spectrum.matchAll(/data-width-mhz="(\d+)"[^>]+width="(\d+)"/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.deepEqual(widths.map(([mhz,pixels])=>pixels/mhz),[3.3,3.3,3.3]);
 for(const file of ['wifi-rf-spectrum.svg','wifi-rf-overlap.svg']){
  const svg=fs.readFileSync(`${repo}/labs/${file}`,'utf8');
  const channels=[...svg.matchAll(/data-channel="(\d+)" x="(\d+)"[^>]+width="(\d+)"/g)].map(m=>({channel:Number(m[1]),start:Number(m[2]),width:Number(m[3])}));
  assert.equal(channels.length,2);
  const [a,b]=channels;
  assert.equal(a.width,b.width,'both channels have 20 MHz nominal width');
  const pxPerMHz=a.width/20;
  assert.equal((b.start-a.start)/pxPerMHz,2422-2412,'centres are 10 MHz apart on one scale');
  const overlap=Math.min(a.start+a.width,b.start+b.width)-Math.max(a.start,b.start);
  assert.equal(overlap/pxPerMHz,10,'nominal intersection is 10 MHz');
 }
});
