// Existing lesson data and topic renderer retained from redistribution-simulator; playback is shared.
(()=>{
var lessons=[
{title:'경계가 없으면?',id:'REDIST-01/03',text:'R1이 OSPF TARGET을 알고 있어도 BGP에 명시적으로 주입하지 않으면 R3에는 보이지 않습니다.',start:['R1 TARGET = OSPF Internal','R1-R3 eBGP Established','OSPF→BGP 아직 없음'],question:'이 상태에서 R3의 BGP Table에 TARGET 10.10.10.10/32가 자동으로 보일까요?',options:['보인다 — R1이 두 Protocol을 모두 실행하니까','보이지 않는다 — 명시적 Redistribution이 필요하다','BGP Session이 Down된다'],correct:1,actual:'재분배 전에는 R3 TARGET 없음',observed:'Redistribution 적용 후 TARGET 등장 · AS_PATH 65001',reason:'Routing Protocol은 서로의 Route를 자동 교환하지 않습니다. R1 OSPF_TO_BGP가 TARGET을 Permit한 뒤에야 R3로 BGP UPDATE가 전송됐습니다. 이번 Run의 R3 Actual은 AS_PATH 65001, NEXT_HOP 10.0.13.1, ORIGIN incomplete, MED 11입니다.',event:'TARGET은 R1 OSPF에 먼저 존재했고, R1→R3 BGP UPDATE frame 166에서 처음 광고됐습니다.',state:'target',evidence:['R1 OSPF TARGET 존재 · R3 BGP TARGET baseline 부재','R1-R3 eBGP Session Established 양성 대조','OSPF_TO_BGP 적용 후 R3 TARGET 등장','CP-R1-R3 frame 166 · AS_PATH 65001 · NEXT_HOP 10.0.13.1 · ORIGIN incomplete · MED 11'],scope:'ORIGIN incomplete와 MED 11은 이번 Cisco IOL/run Actual입니다. 모든 Redistribution의 고정값으로 일반화하지 않습니다.'},
{title:'Static → OSPF',id:'REDIST-02',text:'Static Route를 OSPF에 주입하면 OSPF는 그것을 외부 Route로 표현할 수 있습니다.',start:['R2 Static 198.51.100.0/24','시작 Metric 20','Metric type E1','Tag 65002'],question:'R1에서 이 Route를 실제로 관측한 형태는 무엇일까요?',options:['OSPF Internal Route, Tag 없음','OSPF External E1, Type 5 LSA, Tag 65002','eBGP Route, AD20'],correct:1,actual:'OSPF External Type 1 + Tag 65002',observed:'Type5 LSA seed20 · R1 RIB O E1 metric30',reason:'R2가 Static Route를 OSPF로 재분배하면서 E1과 Tag를 명시했습니다. R1은 Type 5 LSA와 Tag 65002를 확인했고, Routing Table metric은 시작값20에 R2까지의 OSPF 내부 cost10이 더해져 30이었습니다.',event:'CP-R1-R2에서 Type 5 LSA initial 153 → flush 185 → recovery 220을 관측했습니다.',state:'external',evidence:['R2 Static Null0 198.51.100.0/24','OSPF Type 5 · metric type 1 · seed metric 20 · tag 65002','R1 RIB O E1 metric30','제거 시 RIB/LSDB 부재, 재적용 후 동일 속성 복구'],scope:'Route Tag는 경로 선호 숫자가 아닙니다. Policy가 나중에 Match할 수 있는 행정용 표식입니다.'},
{title:'Prefix Policy',id:'REDIST-04',text:'같은 OSPF Domain의 Route라도 Route-map에서 Permit하지 않으면 BGP로 넘기지 않을 수 있습니다.',start:['TARGET은 Permit','BLOCK 10.10.20.20/32는 OSPF에 존재','BLOCK Permit 없음'],question:'BLOCK Prefix용 임시 Permit을 하나 추가하면 R3에서는 어떻게 될까요?',options:['BLOCK이 BGP Route로 나타난다','TARGET이 사라진다','데이터 Packet만 통과하고 BGP Table은 그대로다'],correct:0,actual:'BLOCK이 R3 BGP에 등장',observed:'Permit 추가 → Advertisement · Permit 제거 → Withdrawal',reason:'Route-map은 Routing Information을 선별합니다. BLOCK Prefix를 Permit한 동안만 R3에 광고됐고 제거 후 자동 재평가되어 철회됐습니다. TARGET은 전체 과정에서 유지됐습니다.',event:'CP-R1-R3 BLOCK advertisement frame 195 · withdrawal frame 215 · TARGET withdrawal 없음.',state:'block',evidence:['R1 OSPF에는 BLOCK 존재','Baseline R3 BGP BLOCK 부재 + TARGET 양성 대조','임시 permit20 → R3 BLOCK 등장','permit20 제거 → BLOCK Withdrawal · TARGET 유지'],scope:'Route-map Permit/Deny는 Packet ACL이 아닙니다. 경계를 넘길 Route 정보를 선택합니다.'},
{title:'Tag Guard',id:'REDIST-05',text:'Prefix는 허용돼도 앞선 Tag Deny가 먼저 Match하면 재분배를 막을 수 있습니다.',start:['TAGGED = OSPF E1','Tag 65002','seq5 deny tag65002','seq15 permit TAGGED prefix'],question:'seq5 Tag Deny만 제거하고 seq15 Prefix Permit은 그대로 두면 R3에서 무엇이 보일까요?',options:['TAGGED Route가 BGP로 광고된다','Tag 값이 Metric으로 바뀐다','BGP Session이 Reset된다'],correct:0,actual:'TAGGED Route가 R3에 광고됨',observed:'deny5 제거 → Advertisement · 복구 → Withdrawal',reason:'Route-map은 위에서 아래로 평가됩니다. Baseline에서는 seq5가 먼저 Tag 65002를 Match해 중단시켰습니다. seq5만 제거하자 뒤의 seq15 Prefix Permit이 적용됐고, seq5를 복구하자 다시 철회됐습니다.',event:'CP-R1-R3 TAGGED advertisement frame 256 · withdrawal frame 294. Session reset 없이 자동 재평가됐습니다.',state:'tag',evidence:['R1 TAGGED OSPF E1 · Tag 65002','seq5 deny tag65002가 seq15 permit prefix보다 먼저 적용','deny5 제거 시 R3 TAGGED AS_PATH 65001 / MED30','deny5 복구 후 Withdrawal · 실제 Routing Loop는 만들지 않음'],scope:'이번 Lab은 실제 지속 Loop를 만들지 않았습니다. Tag를 이용한 re-entry guard 효과만 검증했습니다.'},
{title:'같은 Prefix 두 Source',id:'REDIST-06',text:'한 Router가 같은 Prefix를 BGP와 OSPF에서 동시에 알면 Cisco RIB는 Source Preference를 비교합니다.',start:['CONFLICT 10.30.30.0/24','eBGP Candidate AD20','OSPF External Candidate AD110','BGP Session Established'],question:'eBGP CONFLICT 광고만 철회하고 BGP Session은 유지하면 R1 RIB는 무엇으로 바뀔까요?',options:['Route가 완전히 사라진다','OSPF External Route로 Fallback한다','BGP AD가 자동으로 110으로 바뀐다'],correct:1,actual:'OSPF External Route로 Fallback',observed:'BGP AD20 → OSPF AD110 → BGP AD20 복구',reason:'같은 Prefix의 OSPF 후보가 계속 존재했기 때문에 BGP Prefix만 사라지자 RIB는 OSPF External을 설치했습니다. R3가 BGP Prefix를 다시 광고하면 낮은 Cisco AD20의 eBGP Route가 다시 설치됐습니다.',event:'CONFLICT BGP withdrawal frame 336 · restore advertisement frame 356. BGP Session은 계속 Established였습니다.',state:'ad',evidence:['R1 OSPF Type5 후보 + R1 BGP Candidate 동시 존재','Baseline RIB eBGP AD20','R3 network origination만 제거 → OSPF AD110 / E1 metric40','BGP origination 복구 → RIB eBGP AD20 재선택'],scope:'Administrative Distance와 기본값 20/110은 Cisco 구현 범위입니다. BGP LOCAL_PREF나 OSPF Metric과 같은 값이 아닙니다.'}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function stateRow(k,v,c){return '<div class="state-row"><span>'+k+'</span><b class="'+(c||'')+'">'+v+'</b></div>';}
function resetTopo(){
 ['linkR2','linkR3'].forEach(function(id){el(id).setAttribute('class','link');});
 ['nodeR1','nodeR2','nodeR3'].forEach(function(id){el(id).setAttribute('class',id==='nodeR1'?'node boundary':'node');});
 el('leftToken').textContent='TARGET · OSPF Internal';el('leftToken').setAttribute('class','route-text');
 el('midToken').textContent='Boundary · Policy 대기';el('midToken').setAttribute('class','route-text');
 el('rightToken').textContent='R3 · TARGET 없음';el('rightToken').setAttribute('class','route-text');
}
function applyState(s){
 resetTopo();
 if(s==='target'){
  el('linkR2').classList.add('ospf');el('linkR3').classList.add('bgp');el('nodeR1').classList.add('active');el('nodeR3').classList.add('warn');
  el('midToken').textContent='OSPF → BGP · TARGET Permit';el('midToken').setAttribute('class','route-text ok');
  el('rightToken').textContent='R3 · TARGET BGP 있음';el('rightToken').setAttribute('class','route-text ok');
  el('states').innerHTML=stateRow('Before','R3 TARGET 없음','')+stateRow('Boundary','TARGET Permit','ok')+stateRow('After','R3 TARGET 있음','ok')+stateRow('AS_PATH','65001','ok');return;
 }
 if(s==='external'){
  el('linkR2').classList.add('ospf');el('nodeR2').classList.add('active');el('nodeR1').classList.add('active');
  el('leftToken').textContent='Static 198.51.100.0/24';el('midToken').textContent='OSPF E1 · Tag65002';el('midToken').setAttribute('class','route-text ok');el('rightToken').textContent='BGP export는 Tag Guard 대상';
  el('states').innerHTML=stateRow('Source','Static Null0','')+stateRow('OSPF LSA','Type 5 · E1','ok')+stateRow('Start Metric','20','')+stateRow('R1 RIB Metric','30','warn')+stateRow('Route Tag','65002','ok');return;
 }
 if(s==='block'){
  el('linkR2').classList.add('ospf');el('linkR3').classList.add('bgp');el('nodeR1').classList.add('active');
  el('leftToken').textContent='BLOCK · OSPF Internal';el('midToken').textContent='permit20 임시 추가';el('midToken').setAttribute('class','route-text warn');el('rightToken').textContent='R3 · BLOCK 등장→철회';
  el('states').innerHTML=stateRow('Baseline','BLOCK Filtered','')+stateRow('Permit20 추가','BLOCK 광고','warn')+stateRow('Permit20 제거','BLOCK Withdrawal','ok')+stateRow('TARGET','계속 유지','ok');return;
 }
 if(s==='tag'){
  el('linkR2').classList.add('ospf');el('linkR3').classList.add('bgp');el('nodeR1').classList.add('warn');
  el('leftToken').textContent='TAGGED · E1 · Tag65002';el('midToken').textContent='deny5 제거→복구';el('midToken').setAttribute('class','route-text warn');el('rightToken').textContent='R3 · 광고→Withdrawal';
  el('states').innerHTML=stateRow('Baseline','deny5가 먼저 차단','')+stateRow('deny5 제거','seq15 Permit 적용','warn')+stateRow('R3','TAGGED 등장','warn')+stateRow('Guard 복구','Withdrawal','ok');return;
 }
 if(s==='ad'){
  el('linkR2').classList.add('ospf');el('linkR3').classList.add('bgp');el('nodeR1').classList.add('boundary');el('nodeR3').classList.add('warn');
  el('leftToken').textContent='OSPF Candidate · AD110';el('midToken').textContent='RIB Source 선택';el('midToken').setAttribute('class','route-text ok');el('rightToken').textContent='BGP Candidate · AD20';
  el('states').innerHTML=stateRow('둘 다 존재','BGP AD20 설치','ok')+stateRow('BGP Prefix 철회','OSPF AD110 Fallback','warn')+stateRow('BGP Session','Established 유지','ok')+stateRow('BGP 복구','AD20 재선택','ok');return;
 }
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetTopo();},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
