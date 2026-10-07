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
// Display names follow the current Concept Guide; immutable lesson/evidence data remains above.
const presentation={
 names:{R1:'Router A',R2:'Router B',R3:'Router C',R4:'Router D'},
 labels:{'Baseline':'기본 상태','Recovery':'복구','Candidate':'후보 경로','Control Plane':'제어 영역','TARGET only':'TARGET만 허용','TARGET-only outbound filter':'TARGET만 허용하는 outbound filter','TARGET 동일':'목적지 Prefix 동일','explicit next-hop-self':'명시적 next-hop-self'},
 lessons:[
  {title:'같은 AS의 두 Router는 어떤 관계일까요?',brief:'학습 페이지의 AS 구분을 적용합니다. Router A·D와 Router B·C의 AS 번호를 비교하세요.',hints:['케이블 모양이 아니라 양 끝 장비의 AS 번호를 보세요.','eBGP와 iBGP는 서로 다른 AS인지, 같은 AS인지로 구분합니다.','Router A와 Router D는 모두 AS 65001에 속합니다.']},
  {title:'선호도가 같다면 어떤 후보를 선택할까요?',brief:'같은 목적지 Prefix의 두 후보를 비교합니다. 이번 검증에서는 Weight와 LOCAL_PREF 등 선행 조건을 같게 통제했습니다.',hints:['두 후보는 같은 203.0.113.1/32에 대한 경로입니다.','LOCAL_PREF는 모두 100입니다. AS_PATH를 비교하세요.','AS_PATH의 반복된 AS 번호는 실제 Router 대수를 뜻하지 않습니다.']},
  {title:'선호 정책을 바꾸면 더 긴 경로도 선택될까요?',brief:'학습 페이지의 Router B → Router C 전환을 관찰합니다. LOCAL_PREF 변경, RIB 반영, 정책 제거 후 복구를 구분하세요.',hints:['Router C의 AS_PATH는 정책을 바꿔도 그대로입니다.','바뀌는 값은 Router C 후보의 LOCAL_PREF 100 → 200입니다.','이번 Cisco 비교에서는 LOCAL_PREF가 AS_PATH보다 먼저 고려됐습니다.']},
  {title:'같은 AS 내부에는 어떤 속성이 전달될까요?',brief:'선택한 경로를 Router D에 광고합니다. AS_PATH와 LOCAL_PREF 전달, 명시적 next-hop-self 설정을 따로 확인하세요.',hints:['Router A와 Router D는 같은 AS입니다.','iBGP 광고 자체가 자신의 AS를 AS_PATH에 추가하는지 생각해 보세요.','NEXT_HOP은 이번 실습에 명시한 next-hop-self 설정과 연결해 보세요.']},
  {title:'광고 필터를 제거하면 어떤 경로가 보일까요?',brief:'경로 선택과 경로 광고는 다른 판단입니다. Router B가 보유한 두 Prefix 중 Router A에 보이는 범위의 변화를 관찰하세요.',hints:['Router B 자체에는 TARGET과 EXTRA가 모두 있습니다.','Prefix Filter는 데이터 Packet이 아니라 광고할 Route를 고릅니다.','필터를 제거한 장면과 다시 적용한 장면을 비교하세요.']}
 ]
};
function bgpRows(rows){el('states').innerHTML=rows.map(r=>stateRow(...r)).join('');}
function bgpClear(){clearTopo();el('labelR2').textContent='관찰 대기';el('labelR3').textContent='관찰 대기';el('labelR4').textContent='관찰 대기';el('routeCandidates').replaceChildren();el('states').replaceChildren();}
function bgpMark(ids,cls='active'){ids.forEach(id=>el(id).classList.add(cls));}
function candidateHtml(name,path,lp,status,cls=''){return '<article class="route-candidate '+cls+'"><h3>'+name+' 후보</h3><p>Prefix · 203.0.113.1/32</p><p>AS_PATH · '+path+'</p><p>LOCAL_PREF · '+lp+'</p><p class="route-status">'+status+'</p></article>';}
function candidates(lp=100,selected=''){el('routeCandidates').innerHTML=candidateHtml('Router B','65002',100,selected==='B'?'Best Path로 선택':'후보 경로',selected==='B'?'is-selected':'')+candidateHtml('Router C','65003 65003 65003',lp,selected==='C'?'Best Path로 선택':'후보 경로',selected==='C'?'is-selected':lp===200?'is-focus':'');el('labelR2').textContent='eBGP';el('labelR3').textContent='eBGP';}
function bgpScene(rows,ids=[],cls='active',lp=null,chosen=''){bgpClear();if(lp!==null)candidates(lp,chosen);bgpMark(ids,cls);bgpRows(rows);}
function bgpEvent(title,detail,kind,duration,action){return {title,detail,kind,duration,action:()=>{action();el('simVisual').dataset.reveal='events';}};}
function bgpPlan(i){const state=lessons[i].state;
 if(state==='session')return [
  bgpEvent('AS 번호 비교','Router A·D는 AS 65001, Router B는 AS 65002, Router C는 AS 65003입니다.','조건',1800,()=>bgpScene([['Router A · Router D','AS 65001'],['Router B · Router C','AS 65002 · AS 65003']],['nodeR1','nodeR4'])),
  bgpEvent('외부 AS와의 관계','Router A–B와 Router A–C는 서로 다른 AS를 연결하는 eBGP 관계입니다.','AS 비교',1800,()=>{bgpScene([['Router A ↔ Router B','eBGP','ok'],['Router A ↔ Router C','eBGP','ok']],['nodeR1','nodeR2','nodeR3','linkR2','linkR3']);el('labelR2').textContent='eBGP';el('labelR3').textContent='eBGP';}),
  bgpEvent('같은 AS 내부의 관계','Router A와 Router D는 같은 AS 65001의 iBGP 관계입니다. 케이블 종류로 구분하지 않습니다.','AS 비교',1800,()=>{bgpScene([['Router A ↔ Router D','같은 AS 65001 → iBGP','ok']],['nodeR1','nodeR4','linkR4']);el('labelR4').textContent='iBGP';}),
  bgpEvent('기존 검증 결과 대조','세 BGP Session은 Established였고 내부 링크에서 TCP/179 BGP 메시지가 확인됐습니다.','관찰 결과',1650,()=>{applyState('session');el('labelR2').textContent='eBGP';el('labelR3').textContent='eBGP';el('labelR4').textContent='iBGP';})
 ];
 if(state==='baseline')return [
  bgpEvent('같은 Prefix의 두 후보','Router B와 Router C가 알린 203.0.113.1/32 후보를 함께 비교합니다.','후보',1800,()=>bgpScene([['목적지 Prefix','203.0.113.1/32'],['후보 수','Router B · Router C']],['nodeR2','nodeR3'],'active',100)),
  bgpEvent('선행 조건과 AS_PATH 비교','이번 검증은 Weight 0, LOCAL_PREF 100 등 선행 조건이 같습니다. Router B의 AS_PATH는 65002 한 항목입니다.','판단',2100,()=>bgpScene([['Weight','0 / 0'],['LOCAL_PREF','100 / 100'],['AS_PATH','65002 / 65003 65003 65003']],['nodeR1'],'active',100)),
  bgpEvent('Best Path와 RIB 반영','통제된 비교 결과 Router B가 선택됐고 RIB Next Hop은 10.0.12.2입니다.','선택',1650,()=>bgpScene([['Best Path','Router B','ok'],['RIB Next Hop','10.0.12.2','ok']],['nodeR1','nodeR2','linkR2'],'best',100,'B')),
  bgpEvent('실제 전달 근거 확인','기존 marker 411 Ping은 Router A–B 링크에서만 Request/Reply 각각 3개가 관측됐습니다. 전체 BGP 선택 순서의 검증은 아닙니다.','관찰 결과',2100,()=>bgpScene([['관측 링크','Router A ↔ Router B','ok'],['기존 Ping','3/3','ok'],['반대 후보 링크','같은 marker 0']],['nodeR1','nodeR2','linkR2'],'best',100,'B'))
 ];
 if(state==='policy')return [
  bgpEvent('변경 전 후보 확인','두 LOCAL_PREF가 모두 100인 기본 상태에서는 Router B를 선택했습니다.','변경 전',1650,()=>bgpScene([['기본 LOCAL_PREF','100 / 100'],['기본 Best Path','Router B']],['nodeR1','nodeR2','linkR2'],'best',100,'B')),
  bgpEvent('Router C의 LOCAL_PREF 변경','inbound route-map으로 TARGET 후보의 LOCAL_PREF만 200으로 올립니다. AS_PATH는 바뀌지 않습니다.','정책',2100,()=>bgpScene([['Router B LOCAL_PREF','100 유지'],['Router C LOCAL_PREF','100 → 200','warn'],['Router C AS_PATH','65003 65003 65003 유지']],['nodeR3'],'policy',200)),
  bgpEvent('선택과 전달 경로 전환','Router C가 Best Path가 되며 RIB Next Hop은 10.0.13.2입니다. 기존 marker 421 Ping은 해당 링크에서 3/3이었습니다.','선택',2100,()=>bgpScene([['Best Path','Router C','ok'],['RIB Next Hop','10.0.13.2','ok'],['기존 Ping','Router A–C에서 3/3','ok']],['nodeR1','nodeR3','linkR3'],'policy',200,'C')),
  bgpEvent('정책 제거 후 복구','기존 검증에서 정책 제거 후 LOCAL_PREF 100과 Router B Best로 돌아왔습니다. marker 431/441도 Router A–B에서 관측됐습니다.','복구',2100,()=>bgpScene([['LOCAL_PREF','100 / 100 복구'],['Best Path','Router B 복구','ok'],['RIB Next Hop','10.0.12.2','ok']],['nodeR1','nodeR2','linkR2'],'best',100,'B'))
 ];
 if(state==='ibgp')return [
  bgpEvent('광고할 선택 경로 확인','Router A가 선택한 Router C 경로의 AS_PATH와 LOCAL_PREF를 확인합니다.','조건',1800,()=>bgpScene([['선택 경로','Router C'],['AS_PATH','65003 65003 65003'],['LOCAL_PREF','200']],['nodeR1','nodeR3','linkR3'],'policy',200,'C')),
  bgpEvent('같은 AS로 속성 전달','Router D의 AS_PATH에는 AS 65001이 새로 추가되지 않았고 LOCAL_PREF 200이 전달됐습니다.','iBGP 광고',2100,()=>{bgpScene([['Router D AS_PATH','65003 65003 65003','ok'],['Router D LOCAL_PREF','200','ok']],['nodeR1','nodeR4','linkR4']);el('labelR4').textContent='iBGP';}),
  bgpEvent('명시적 next-hop-self 적용 결과','Router A→D에 설정한 next-hop-self 때문에 Router D의 NEXT_HOP은 Router A 주소 10.0.14.1입니다.','속성 확인',2100,()=>{bgpScene([['Router D NEXT_HOP','10.0.14.1','ok'],['설정 근거','Router A → D next-hop-self'],['주의','iBGP의 자동 공통 동작으로 일반화하지 않음']],['nodeR1','nodeR4','linkR4']);el('labelR4').textContent='iBGP';}),
  bgpEvent('수신한 속성 조합 확인','기존 UPDATE에서 긴 AS_PATH, LOCAL_PREF 200, NEXT_HOP 10.0.14.1의 조합을 함께 확인했습니다.','관찰 결과',1800,()=>{applyState('ibgp');el('labelR2').textContent='eBGP';el('labelR3').textContent='eBGP';el('labelR4').textContent='iBGP';})
 ];
 return [
  bgpEvent('보유 경로와 광고 경로 구분','Router B는 TARGET과 EXTRA를 모두 보유하지만 기본 필터는 TARGET만 광고합니다.','변경 전',2100,()=>{bgpScene([['Router B 보유','TARGET · EXTRA'],['Router A 수신','TARGET만'],['광고 정책','TARGET만 허용']],['nodeR2','nodeR1']);el('labelR2').textContent='eBGP';}),
  bgpEvent('outbound Prefix Filter 제거','광고 허용 범위를 바꾸고 outbound Update를 다시 보냅니다. 데이터 Packet ACL 변경과는 다릅니다.','정책',1800,()=>bgpScene([['변경 지점','Router B outbound Prefix Filter'],['처리 대상','BGP Route Advertisement']],['nodeR2'],'policy')),
  bgpEvent('EXTRA 경로 광고와 수신','EXTRA 198.51.100.2/32가 Router A와 Router D에 나타났습니다. TARGET도 유지됩니다.','광고',2100,()=>{bgpScene([['EXTRA 198.51.100.2/32','Router A · Router D에 등장','ok'],['TARGET 203.0.113.1/32','유지','ok']],['nodeR1','nodeR2','nodeR4','linkR2','linkR4']);el('labelR2').textContent='eBGP';el('labelR4').textContent='iBGP';}),
  bgpEvent('필터 재적용 후 철회','필터를 다시 적용하자 EXTRA Withdrawal이 확인됐습니다. TARGET과 Router B Best는 유지됐습니다.','복구',2100,()=>{bgpScene([['EXTRA','Withdrawal → 경로에서 제거','ok'],['TARGET','유지','ok'],['Best Path','Router B 유지','ok']],['nodeR1','nodeR2','linkR2'],'best');el('labelR2').textContent='eBGP';})
 ];
}
const adapter={raw:lessons,kind:'state',presentation,buildPlan:bgpPlan,reset(i){index=i;recovered=false;bgpClear();},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
