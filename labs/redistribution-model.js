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
const presentation={
 names:{R1:'Router A',R2:'Router B',R3:'Router C'},
 labels:{'Baseline':'기본 상태','Before':'변경 전','After':'변경 후','Boundary':'재분배 경계','Source':'경로 출처','Recovery':'복구','Start Metric':'시작 Metric','Fallback':'대체 경로 선택','Candidate':'후보 경로','Session reset':'Session 재시작'},
 lessons:[
  {title:'두 프로토콜을 실행하면 경로가 자동 공유될까요?',brief:'학습 페이지의 Router B → Router A → Router C 구성을 사용합니다. 재분배 전후의 경로 정보를 비교하세요.',hints:['BGP Session이 정상인 것과 특정 Route를 광고하는 것은 별개입니다.','Router A는 OSPF에서 TARGET을 알고 있습니다.','OSPF 정보를 BGP에 넣는 명시적 경계 설정이 있는지 확인하세요.']},
  {title:'Static Route는 OSPF에서 어떻게 보일까요?',brief:'Route의 출처, 외부 경로 유형, Metric, Tag를 구분합니다. 학습 페이지의 seed 20과 RIB 30을 연결하세요.',hints:['이 Route는 Router B의 Static Null0에서 시작합니다.','재분배 시 OSPF E1과 Tag 65002를 명시했습니다.','E1의 RIB Metric에는 외부 Metric과 내부 경로 Cost가 반영됩니다.']},
  {title:'허용한 Prefix만 경계를 넘을까요?',brief:'학습 페이지의 TARGET과 BLOCK을 대조합니다. 임시 Permit 추가, 광고, Permit 제거 후 철회를 순서대로 보세요.',hints:['BLOCK도 Router A의 OSPF에는 있습니다.','Route-map은 데이터 Packet이 아니라 재분배할 경로 정보를 선별합니다.','TARGET Permit은 유지한 채 BLOCK Permit만 바꿉니다.']},
  {title:'앞선 Tag Deny가 뒤의 Prefix Permit보다 먼저일까요?',brief:'Route-map을 위에서 아래로 읽습니다. Tag 조건과 Prefix 조건이 모두 맞을 때 먼저 적용되는 항목을 보세요.',hints:['TAGGED의 Route Tag는 65002입니다.','seq5는 Tag 65002를 Deny하고 seq15는 TAGGED Prefix를 Permit합니다.','seq5만 제거한 뒤 뒤쪽 항목까지 평가될 수 있는지 생각해 보세요.']},
  {title:'선택한 BGP 경로만 사라지면 무엇을 쓸까요?',brief:'같은 Prefix의 eBGP·OSPF 후보를 비교합니다. Cisco AD, 프로토콜 Metric, BGP Session 상태를 구분하세요.',hints:['같은 10.30.30.0/24를 두 출처에서 알고 있습니다.','철회하는 것은 BGP Prefix이며 Session은 유지됩니다.','OSPF 후보가 남아 있으면 선택 가능한 다른 출처가 있습니다.']}
 ]
};
function redRows(rows){el('states').innerHTML=rows.map(r=>stateRow(...r)).join('');}
function redScene(left,mid,right,rows,marks={}){resetTopo();el('nodeR1').classList.remove('boundary');el('leftToken').textContent=left;el('midToken').textContent=mid;el('rightToken').textContent=right;el('routePolicies').replaceChildren();Object.entries(marks).forEach(([id,cls])=>el(id).classList.add(cls));redRows(rows);}
function redEvent(title,detail,kind,duration,action){return {title,detail,kind,duration,action:()=>{action();el('simVisual').dataset.reveal='events';}};}
function redPolicy(mode){const list=[['seq5 · Tag 65002','Deny',mode==='deny'],['seq10 · TARGET','Permit',false],['seq15 · TAGGED','Permit',mode==='permit']];el('routePolicies').innerHTML=list.filter((_,i)=>!(mode==='permit'&&i===0)).map(([label,value,focus])=>'<p class="'+(focus?'is-focus':'')+'">'+label+' → '+value+'</p>').join('');}
function redPlan(i){const state=lessons[i].state;
 if(state==='target')return [
  redEvent('OSPF와 BGP의 기존 상태 확인','Router A는 OSPF TARGET을 알고 있고 Router C와 eBGP Session도 Established입니다. 재분배는 아직 없습니다.','조건',2100,()=>redScene('TARGET · OSPF Internal','OSPF → BGP 설정 없음','TARGET 조회 전',[['Router A의 TARGET','OSPF에서 확인'],['Router A ↔ Router C','BGP Established']],{nodeR2:'active',linkR2:'ospf',nodeR1:'active'})),
  redEvent('재분배 전 수신 경로 조회','Router C의 BGP Table에는 TARGET이 없습니다. 두 프로토콜을 실행하는 것만으로 경로가 자동 공유되지는 않습니다.','변경 전',2100,()=>redScene('TARGET · OSPF에 존재','재분배 없음','TARGET 없음',[['Router A OSPF','TARGET 존재'],['Router C BGP','TARGET 없음','warn'],['BGP Session','Established 유지']],{nodeR1:'active',nodeR3:'warn'})),
  redEvent('TARGET을 명시적으로 Permit','Router A의 OSPF_TO_BGP Route-map으로 TARGET을 선택해 BGP에 주입합니다. 경로 정보의 처리입니다.','재분배 정책',2100,()=>redScene('TARGET · OSPF Internal','TARGET Permit → BGP 주입','BGP UPDATE 전송',[['재분배 방향','OSPF → BGP'],['선택한 경로','TARGET 10.10.10.10/32']],{nodeR1:'boundary',linkR2:'ospf',linkR3:'bgp'})),
  redEvent('Router C의 BGP 경로 확인','기존 검증에서 TARGET이 Router C에 나타났고 AS_PATH 65001, NEXT_HOP 10.0.13.1이 확인됐습니다.','관찰 결과',2100,()=>redScene('TARGET 유지','OSPF → BGP 적용','TARGET BGP 수신',[['TARGET','Router C에 등장','ok'],['AS_PATH','65001'],['NEXT_HOP','10.0.13.1'],['관찰 범위','경로 광고 · 목적지 서비스 성공과 구분']],{nodeR1:'boundary',linkR3:'bgp',nodeR3:'active'}))
 ];
 if(state==='external')return [
  redEvent('출발 Route의 종류 확인','198.51.100.0/24는 Router B의 Static Null0 Route입니다. 사용자 단말 통신 성공을 뜻하는 Prefix는 아닙니다.','경로 출처',2100,()=>redScene('Static 198.51.100.0/24','OSPF 경계 관찰','이번 판단 대상 아님',[['경로 출처','Router B · Static Null0'],['Prefix','198.51.100.0/24']],{nodeR2:'active'})),
  redEvent('OSPF External 속성 설정','Static Route를 OSPF로 재분배할 때 E1, seed Metric 20, Route Tag 65002를 명시했습니다.','재분배 설정',2100,()=>redScene('Static → OSPF E1','Type 5 LSA 수신','이번 판단 대상 아님',[['OSPF 유형','External E1 · Type 5 LSA'],['시작 Metric','20'],['Route Tag','65002']],{nodeR2:'active',linkR2:'ospf',nodeR1:'active'})),
  redEvent('RIB Metric의 값 비교','Router A에서는 외부 Metric 20에 Router B까지의 내부 Cost 10을 더한 E1 Metric 30이 관측됐습니다.','Metric 비교',2100,()=>redScene('외부 Metric 20','내부 Cost 10 + 외부 20','이번 판단 대상 아님',[['시작 Metric','20'],['내부 Cost','10'],['Router A RIB','O E1 · Metric 30','ok'],['Route Tag','65002 · Metric과 별도']],{nodeR1:'boundary',linkR2:'ospf'})),
  redEvent('제거와 재적용 결과 대조','기존 검증에서 재분배 제거 시 RIB/LSDB에서 사라졌고, 재적용 후 같은 E1·Tag 속성으로 복구됐습니다.','복구 근거',2100,()=>redScene('Static → OSPF 복구','O E1 · Tag 65002','이번 판단 대상 아님',[['제거 시','RIB · LSDB 부재'],['재적용 후','E1 · Tag 65002 복구','ok'],['RIB Metric','30','ok']],{nodeR2:'active',nodeR1:'active',linkR2:'ospf'}))
 ];
 if(state==='block')return [
  redEvent('보유 경로와 허용 정책 비교','TARGET과 BLOCK 모두 OSPF에 있지만, 기본 정책은 TARGET만 BGP로 넘깁니다.','변경 전',2100,()=>redScene('TARGET · BLOCK 보유','TARGET Permit / BLOCK 제외','TARGET만 수신',[['Router A OSPF','TARGET · BLOCK'],['Router C BGP','TARGET만'],['BLOCK','10.10.20.20/32']],{nodeR2:'active',nodeR1:'boundary'})),
  redEvent('BLOCK 임시 Permit 추가','기존 TARGET Permit은 유지하고 BLOCK Prefix용 permit20을 임시로 추가합니다.','정책 변경',1800,()=>redScene('BLOCK · OSPF Internal','permit20 추가','광고 처리 중',[['변경 항목','BLOCK permit20 추가'],['TARGET 정책','유지']],{nodeR1:'boundary'})),
  redEvent('BLOCK 광고 확인','허용된 BLOCK 경로가 Router C의 BGP에 나타났습니다. TARGET도 계속 유지됐습니다.','광고',1800,()=>redScene('BLOCK 유지','BLOCK 재분배 허용','TARGET · BLOCK 수신',[['Router C BLOCK','등장','ok'],['Router C TARGET','유지','ok']],{nodeR1:'boundary',linkR3:'bgp',nodeR3:'active'})),
  redEvent('임시 Permit 제거 후 철회','permit20 제거 후 정책이 재평가돼 BLOCK은 Withdrawal됐습니다. 수렴 시간을 고정값으로 일반화하지 않습니다.','복구',2100,()=>redScene('BLOCK · OSPF 유지','permit20 제거','TARGET 유지 · BLOCK 철회',[['BLOCK','Withdrawal 확인','ok'],['TARGET','유지','ok'],['임시 permit20','제거 완료']],{nodeR1:'boundary',linkR3:'bgp',nodeR3:'active'}))
 ];
 if(state==='tag')return [
  redEvent('Tag와 평가 순서 확인','TAGGED는 OSPF E1이며 Tag 65002를 갖습니다. seq5 Tag Deny가 seq15 Prefix Permit보다 앞에 있습니다.','조건',2100,()=>{redScene('TAGGED · Tag 65002','위에서 아래로 정책 평가','아직 광고하지 않음',[['경로 속성','OSPF E1 · Tag 65002'],['평가 순서','seq5 → seq10 → seq15']],{nodeR1:'boundary'});redPolicy('');}),
  redEvent('앞선 Tag Deny에 Match','seq5가 먼저 Tag 65002를 Match해 재분배를 막습니다. 뒤의 Prefix Permit까지 진행하지 않습니다.','정책 판단',2100,()=>{redScene('TAGGED · Tag 65002','seq5 Deny에서 중단','TAGGED 없음',[['먼저 적용한 항목','seq5 deny tag65002','warn'],['Router C TAGGED','없음']],{nodeR1:'warn'});redPolicy('deny');}),
  redEvent('seq5 제거 후 뒤의 Permit 적용','Tag Deny만 제거하면 seq15 Prefix Permit이 적용돼 TAGGED가 Router C에 광고됩니다.','정책 변경',2100,()=>{redScene('TAGGED · Tag 65002','seq15 Permit 적용','TAGGED 등장',[['제거한 항목','seq5 Tag Deny'],['적용한 항목','seq15 Prefix Permit','ok'],['Router C','AS_PATH 65001 · MED 30']],{nodeR1:'boundary',linkR3:'bgp',nodeR3:'active'});redPolicy('permit');}),
  redEvent('Tag Guard 복구 후 철회','seq5 복구 후 TAGGED Withdrawal을 확인했습니다. Session은 유지됐으며 실제 지속 Loop를 만든 검증은 아닙니다.','복구',2100,()=>{redScene('TAGGED · OSPF 유지','seq5 Deny 복구','TAGGED 철회',[['TAGGED','Withdrawal 확인','ok'],['BGP Session','유지'],['검증 범위','Tag 기반 재유입 방지 효과']],{nodeR1:'warn'});redPolicy('deny');})
 ];
 return [
  redEvent('같은 Prefix의 두 출처 확인','CONFLICT 10.30.30.0/24는 eBGP AD20과 OSPF External AD110 후보가 함께 있습니다. 값은 이번 Cisco 구현 기준입니다.','후보',2100,()=>redScene('OSPF 후보 · AD110','10.30.30.0/24 비교','eBGP 후보 · AD20',[['목적지 Prefix','10.30.30.0/24'],['eBGP 후보','Cisco AD20'],['OSPF 후보','Cisco AD110']],{nodeR1:'boundary'})),
  redEvent('기본 RIB 선택 확인','두 후보가 있을 때 Router A의 RIB에는 eBGP AD20 경로가 설치됐습니다.','선택',1800,()=>redScene('OSPF 후보 유지','RIB = eBGP AD20','BGP Prefix 존재',[['기본 RIB','eBGP · AD20','ok'],['OSPF 후보','계속 존재']],{nodeR1:'boundary',nodeR3:'active',linkR3:'bgp'})),
  redEvent('BGP Prefix만 철회','BGP Session을 유지한 채 CONFLICT origination만 제거합니다. OSPF 후보는 남아 있습니다.','Prefix 철회',1800,()=>redScene('OSPF 후보 유지','RIB 재선택','CONFLICT Withdrawal',[['BGP Prefix','철회'],['BGP Session','Established 유지','ok'],['남은 후보','OSPF External']],{nodeR3:'warn',nodeR1:'boundary'})),
  redEvent('남은 OSPF 후보 설치','Router A RIB는 OSPF AD110 경로로 바뀌었습니다. 이 시점의 OSPF E1 Metric은 40이었습니다.','대체 경로',1800,()=>redScene('OSPF E1 · AD110','RIB = OSPF','Session 정상 · Prefix 없음',[['RIB 출처','OSPF External · AD110','ok'],['E1 Metric','40'],['구분','AD와 Metric은 다른 값']],{nodeR2:'active',linkR2:'ospf',nodeR1:'boundary'})),
  redEvent('BGP 광고 복구 후 재선택','CONFLICT Prefix를 다시 광고하자 Router A는 eBGP AD20 경로를 다시 선택했습니다.','복구',1800,()=>redScene('OSPF 후보 유지','RIB = eBGP AD20 복구','CONFLICT 재광고',[['복구된 RIB','eBGP · AD20','ok'],['BGP Session','Established 유지']],{nodeR1:'boundary',nodeR3:'active',linkR3:'bgp'}))
 ];
}
const adapter={raw:lessons,kind:'state',presentation,buildPlan:redPlan,reset(i){index=i;recovered=false;resetTopo();el('nodeR1').classList.remove('boundary');el('leftToken').textContent='출발 경로 관찰 대기';el('midToken').textContent='재분배 정책 관찰 대기';el('rightToken').textContent='수신 경로 관찰 대기';el('states').replaceChildren();el('routePolicies').replaceChildren();},show(){applyState(lessons[index].state);},recover:null,compare:null};
NetworkSimulator.mount(adapter);
})();
