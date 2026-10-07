// Existing lesson data and topic renderer retained from routing-table-simulator; playback is shared.
(()=>{
const lessons=[
  {
    title:"Connected Route는 언제 보일까?",
    text:"R1의 세 L3 Interface가 모두 up/up인 정상 Baseline입니다.",
    states:["R1 E0/0 · 10.10.10.1/24","R1 E0/1 · 192.0.2.1/30","R1 E0/2 · 192.0.2.5/30"],
    question:"R1의 Routing Table에는 무엇이 생길까요?",
    options:["세 Interface에 대응하는 Connected Prefix가 보인다","Default Route만 보인다","Interface IP는 Routing Table과 관계없다"],
    correct:0,
    actual:"Connected 10.10.10.0/24 · 192.0.2.0/30 · 192.0.2.4/30",
    reason:"Cisco IOL에서 세 Interface가 up/up일 때 대응 Connected Prefix가 실제 Routing Table에 설치됐습니다.",
    dest:"Interface 상태",
    decision:"Connected Prefix 설치",
    routeMode:"connected",
    eventKind:"RIB",
    eventText:"R1의 활성 L3 Interface Prefix가 Connected Route로 확인됩니다.",
    evidence:["ROUTE-01 PASS","show ip interface brief + show ip route connected 교차 확인","실제 Interface명은 IOL Ethernet0/x"],
    completeOnRecover:false
  },
  {
    title:"Specific Static Route는 어느 방향일까?",
    text:"R1에는 203.0.113.0/24 → 192.0.2.2(R2) Static Route와 /0 Default Route가 함께 있습니다.",
    states:["목적지 203.0.113.10","/24 → R2","/0 → R3"],
    question:"203.0.113.10으로 가는 패킷은 어디로 전달될까요?",
    options:["R2 방향 CP2","R3 방향 CP3","R1에서 즉시 Drop"],
    correct:0,
    actual:"R2 방향 CP2",
    reason:"203.0.113.0/24 Static Route가 목적지에 일치했고, 실제 CP2에서 Echo Request/Reply 3쌍이 확인됐습니다.",
    dest:"203.0.113.10",
    decision:"203.0.113.0/24 → 192.0.2.2 · R2",
    routeMode:"r2",
    eventKind:"FORWARD",
    eventText:"R1이 /24 Static Route를 선택해 R2 방향으로 Forward합니다.",
    evidence:["ROUTE-02 PASS","CP2 Request/Reply 3쌍","R1 통과 시 Request TTL 64 → 63","비선택 CP3 대응 Echo 0"],
    completeOnRecover:false
  },
  {
    title:"Default Route는 언제 선택될까?",
    text:"R1에는 198.51.100.10을 위한 Specific Route가 없고 /0 Default Route만 남아 있습니다.",
    states:["목적지 198.51.100.10","Specific Route 없음","Default /0 → R3"],
    question:"R1은 198.51.100.10을 어디로 보낼까요?",
    options:["R2의 /24로 보낸다","R3의 Default Route로 보낸다","Route가 없으므로 항상 Drop한다"],
    correct:1,
    actual:"R3 방향 CP3",
    reason:"더 구체적인 Route가 없으므로 0.0.0.0/0이 선택됐고, 실제 CP3에서 3/3 Echo Reply가 확인됐습니다.",
    dest:"198.51.100.10",
    decision:"0.0.0.0/0 → 192.0.2.6 · R3",
    routeMode:"r3",
    eventKind:"DEFAULT",
    eventText:"Specific Route가 없어서 Default Route가 Route of Last Resort로 선택됩니다.",
    evidence:["ROUTE-03 PASS","Default RIB/CEF Next Hop과 CP3 경로 일치","CP3 3/3 Reply","비선택 CP2 대응 Echo 0"],
    completeOnRecover:false
  },
  {
    title:"/24와 /0이 동시에 맞으면?",
    text:"203.0.113.10은 203.0.113.0/24와 0.0.0.0/0 두 Route에 모두 일치합니다.",
    states:["203.0.113.0/24 → R2","0.0.0.0/0 → R3","둘 다 Match"],
    question:"Longest Prefix Match 결과는 무엇일까요?",
    options:["/0 Default가 더 넓으므로 R3","/24가 더 구체적이므로 R2","두 경로를 매 패킷마다 번갈아 사용"],
    correct:1,
    actual:"/24 Static Route → R2",
    reason:"같은 목적지에 여러 Prefix가 맞으면 Prefix Length가 가장 긴 Route가 우선입니다. 실제 Echo는 CP2에 3쌍, CP3에 0개였습니다.",
    dest:"203.0.113.10",
    decision:"/24 wins over /0 → R2",
    routeMode:"lpm",
    eventKind:"LPM",
    eventText:"R1은 /24와 /0을 비교하고 더 긴 /24 Prefix를 선택합니다.",
    evidence:["ROUTE-04 PASS","RFC 1812/4632 Longest Prefix Match","CP2 3쌍 · CP3 0","이 실험은 AD/Metric 비교가 아님"],
    completeOnRecover:false
  },
  {
    title:"Default Route가 사라지면 어디에서 멈출까?",
    text:"R1의 R3-facing E0/2를 shutdown해 Connected Route와 Default Route가 제거된 장애 상태입니다.",
    states:["R1 E0/2 DOWN","192.0.2.4/30 제거","0.0.0.0/0 제거"],
    question:"PC1 → 198.51.100.10 패킷은 어떻게 될까요?",
    options:["R2로 자동 우회한다","R1에서 Stop되고 다음 경로로 Forward되지 않는다","기존 Default Route가 계속 사용된다"],
    correct:1,
    actual:"R1에서 STOP · CP2/CP3 Forward 0",
    reason:"사용 가능한 Matching Route가 없어 R1이 패킷을 다음 Hop으로 보내지 않았습니다. 이번 Cisco IOL은 ICMP Type 3 Code 1을 반환했습니다.",
    dest:"198.51.100.10",
    decision:"No usable route → STOP at R1",
    routeMode:"failure",
    eventKind:"NO ROUTE",
    eventText:"R1에 Matching Route가 없어 패킷이 R1에서 멈춥니다. 아래의 표준/구현 차이를 함께 확인하세요.",
    evidence:["ROUTE-05 원래 Result = FAIL(엄격 RFC Code 판정)","Fault probe CP1 ingress 3 · CP2 0 · CP3 0","Cisco Actual ICMP Type 3 Code 1 ×3","추가 재검증 2회에서도 동일 동작 재현"],
    completeOnRecover:true,
    standard:"RFC 1812의 No Route 기대는 Type 3 Code 0입니다. 이번 Cisco IOL IOS 15.4(2)T4는 Type 3 Code 1을 반환했습니다. 원래 FAIL은 보존하며, Code 1을 모든 Cisco의 공통 동작으로 일반화하지 않습니다."
  }
];


const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function routeRows(mode){
  const base=[
    {p:"C 10.10.10.0/24",n:"direct · E0/0"},
    {p:"C 192.0.2.0/30",n:"direct · E0/1"},
    {p:"C 192.0.2.4/30",n:"direct · E0/2"},
    {p:"S 203.0.113.0/24",n:"via 192.0.2.2 · R2"},
    {p:"S* 0.0.0.0/0",n:"via 192.0.2.6 · R3"}
  ];
  if(mode==="failure"&&!recovered){
    base[2].removed=true;base[4].removed=true;
  }
  if(mode==="connected"){base[0].chosen=base[1].chosen=base[2].chosen=true;}
  if(mode==="r2"||mode==="lpm")base[3].chosen=true;
  if(mode==="r3"||(mode==="failure"&&recovered))base[4].chosen=true;
  return base;
}
function resetTopology(){
  ["link-pc-r1","link-r1-r2","link-r1-r3"].forEach(id=>$(id).setAttribute("class","net-link"));
  ["node-pc1","node-r1","node-r2","node-r3"].forEach(id=>$(id).className="node "+id.replace("node-",""));
  $("stopMarker").style.display="none";
  $("eventKind").textContent="IDLE";
  $("eventText").textContent="예상을 선택한 뒤 실행하면 현재 Route 판단과 Packet Path를 보여줍니다.";
  $("lookupDest").textContent="대기";
  $("lookupDecision").textContent="예상 후 실행하세요.";
}
function renderRouteTable(){
  $("routeTable").innerHTML=routeRows(lessons[index].routeMode).map(r=>`<div class="route-row ${r.chosen?"chosen":""} ${r.removed?"removed":""}"><strong>${r.p}</strong><span>${r.n}</span></div>`).join("");
}
function applyTopology(l){
  $("lookupDest").textContent="Destination: "+l.dest;
  $("lookupDecision").textContent="Decision: "+l.decision;
  $("eventKind").textContent=l.eventKind;
  $("eventText").textContent=l.eventText;
  $("node-r1").classList.add(l.routeMode==="failure"&&!recovered?"stop":"active");
  if(l.routeMode!=="connected")$("link-pc-r1").setAttribute("class","net-link ingress");
  if(l.routeMode==="r2"){
    $("link-r1-r2").setAttribute("class","net-link selected");$("node-r2").classList.add("active");
  }else if(l.routeMode==="r3"){
    $("link-r1-r3").setAttribute("class","net-link selected");$("node-r3").classList.add("active");
  }else if(l.routeMode==="lpm"){
    $("link-r1-r2").setAttribute("class","net-link selected");$("link-r1-r3").setAttribute("class","net-link excluded");$("node-r2").classList.add("active");
  }else if(l.routeMode==="failure"){
    if(recovered){
      $("link-r1-r3").setAttribute("class","net-link selected");$("node-r3").classList.add("active");$("node-r1").classList.remove("stop");$("node-r1").classList.add("active");
      $("eventKind").textContent="RECOVERY";$("eventText").textContent="E0/2가 복구되면서 Connected/Default Route가 다시 설치되고 R3 방향 3/3 통신이 복구됩니다.";
      $("lookupDecision").textContent="Default restored → R3";
    }else{
      $("link-r1-r3").setAttribute("class","net-link down");$("node-r3").classList.add("down");$("stopMarker").style.display="block";
    }
  }
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetTopology();renderRouteTable();},show(){resetTopology();applyTopology(lessons[index]);renderRouteTable();},recover:()=>{recovered=true;resetTopology();applyTopology(lessons[index]);renderRouteTable()},compare:null};
adapter.presentation={names:{R1:'Router A',R2:'Router B',R3:'Router C',PC1:'PC A'},labels:{'Baseline':'기준 상태','Destination':'목적지','Decision':'판단','Route Decision Point':'경로 선택','Specific Next Hop':'구체 경로의 Next Hop','Default Next Hop':'Default 경로의 Next Hop','ROUTE LOOKUP':'경로표 조회','NO ROUTE':'일치 경로 없음','STOP':'전달 중단','FORWARD':'전달','RECOVERY':'복구','Specific Route':'구체 경로','Packet Path':'패킷 경로','Matching Route':'일치하는 경로','wins over':'우선','No usable route':'사용 가능한 경로 없음','Default restored':'Default Route 복구','direct':'직접 연결','both Match':'모두 일치'},lessons:[
 {title:'Interface가 Up이면 어떤 경로가 생길까요?',brief:'Router A의 L3 Interface 세 개를 하나씩 확인합니다. 각 주소 범위에 대응하는 Connected Route를 관찰하세요.',hints:['Connected는 직접 연결된 네트워크 경로입니다.','Interface 주소의 Prefix를 확인하세요.','세 Interface가 모두 up/up인 조건입니다.']},
 {title:'203.0.113.10은 어느 Router로 보낼까요?',brief:'학습 페이지와 같은 목적지입니다. Router A에서 목적지에 일치하는 경로를 찾고 다음 Router를 관찰합니다.',hints:['출발지가 아닌 목적지 IP로 경로를 찾습니다.','203.0.113.10이 포함되는 Prefix를 찾으세요.','/24 Static Route에 표시된 Next Hop을 확인하세요.']},
 {title:'구체적인 경로가 없으면 Default를 쓸까요?',brief:'목적지 198.51.100.10을 /24와 /0에 각각 대조합니다. 일치하는 경로가 실제로 사용 가능한지도 확인하세요.',hints:['Default Route는 0.0.0.0/0입니다.','더 구체적인 일치 경로가 있는지 먼저 확인합니다.','Default Route도 설치되어 있어야 사용할 수 있습니다.']},
 {title:'/24와 /0이 모두 맞으면 어느 쪽이 우선일까요?',brief:'동일한 목적지에 맞는 두 Prefix를 비교합니다. AD·Metric이 아닌 Prefix Length로 판단하는 실습입니다.',hints:['두 경로 모두 목적지를 포함합니다.','LPM은 가장 긴 Prefix Length를 고릅니다.','/24와 /0 중 더 구체적인 범위를 생각하세요.']},
 {title:'Default Route가 없어지면 어디서 멈출까요?',brief:'Router A의 E0/2 장애로 Connected와 Default Route가 제거된 조건입니다. 들어온 패킷이 다음 Router로 나가는지 관찰하세요.',hints:['남은 /24는 198.51.100.10과 일치하지 않습니다.','케이블이 남아 있다고 임의의 Router로 전달하지는 않습니다.','이번 Cisco IOL의 ICMP Code 관찰과 표준 기대를 구분하세요.']}
]};
const routeStage=$('topologyStage');
const routeMarker=document.createElement('span');routeMarker.className='route-packet';routeMarker.textContent='IPv4';routeMarker.hidden=true;routeStage.append(routeMarker);
function routeCenter(id){const a=routeStage.getBoundingClientRect(),b=$(id).getBoundingClientRect();return{x:b.left-a.left+b.width/2,y:b.top-a.top+b.height/2,w:b.width,h:b.height};}
function routeLayout(){if(!routeStage.clientWidth)return;routeStage.querySelector('svg').setAttribute('viewBox',`0 0 ${routeStage.clientWidth} ${routeStage.clientHeight}`);[['link-pc-r1','node-pc1','node-r1'],['link-r1-r2','node-r1','node-r2'],['link-r1-r3','node-r1','node-r3']].forEach(([id,a,b])=>{const p=routeCenter(a),q=routeCenter(b),dx=q.x-p.x,dy=q.y-p.y;const edge=(r,z)=>{const t=Math.min(r.w/2/(Math.abs(dx)||1),r.h/2/(Math.abs(dy)||1));return{x:r.x+z*dx*t,y:r.y+z*dy*t};};const f=edge(p,1),t=edge(q,-1);Object.entries({x1:f.x,y1:f.y,x2:t.x,y2:t.y}).forEach(([k,v])=>$(id).setAttribute(k,v));});}
function routeMove(a,b,p){routeLayout();const f=routeCenter(a),t=routeCenter(b);routeMarker.hidden=false;routeMarker.style.left=(f.x+(t.x-f.x)*p)+'px';routeMarker.style.top=(f.y+(t.y-f.y)*p)+'px';}
function routeNeutral(){resetTopology();routeMarker.hidden=true;renderRouteTable();all('#routeTable .route-row').forEach(n=>n.classList.remove('chosen'));$('lookupDest').textContent='목적지: '+lessons[index].dest;$('lookupDecision').textContent='경로 비교 대기';routeLayout();}
const routeReset=adapter.reset;adapter.reset=function(i){routeReset(i);routeNeutral();};
function routeDisplay(){adapter.show();$('lookupDest').textContent='목적지: '+lessons[index].dest;$('lookupDecision').textContent=lessons[index].routeMode==='connected'?'활성 Interface의 Connected Route 확인':lessons[index].routeMode==='failure'&&!recovered?'사용 가능한 경로 없음 → Router A에서 중단':recovered?'Default Route 복구 → Router C':lessons[index].routeMode==='r3'?'Default /0 → Router C':'더 구체적인 /24 → Router B';}
adapter.buildPlan=function(i,mode='normal'){
 const l=lessons[i],rows=()=>all('#routeTable .route-row'),event=(title,detail,duration,action,animate)=>({title,detail,kind:'경로표 조회',duration,action,animate});
 if(mode==='recover')return[
 event('E0/2를 복구합니다','Router A의 장애 Interface를 복구합니다. Connected와 Default Route가 다시 설치되는지 순서대로 확인합니다.',1050,()=>{routeMarker.hidden=true;routeNeutral();}),
 event('Connected·Default Route가 다시 설치됩니다','192.0.2.4/30과 0.0.0.0/0을 다시 사용할 수 있습니다. 목적지 198.51.100.10과 일치하는 Default Route를 선택합니다.',1470,()=>{recovered=true;renderRouteTable();$('lookupDecision').textContent='Default /0 → Router C';}),
 event('Router C 방향으로 전달합니다','기존 복구 검증에서 3/3 통신과 Default 경로 복귀를 확인했습니다.',1650,()=>{adapter.recover();$('lookupDecision').textContent='Default Route 복구 → Router C';},p=>routeMove('node-r1','node-r3',Math.min(1,Math.max(0,(p*1650-1050)/420))))
 ];
 if(mode!=='normal')return null;
 if(l.routeMode==='connected')return [
 event('세 Interface의 주소와 상태를 확인합니다','Router A의 E0/0·E0/1·E0/2가 모두 up/up입니다. 각 Prefix에 해당하는 Connected Route를 차례로 봅니다.',1050,()=>{routeNeutral();rows().forEach(r=>r.classList.add('route-pending'));}),
 ...['10.10.10.0/24 · E0/0','192.0.2.0/30 · E0/1','192.0.2.4/30 · E0/2'].map((prefix,n)=>event(prefix+' Connected Route','활성 Interface 주소에서 해당 네트워크의 Connected Route를 확인합니다.',1230,()=>{rows()[n].classList.remove('route-pending');rows()[n].classList.add('chosen');$('node-r1').classList.add('active');$('lookupDecision').textContent=prefix;})),
 event('Interface 세 개와 Connected 경로를 대조합니다',l.reason,1230,()=>{rows().forEach(r=>r.classList.remove('route-pending'));routeDisplay();})];
 const plan=[event('PC A의 목적지 IP를 확인합니다','목적지 '+l.dest+'인 패킷이 Router A로 들어옵니다. 아직 출력 방향은 정하지 않습니다.',1650,()=>{routeNeutral();$('link-pc-r1').setAttribute('class','net-link ingress');},p=>routeMove('node-pc1','node-r1',Math.max(0,Math.min(1,(p*1650-1050)/420))))];
 if(l.routeMode==='failure')plan.push(event('장애로 제거된 경로를 확인합니다','E0/2 장애로 192.0.2.4/30과 Default Route가 제거됐습니다. 나머지 경로는 그대로입니다.',1470,()=>{routeMarker.hidden=true;renderRouteTable();$('link-r1-r3').setAttribute('class','net-link down');rows()[2].classList.add('route-current');rows()[4].classList.add('route-current');}));
 plan.push(event('목적지에 일치하는 Prefix를 찾습니다',l.routeMode==='r3'||l.routeMode==='failure'?'203.0.113.0/24는 이 목적지와 일치하지 않습니다. Default Route의 사용 가능 여부를 확인합니다.':'203.0.113.0/24와 0.0.0.0/0이 모두 목적지에 일치합니다.',1470,()=>{routeMarker.hidden=true;rows().forEach(r=>r.classList.remove('chosen','route-current'));if(l.routeMode==='r2'||l.routeMode==='lpm'){rows()[3].classList.add('route-candidate');rows()[4].classList.add('route-candidate');}else rows()[4].classList.add('route-candidate');$('lookupDecision').textContent='목적지와 Prefix를 비교합니다';}));
 plan.push(event(l.routeMode==='failure'?'사용 가능한 일치 경로가 없습니다':'가장 긴 일치 Prefix를 선택합니다',l.routeMode==='failure'?'남아 있는 /24는 일치하지 않고 /0은 제거됐습니다. 다른 Router로 임의 전달하지 않습니다.':l.routeMode==='r3'?'더 구체적인 일치 경로가 없으므로 사용 가능한 /0이 선택됩니다.':'/24가 /0보다 구체적입니다. Router B 방향의 Next Hop 192.0.2.2를 선택합니다.',1050,()=>{rows().forEach(r=>r.classList.remove('route-candidate'));const n=l.routeMode==='failure'?-1:l.routeMode==='r3'?4:3;if(n>=0)rows()[n].classList.add('chosen');$('lookupDecision').textContent=l.routeMode==='failure'?'사용 가능한 경로 없음':l.routeMode==='r3'?'Default /0 선택':'Longest Prefix Match: /24 선택';}));
 const dest=l.routeMode==='r3'?'node-r3':'node-r2';plan.push(event(l.routeMode==='failure'?'Router A에서 전달을 중단합니다':'선택한 Next Hop으로 전달합니다',l.eventText,1650,()=>{routeDisplay();routeMarker.hidden=true;},l.routeMode==='failure'?undefined:p=>routeMove('node-r1',dest,Math.max(0,Math.min(1,(p*1650-1050)/420)))));return plan;
};
new ResizeObserver(routeLayout).observe(routeStage);

NetworkSimulator.mount(adapter);
})();
