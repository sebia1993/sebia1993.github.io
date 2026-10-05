const lessons=[
{
claim:"DOT1X-01",title:"EAPOL과 RADIUS의 경계",text:"Supplicant와 Authenticator, Authenticator와 RADIUS Server 사이에서 각각 어떤 Protocol이 보일까요?",states:["SUPP↔SW1","SW1↔FreeRADIUS","CP-EAPOL / CP-RADIUS"],question:"정상 인증의 Protocol Boundary는?",options:["Supplicant↔Authenticator = EAPOL, Authenticator↔RADIUS = RADIUS","Supplicant가 RADIUS Server에 직접 RADIUS를 전송","모든 구간이 EAPOL"],correct:0,mode:"boundary",actual:"EAPOL / RADIUS 경계 직접 관측",reason:"CP-EAPOL에는 EAPOL, CP-RADIUS에는 UDP/1812 RADIUS가 보였고 Supplicant access link에는 RADIUS가 없었습니다.",recover:false,evidence:["CP-EAPOL original PCAP","CP-RADIUS original PCAP","Supplicant direct RADIUS = not observed","SW1 = RADIUS client / Authenticator"]
},
{
claim:"DOT1X-02",title:"EAP Relay를 어떻게 확인할까?",text:"Authenticator는 EAP를 끝내는 대신 Backend RADIUS로 Relay합니다. 실제 Packet을 어떻게 연결할까요?",states:["EAP Identifier","Packet direction","Full EAP byte hash"],question:"가장 강한 상호 검증은?",options:["EAPOL과 RADIUS의 EAP payload를 Identifier/방향/바이트로 대응","시간만 비슷하면 같은 Packet으로 간주","RADIUS Code만 보고 EAP를 추정"],correct:0,mode:"relay",actual:"정상 BLUE에서 20개 EAP Relay exact-match",reason:"EAP Identifier뿐 아니라 전체 EAP 바이트 SHA-256을 대조해 20개 Relay를 연결했습니다. 최초 Request/Identity는 SW1이 로컬 생성했습니다.",recover:false,evidence:["20 exact EAP byte matches","Access-Request carries EAP Response","Access-Challenge carries next EAP Request","Initial Request/Identity = local authenticator event"]
},
{
claim:"DOT1X-03",title:"인증 성공은 어디까지 확인해야 할까?",text:"BLUE Identity가 정상입니다. Access-Accept 하나만 보면 충분할까요?",states:["PEAPv0/MSCHAPv2","BLUE","VLAN20"],question:"정상 성공의 완성 Evidence는?",options:["Access-Accept + EAP Success + Authorized + Data success","Access-Accept만 있으면 완료","Ping만 되면 인증 성공"],correct:0,mode:"success",actual:"Access-Accept #324 · Authorized · VLAN20 · 10.77.20.10 · Ping 3/3",reason:"AAA 결과와 Authenticator Session, 실제 Data Plane이 모두 같은 성공 상태를 가리켜야 합니다.",recover:false,evidence:["Access-Accept frame 324","EAP Success","Cisco Authorized / VLAN20","DHCP 10.77.20.10","Ping 3/3"]
},
{
claim:"DOT1X-04",title:"잘못된 Credential은 어떤 실패인가?",text:"BLUE Identity에 잘못된 Lab Password를 한 번 사용했습니다.",states:["EAP starts","Explicit server response","Unauthorized"],question:"이 경우 핵심 RADIUS Evidence는?",options:["Access-Reject","RADIUS 응답 없음","Access-Accept + VLAN 변경"],correct:0,mode:"reject",actual:"Access-Reject #371 · EAP Failure · Unauthorized · Ping 0/3",reason:"서버가 명시적으로 인증을 거절했습니다. 이후 정상 BLUE로 복구해 Access-Accept #416과 Ping 3/3을 확인했습니다.",recover:true,evidence:["Access-Reject frame 371","EAP Failure","CP-EAPOL ARP present / CP-DATA matching ARP absent","Ping 0/3"]
},
{
claim:"DOT1X-05",title:"인증과 VLAN 인가는 같은가?",text:"BLUE와 GREEN은 둘 다 정상 Identity입니다.",states:["BLUE = VLAN20","GREEN = VLAN30","Both Access-Accept"],question:"두 사용자의 차이는 무엇일까요?",options:["인증은 둘 다 성공, Authorization VLAN이 다름","BLUE만 인증 성공","VLAN은 인증과 무관해 RADIUS가 전달하지 않음"],correct:0,mode:"vlan",actual:"BLUE→VLAN20 / GREEN→VLAN30 · 둘 다 Ping 3/3",reason:"둘 다 Access-Accept였지만 Tunnel Attributes와 Cisco Session VLAN, DHCP 주소가 다르게 적용됐습니다.",recover:false,evidence:["Tunnel-Type=13","Tunnel-Medium-Type=6","BLUE Private-Group-ID=20","GREEN Private-Group-ID=30","10.77.20.10 / 10.77.30.10"]
},
{
claim:"DOT1X-06",title:"Reject와 RADIUS 무응답은 어떻게 다를까?",text:"정상 BLUE Baseline에서 Lab FreeRADIUS 서비스만 중단했습니다.",states:["Access-Request retry","Accept=0","Reject=0"],question:"이 장애를 무엇으로 분류해야 할까요?",options:["AAA Server no-response / timeout","잘못된 비밀번호 Access-Reject","VLAN authorization 오류"],correct:0,mode:"timeout",actual:"Access-Request ×3 · Accept/Reject 0 · Timeout/Unauthorized · Ping 0/3",reason:"명시적 Reject가 아니라 RADIUS 응답 자체가 없었습니다. 서비스 복구 후 Access-Accept #523, Authorized, Ping 3/3으로 돌아왔습니다.",recover:true,evidence:["3 Access-Request retransmissions","No RADIUS Accept/Reject","Cisco timeout counters","ICMP Type3 Code3 from closed UDP port exists","Ping 0/3"]
}
];

let index=0, selected=null, executed=false, recovered=false;
const done=new Set();
const $=id=>document.getElementById(id);

function row(text,cls=""){return '<div class="dot-state-row '+cls+'">'+text+'</div>'}
function event(step,text,cls=""){return '<div class="dot-event '+cls+'"><span>'+step+'</span><code>'+text+'</code></div>'}

function renderTabs(){
  $("lessonTabs").innerHTML=lessons.map((l,i)=>'<button class="dot-tab '+(i===index?'active ':'')+(done.has(i)?'done':'')+'" data-i="'+i+'">'+(i+1)+'. '+l.claim+'</button>').join("");
  $("lessonTabs").querySelectorAll("button").forEach(b=>b.onclick=()=>go(Number(b.dataset.i)));
}
function renderProgress(){
  $("progressBar").style.width=(done.size/6*100)+"%";
  $("progressCount").textContent=done.size+" / 6 완료";
}
function resetPanels(){
  $("stateList").innerHTML=row("예상 후 실제 Session/AAA 상태를 표시합니다.");
  $("eventList").innerHTML=event("대기","메시지 흐름을 아직 열지 않았습니다.");
  $("evidenceList").innerHTML=row("실제 Evidence는 실행 후 표시됩니다.");
  $("scopeNote").textContent="실제 WLAN에서는 AP/Controller가 Authenticator 역할을 맡습니다.";
}
function render(){
  const l=lessons[index];
  selected=null; executed=false; recovered=false;
  $("lessonNo").textContent=index+1;
  $("lessonTitle").textContent=l.title;
  $("lessonText").textContent=l.text;
  $("startState").innerHTML=l.states.map(x=>'<span>'+x+'</span>').join("");
  $("question").textContent=l.question;
  $("options").innerHTML=l.options.map((x,i)=>'<button class="dot-choice" data-i="'+i+'">'+x+'</button>').join("");
  $("options").querySelectorAll(".dot-choice").forEach(b=>b.onclick=()=>choose(Number(b.dataset.i)));
  $("runBtn").disabled=true;
  $("recoverBtn").classList.add("dot-hidden");
  $("feedback").classList.add("dot-hidden");
  resetPanels(); renderTabs(); renderProgress();
  $("prevBtn").disabled=index===0;
  $("nextBtn").textContent=index===5?"로드맵으로 →":"다음 문제 →";
}
function choose(i){
  if(executed)return;
  selected=i;
  $("options").querySelectorAll(".dot-choice").forEach((b,j)=>b.classList.toggle("selected",j===i));
  $("runBtn").disabled=false;
}
function apply(mode){
  if(mode==="boundary"){
    $("stateList").innerHTML=row("SUPP-LINUX ↔ SW1 : EAPOL","ok")+row("SW1 ↔ FreeRADIUS : UDP/1812 RADIUS","ok");
    $("eventList").innerHTML=event("CP-EAPOL","EAP Request / Response")+event("CP-RADIUS","Access-Request / Access-Challenge","success")+event("BOUNDARY","Supplicant direct RADIUS = none");
  }
  if(mode==="relay"){
    $("stateList").innerHTML=row("20 exact EAP relay matches","ok")+row("Initial Request/Identity = locally generated by SW1","warn");
    $("eventList").innerHTML=event("STA→SW1","EAP Response")+event("SW1→AAA","Access-Request + identical EAP-Message","success")+event("AAA→SW1","Access-Challenge + next EAP Request","success")+event("SW1→STA","EAP Request");
  }
  if(mode==="success"){
    $("stateList").innerHTML=row("PEAPv0/MSCHAPv2 · TLS1.2","ok")+row("Cisco Session = Authorized","ok")+row("VLAN20 · 10.77.20.10","ok")+row("Ping 3/3","ok");
    $("eventList").innerHTML=event("AAA","#324 Access-Accept","success")+event("EAP","Success","success")+event("SW1","Controlled Port Authorized","success")+event("DATA","DHCP / ICMP passes","success");
  }
  if(mode==="reject"){
    $("stateList").innerHTML=row("RADIUS = Access-Reject #371","bad")+row("EAP Failure / Unauthorized","bad")+row("Ping 0/3","bad");
    $("eventList").innerHTML=event("EAP","Authentication exchange starts")+event("AAA","Access-Reject","fail")+event("SW1","Unauthorized","fail")+event("DATA","ARP stops before CP-DATA","fail");
  }
  if(mode==="vlan"){
    $("stateList").innerHTML=row("BLUE = Accept / VLAN20 / 10.77.20.10","ok")+row("GREEN = Accept / VLAN30 / 10.77.30.10","ok");
    $("eventList").innerHTML=event("BLUE","Accept → Tunnel Private Group 20 → VLAN20","success")+event("GREEN","Accept → Tunnel Private Group 30 → VLAN30","success")+event("POINT","Authentication same, Authorization different","success");
  }
  if(mode==="timeout"){
    $("stateList").innerHTML=row("Access-Request retransmissions = 3","warn")+row("Access-Accept = 0 / Access-Reject = 0","bad")+row("Cisco timeout / Unauthorized","bad")+row("Ping 0/3","bad");
    $("eventList").innerHTML=event("SW1→AAA","Access-Request #1","warn")+event("SW1→AAA","Access-Request retry #2/#3","warn")+event("AAA","No RADIUS response","fail")+event("SW1","Timeout → Unauthorized","fail");
    $("scopeNote").innerHTML="<b>정확한 표현:</b> Linux가 UDP closed-port에 ICMP Type3 Code3을 반환했지만 RADIUS Accept/Reject는 없었습니다. 즉 'IP 응답 없음'이 아니라 'RADIUS 응답 없음'입니다.";
  }
}
function run(){
  if(selected===null||executed)return;
  executed=true;
  const l=lessons[index];
  $("options").querySelectorAll(".dot-choice").forEach((b,i)=>{b.disabled=true;if(i===l.correct)b.classList.add("correct");if(i===selected&&i!==l.correct)b.classList.add("wrong");});
  const ok=selected===l.correct;
  $("feedback").classList.remove("dot-hidden","good","bad");
  $("feedback").classList.add(ok?"good":"bad");
  $("feedbackTitle").textContent=ok?"예상 적중":"예상과 다름";
  $("myAnswer").textContent=l.options[selected];
  $("actualAnswer").textContent=l.actual;
  $("reasonText").textContent=l.reason;
  $("evidenceList").innerHTML=l.evidence.map(x=>row(x,"ok")).join("");
  apply(l.mode);
  if(l.recover)$("recoverBtn").classList.remove("dot-hidden"); else done.add(index);
  renderTabs(); renderProgress();
}
function recover(){
  const l=lessons[index];
  if(!l.recover||!executed)return;
  recovered=true;
  $("recoverBtn").classList.add("dot-hidden");
  if(l.mode==="reject"){
    $("stateList").innerHTML=row("Correct BLUE restored","ok")+row("Access-Accept #416","ok")+row("Authorized / Ping 3/3","ok");
    $("eventList").innerHTML=event("RECOVERY","Correct credential","success")+event("AAA","Access-Accept #416","success")+event("DATA","Ping 3/3","success");
  }else{
    $("stateList").innerHTML=row("FreeRADIUS service restored","ok")+row("Access-Accept #523","ok")+row("Authorized / Ping 3/3","ok")+row("Final BLUE / VLAN20 baseline","ok");
    $("eventList").innerHTML=event("RECOVERY","RADIUS service restored","success")+event("AAA","Access-Accept #523","success")+event("SW1","Authorized","success")+event("DATA","Ping 3/3","success");
  }
  $("actualAnswer").textContent+=" → Recovery PASS";
  $("reasonText").textContent+=" 복구 후 정상 인증과 Data Plane을 다시 확인했습니다.";
  done.add(index); renderTabs(); renderProgress();
}
function go(i){
  index=Math.max(0,Math.min(5,i)); render();
  $("lessonTitle").focus({preventScroll:true});
  window.scrollTo({top:document.querySelector(".dot-tabs").offsetTop-80,behavior:"smooth"});
}

$("runBtn").onclick=run;
$("recoverBtn").onclick=recover;
$("resetBtn").onclick=render;
$("prevBtn").onclick=()=>go(index-1);
$("nextBtn").onclick=()=>{if(index===5){location.href="../roadmap.html";return;}go(index+1);};
render();