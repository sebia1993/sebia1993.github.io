import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {lessons,groups} from '../labs/physical-network-lessons.js';
import {scenarios as core} from '../labs/physical-network-model.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const guide=read('labs/physical-network.html'),lab=read('labs/physical-network-simulator.html');

test('three small lesson groups map back to existing guide anchors',()=>{
 assert.equal(lessons.length,12);assert.equal(groups.length,3);
 assert.equal(new Set(lessons.map(s=>s.id)).size,12);
 for(let g=0;g<3;g++)assert.equal(lessons.filter(s=>s.group===g).length,4);
 for(const s of lessons){assert.ok(guide.includes(`id="${s.anchor}"`),s.id);assert.ok(s.answer>=0&&s.answer<s.choices.length);assert.ok(s.events.length>=3);assert.ok(s.reason.length>30);}
});
test('existing physical states, event sequence and answers remain unchanged',()=>{
 for(let i=0;i<4;i++){
  assert.equal(lessons[i].id,core[i].id);assert.equal(lessons[i].answer,core[i].answer);
  assert.deepEqual(lessons[i].events.map(e=>[e.active,e.change]),core[i].events.map(e=>[e.active,e.change]));
 }
 const bytes=readFileSync(new URL('../labs/physical-network-model.js',import.meta.url));
 // Normalize checkout line endings only; no content, whitespace or state is ignored.
 const canonical=value=>value.toString('utf8').replace(/\r\n/g,'\n');
 const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
 const expected='772ae647751e134c70036cc8f786256835b616b159189e4b781d05365e55f91e';
 assert.equal(digest(bytes),expected);
 assert.equal(digest(Buffer.from(canonical(bytes).replace(/\n/g,'\r\n'))),expected);
});
test('photo license, specimen limits and reuse are retained',()=>{
 const s=lessons.find(s=>s.id==='photo');
 assert.match(s.visual,/cat5e-cross-section\.jpg/);assert.match(s.visual,/cat6-cross-section\.jpg/);
 assert.equal((s.visual.match(/rel="license"/g)||[]).length,2);
 assert.match(s.visual,/TubeTimeUS/);assert.match(s.visual,/CC BY-SA 4.0/);assert.match(s.visual,/같은 배율/);
 assert.match(s.reason,/미확인/);assert.match(s.reason,/중앙 분리대가 없는 Cat6/);
});
test('new scenarios preserve uncertainty, assumptions and observation semantics',()=>{
 assert.deepEqual(lessons.slice(4).map(s=>s.answer),[0,1,2,0,0,1,1,1]);
 assert.match(lessons.find(s=>s.id==='distance').reason,/55m 이내에서도 조건부/);
 assert.match(lessons.find(s=>s.id==='places').reason,/해외 과거 사례/);
 assert.match(lessons.find(s=>s.id==='sr-cable').reason,/사양에 맞는 후보/);
 assert.match(lessons.find(s=>s.id==='polarity').setup,/학습용 가정/);
 for(const s of lessons.slice(4)){assert.equal(s.kind,'inspection');assert.ok(s.visual);assert.ok(s.setup);for(const e of s.events)assert.deepEqual(e.change,{});}
});
test('simulator labels match concept roles and helper links preserve two-stage flow',()=>{
 for(const text of ['L2 스위치 · AP 연결','L3 스위치 · 상위 연결','<strong>지빅 A</strong>','<strong>지빅 B</strong>'])assert.ok(lab.includes(text),text);
 assert.match(lab,/id="conceptGuideLink"/);assert.match(lab,/id="conceptSectionLink"/);assert.match(lab,/id="resultConceptLink"/);
 assert.ok(!lab.includes('concept-guide.css'));
 for(const css of ['arp-simulator-1.css','arp-simulator-2.css','arp-simulator-3.css','arp-simulator-mobile.css','arp-simulator-mobile-follow.css'])assert.ok(lab.includes(css));
});
