// Existing lesson data and topic renderer retained from vrf-simulator; playback is shared.
(()=>{
var baseBlue=["C 10.10.10.0/24 → e0/0","L 10.10.10.1/32 → e0/0","C 10.20.20.1/32 → Lo10"];
var baseRed=["C 10.10.10.0/24 → e0/1","L 10.10.10.1/32 → e0/1","C 10.30.30.1/32 → Lo20"];
var baseGlobal=["C 192.0.2.0/24 → e0/2","L 192.0.2.1/32 → e0/2"];
var lessons=[
{id:"VRF-01",title:"Separate Tables",text:"한 Router에서 BLUE·RED·Global은 같은 Table일까요?",start:["R1 1대","VRF BLUE / RED","Global default table"],question:"VRF를 만든 뒤 가장 정확한 설명은?",options:["BLUE와 RED Route는 결국 하나의 Global Table로 합쳐진다.","R1 안에 Global, BLUE, RED의 별도 Routing Context가 존재한다.","VRF는 L2 MAC Table만 분리하고 Routing Table은 공유한다."],correct:1,actual:"Global / BLUE / RED RIB를 각각 별도로 조회",reason:"show ip vrf와 각 RIB 조회에서 세 Routing Context가 독립적으로 확인됐습니다.",state:"tables",event:"R1 · VRF Context 3개 → 각 Routing Table을 별도로 조회",evidence:["VRF-01 PASS","show ip vrf: BLUE / RED","Global·BLUE·RED RIB snapshot","Cisco IOL 15.4(2)T4"]},
{id:"VRF-02",title:"Interface Membership",text:"Connected Route는 어느 Table에 설치될까요?",start:["e0/0 → BLUE","e0/1 → RED","e0/2 → Global"],question:"Ethernet0/0을 BLUE에 넣고 10.10.10.1/24를 설정한 결과는?",options:["10.10.10.0/24 Connected Route는 BLUE Table에 설치된다.","Connected Route는 항상 Global Table에만 설치된다.","같은 Prefix가 RED에도 있으면 BLUE Interface는 자동 Down된다."],correct:0,actual:"e0/0 Route는 BLUE · e0/1 Route는 RED",reason:"Interface의 VRF 소속과 Connected/Local Route의 RIB가 일치했습니다. VRF Route가 Global로 자동 복제되지 않았습니다.",state:"membership",event:"Interface Membership → 해당 VRF의 Connected/Local Route 설치",evidence:["VRF-02 PASS","e0/0·Lo10 = BLUE","e0/1·Lo20 = RED","e0/2 = Global"]},
{id:"VRF-03",title:"Overlapping Prefix",text:"BLUE와 RED가 같은 Gateway/Host IP를 동시에 쓸 수 있을까요?",start:["BLUE 10.10.10.0/24","RED 10.10.10.0/24","각기 별도 L2 link"],question:"이번 Lab에서 BLUE와 RED에 동일 10.10.10.1/24와 10.10.10.10/24를 사용한 결과는?",options:["중복 주소 오류로 한쪽 VRF가 비활성화됐다.","두 VRF가 하나로 합쳐져 같은 Host를 공유했다.","서로 다른 VRF/segment에서 동일 주소가 공존했고 각 local Ping이 3/3이었다."],correct:2,actual:"동일 Prefix/IP 공존 · BLUE/RED 각각 3/3",reason:"VRF가 Routing Context를 분리하므로 이번 격리 구성에서는 같은 Prefix와 같은 Host/Gateway 주소가 정상 공존했습니다.",state:"overlap",event:"BLUE와 RED · 같은 10.10.10.0/24를 서로 다른 Context에서 유지",evidence:["VRF-03 PASS","BLUE GW/Host = 10.10.10.1 / .10","RED GW/Host = 10.10.10.1 / .10","각 VRF Ping 3/3"]},
{id:"VRF-04",title:"Same Destination, Different Path",text:"Destination IP가 같으면 항상 같은 Interface로 나갈까요?",start:["Dst 10.10.10.10","BLUE test size 301","RED test size 302"],question:"같은 10.10.10.10으로 BLUE/RED VRF-aware Ping을 보냈을 때 실제 결과는?",options:["두 test 모두 e0/0으로 나갔다.","BLUE는 e0/0, RED는 e0/1로 나갔고 반대 링크에는 해당 marker가 없었다.","R1이 둘 중 한 Host를 임의로 선택했다."],correct:1,actual:"BLUE→e0/0 3/3 · RED→e0/1 3/3",reason:"Destination IP는 같지만 먼저 선택된 VRF Routing Table이 달라 서로 다른 출력 Interface가 결정됐습니다.",state:"same-dst",event:"Same Destination 10.10.10.10 · BLUE RIB→e0/0 / RED RIB→e0/1",evidence:["VRF-04 PASS","CP-BLUE frames 49/51/53 + replies","CP-RED frames 49/51/53 + replies","반대 링크 marker 0 · 양성 대조 완료"]},
{id:"VRF-05",title:"Default Isolation",text:"BLUE의 Route가 RED나 Global에 자동으로 보일까요?",start:["BLUE Lo10 10.20.20.1/32","RED Lo20 10.30.30.1/32","모든 physical link Up"],question:"BLUE에서 RED Loopback 10.30.30.1을 Lookup했을 때 실제 결과는?",options:["같은 R1 내부이므로 자동으로 RED Route를 사용한다.","Route는 없었고 packet이 어떤 physical link로도 나가지 않았다.","e0/1이 Down되어 실패했다."],correct:1,actual:"BLUE RIB에 Route 없음 · 링크는 정상 · Echo Reply 0/3",reason:"물리 장비와 Interface가 정상이어도 다른 VRF의 Route는 자동 공유되지 않습니다. 이번 실패 지점은 링크가 아니라 선택된 Table의 Route Lookup입니다.",state:"isolation",event:"VRF BLUE Lookup · 10.30.30.1 Route 없음 → R1에서 Stop",evidence:["VRF-05 PASS","RED 10.30.30.1/32 only in RED RIB","BLUE/Global 조회: not in table","cross-VRF Ping 0/3 · capture health verified"]},
{id:"VRF-06",title:"Selective Route Leak",text:"한 방향 Route Leak이 곧 양방향 Ping 성공일까요?",start:["BLUE에 Global /24 없음","Global 192.0.2.0/24","reverse route 미구성"],question:"192.0.2.0/24를 BLUE에 정적으로 Leak한 뒤 실제 결과는?",options:["Request도 못 나가므로 Leak은 실패했다.","Request 3개가 Global link로 나가고 Reply frame도 돌아왔지만 reverse route가 없어 원래 BLUE Ping은 0/3이었다.","Global과 BLUE Table 전체가 합쳐져 모든 Route가 공유됐다."],correct:1,actual:"선택 /24만 추가 · outbound 3/3 · original BLUE ping 0/3",reason:"Route Leak은 BLUE의 outbound lookup을 바꿨지만 Global에는 BLUE source로 돌아갈 Route가 없었습니다. 링크에서 Reply를 본 것과 BLUE Context에 Reply가 전달된 것은 다릅니다.",state:"leak",event:"BLUE Static Leak → Global e0/2 Request 3개 · Reply는 R1 Global ingress에서 Return Route 없음",evidence:["VRF-06 PASS (단방향 forwarding Claim)","S 192.0.2.0/24 via 192.0.2.10","CP-GLOBAL Request 74/79/82 · Reply 77/80/83","original BLUE ping Echo Reply 0/3","Leak 제거 후 baseline 복구 · 최종 각 Context 3/3"]}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function stateRow(label,value,kind){return '<div class="state-row"><span>'+label+'</span><strong class="'+(kind||'')+'">'+value+'</strong></div>';}
function ribHtml(items,extra){return items.map(function(x){return '<li>'+x+'</li>';}).join('')+(extra||'');}
function setRibs(mode){var extraBlue='';if(mode==='leak')extraBlue='<li class="added">S 192.0.2.0/24 → 192.0.2.10 (global)</li>';el('blueRib').innerHTML=ribHtml(baseBlue,extraBlue);el('redRib').innerHTML=ribHtml(baseRed);el('globalRib').innerHTML=ribHtml(baseGlobal);}
function clearTopo(){all('[data-node]').forEach(function(n){n.classList.remove('active','stop');});all('[data-link]').forEach(function(n){n.classList.remove('path','reply','muted','stop');});all('[data-mobile-link]').forEach(function(n){n.classList.remove('path','reply','stop');});}
function node(name,cls){all('[data-node="'+name+'"]').forEach(function(n){n.classList.add(cls);});}
function link(name,cls){all('[data-link="'+name+'"]').forEach(function(n){n.classList.add(cls);});all('[data-mobile-link="'+name+'"]').forEach(function(n){n.classList.add(cls);});}
function applyState(s){clearTopo();setRibs(s==='leak'?'leak':'base');
if(s==='tables'){node('r1','active');el('states').innerHTML=stateRow('Routing Context','3개','ok')+stateRow('BLUE','별도 RIB','ok')+stateRow('RED','별도 RIB','ok')+stateRow('Global','별도 RIB','ok');}
if(s==='membership'){node('r1','active');link('blue','path');link('red','path');link('global','path');el('states').innerHTML=stateRow('e0/0','VRF BLUE','ok')+stateRow('e0/1','VRF RED','ok')+stateRow('e0/2','Global','ok')+stateRow('Connected Route','각 소속 RIB','ok');}
if(s==='overlap'){node('blue','active');node('red','active');link('blue','path');link('red','path');el('states').innerHTML=stateRow('BLUE GW/Host','10.10.10.1 / .10','ok')+stateRow('RED GW/Host','10.10.10.1 / .10','ok')+stateRow('주소 충돌','관측 안 됨','ok')+stateRow('각 VRF Ping','3/3','ok');}
if(s==='same-dst'){node('r1','active');node('blue','active');node('red','active');link('blue','path');link('red','path');el('states').innerHTML=stateRow('Destination','둘 다 10.10.10.10','')+stateRow('BLUE','e0/0 · 3/3','ok')+stateRow('RED','e0/1 · 3/3','ok')+stateRow('반대 링크','marker 0','ok');}
if(s==='isolation'){node('r1','stop');link('blue','muted');link('red','muted');link('global','muted');el('states').innerHTML=stateRow('Selected Table','VRF BLUE','')+stateRow('Dst 10.30.30.1','Route 없음','warn')+stateRow('Physical Links','모두 Up','ok')+stateRow('Stop Point','R1 Lookup','warn');}
if(s==='leak'){node('r1','stop');node('global','active');link('global','path');el('states').innerHTML=stateRow('BLUE에 추가','192.0.2.0/24 S','ok')+stateRow('Outbound Request','3/3 on CP-GLOBAL','ok')+stateRow('Reply frame','3개 R1까지 관측','ok')+stateRow('Return Route','Global→10.20.20.1 없음','warn')+stateRow('Original BLUE Ping','0/3','warn')+stateRow('Recovery','Leak 제거 후 baseline','ok');el('scopeNote').innerHTML='<b>중요:</b> CP-GLOBAL에서 Echo Reply frame 3개가 보였지만 Global RIB에 BLUE source 10.20.20.1 경로가 없어 원래 BLUE Ping의 Echo Reply는 0/3입니다. 이 상태를 양방향 Reachability 성공으로 표시하지 않습니다.';return;}
el('scopeNote').innerHTML='<b>Lab 범위:</b> Router-origin VRF ping을 사용했습니다. Host-to-host Inter-VRF Routing, MP-BGP/MPLS, 동적 Route Import는 검증하지 않았습니다.';
}
const presentation={
 guideDifferences:[{name:'Router A',reason:'학습 페이지의 기존 상세 자료에 R1으로 기록된 같은 Router입니다. 실습에서는 짧은 장비 명명 규칙을 적용합니다.'},{name:'PC C',reason:'학습 페이지의 기존 상세 자료에 PC-GLOBAL로 기록된 Global 단말입니다. PC A(BLUE)·PC B(RED)와 구분하는 짧은 이름입니다.'}],
 names:{'PC-BLUE':'PC A','PC-RED':'PC B','PC-GLOBAL':'PC C',R1:'Router A'},
 labels:{'Global default table':'Global 기본 경로표','Routing Contexts':'Routing Context','Selected Table':'선택한 Routing Table','Physical Links':'물리 링크','Stop Point':'중단 위치','Destination':'목적지','Recovery':'복구','Original BLUE Ping':'원래 BLUE Ping','Outbound Request':'출력된 Echo Request','Reply frame':'관측된 Echo Reply','Return Route':'반환 경로','각 local Ping':'각 VRF의 Ping','별도 L2 link':'별도 L2 링크','reverse route':'반환 경로','모든 physical link Up':'모든 물리 링크 Up','BLUE test size':'BLUE Ping 크기','RED test size':'RED Ping 크기'},
 lessons:[
  {title:'한 Router 안의 경로표는 어떻게 나뉠까요?',brief:'학습 페이지의 BLUE·RED·Global 공간을 살펴봅니다. 장비는 하나여도 조회할 Routing Table은 구분됩니다.',hints:['VRF는 한 Router 안의 Routing Context를 나눕니다.','각 Context의 경로표를 따로 조회하는지 확인하세요.','BLUE·RED·Global이라는 이름은 조회 범위를 구분합니다.']},
  {title:'연결된 경로는 어느 경로표에 생길까요?',brief:'인터페이스 소속 → 해당 VRF의 Connected/Local Route 순서로 관찰합니다.',hints:['Ethernet0/0은 BLUE에 속합니다.','인터페이스 주소만 보지 말고 VRF 소속도 함께 보세요.','Global과 BLUE는 별도의 Routing Table입니다.']},
  {title:'같은 주소를 서로 다른 VRF에서 쓸 수 있을까요?',brief:'학습 페이지의 PC A·PC B는 같은 IP를 사용합니다. 각 VRF와 L2 구간이 분리된 조건을 함께 확인하세요.',hints:['PC A는 BLUE, PC B는 RED 공간에 있습니다.','같은 IP를 쓰는 두 단말이 같은 L2 구간에 있는지 확인하세요.','각 Context 안에서 수행한 Ping 결과를 비교하세요.']},
  {title:'같은 목적지도 출력 인터페이스가 달라질까요?',brief:'목적지보다 먼저 Context를 선택합니다. BLUE 경로표와 RED 경로표에서 같은 IP를 찾아보세요.',hints:['두 Ping의 목적지는 모두 10.10.10.10입니다.','먼저 선택한 Routing Table이 무엇인지 보세요.','각 표의 10.10.10.0/24 행에 적힌 인터페이스를 비교하세요.']},
  {title:'다른 VRF의 경로를 자동으로 쓸 수 있을까요?',brief:'물리 링크 정상 여부와 선택한 경로표의 Route 존재 여부를 구분합니다.',hints:['이번 조회는 BLUE Context에서 시작합니다.','10.30.30.1/32는 RED에 있는 Loopback입니다.','같은 Router 안에 있다는 이유로 다른 표까지 함께 찾지는 않습니다.']},
  {title:'경로를 공유하면 왕복 Ping도 성공할까요?',brief:'학습 페이지의 한 방향 Route Leak을 재현합니다. 나가는 경로, 링크의 Reply, 원래 BLUE Ping 결과를 구분하세요.',hints:['추가하는 경로는 BLUE의 192.0.2.0/24 한 개입니다.','돌아오는 패킷은 Global에서 10.20.20.1을 찾아야 합니다.','링크에서 Reply를 보는 것과 BLUE Context까지 전달되는 것은 다릅니다.']}
 ]
};
function vrfRows(rows){el('states').innerHTML=rows.map(r=>stateRow(...r)).join('');}
function vrfScene(rows,context=null,focusPrefix=null){clearTopo();setRibs('base');all('#simVisual .rib').forEach(x=>x.classList.remove('is-focus'));all('#simVisual .rib li').forEach(x=>x.classList.remove('is-focus'));if(context){const rib=el(context+'Rib');rib.parentElement.classList.add('is-focus');if(focusPrefix)Array.from(rib.children).filter(x=>x.textContent.includes(focusPrefix)).forEach(x=>x.classList.add('is-focus'));}vrfRows(rows);}
function vrfEvent(title,detail,kind,duration,action){return {title,detail,kind,duration,action:()=>{action();el('simVisual').dataset.reveal='events';}};}
function vrfPlan(i){const state=lessons[i].state;
 if(state==='tables')return [
  vrfEvent('하나의 Router, 세 Context','Router A 안에서 BLUE·RED·Global을 구분합니다. 선택한 Context의 표만 조회합니다.','조건',1800,()=>{vrfScene([['장비','Router A 1대'],['Routing Context','BLUE · RED · Global']]);node('r1','active');['blueRib','redRib','globalRib'].forEach(id=>el(id).replaceChildren());}),
  vrfEvent('BLUE Routing Table 조회','BLUE에는 e0/0의 10.10.10.0/24와 Loopback10의 10.20.20.1/32가 있습니다.','BLUE 조회',1800,()=>{vrfScene([['조회 범위','VRF BLUE'],['확인 경로','10.10.10.0/24 · 10.20.20.1/32']],'blue');el('redRib').replaceChildren();el('globalRib').replaceChildren();}),
  vrfEvent('RED Routing Table 조회','RED의 같은 10.10.10.0/24는 e0/1을 사용합니다. RED Loopback20도 별도로 있습니다.','RED 조회',1800,()=>{vrfScene([['조회 범위','VRF RED'],['같은 Prefix의 출력','e0/1']],'red');el('globalRib').replaceChildren();}),
  vrfEvent('Global까지 별도 조회','Global은 192.0.2.0/24를 갖습니다. 세 Routing Table이 하나로 합쳐지는 것은 아닙니다.','관찰 결과',1800,()=>vrfScene([['BLUE · RED · Global','각각 별도 RIB','ok'],['Global 연결 경로','192.0.2.0/24 → e0/2']],'global'))
 ];
 if(state==='membership')return [
  vrfEvent('인터페이스 소속 확인','e0/0은 BLUE, e0/1은 RED, e0/2는 Global 소속입니다.','조건',1800,()=>{vrfScene([['e0/0','BLUE'],['e0/1','RED'],['e0/2','Global']]);node('r1','active');}),
  vrfEvent('BLUE 인터페이스의 경로 설치','e0/0의 10.10.10.1/24로 생긴 Connected/Local Route는 BLUE RIB에 있습니다.','BLUE 경로',1800,()=>{vrfScene([['인터페이스','e0/0 → BLUE'],['Connected Route','10.10.10.0/24','ok'],['Local Route','10.10.10.1/32','ok']],'blue','10.10.10.');link('blue','path');}),
  vrfEvent('RED 인터페이스와 대조','e0/1의 같은 Prefix는 RED RIB에서 확인됩니다. 출력 인터페이스는 e0/1입니다.','RED 경로',1800,()=>{vrfScene([['인터페이스','e0/1 → RED'],['Connected Route','10.10.10.0/24 → e0/1','ok']],'red','10.10.10.');link('red','path');}),
  vrfEvent('Global 자동 복제 여부 확인','Global의 연결 경로는 e0/2의 192.0.2.0/24입니다. BLUE·RED Route가 자동 복제되지 않았습니다.','관찰 결과',1800,()=>vrfScene([['Global 연결 경로','192.0.2.0/24 → e0/2'],['VRF Route 자동 복제','없음','ok']],'global'))
 ];
 if(state==='overlap')return [
  vrfEvent('같은 주소, 분리된 공간','PC A와 PC B는 각각 BLUE·RED의 별도 L2 구간에서 10.10.10.10/24를 사용합니다.','조건',1800,()=>vrfScene([['PC A · BLUE','10.10.10.10/24'],['PC B · RED','10.10.10.10/24'],['L2 구간','서로 분리됨']])),
  vrfEvent('BLUE Context의 Ping 관찰','BLUE 표의 10.10.10.0/24 → e0/0 경로를 사용했습니다. 기존 BLUE Ping은 3/3이었습니다.','BLUE 관찰',1800,()=>{vrfScene([['BLUE 출력','e0/0 → PC A'],['기존 Ping','3/3','ok']],'blue','10.10.10.0/24');node('blue','active');link('blue','path');}),
  vrfEvent('RED Context의 Ping 관찰','RED 표에서는 같은 Prefix를 e0/1로 전달했습니다. 기존 RED Ping도 3/3이었습니다.','RED 관찰',1800,()=>{vrfScene([['RED 출력','e0/1 → PC B'],['기존 Ping','3/3','ok']],'red','10.10.10.0/24');node('red','active');link('red','path');}),
  vrfEvent('주소와 Context를 함께 해석','이번 분리 구성에서는 같은 Prefix·Host·Gateway 주소가 정상 공존했습니다.','관찰 결과',1650,()=>{vrfScene([['BLUE · RED 주소','같아도 각 Context에서 해석'],['기존 각 VRF Ping','각각 3/3','ok']]);node('blue','active');node('red','active');link('blue','path');link('red','path');})
 ];
 if(state==='same-dst')return [
  vrfEvent('동일 목적지 확인','두 Router-origin Ping의 목적지는 모두 10.10.10.10입니다. 시작 Context가 다릅니다.','조건',1800,()=>vrfScene([['목적지','10.10.10.10'],['시작 Context','BLUE / RED']])),
  vrfEvent('BLUE 표에서 목적지 Lookup','BLUE의 10.10.10.0/24는 e0/0을 가리킵니다. PC A 방향의 CP-BLUE에서 해당 Request/Reply가 3개씩 보였습니다.','BLUE Lookup',2100,()=>{vrfScene([['선택한 표','BLUE'],['출력','e0/0 → PC A','ok'],['기존 관측','Request / Reply 각 3개']],'blue','10.10.10.0/24');node('r1','active');node('blue','active');link('blue','path');}),
  vrfEvent('RED 표에서 같은 목적지 Lookup','RED의 10.10.10.0/24는 e0/1을 가리킵니다. PC B 방향의 CP-RED에서 해당 Request/Reply가 3개씩 보였습니다.','RED Lookup',2100,()=>{vrfScene([['선택한 표','RED'],['출력','e0/1 → PC B','ok'],['기존 관측','Request / Reply 각 3개']],'red','10.10.10.0/24');node('r1','active');node('red','active');link('red','path');}),
  vrfEvent('반대 링크까지 비교','각 Ping marker는 반대 링크에서 0개였습니다. 같은 목적지라도 Context에 따라 출력 경로가 달랐습니다.','관찰 결과',1800,()=>{vrfScene([['BLUE','e0/0 · 3/3','ok'],['RED','e0/1 · 3/3','ok'],['반대 링크','각 marker 0']]);link('blue','path');link('red','path');})
 ];
 if(state==='isolation')return [
  vrfEvent('BLUE Context에서 조회 시작','목적지는 RED Loopback 10.30.30.1이지만 이번 Ping의 조회 범위는 BLUE입니다.','조건',1800,()=>{vrfScene([['선택한 표','BLUE'],['목적지','10.30.30.1']],'blue');node('r1','active');}),
  vrfEvent('BLUE 표에서 Route 찾기','BLUE RIB에는 10.30.30.1로 가는 경로가 없습니다. RED 표의 경로를 자동으로 가져오지 않습니다.','Lookup',2100,()=>{vrfScene([['BLUE Lookup','10.30.30.1 Route 없음','warn'],['RED Route 자동 사용','하지 않음']],'blue');node('r1','stop');}),
  vrfEvent('물리 링크 상태와 분리','물리 링크는 모두 Up이었습니다. 중단 지점은 케이블이 아니라 Router A의 BLUE Route Lookup입니다.','중단 위치',1800,()=>{vrfScene([['물리 링크','모두 Up','ok'],['중단 위치','Router A · BLUE Lookup','warn']],'blue');node('r1','stop');}),
  vrfEvent('출력과 결과 확인','기존 cross-VRF Ping은 0/3이며 어떤 물리 링크로도 Request가 출력되지 않았습니다.','관찰 결과',1800,()=>{vrfScene([['물리 링크 출력','없음'],['기존 Ping','Echo Reply 0/3','warn']],'blue');node('r1','stop');})
 ];
 return [
  vrfEvent('경로 공유 전 Lookup','BLUE에는 Global의 192.0.2.0/24가 없습니다. 먼저 선택한 경로표에서 목적지 Route가 없는 상태를 확인합니다.','변경 전',1800,()=>vrfScene([['선택한 표','BLUE'],['192.0.2.0/24','Route 없음']],'blue')),
  vrfEvent('선택한 /24만 정적으로 추가','BLUE에 192.0.2.0/24 경로 하나를 추가합니다. Global 전체 표를 합치는 동작이 아닙니다.','Route Leak',2100,()=>{vrfScene([['BLUE 추가 Route','192.0.2.0/24 → 192.0.2.10','ok']],'blue');setRibs('leak');}),
  vrfEvent('나가는 Request 확인','BLUE의 새 경로로 Global e0/2에 Echo Request 3개가 출력됐습니다.','출력 관찰',1800,()=>{vrfScene([['출력 경로','Global e0/2 → PC C','ok'],['기존 Echo Request','3개','ok']],'blue');setRibs('leak');link('global','path');node('global','active');}),
  vrfEvent('Reply 수신과 반환 Lookup 구분','PC C가 보낸 Reply 3개는 Router A까지 왔지만, Global에는 원래 BLUE 출발지 10.20.20.1로 돌아갈 Route가 없습니다.','반환 Lookup',2400,()=>{vrfScene([['링크에서 관측한 Reply','3개'],['Global → 10.20.20.1','반환 Route 없음','warn'],['원래 BLUE Ping','0/3','warn']],'global');setRibs('leak');link('global','reply');node('r1','stop');}),
  vrfEvent('공유 경로 제거 후 복구 확인','기존 검증에서 Leak Route를 제거한 뒤 각 Context의 기본 대조 통신은 3/3으로 복구됐습니다. 한 방향 Leak 당시 BLUE Ping은 0/3입니다.','복구',2100,()=>{vrfScene([['BLUE의 192.0.2.0/24','제거 완료'],['각 Context 기본 대조 통신','각각 3/3 복구','ok'],['앞선 한 방향 Leak Ping','0/3']],'blue');})
 ];
}
const adapter={raw:lessons,kind:'state',presentation,buildPlan:vrfPlan,reset(i){index=i;recovered=false;clearTopo();['blueRib','redRib','globalRib','states'].forEach(id=>el(id).replaceChildren());all('#simVisual .rib').forEach(x=>x.classList.remove('is-focus'));},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
