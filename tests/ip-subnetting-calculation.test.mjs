import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {addressWindow,parseIPv4,subnetInfo,eventsFor,lessons} from '../labs/ip-subnetting-model.js';
test('subnet arithmetic and visual ranges match 429 independent Python ipaddress cases',()=>{
 const oracle=JSON.parse(execFileSync(process.platform==='win32'?'python':'python3',['-c',`
import ipaddress,json
cases=[]
for p in range(33):
 for ip in ['0.0.0.0','1.2.3.4','10.77.10.10','10.77.10.140','128.0.0.0','192.168.10.63','192.168.10.64','192.168.10.65','192.168.10.70','192.168.10.127','192.168.10.128','192.168.10.129','255.255.255.255']:
  n=ipaddress.IPv4Network(f'{ip}/{p}',strict=False)
  cases.append(dict(ip=ip,prefix=p,network=str(n.network_address),broadcast=str(n.broadcast_address) if p<31 else None,firstHost=str(n.network_address+(1 if p<31 else 0)),lastHost=str(n.broadcast_address-(1 if p<31 else 0)),hostCount=n.num_addresses-(2 if p<31 else 0)))
print(json.dumps(cases))
 `],{encoding:'utf8'}));
 for(const c of oracle){
  const i=subnetInfo(c.ip,c.prefix),w=addressWindow(c.ip,c.prefix);
  for(const key of ['network','broadcast','firstHost','lastHost','hostCount'])assert.equal(i[key],c[key],`${c.ip}/${c.prefix} ${key}`);
  const selected=w.blocks.filter(b=>b.active);assert.equal(selected.length,1);assert.equal(selected[0].network,c.network);
  assert.equal(selected[0].end-selected[0].start+1,2**(32-c.prefix));assert.ok(parseIPv4(c.ip)>=selected[0].start&&parseIPv4(c.ip)<=selected[0].end);
 }
});
test('the four original scenario decisions and resolution outcomes are preserved',()=>{
 assert.deepEqual(lessons.slice(3).map(l=>eventsFor(l).at(-1).observation.resolved),[true,true,false,true]);
 assert.deepEqual(lessons.slice(3).map(l=>eventsFor(l).at(-1).observation.arpTarget),['10.77.10.20','10.77.10.1','10.77.10.140','10.77.10.1']);
});
