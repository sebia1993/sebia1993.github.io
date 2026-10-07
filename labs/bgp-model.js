// Existing lesson data and topic renderer retained from bgp-simulator; playback is shared.
(()=>{
var lessons=[
{title:'AS 관계',id:'BGP-01',text:'eBGP와 iBGP를 케이블 모양이 아니라 AS 관계로 구분합니다.',start:['R1 AS65001','R2 AS65002','R3 AS65003','R4 AS65001'],question:'R1과 R4의 BGP 관계는 무엇일까요?',options:['eBGP — 서로 다른 AS이기 때문','iBGP — 같은 AS65001이기 때문','물리 링크만 보고는 구분할 수 없음'],correct:1,actual:'R1↔R4는 iBGP',observed:'같은 AS65001 · 세 Session Established',reason:'eBGP/iBGP는 물리 링크가 아니라 Local AS와 Peer AS의 관계로 정합니다. R1↔R2와 R1↔R3는 서로 다른 AS라 eBGP, R1↔R4는 같은 AS라 iBGP였습니다.',event:'세 BGP Session이 모두 Established. TCP/179 OPEN·KEEPALIVE·UPDATE가 세 링크에서 확인됐습니다.',state:'session',evidence:['R1-R2 = AS65001↔65002 eBGP','R1-R3 = AS65001↔65003 eBGP','R1-R4 = AS65001↔65001 iBGP','세 내부 링크에서 TCP/179 OPEN/KEEPALIVE/UPDATE 확인'],scope:'BGP Session 관계만 확인합니다. 수렴 시간은 이번 검증에서 일반화하지 않습니다.'},
{title:'Baseline Best',id:'BGP-03',text:'같은 Prefix의 후보 경로 두 개가 있을 때 통제된 조건에서 어떤 경로가 Best가 되는지 봅니다.',start:['TARGET 203.0.113.1/32','R2 AS_PATH 65002','R3 AS_PATH 65003 65003 65003','LOCAL_PREF 100 / 100'],question:'Weight와 LOCAL_PREF가 같고 R2의 AS_PATH가 더 짧다면 이번 Baseline에서 어느 경로가 선택됐을까요?',options:['R2 경로','R3 경로','둘 다 동시에 같은 Best Path'],correct:0,actual:'R2가 Best Path',observed:'RIB Next Hop 10.0.12.2 · Ping 3/3 R2 링크만',reason:'이번 Cisco 검증에서는 선행 조건을 같게 통제했고 R2의 AS_PATH가 더 짧았습니다. R1은 두 후보를 보유했지만 forwarding에는 R2 경로 하나가 선택됐습니다.',event:'Baseline: R2가 Best. marker 411 Request/Reply가 CP-R1-R2에서만 3개씩 관측됐습니다.',state:'baseline',evidence:['R1 두 후보 Weight=0, LOCAL_PREF=100','R2 AS_PATH=65002 · R3 AS_PATH=65003 65003 65003','R1 Best/RIB Next Hop=10.0.12.2','CP-R1-R2 marker 411 Ping 3/3 · R1-R3 동일 marker 0'],scope:'Cisco Best-Path 전체 순서를 일반화하지 않습니다. 이번 문제는 통제된 한 비교 상황입니다.'},
{title:'LOCAL_PREF Policy',id:'BGP-04',text:'R3에서 받은 TARGET의 LOCAL_PREF만 200으로 바꾸면 선택과 실제 전달 경로가 어떻게 변하는지 확인합니다.',start:['R2 LP100','R3 LP200','R3 AS_PATH는 더 김','TARGET 동일'],question:'R3의 AS_PATH가 더 길어도 LOCAL_PREF를 200으로 높인 뒤 이번 Lab에서 Best Path는 어디로 바뀌었을까요?',options:['계속 R2','R3','두 경로 모두 설치'],correct:1,actual:'R3로 Best Path 전환',observed:'RIB Next Hop 10.0.13.2 · Ping 3/3 R3 링크만',reason:'Route Policy가 R3 후보의 LOCAL_PREF를 200으로 바꾸자 Cisco의 통제된 비교에서 R3가 Best가 됐습니다. 정책 제거 후 LOCAL_PREF 100과 R2 Best로 복구됐습니다.',event:'Policy: R2 → R3. marker 421은 R3 링크, 복구 marker 431/441은 다시 R2 링크에서 3/3 관측됐습니다.',state:'policy',evidence:['R3 TARGET inbound route-map → LOCAL_PREF 200','R1 Best/RIB Next Hop 10.0.13.2','CP-R1-R3 marker 421 Ping 3/3','정책 제거 후 R2 Best·LP100 복구 및 marker 431/441 R2 링크'],scope:'LOCAL_PREF 정책은 Packet에 ACL을 거는 것이 아니라 Route Attribute를 바꾸어 Path 선택을 제어합니다.'},
{title:'iBGP 전달',id:'BGP-05',text:'R1이 선택한 경로를 같은 AS의 R4에 전달할 때 어떤 속성이 보였는지 확인합니다.',start:['R1↔R4 iBGP','R1→R4 next-hop-self 명시','현재 R3 Best','R3 LP200'],question:'R3 정책 상태에서 R4가 실제로 받은 조합은 무엇일까요?',options:['AS_PATH 65001 65003 65003 65003 · LP200 · NEXT_HOP R3','AS_PATH 65003 65003 65003 · LP200 · NEXT_HOP R1','AS_PATH 65002 · LP100 · NEXT_HOP R1'],correct:1,actual:'R3 AS_PATH + LP200, NEXT_HOP은 R1',observed:'65003 65003 65003 · 200 · 10.0.14.1',reason:'iBGP 광고 자체 때문에 AS65001이 AS_PATH에 추가되지 않았고 LOCAL_PREF 200이 내부에 전달됐습니다. NEXT_HOP=R1은 이번 Lab의 명시적 next-hop-self 설정 결과입니다.',event:'CP-R1-R4 UPDATE에서 baseline 65002/LP100 → policy 65003×3/LP200 → recovery 65002/LP100 순서를 확인했습니다.',state:'ibgp',evidence:['CP-R1-R4 frame 88: AS_PATH 65002 · LP100 · NH 10.0.14.1','frame 138: AS_PATH 65003 65003 65003 · LP200 · NH 10.0.14.1','frame 179: AS_PATH 65002 · LP100 · NH 10.0.14.1','next-hop-self는 R1→R4에 명시적으로 구성'],scope:'NEXT_HOP 변경을 iBGP의 자동 공통 동작으로 가르치지 않습니다. 이번 값은 explicit next-hop-self 구현 결과입니다.'},
{title:'Prefix Filter',id:'BGP-06',text:'R2가 가진 두 Prefix 중 Neighbor에게 어떤 Route를 보여줄지 Route Policy로 제어합니다.',start:['R2 TARGET + EXTRA 보유','TARGET-only outbound filter','R1에는 TARGET만','Packet ACL 아님'],question:'TARGET-only Prefix Filter를 제거하고 outbound Update를 다시 보내면 R1에서 무엇이 바뀔까요?',options:['EXTRA 198.51.100.2/32가 새로 보임','TARGET 203.0.113.1/32가 사라짐','데이터 Packet만 통과하고 Route는 그대로'],correct:0,actual:'EXTRA Route가 R1에 등장',observed:'필터 제거 → EXTRA 광고 · 재적용 → Withdrawal',reason:'Prefix Filter는 BGP Neighbor에게 광고할 Route의 범위를 제어합니다. 제거 후 EXTRA가 나타났고 재적용 후 Withdrawal로 사라졌으며 TARGET는 유지됐습니다.',event:'R2→R1에서 EXTRA advertisement frame 216, filter 재적용 후 withdrawal frame 239를 보존했습니다.',state:'filter',evidence:['R2 Local BGP Table: TARGET + EXTRA','TARGET-only filter baseline: R1 EXTRA 없음','필터 제거 후 R1/R4 EXTRA 등장','재적용 후 EXTRA 철회, TARGET/R2 Best 유지'],scope:'Prefix Filter는 데이터-plane Packet ACL이 아닙니다. “Route를 광고할지”를 제어합니다.'}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function stateRow(k,v,c){return '<div class="state-row"><span>'+k+'</span><b class="'+(c||'')+'">'+v+'</b></div>';}
function clearTopo(){['linkR2','linkR3','linkR4','nodeR1','nodeR2','nodeR3','nodeR4'].forEach(function(id){el(id).setAttribute('class',id.indexOf('link')===0?'link':'node');});el('labelR2').textContent='65002 · LP100';el('labelR3').textContent='65003×3 · LP100';el('labelR4').textContent='R4 · LP100';}
function applyState(s){
 clearTopo();
 if(s==='session'){
  ['linkR2','linkR3','linkR4','nodeR1','nodeR2','nodeR3','nodeR4'].forEach(function(id){el(id).classList.add('active');});
  el('states').innerHTML=stateRow('R1↔R2','eBGP Established','ok')+stateRow('R1↔R3','eBGP Established','ok')+stateRow('R1↔R4','iBGP Established','ok')+stateRow('Control Plane','TCP/179 BGP 확인','ok');return;
 }
 if(s==='baseline'){
  el('linkR2').classList.add('best');el('nodeR1').classList.add('best');el('nodeR2').classList.add('best');
  el('states').innerHTML=stateRow('Candidate','R2 + R3 두 개','ok')+stateRow('LOCAL_PREF','100 / 100','')+stateRow('Best Path','R2','ok')+stateRow('RIB Next Hop','10.0.12.2','ok');return;
 }
 if(s==='policy'){
  el('labelR3').textContent='65003×3 · LP200';el('labelR4').textContent='R4 · LP200';el('linkR3').classList.add('policy');el('nodeR1').classList.add('policy');el('nodeR3').classList.add('policy');
  el('states').innerHTML=stateRow('R2 LOCAL_PREF','100','')+stateRow('R3 LOCAL_PREF','200','warn')+stateRow('Best Path','R3','ok')+stateRow('Recovery','정책 제거 → R2','ok');return;
 }
 if(s==='ibgp'){
  el('labelR3').textContent='65003×3 · LP200';el('labelR4').textContent='R4 · LP200';el('linkR3').classList.add('policy');el('linkR4').classList.add('active');el('nodeR1').classList.add('active');el('nodeR4').classList.add('active');
  el('states').innerHTML=stateRow('R4 AS_PATH','65003 65003 65003','ok')+stateRow('R4 LOCAL_PREF','200','ok')+stateRow('R4 NEXT_HOP','10.0.14.1','ok')+stateRow('이유','next-hop-self 명시','warn');return;
 }
 if(s==='filter'){
  el('linkR2').classList.add('active');el('nodeR2').classList.add('active');el('nodeR1').classList.add('active');
  el('states').innerHTML=stateRow('Baseline Filter','TARGET only','')+stateRow('필터 제거','EXTRA 등장','warn')+stateRow('필터 재적용','EXTRA Withdrawal','ok')+stateRow('TARGET','계속 유지','ok');return;
 }
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;clearTopo();},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
