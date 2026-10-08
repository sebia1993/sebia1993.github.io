import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {segments} from '../labs/physical-network-simulator-links.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('labs/physical-network-simulator.html'),guide=read('labs/physical-network.html'),css=read('labs/physical-network-simulator-links.css');
test('one continuous segment for each physical cable or module attachment',()=>{
 assert.deepEqual(segments.map(s=>s.id),['utp1','utp2','sfpa','fibera','fiberb','sfpb']);
 assert.deepEqual(segments.map(s=>[s.from,s.to]),[['ap1','access'],['ap2','access'],['access','sfpa'],['sfpa','fdf'],['fdf','sfpb'],['sfpb','distribution']]);
 assert.equal(segments.filter(s=>s.cable).length,4);
});
test('new line painter is isolated to the simulator; concept painter remains unchanged',()=>{
 assert.match(html,/physical-network-simulator-links.js\?v=20261008-continuity/);
 assert.match(html,/physical-network-simulator-links.css\?v=20261008-continuity/);
 assert.doesNotMatch(html,/src="physical-network-topology.js/);
 assert.match(guide,/src="physical-network-topology.js/);
 assert.doesNotMatch(guide,/physical-network-simulator-links/);
 assert.match(css,/#physicalLab \.phy-cable::before/);
 assert.match(css,/content:none!important/);
});
test('layout orientation and drawing share the same breakpoint contract',()=>{
 assert.match(css,/--phy-axis:horizontal/);assert.match(css,/@media\(max-width:900px\)/);assert.match(css,/--phy-axis:vertical/);
 const js=read('labs/physical-network-simulator-links.js');
 for(const s of ['getScreenCTM','ResizeObserver','MutationObserver','document.fonts','instances.has(map)','requestAnimationFrame'])assert.ok(js.includes(s),s);
});
