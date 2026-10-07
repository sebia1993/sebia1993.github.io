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
NetworkSimulator.mount(adapter);
})();
