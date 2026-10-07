// Existing lesson data and topic renderer retained from fhrp-simulator; playback is shared.
(()=>{
var lessons=[
{
id:"FHRP-01",title:"Virtual Gateway",text:"Host는 어떤 주소를 Gateway로 보고, 실제 전달은 누가 수행할까요?",start:["PC1 GW = 10.10.10.1","R1/R2 physical IP는 별도","HSRP baseline"],
question:"정상 HSRP에서 PC1이 Remote로 보낼 때 가장 정확한 설명은?",options:["PC1은 R1의 물리 IP를 매번 새로 선택한다.","PC1은 VIP를 Virtual MAC으로 해석하고 현재 Active R1이 전달한다.","R1과 R2가 같은 프레임을 동시에 upstream으로 전달한다."],correct:1,
actual:"VIP/MAC 유지 · R1 Active가 Request 전달",reason:"PC1의 Gateway는 10.10.10.1이었고 ARP는 HSRPv2 Virtual MAC으로 해석됐습니다. 동일 Echo Request가 CP-R1-UP에서 확인됐습니다.",
state:"normal",event:"PC1 → VIP/Virtual MAC → R1 Active → R3",evidence:["PC1 GW 10.10.10.1","HSRP VMAC 00:00:0c:9f:f0:0a","R1 Active / R2 Standby","Echo 3/3, request on CP-R1-UP"]
},
{
id:"FHRP-02",title:"Priority / Hello",text:"선호 Active와 Peer 감시는 어떤 정보로 확인할까요?",start:["R1 priority 110","R2 priority 100","preempt both"],
question:"이번 HSRP baseline에서 R1이 선호 Active였던 조건은?",options:["R1 priority 110 > R2 100이고 두 Router의 상태가 Hello로 유지됐다.","PC1이 R1의 물리 MAC을 Default Gateway로 저장했기 때문이다.","R2의 uplink를 shutdown했기 때문이다."],correct:0,
actual:"R1 110 / R2 100 · HSRPv2 Hello 관측",reason:"Stable state는 R1 Active / R2 Standby였고 CP-LAN에서 HSRPv2 control을 직접 확인했습니다.",
state:"priority",event:"HSRPv2 Hello · R1 priority 110 / R2 100 · R1 Active",evidence:["HSRPv2 group 10","224.0.0.102 UDP 1985→1985","hello 3s / hold 10s 실제 관측","R1 Active / R2 Standby"]
},
{
id:"FHRP-03",title:"Active Failure",text:"R1의 LAN/FHRP 참여를 중단하면 Host 설정과 Forwarding Owner 중 무엇이 바뀔까요?",start:["R1 Active","R2 Standby","PC1 GW = VIP"],
question:"R1 LAN/FHRP interface를 shutdown한 뒤 가장 정확한 결과는?",options:["PC1 Gateway가 자동으로 10.10.10.3으로 바뀐다.","Virtual MAC이 R2 physical MAC으로 바뀐다.","PC1 Gateway/VIP MAC은 유지되고 R2가 Active가 되어 Request를 전달한다."],correct:2,
actual:"같은 VIP/MAC · Forwarding Owner R1 → R2",reason:"R1은 Init, R2는 Active가 됐고 PC1 Gateway와 HSRP Virtual MAC은 유지됐습니다. 안정화 후 Request는 CP-R2-UP로 이동했습니다.",
state:"failover",event:"R1 LAN/FHRP Down → R2 Standby→Active → Request Path R2",evidence:["R1 e0/0 administrative shutdown","PC1 VIP/VMAC unchanged","transition Echo 30/30","stable R2 forwarding 3/3"]
},
{
id:"FHRP-04",title:"Preemption Recovery",text:"높은 Priority Router가 복구되면 자동으로 역할을 되찾는다고 가정해도 될까요?",start:["R2 Active after failure","R1 priority 110","preempt enabled"],
question:"이번 Lab에서 R1 interface를 복구했을 때 실제 결과는?",options:["R2가 계속 Active로 남고 R1은 영구 Standby가 됐다.","R1이 preempt로 다시 Active가 되고 같은 VIP/MAC의 Request Path가 R1로 돌아왔다.","PC1의 Default Gateway를 수동 변경해야 했다."],correct:1,
actual:"R1 Active 복귀 · R2 Standby · VIP/MAC 유지",reason:"R1 priority 110과 preempt가 유지되어 복구 후 R1이 다시 Active가 됐습니다. 안정화 후 Request가 CP-R1-UP에서 확인됐습니다.",
state:"recovery",event:"R1 복구 → Preempt → R1 Active / R2 Standby",evidence:["R1 priority 110 retained","preempt retained","restore traffic Echo 30/30","stable R1 forwarding 3/3"]
},
{
id:"FHRP-05",title:"Upstream Tracking",text:"Client-facing LAN은 Up인데 upstream만 Down이면 무엇을 추적해야 할까요?",start:["R1 LAN Up","R1 upstream tracked","R1 110 / R2 100"],
question:"R1 upstream만 Down시키고 tracking decrement 20을 적용한 실제 결과는?",options:["R1 effective priority가 110→90으로 내려가 R2가 Active가 됐다.","R1 LAN이 Up이므로 역할은 절대 바뀌지 않았다.","PC1의 Gateway IP가 R2 physical IP로 변경됐다."],correct:0,
actual:"Track Down · 110→90 · R2 Active",reason:"R1 e0/0은 Up인 채 e0/1만 Down이었고 Track 1이 Down되며 Priority가 90으로 낮아졌습니다. 전환은 성공했지만 일시 손실/ICMP 오류도 관측됐습니다.",
state:"tracking",event:"R1 upstream Down · LAN Up → Track Down → 110→90 → R2 Active",evidence:["R1 LAN remained up/up","Track 1 Down","effective priority 90","failure Echo 28/30, recovery 27/30","stable after each transition 3/3"]
},
{
id:"FHRP-06",title:"VRRPv2 Failover",text:"VRRP도 같은 Virtual-Gateway 모델을 쓰지만 HSRP와 무엇이 다를까요?",start:["HSRP removed","VRRPv2 VRID 10","R1 110 / R2 100"],
question:"R1 VRRP/LAN 참여를 중단했을 때 실제 관측으로 맞는 것은?",options:["VRRP는 HSRP UDP/1985를 그대로 사용했다.","VRRPv3가 검증됐고 HSRP Virtual MAC도 그대로 사용했다.","R2가 Master가 되고 같은 VRRP VIP/MAC을 유지했으며 protocol 112 Advertisement가 관측됐다."],correct:2,
actual:"R2 Master · VRRP VIP/MAC 유지 · protocol 112",reason:"이번 Cisco IOL에서 실제 모드는 VRRPv2였습니다. R1 장애 시 R2가 Master가 됐고 복구 후 R1이 다시 Master가 됐습니다.",
state:"vrrp",event:"VRRPv2 · R1 LAN Down → R2 Backup→Master · same VRRP VIP/MAC",evidence:["VRRP version 2 실제 패킷","VMAC 00:00:5e:00:01:0a","224.0.0.18 · IP protocol 112 · TTL 255","failure Echo 29/30","restore 30/30 · final stable 3/3"]
}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function stateRow(label,value,kind){return '<div class="state-row"><span>'+label+'</span><strong class="'+(kind||'')+'">'+value+'</strong></div>';}
function clearTopo(){
all('[data-node]').forEach(function(n){n.classList.remove('active','standby','failed','track-low');});
all('[data-link]').forEach(function(n){n.classList.remove('path','failed','muted');});
all('[data-mobile-path]').forEach(function(n){n.classList.remove('path');});
}
function markNode(name,cls){all('[data-node="'+name+'"]').forEach(function(n){n.classList.add(cls);});}
function markLink(name,cls){all('[data-link="'+name+'"]').forEach(function(n){n.classList.add(cls);});}
function setRoles(r1,r2){
el('r1RoleD').textContent=r1;el('r1RoleM').textContent=r1;el('r2RoleD').textContent=r2;el('r2RoleM').textContent=r2;
}
function applyState(s){
clearTopo();markLink('pc-sw','path');all('[data-mobile-path]').forEach(function(n){n.classList.add('path');});
if(s==='normal'||s==='priority'||s==='recovery'){
 markNode('r1','active');markNode('r2','standby');markLink('sw-r1','path');markLink('r1-r3','path');markLink('sw-r2','muted');markLink('r2-r3','muted');
 setRoles(s==='priority'?'Active · 110 · Hello':'Active · priority 110','Standby · priority 100');
 el('states').innerHTML=stateRow('Host Gateway','10.10.10.1','ok')+stateRow('Virtual MAC','00:00:0c:9f:f0:0a','ok')+stateRow('Forwarding Owner','R1 Active','ok')+(s==='priority'?stateRow('Control','HSRPv2 Hello',''):stateRow('R2','Standby',''));
}
if(s==='failover'){
 markNode('r1','failed');markNode('r2','active');markLink('sw-r1','failed');markLink('r1-r3','muted');markLink('sw-r2','path');markLink('r2-r3','path');setRoles('Init · LAN Down','Active · priority 100');
 el('states').innerHTML=stateRow('Host Gateway','10.10.10.1','ok')+stateRow('HSRP Virtual MAC','유지','ok')+stateRow('Forwarding Owner','R2 Active','ok')+stateRow('R1','LAN/FHRP Down','bad');
}
if(s==='tracking'){
 markNode('r1','track-low');markNode('r2','active');markLink('sw-r1','muted');markLink('r1-r3','failed');markLink('sw-r2','path');markLink('r2-r3','path');setRoles('LAN Up · Track Down · 90','Active · 100');
 el('states').innerHTML=stateRow('R1 client LAN','Up','ok')+stateRow('R1 upstream','Down','bad')+stateRow('R1 effective priority','110 → 90','warn')+stateRow('Forwarding Owner','R2 Active','ok');
}
if(s==='vrrp'){
 markNode('r1','failed');markNode('r2','active');markLink('sw-r1','failed');markLink('r1-r3','muted');markLink('sw-r2','path');markLink('r2-r3','path');setRoles('Init/Down · VRRPv2','Master · priority 100');
 el('states').innerHTML=stateRow('Host Gateway','10.10.10.1','ok')+stateRow('VRRP Virtual MAC','00:00:5e:00:01:0a','ok')+stateRow('Forwarding Owner','R2 Master','ok')+stateRow('Control','IP protocol 112','');
}
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;clearTopo();},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
