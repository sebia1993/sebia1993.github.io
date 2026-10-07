// Existing lesson data and topic renderer retained from dot1x-radius-simulator; playback is shared.
(()=>{
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


const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function row(text,cls=""){return '<div class="dot-state-row '+cls+'">'+text+'</div>'}
function event(step,text,cls=""){return '<div class="dot-event '+cls+'"><span>'+step+'</span><code>'+text+'</code></div>'}
function resetPanels(){
  $("stateList").innerHTML=row("예상 후 실제 Session/AAA 상태를 표시합니다.");
  $("eventList").innerHTML=event("대기","메시지 흐름을 아직 열지 않았습니다.");
  $("evidenceList").innerHTML=row("실제 Evidence는 실행 후 표시됩니다.");
  $("scopeNote").textContent="실제 WLAN에서는 AP/Controller가 Authenticator 역할을 맡습니다.";
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
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetPanels();},show(){apply(lessons[index].mode);},recover:()=>{const reject=lessons[index].mode==='reject';$('stateList').innerHTML=row(reject?'Correct BLUE restored':'FreeRADIUS service restored','ok')+row(reject?'Access-Accept #416':'Access-Accept #523','ok')+row('Authorized / Ping 3/3','ok');$('eventList').innerHTML=event('RECOVERY',reject?'Correct credential':'RADIUS service restored','success')+event('AAA',reject?'Access-Accept #416':'Access-Accept #523','success')+event('DATA','Ping 3/3','success');},compare:null};
adapter.presentation={
 names:{'SUPP-LINUX':'PC A','SW1':'Switch A','FreeRADIUS 인증 서버':'Server A'},
 labels:{'Protocol Boundary':'프로토콜 경계','Protocol':'프로토콜','Credential':'자격정보','Lab Password':'실습 비밀번호','Identity':'Identity','Evidence':'근거','Data success':'데이터 통신 성공','Data Plane':'Data Plane','Backend':'뒤쪽','Packet direction':'패킷 방향','Full EAP byte hash':'전체 EAP 바이트 해시','Explicit server response':'명시적인 서버 응답','Both Access-Accept':'둘 다 Access-Accept','AAA Server no-response / timeout':'AAA 서버 무응답 / Timeout','Baseline':'기준 상태','exact-match':'정확히 일치'},
 lessons:[
  {title:'PC A와 Server A 사이에서 어떤 프로토콜이 보일까요?',brief:'학습 페이지의 PC A → Switch A → Server A 구성입니다. 각 연결 구간의 역할을 나눠 관찰합니다.',hints:['PC A는 Supplicant, Switch A는 Authenticator입니다.','같은 EAP 대화가 두 구간에서 어떻게 운반되는지 보세요.']},
  {title:'Switch A가 같은 EAP를 중계했는지 어떻게 알까요?',brief:'실제 정상 BLUE 인증에서 보존된 EAPOL·RADIUS 근거를 비교합니다. 애니메이션은 전체 20개 교환의 요약입니다.',hints:['시각만 비슷한 패킷이 같은 패킷일까요?','Identifier·방향뿐 아니라 실제 EAP 바이트도 대조합니다.']},
  {title:'Access-Accept 뒤에 무엇을 더 확인할까요?',brief:'BLUE 사용자의 정상 인증입니다. 서버 응답, Switch A 상태, PC A의 주소와 통신을 연결해 봅니다.',hints:['서버의 성공과 Switch A의 접속 허용을 구분하세요.','허용 이후 주소와 실제 데이터 통신도 확인합니다.']},
  {title:'잘못된 비밀번호와 서버 무응답은 어떻게 구분할까요?',brief:'BLUE에 잘못된 실습 비밀번호를 사용한 기존 사례입니다. 응답 유무와 명시적인 거절을 확인합니다.',hints:['서버가 어떤 RADIUS 응답을 보냈는지 확인하세요.','EAP Failure 한 줄만으로 모든 실패를 같은 원인으로 분류하지 않습니다.']},
  {title:'둘 다 인증에 성공해도 VLAN은 다를 수 있을까요?',brief:'BLUE와 GREEN은 둘 다 유효한 사용자입니다. 인증 결과와 적용된 VLAN·주소를 따로 비교합니다.',hints:['인증은 자격 확인, 인가는 허용 범위 결정입니다.','Tunnel Attributes와 Switch A의 실제 VLAN을 연결해 보세요.']},
  {title:'Access-Request만 반복되면 어디를 확인할까요?',brief:'정상 BLUE 조건에서 Server A의 FreeRADIUS 서비스만 중단한 사례입니다.',hints:['응답이 없는 것과 Access-Reject를 받은 것은 다릅니다.','IP 계층 응답과 RADIUS 응답을 구분해서 읽으세요.']}
 ]
};
const dotActors=[{name:'PC A',role:'Supplicant · EAPOL',kind:'pc'},{name:'Switch A',role:'Authenticator',kind:'switch'},{name:'Server A',role:'FreeRADIUS',kind:'server'}];
const dotFrames=[
 [
  ['PC A ↔ Switch A','단말 구간 CP-EAPOL에서는 EAPOL로 EAP Request / Response를 확인했습니다.',0,1,'PC A ↔ Switch A : EAPOL'],
  ['Switch A ↔ Server A','서버 구간 CP-RADIUS에서는 UDP/1812의 RADIUS를 확인했습니다.',1,2,'Switch A ↔ Server A : RADIUS'],
  ['중계 역할 구분','PC A의 access link에서 직접 RADIUS는 관측되지 않았습니다. Switch A가 두 구간을 중계합니다.',null,null,'EAPOL과 RADIUS는 서로 다른 구간']
 ],
 [
  ['PC A의 EAP Response','단말이 보내는 EAP Response를 CP-EAPOL에서 확인합니다.',0,1,'EAPOL 안의 EAP Response'],
  ['EAP를 RADIUS에 넣어 전달','Switch A가 같은 EAP를 EAP-Message에 넣어 Access-Request로 전달합니다.',1,2,'동일 EAP 바이트를 RADIUS에서 대조'],
  ['다음 EAP 요청을 되돌려 전달','Server A의 Access-Challenge 안에 다음 EAP Request가 실립니다.',2,1,'Access-Challenge + EAP Request'],
  ['PC A로 전달','Switch A가 EAP Request를 PC A에 전달합니다. 최초 Request/Identity는 Switch A가 로컬로 생성한 예외입니다.',1,0,'정상 BLUE에서 총 20개 EAP 바이트 일치']
 ],
 [
  ['서버의 인증 성공 응답','기존 근거에서 Server A의 Access-Accept #324를 확인했습니다.',2,1,'Access-Accept #324'],
  ['EAP Success 확인','동일 연결의 EAP Success와 단말 구간을 연결합니다.',1,0,'EAP Success'],
  ['Switch A의 허용 상태','Cisco Session이 Authorized이며 VLAN20이 적용됐습니다.',null,null,'Authorized · VLAN20'],
  ['PC A 주소와 데이터 확인','DHCP 주소 10.77.20.10과 Ping 3/3이 같은 정상 상태를 뒷받침합니다.',null,null,'10.77.20.10 · Ping 3/3']
 ],
 [
  ['인증 교환 시작','잘못된 BLUE 자격정보로 기존 실습에서 인증 교환을 시작했습니다.',0,1,'EAP 인증 교환 시작'],
  ['명시적 거절 응답','Server A가 Access-Reject #371을 반환했습니다. 무응답과 구분합니다.',2,1,'Access-Reject #371'],
  ['허용되지 않은 상태','EAP Failure와 Switch A의 Unauthorized가 확인됐습니다.',1,0,'EAP Failure · Unauthorized'],
  ['데이터 중단 근거','CP-EAPOL의 ARP는 있었지만 CP-DATA에 대응 ARP가 없었고 Ping은 0/3이었습니다.',null,null,'Ping 0/3 · 복구는 별도 관찰']
 ],
 [
  ['BLUE 인증·인가','BLUE는 Access-Accept를 받고 Tunnel Private-Group-ID 20이 적용됐습니다.',2,1,'BLUE · Access-Accept · VLAN20'],
  ['GREEN 인증·인가','GREEN도 Access-Accept를 받지만 Tunnel Private-Group-ID는 30입니다.',2,1,'GREEN · Access-Accept · VLAN30'],
  ['실제 VLAN과 주소 비교','Switch A Session과 DHCP 주소가 각각 VLAN20/10.77.20.10, VLAN30/10.77.30.10에 대응합니다.',null,null,'두 사용자 모두 Ping 3/3 · 적용 VLAN은 다름']
 ],
 [
  ['Access-Request 전송','Server A의 FreeRADIUS 서비스를 중단한 뒤 Switch A가 인증 요청을 보냅니다.',1,2,'Access-Request 1회'],
  ['같은 EAP 요청 재전송','동일 EAP payload의 Access-Request가 총 세 번 기록됐습니다.',1,2,'Access-Request 총 3회'],
  ['RADIUS 응답 없음','Access-Accept와 Access-Reject는 모두 0개였습니다. Linux의 ICMP Type3 Code3 응답은 별도로 존재합니다.',null,null,'RADIUS 응답 없음 ≠ 모든 IP 응답 없음'],
  ['Timeout과 허용 상태','Cisco Timeout / Unauthorized와 Ping 0/3이 확인됐습니다. 비밀번호 오류 Reject와 구분합니다.',null,null,'Timeout · Unauthorized · Ping 0/3']
 ]
];
const dotReset=adapter.reset;
adapter.reset=i=>{dotReset(i);WirelessLab.flow('dotFlow',dotActors,'EAPOL 구간과 RADIUS 구간을 나눠 관찰합니다.');};
adapter.buildPlan=(i,mode='normal')=>{
 if(mode==='compare')return null;
 const frames=mode==='recover'?[
  ['복구 조건 적용',i===3?'BLUE의 올바른 실습 자격정보로 되돌린 기존 복구 사례입니다.':'Server A의 FreeRADIUS 서비스를 복구한 기존 사례입니다.',null,null,i===3?'올바른 BLUE 자격정보 복구':'FreeRADIUS 서비스 복구'],
  ['서버의 성공 응답',i===3?'복구 연결에서 Access-Accept #416을 확인했습니다.':'서비스 복구 후 Access-Accept #523을 확인했습니다.',2,1,i===3?'Access-Accept #416':'Access-Accept #523'],
  ['허용·통신 복구 확인','기존 복구 근거에서 Authorized와 Ping 3/3이 다시 확인됐습니다.',null,null,'Authorized · Ping 3/3']
 ]:dotFrames[i];
 if(!frames)return null;
 return frames.map(([title,detail,from,to,state],k)=>({title,detail,kind:mode==='recover'?'복구 근거':'인증 관찰',duration:from===null?1800:1650,action(){index=i;WirelessLab.flow('dotFlow',dotActors,from===null?'기존 관측 기록의 상태를 확인합니다.':`${dotActors[from].name} → ${dotActors[to].name}`);$('eventList').innerHTML=frames.slice(0,k+1).map((f,j)=>'<div class="dot-event '+(j===k?'success':'')+'"><span>'+(j+1)+'</span><div><b>'+WirelessLab.esc(f[0])+'</b><p>'+WirelessLab.esc(f[4])+'</p></div></div>').join('');$('stateList').innerHTML=row(state,k===frames.length-1&&[3,5].includes(i)&&mode!=='recover'?'bad':'ok');$('scopeNote').textContent='학습 페이지와 같은 유선 802.1X 실습입니다. WLAN의 AP/Controller 직접 실측으로 표시하지 않습니다.';$('simVisual').dataset.reveal='all';},animate(p){if(from!==null)WirelessLab.motion('dotFlow',from,to,Math.min(1,p*1650/420));}}));
};

NetworkSimulator.mount(adapter);
})();
