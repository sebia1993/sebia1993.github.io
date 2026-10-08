import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../labs/physical-network.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../labs/physical-network-applications.css',import.meta.url),'utf8');
const cases=html.match(/<details id="utp-application-cases"[\s\S]*?<\/details>/)?.[0];

test('application row leads with places, not only endpoint devices',()=>{
 assert.match(html,/<tr id="utp-application-places"><th scope="row">실제 사용 장소 예<\/th>/);
 assert.match(html,/학교·의료기관의 업무 공간/);
 assert.match(html,/관공서·기업 사무실·물류시설/);
 assert.ok(!html.includes('<th scope="row">적용 환경 예</th>'));
 assert.match(html,/장소는 사용 예시이지, 케이블을 구분하는 기준은 아닙니다/);
});
test('four dated primary-source cases remain optional and independently cited',()=>{
 assert.ok(cases);
 assert.ok(!/<details[^>]*\bopen(?:[\s=>])/.test(cases));
 assert.equal((cases.match(/class="utp-place-card"/g)||[]).length,4);
 for(const url of [
  'https://icc.com/success-stories/city-of-missoula-awards-project-to-elite-installer/',
  'https://icc.com/success-stories/2011-success-stories/',
  'https://icc.com/success-stories/health-care-facility-headquarters-installs-cat5e-and-cat6-structured-cabling-system/',
  'https://www.ics-panduit.com/expeditors-structured-cabling-system/'
 ]) assert.ok(cases.includes(`href="${url}"`),url);
 for(const date of ['2019-08-16','2011-06','2016-02-01','2011-03','2022-09-13','2026-10-08']) assert.ok(cases.includes(`datetime="${date}"`),date);
 assert.match(cases,/해외 구축 사례/);
 assert.match(cases,/기관명 미공개/);
 assert.match(cases,/현재 배선 상태를 뜻하지 않습니다/);
 assert.match(cases,/같은 시설에서도 두 등급을 함께 쓸 수 있습니다/);
 assert.match(cases,/사무실·창고에는 Cat6 연결 지점 4,644개/);
 assert.match(cases,/주요 통신실 사이에는 광케이블/);
});
test('existing performance content and conceptual navigation are retained',()=>{
 for(const text of ['100 MHz','250 MHz','55 m 이내에서 조건부 검토','분리대가 없는 Cat6도 있습니다.','physical-network-simulator.html']) assert.ok(html.includes(text),text);
 assert.equal((html.match(/id="utp-category-guide"/g)||[]).length,1);
 assert.equal((html.match(/id="utp-application-cases"/g)||[]).length,1);
 assert.equal((html.match(/class="cg-primary"/g)||[]).length,1);
 assert.match(html,/physical-network-applications\.css\?v=20261008-places/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
