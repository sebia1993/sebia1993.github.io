import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lessons} from '../labs/physical-network-lessons.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const guide=read('labs/physical-network.html'),js=read('labs/physical-network-simulator.js'),css=read('labs/physical-network-simulator.css');
const lesson=id=>lessons.find(s=>s.id===id);
test('existing scenario IDs and grade answers stay stable',()=>{
 assert.deepEqual(lessons.map(s=>s.id),['normal','utp','sfp','fiber','photo','port-speed','distance','places','fiber-color','sr-cable','optic-mismatch','polarity']);
 assert.deepEqual(lessons.slice(4).map(s=>s.answer),[0,1,2,0,0,1,1,1]);
 assert.equal(lessons.length,12);
});
test('core scenarios return to their own concept section',()=>{
 for(const [id,anchor]of Object.entries({normal:'cg-picture',utp:'utp',sfp:'sfp',fiber:'fiber'})){
  assert.equal(lesson(id).anchor,anchor);assert.ok(guide.includes(`id="${anchor}"`));
 }
});
test('photo observations remain specimen-specific and appear during their own steps',()=>{
 const s=lesson('photo');
 assert.match(s.visual,/data-reveal-step="0" hidden>이 샘플: 절연된 심선 8가닥/);
 assert.match(s.visual,/data-reveal-step="1" hidden>이 샘플: 회색 X형/);
 assert.match(s.visual,/https:\/\/leviton.com\/products\/310-utp6p-mlb/);
 assert.equal((s.visual.match(/rel="license"/g)||[]).length,2);
 assert.match(s.reason,/미확인/);
});
test('frequency performance and link rate have separate labels and progressive reveal',()=>{
 const s=lesson('port-speed');
 for(const t of ['100 MHz','250 MHz','1 Gbps → 1 Gbps','초당 데이터 전송량','자동으로 2.5배'])assert.ok(s.visual.includes(t),t);
 assert.match(s.visual,/data-reveal-step="1" hidden>규격 대역폭/);
 assert.match(s.visual,/data-reveal-step="2" hidden>모델의 링크 속도/);
 assert.match(s.setup,/전체 20m/);assert.equal(s.answer,1);
 assert.ok(guide.includes('100 MHz')&&guide.includes('250 MHz'));
});
test('distance bars use common scales and explicit conditional meaning',()=>{
 const s=lesson('distance');
 assert.equal((s.visual.match(/class="inspection-ruler"/g)||[]).length,2);
 assert.equal((s.visual.match(/<span>0 m<\/span><span>50 m<\/span><span>100 m<\/span>/g)||[]).length,2);
 assert.match(s.visual,/inspection-range conditional" style="width:55%"/);
 assert.match(s.visual,/inspection-range" style="width:100%"/);
 assert.match(s.visual,/사선은 조건부 검토/);assert.match(s.visual,/짧은 거리도 자동 보장되지 않습니다/);
 assert.match(css,/repeating-linear-gradient/);
});
test('all four approved place examples remain dated and independently sourced',()=>{
 const s=lesson('places');
 for(const key of ['school','health','office','logistics'])assert.ok(s.visual.includes(`data-focus="${key}"`));
 assert.equal((s.visual.match(/class="inspection-source"/g)||[]).length,4);
 assert.equal(s.events.length,4);assert.deepEqual(s.events[3].active,['logistics']);
 for(const t of ['Expeditors','공사 완료: 2011년 3월','소개 글 게시: 2022년 9월','주요 통신실 사이','광케이블'])assert.ok(s.visual.includes(t),t);
 assert.match(s.visual,/data-reveal-step="3" hidden>사무실·창고/);
 assert.match(s.reason,/해외 과거 사례/);
});
test('counts and control copy reflect the active lesson rather than fixed assumptions',()=>{
 assert.match(js,/scenarios.filter\(s=>s.group===i\).length/);
 assert.doesNotMatch(js,/name\+' · 4문제'/);
 assert.match(js,/실행해서 사진·자료의 근거를 확인하세요/);
 assert.match(js,/const EVENT_MS=2490/);
 for(const s of lessons.filter(s=>s.kind==='inspection'))for(const e of s.events)assert.deepEqual(e.change,{});
});
