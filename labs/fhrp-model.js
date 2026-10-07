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
adapter.presentation={guideDifferences:[{name:'Switch A',reason:'가상 Gateway와 단말을 연결하는 기존 실습의 L2 장비 SW1입니다.'},{name:'Router C',reason:'상위 경로 관찰을 위한 기존 실습의 원격 목적지 R3입니다. 학습 페이지의 Router A·B 역할 전환과 연결해 표시합니다.'}],names:{PC1:'PC A',SW1:'Switch A',R1:'Router A',R2:'Router B',R3:'Router C',Remote:'Router C'},labels:{'Host Gateway':'단말 Gateway','Forwarding Owner':'전달 담당 Router','Control':'제어 정보','client LAN':'단말 LAN','upstream':'상위 연결','effective priority':'실효 Priority','Virtual Gateway':'가상 Gateway','Active Failure':'Active 장애','Preemption Recovery':'Preemption 복구','Upstream Tracking':'상위 연결 추적','VRRPv2 Failover':'VRRPv2 역할 전환','Request Path':'Request 경로','same VRRP VIP/MAC':'동일한 VRRP VIP/MAC','Host':'단말','baseline':'기준 상태','Lab 설계 주의':'관찰 범위','return route':'돌아오는 경로','priority':'Priority','preempt both':'양쪽 Preemption 활성화','preempt enabled':'Preemption 활성화','physical IP':'물리 IP','physical MAC':'물리 MAC','failure':'장애','stable':'안정화 후'},lessons:[
 {title:'PC A의 Gateway와 실제 전달 담당은 같을까요?',brief:'학습 페이지의 가상 Gateway 모델입니다. PC A의 Gateway IP, ARP의 Virtual MAC, 실제 전달 Router를 차례로 확인합니다.',hints:['PC A는 가상 IP를 Gateway로 설정합니다.','가상 MAC과 Router의 물리 MAC을 구분하세요.','현재 Active Router가 실제로 전달합니다.']},
 {title:'어떤 조건으로 Active를 확인할까요?',brief:'Router A의 Priority 110과 Router B의 100을 비교합니다. 이번 HSRPv2의 Hello 관측과 안정화 후 역할을 확인하세요.',hints:['단말이 두 Router 중 하나를 직접 고르는 모델이 아닙니다.','이번 실습은 양쪽 Preemption이 활성화돼 있습니다.','Priority와 Hello 관측을 역할 상태와 함께 봅니다.']},
 {title:'Active 장애 때 단말의 Gateway도 바뀔까요?',brief:'Router A의 LAN/FHRP 참여만 중단합니다. 같은 VIP·Virtual MAC과 바뀌는 전달 담당을 구분하세요.',hints:['가상 Gateway와 물리 Router는 다른 개념입니다.','Router B는 같은 HSRP 그룹에 참여합니다.','Echo Request가 나가는 상위 링크를 확인하세요.']},
 {title:'Router A가 돌아오면 역할을 되찾을까요?',brief:'Router B가 Active인 장애 후 상태에서 시작합니다. Router A의 Priority와 Preemption 조건을 보고 복구를 관찰합니다.',hints:['복구됐다는 사실만으로 역할 복귀를 단정하지 않습니다.','이번 조건은 Router A의 더 높은 Priority와 Preemption 활성화입니다.','PC A의 Gateway를 수동 변경하는 과정은 없습니다.']},
 {title:'LAN은 Up인데 상위 링크만 끊기면?',brief:'Router A의 단말 LAN은 유지하고 상위 링크만 끊습니다. Track 상태 → Priority 변화 → 역할 전환 순서로 확인합니다.',hints:['단말 쪽 Interface는 계속 Up입니다.','Track에 연결된 감소값은 20입니다.','110에서 20을 뺀 값과 Router B의 100을 비교하세요.']},
 {title:'VRRPv2에서도 가상 Gateway는 유지될까요?',brief:'기존 HSRP를 제거하고 VRRPv2로 따로 검증한 조건입니다. VRRP의 VIP·MAC과 Master 전환을 확인합니다.',hints:['이번 실제 검증은 VRRPv2입니다.','HSRP와 VRRP의 Virtual MAC을 서로 같다고 가정하지 마세요.','학습 페이지의 현행 VRRPv3 설명과 기존 VRRPv2 실측을 구분합니다.']}
]};
const fhrpTopology=document.querySelector('#simVisual .topology');
const fhrpMarker=document.createElement('span');fhrpMarker.className='fhrp-packet';fhrpMarker.hidden=true;fhrpTopology.append(fhrpMarker);
function fhrpCenter(id){const n=all('[data-node="'+id+'"]').find(n=>n.getBoundingClientRect().width>0),r=n.getBoundingClientRect(),s=fhrpTopology.getBoundingClientRect();return{x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2};}
function fhrpMove(route,p){const pts=route.map(fhrpCenter),t=Math.min(pts.length-1-.00001,Math.max(0,p)*(pts.length-1)),a=pts[Math.floor(t)],b=pts[Math.floor(t)+1];fhrpMarker.hidden=false;fhrpMarker.style.left=(a.x+(b.x-a.x)*(t%1))+'px';fhrpMarker.style.top=(a.y+(b.y-a.y)*(t%1))+'px';}
function fhrpStart(protocol='HSRP'){clearTopo();fhrpMarker.hidden=true;setRoles('Priority 110','Priority 100');$('states').innerHTML=stateRow('단말 Gateway','10.10.10.1','')+stateRow('관찰 대상',protocol,'');}
function fhrpBaseline(vrrp=false){applyState('normal');fhrpMarker.hidden=true;if(vrrp){setRoles('Master · Priority 110','Backup · Priority 100');$('states').innerHTML=stateRow('단말 Gateway','10.10.10.1','ok')+stateRow('VRRP Virtual MAC','00:00:5e:00:01:0a','ok')+stateRow('전달 담당 Router','Router A Master','ok');}}
const fhrpReset=adapter.reset;adapter.reset=function(i){fhrpReset(i);fhrpStart(lessons[i].state==='vrrp'?'VRRPv2':'HSRPv2');};
adapter.buildPlan=function(i,mode='normal'){
 if(mode!=='normal')return null;const l=lessons[i],ev=(title,detail,duration,action,route,packet='IPv4')=>({title,detail,kind:route?'경로 관찰':'역할 확인',duration,action(){action();fhrpMarker.textContent=packet;},animate:route?p=>fhrpMove(route,Math.min(1,Math.max(0,(p*duration-1050)/((route.length-1)*420)))):undefined});
 const forward=(owner)=>ev('현재 전달 담당의 경로를 따라갑니다',i===4?'전환 후 안정화된 Echo Request는 Router B 방향입니다. 전환 중 손실과 ICMP 오류가 있었으므로 무손실로 표현하지 않습니다.':'Echo Request가 선택된 상위 링크로 전달됩니다. 돌아오는 경로는 기존 실험에서 Router B로 고정되어 담당 판정에 사용하지 않습니다.',2490,()=>adapter.show(),['pc1','sw1',owner,'r3']);
 if(l.state==='normal')return[
 ev('PC A의 Gateway 설정을 읽습니다','PC A는 Router의 물리 주소 대신 VIP 10.10.10.1을 사용합니다.',1050,()=>fhrpStart()),
 ev('ARP에서 Virtual MAC을 확인합니다','기존 HSRPv2 검증의 VIP는 00:00:0c:9f:f0:0a로 해석됐습니다.',1470,()=>{$('states').innerHTML+=stateRow('Virtual MAC','00:00:0c:9f:f0:0a','ok');markNode('pc1','active');}),
 ev('현재 Active Router를 확인합니다','이번 기준 상태는 Router A Active / Router B Standby입니다.',1230,()=>adapter.show()),forward('r1')];
 if(l.state==='priority')return[
 ev('두 Router의 Priority를 비교합니다','Router A는 110, Router B는 100이고 양쪽 Preemption이 활성화돼 있습니다.',1050,()=>fhrpStart()),
 ev('HSRPv2 Hello로 상태를 확인합니다','CP-LAN에서 HSRPv2 Hello를 관찰했습니다. 기존 관측 주기는 Hello 3초·Hold 10초이며 재생 속도와는 다릅니다.',2070,()=>{fhrpStart();$('states').innerHTML+=stateRow('제어 정보','HSRPv2 Hello','');},['r1','sw1','r2'],'HSRP'),
 ev('안정화 후 역할을 대조합니다',l.reason,1470,()=>adapter.show()),forward('r1')];
 if(l.state==='recovery')return[
 ev('장애 후 Router B가 전달하고 있습니다','같은 VIP·Virtual MAC을 유지하며 Router B가 Active인 상태에서 복구를 시작합니다.',1230,()=>{applyState('failover');fhrpMarker.hidden=true;}),
 ev('Router A 복구와 Preemption 조건을 확인합니다','Router A가 Priority 110으로 복구됩니다. 이번 실습은 Preemption이 활성화돼 있습니다.',1470,()=>{clearTopo();setRoles('복구 · Priority 110 · Preemption','Active · Priority 100');fhrpMarker.hidden=true;$('states').innerHTML=stateRow('단말 Gateway','10.10.10.1','ok')+stateRow('복구 조건','Router A · Preemption 활성화','');}),
 ev('Router A가 다시 Active가 됩니다',l.reason,1470,()=>adapter.show()),forward('r1')];
 const vrrp=l.state==='vrrp';const plan=[ev(vrrp?'VRRPv2 기준 상태를 확인합니다':'장애 전 전달 담당을 확인합니다',vrrp?'HSRP를 제거한 별도 VRRPv2 검증입니다. VRRP VIP·MAC과 Router A Master / Router B Backup 상태로 시작합니다.':'Router A가 전달하고 Router B가 대기합니다. PC A의 Gateway는 VIP 10.10.10.1입니다.',1230,()=>fhrpBaseline(vrrp))];
 if(l.state==='tracking'){
 plan.push(ev('단말 LAN은 유지하고 상위 링크만 끊습니다','Router A의 e0/0은 Up입니다. e0/1 장애를 Track 1에서 확인합니다.',1470,()=>{clearTopo();markNode('r1','track-low');markLink('r1-r3','failed');setRoles('LAN Up · 상위 링크 Down','Priority 100');$('states').innerHTML=stateRow('Router A 단말 LAN','Up','ok')+stateRow('상위 링크','Down','bad')+stateRow('Track 1','Down','bad');fhrpMarker.hidden=true;}));
 plan.push(ev('Track 감소값을 Priority에 반영합니다','110 − 20 = 90입니다. Router B의 Priority 100보다 낮아집니다.',1470,()=>{$('states').innerHTML+=stateRow('Router A 실효 Priority','110 → 90','warn');setRoles('LAN Up · Track Down · 90','Priority 100');}));
 }else plan.push(ev('Router A의 LAN/FHRP 참여를 중단합니다','Router A의 LAN Interface를 shutdown합니다. PC A의 Gateway 설정은 바꾸지 않습니다.',1470,()=>{clearTopo();markNode('r1','failed');markLink('sw-r1','failed');setRoles('Init · LAN Down',vrrp?'Backup · Priority 100':'Standby · Priority 100');$('states').innerHTML=stateRow('단말 Gateway','10.10.10.1','ok')+stateRow(vrrp?'VRRP Virtual MAC':'HSRP Virtual MAC',vrrp?'00:00:5e:00:01:0a':'00:00:0c:9f:f0:0a','ok')+stateRow('Router A','LAN/FHRP Down','bad');fhrpMarker.hidden=true;}));
 plan.push(ev(vrrp?'Router B가 Master가 됩니다':'Router B가 Active가 됩니다',l.reason,1470,()=>adapter.show()),forward('r2'));return plan;
};

NetworkSimulator.mount(adapter);
})();
