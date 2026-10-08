import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('labs/physical-network.html',root),'utf8');
const css=readFileSync(new URL('labs/physical-network-photos.css',root),'utf8');
const manifest=JSON.parse(readFileSync(new URL('docs/physical-network-photo-sources.json',root),'utf8'));
const section=html.match(/<section id="utp-cross-section-photos"[\s\S]*?<\/section>/)?.[0];

test('real cross-section photos are directly visible below the preserved schematic',()=>{
 assert.ok(section);
 assert.equal((section.match(/<img /g)||[]).length,2);
 assert.ok(html.indexOf('utp-cutaway-figure')<html.indexOf('id="utp-cross-section-photos"'));
 assert.equal((html.match(/class="utp-cutaway"/g)||[]).length,2);
 assert.ok(section.indexOf('<img ')<section.indexOf('<details'));
 assert.match(section,/width="1200" height="900"/);
 for(const category of ['cat5e','cat6']){
  assert.ok(section.includes(`href="images/${category}-cross-section-original.jpg"`));
  assert.ok(section.includes(`src="images/${category}-cross-section.jpg"`));
 }
});
test('photographs retain author, license, original source and processing disclosure',()=>{
 assert.equal(manifest.author,'TubeTimeUS');
 assert.equal(manifest.license,'CC BY-SA 4.0');
 assert.equal(manifest.photos.length,2);
 for(const photo of manifest.photos){
  const original=readFileSync(new URL(photo.originalPath,root));
  const preview=readFileSync(new URL(photo.previewPath,root));
  assert.equal(createHash('sha1').update(original).digest('hex'),photo.originalSha1);
  assert.equal(createHash('sha256').update(original).digest('hex'),photo.originalSha256);
  assert.equal(createHash('sha256').update(preview).digest('hex'),photo.previewSha256);
  assert.equal(original.readUInt16BE(0),0xffd8);
  assert.equal(preview.readUInt16BE(0),0xffd8);
  assert.ok(preview.length<500000);
  assert.deepEqual(photo.previewDimensions,[1200,900]);
  assert.ok(section.includes(photo.sourcePage));
 }
 assert.equal((section.match(/rel="license"/g)||[]).length,2);
 assert.match(section,/크기 축소·JPEG 재압축/);
 assert.match(section,/잘라내기·색상 보정·합성은 하지 않았습니다/);
});
test('specimen observations are not converted to universal identification rules',()=>{
 for(const text of ['이 샘플에는 중앙 분리대가 없습니다','회색 X자 부분','같은 배율의 굵기 비교가 아닙니다','등급을 정하는 기준이 아닙니다','분리대가 없는 Cat6도','구리점 하나하나를 별도의 심선으로 세지 않습니다','우리 사업장 케이블이 아닙니다']) assert.ok(section.includes(text),text);
 assert.match(section,/href="#utp-inside"/);
 assert.match(section,/블로그 사진을 재게시하지 않았으며/);
 assert.ok(!/<img[^>]+src="https?:/i.test(section));
 assert.equal(manifest.networkLabExecuted,false);
});
test('photo styling is scoped, responsive and does not crop or transform subjects',()=>{
 assert.match(css,/\.physical-concept \.utp-real-photo-grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/object-fit:contain/);
 assert.doesNotMatch(css,/object-fit:cover|filter:|transform:/);
});
test('existing cable performance, place examples and learning flow remain present',()=>{
 for(const text of ['100 MHz','250 MHz','55 m 이내에서 조건부 검토','id="utp-application-cases"','class="utp-place-card"','physical-network-simulator.html','분리대가 없는 Cat6도 있습니다.','images/cat5e-twisted-pairs.jpg']) assert.ok(html.includes(text),text);
 assert.equal((html.match(/class="utp-place-card"/g)||[]).length,4);
 assert.equal((html.match(/class="cg-primary"/g)||[]).length,1);
});
