// Existing lesson data and topic renderer retained from nat-pat-simulator; playback is shared.
(()=>{
const lessons=[
{claim:"NAT-01",title:"Basic NAT",text:"R1 10.0.11.2에서 R3 198.51.100.2로 ICMP를 보냅니다. R2는 Basic NAT로 198.51.100.5를 사용합니다.",states:["Inside Local 10.0.11.2","Inside Global 198.51.100.5","CP11 ↔ CP23"],question:"CP23에서 같은 Request의 Source는?",options:["198.51.100.5","10.0.11.2","198.51.100.2"],correct:0,mode:"basic",actual:"CP11 10.0.11.2 → CP23 198.51.100.5",reason:"R2가 Inside Local Source를 Inside Global .5로 바꿨고 Destination은 R3로 유지됐습니다.",recover:false,evidence:["R1 Ping 3/3","CP11 source 10.0.11.2","CP23 source 198.51.100.5","Translation Table mapping 일치"]},
{claim:"NAT-02",title:"PAT Overload",text:"R1과 R4가 동시에 R3 TCP/23에 연결합니다. 두 Flow 모두 하나의 Global IP를 공유합니다.",states:["R1 local :25473","R4 local :46258","Global IP 198.51.100.5"],question:"이번 Run의 두 PAT mapping은?",options:[".5:25473 / .5:46258",".5:23 / .5:23","각각 다른 Global IP"],correct:0,mode:"pat",actual:"198.51.100.5:25473 / 198.51.100.5:46258",reason:"두 Flow는 같은 Global IP를 공유하면서 서로 다른 TCP endpoint로 구분됐습니다. 이번 Run에서는 local source port가 그대로 유지됐습니다.",recover:false,evidence:["R1/R4 TCP session 동시 성공","R3 prompt 도달","R1 global :25473","R4 global :46258"]},
{claim:"NAT-03",title:"Return Translation",text:"NAT-02의 두 PAT session이 동시에 살아 있습니다.",states:["R1 global :25473","R4 global :46258","같은 Global IP"],question:"R3의 :46258 응답은 어디로 돌아가야 할까요?",options:["R4 10.0.14.2:46258","R1 10.0.11.2:25473","두 Inside Host 모두"],correct:0,mode:"return",actual:"R4 10.0.14.2:46258",reason:"Translation Table이 Global endpoint를 정확한 Inside Local endpoint와 연결했고 다른 Inside Link에는 대응 응답이 없었습니다.",recover:false,evidence:["R4 응답 CP23→CP14 대응","R1 응답은 CP23→CP11 대응","다른 Inside link 대응 응답 0","NAT-03은 NAT-02 session 재사용"]},
{claim:"NAT-04",title:"Static PAT",text:"R3가 198.51.100.5:2323으로 TCP 연결을 시작하고 R2에는 고정 Port mapping이 있습니다.",states:["Global .5:2323","Local R1 10.0.11.2:23","Outside → Inside"],question:"CP11에서 변환된 Destination은?",options:["10.0.11.2:23","10.0.11.2:2323","198.51.100.5:23"],correct:0,mode:"static",actual:"10.0.11.2:23",reason:"R2가 Outside의 Global :2323 endpoint를 R1의 Local :23 서비스로 변환했습니다.",recover:false,evidence:["CP23 dst 198.51.100.5:2323","CP11 dst 10.0.11.2:23","3-way handshake 성공","R1 prompt/응답 및 return source 역변환"]},
{claim:"NAT-05",title:"NAT Selection Mismatch",text:"NAT 대상 목록에서 R4만 빠졌습니다. R1은 정상 통제 Flow입니다.",states:["R1 selected","R4 not selected","R3 private route 없음"],question:"R4 Request는 R2에서 어떻게 될까요?",options:["번역 없이 CP23까지 Forward","R2에서 보안 Drop","자동으로 R1 mapping 재사용"],correct:0,mode:"selectionFail",actual:"CP23까지 source 10.0.14.2 그대로 Forward · Ping 0/3",reason:"Selection 불일치는 보안 Drop이 아니었습니다. R4 Packet은 Outside까지 나갔지만 Translation이 없어 R3가 private source로 Reply할 route가 없었습니다.",recover:true,evidence:["R4 Translation entry 없음","CP14→CP23 source 10.0.14.2 유지","R3 internal route 없음","동시 R1 control 3/3 정상 변환"]},
{claim:"NAT-06",title:"Inside Role Failure",text:"R2의 R1-facing Interface에서 NAT inside role만 제거했습니다. R4 쪽 role과 selection은 유지합니다.",states:["R1 role missing","R4 control normal","Routing unchanged"],question:"R1 Request의 CP23 Source는?",options:["10.0.11.2 그대로","198.51.100.5로 정상 변환","Packet이 R2에서 바로 Drop"],correct:0,mode:"roleFail",actual:"10.0.11.2 그대로 · R1 0/3",reason:"R1 Packet은 Routing에 따라 CP23까지 나갔지만 NAT inside role이 없어 Translation이 생성되지 않았습니다. R4는 같은 시점 3/3 정상 변환됐습니다.",recover:true,evidence:["R1 Translation 없음","CP23 source 10.0.11.2","R4 control 3/3 translated","role 복구 후 R1/R4 모두 3/3"]}
];


const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function tr(text,cls=""){return `<div class="tr-row ${cls}">${text}</div>`;}
function resetVisual(){
  $("link11").setAttribute("class","net-link inside");$("link14").setAttribute("class","net-link inside");$("link23").setAttribute("class","net-link outside");$("stopMarker").style.display="none";
  ["r1","r2","r3","r4"].forEach(id=>$(id).className="node "+id);$("r2").classList.add("nat");$("natBadge").textContent="R2 · NAT EDGE";
  $("eventKind").textContent="IDLE";$("eventText").textContent="예상을 선택한 뒤 실행하면 NAT 전후 Packet View를 보여줍니다.";
  $("metaPanel").innerHTML="<span>Inside</span><strong>E0/0 · E0/1</strong><span>Outside</span><strong>E0/2</strong><span>Global IP</span><strong>198.51.100.5</strong>";
  $("translationList").innerHTML="";$("resultBox").innerHTML="<strong>대기</strong>예상 후 실행하세요.";$("scopeNote").innerHTML="<b>학습 모델:</b> Animation은 실제 처리 시간을 의미하지 않습니다.";
}
function passR1(){ $("link11").setAttribute("class","net-link pass");$("link23").setAttribute("class","net-link pass");["r1","r2","r3"].forEach(id=>$(id).classList.add("active")); }
function passR4(){ $("link14").setAttribute("class","net-link pass");$("link23").setAttribute("class","net-link pass");["r4","r2","r3"].forEach(id=>$(id).classList.add("active")); }
function apply(mode){
 resetVisual();
 if(mode==="basic"){
  passR1();$("translationList").innerHTML=tr("ICMP · 10.0.11.2 ⇄ 198.51.100.5","active");$("eventKind").textContent="BASIC NAT";$("eventText").textContent="CP11의 10.0.11.2 Source가 CP23에서 198.51.100.5로 보이고 Return은 다시 R1로 역변환됩니다.";$("resultBox").innerHTML="<strong>Ping 3/3</strong>Inside Local → Inside Global";
 }
 if(mode==="pat"){
  $("link11").setAttribute("class","net-link pass");$("link14").setAttribute("class","net-link pass");$("link23").setAttribute("class","net-link pass");["r1","r2","r3","r4"].forEach(id=>$(id).classList.add("active"));
  $("translationList").innerHTML=tr("TCP · 10.0.11.2:25473 → .5:25473","active")+tr("TCP · 10.0.14.2:46258 → .5:46258","active");$("eventKind").textContent="PAT OVERLOAD";$("eventText").textContent="R1과 R4가 같은 Global IP를 동시에 공유하며 두 Translation row로 Flow가 구분됩니다.";$("resultBox").innerHTML="<strong>2 sessions PASS</strong>Global IP 198.51.100.5 shared";
  $("scopeNote").innerHTML="<b>주의:</b> 이번 Run에서는 Source Port가 보존됐습니다. PAT가 항상 Port 번호를 바꾸는 것은 아닙니다.";
 }
 if(mode==="return"){
  passR4();$("link23").setAttribute("class","net-link return");$("link14").setAttribute("class","net-link return");$("translationList").innerHTML=tr("Global .5:46258 → Local 10.0.14.2:46258","active")+tr("Global .5:25473 → Local 10.0.11.2:25473");$("eventKind").textContent="RETURN TRANSLATION";$("eventText").textContent="R3 응답의 Global :46258 endpoint가 Translation Table을 통해 R4의 CP14 Flow로 정확히 돌아갑니다.";$("resultBox").innerHTML="<strong>R4 selected</strong>Other Inside link matching reply = 0";
 }
 if(mode==="static"){
  $("link23").setAttribute("class","net-link pass");$("link11").setAttribute("class","net-link pass");["r3","r2","r1"].forEach(id=>$(id).classList.add("active"));$("translationList").innerHTML=tr("TCP · .5:2323 ⇄ 10.0.11.2:23","active");$("eventKind").textContent="STATIC PAT";$("eventText").textContent="R3가 Global .5:2323으로 시작한 연결이 R2에서 R1 10.0.11.2:23으로 변환됩니다.";$("resultBox").innerHTML="<strong>Handshake PASS</strong>R3 → .5:2323 → R1:23";
 }
 if(mode==="selectionFail"){
  $("link14").setAttribute("class","net-link untranslated");$("link23").setAttribute("class","net-link untranslated");$("r4").classList.add("warning");$("r2").classList.add("warning");$("r3").classList.add("failure");$("stopMarker").style.display="block";$("translationList").innerHTML=tr("R1 control · translated","active")+tr("R4 · no translation entry","warn");$("eventKind").textContent="UNTRANSLATED";$("eventText").textContent="R4 Request는 R2에서 Drop되지 않고 10.0.14.2 Source 그대로 CP23까지 전달됩니다. R3에 private return route가 없어 Reply가 돌아오지 않습니다.";$("resultBox").innerHTML="<strong>R4 Ping 0/3</strong>Forwarded untranslated · Return fails";
 }
 if(mode==="roleFail"){
  $("link11").setAttribute("class","net-link untranslated");$("link23").setAttribute("class","net-link untranslated");$("r1").classList.add("warning");$("r2").classList.add("warning");$("r3").classList.add("failure");$("link14").setAttribute("class","net-link pass");$("translationList").innerHTML=tr("R1 · no translation entry","warn")+tr("R4 · translated control","active");$("eventKind").textContent="INSIDE ROLE MISSING";$("eventText").textContent="R1 Packet은 Routing으로 CP23까지 나가지만 NAT inside role이 없어 10.0.11.2 그대로 보입니다. R4는 정상 변환됩니다.";$("resultBox").innerHTML="<strong>R1 0/3 · R4 3/3</strong>Routing alive, NAT role missing";
 }
 if(mode==="recover"){
  $("link11").setAttribute("class","net-link pass");$("link14").setAttribute("class","net-link pass");$("link23").setAttribute("class","net-link pass");["r1","r2","r3","r4"].forEach(id=>$(id).classList.add("active"));$("translationList").innerHTML=tr("R1 · translated","active")+tr("R4 · translated","active");$("eventKind").textContent="RECOVERY";$("eventText").textContent="NAT selection/role을 원복한 뒤 두 Inside node 모두 Translation이 생성되고 3/3 통신이 복구됩니다.";$("resultBox").innerHTML="<strong>R1 3/3 · R4 3/3</strong>Baseline restored";
 }
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetVisual();},show(){apply(lessons[index].mode);},recover:()=>apply('recover'),compare:null};
const S=SecurityLab;
adapter.presentation={names:S.names,labels:{...S.labels,'PAT OVERLOAD':'PAT 주소 공유','RETURN TRANSLATION':'응답 역변환','STATIC PAT':'Static PAT','UNTRANSLATED':'미변환 전달','INSIDE ROLE MISSING':'NAT inside 역할 누락','2 sessions PASS':'두 Session 성공','Other Inside link matching reply = 0':'다른 내부 링크의 대응 응답 0개','Handshake PASS':'Handshake 성공','Forwarded untranslated · Return fails':'미변환 전달 · 응답 경로 실패','Routing alive, NAT role missing':'Routing 유지 · NAT inside 역할 누락','Baseline restored':'정상 기준 복구','No translation entry':'변환 기록 없음','no translation entry':'변환 기록 없음','role missing':'역할 누락','control normal':'대조 통신 정상','Routing unchanged':'Routing 유지','not selected':'대상 제외','번역 없이':'주소 변환 없이'},lessons:[
{title:'NAT 바깥에서 출발지 주소는 무엇일까요?',brief:'학습 페이지의 Router A·D는 내부, Router B는 NAT 경계, Router C는 외부입니다. CP11과 CP23에서 같은 요청의 값을 비교합니다.',hints:['Inside Local과 Inside Global은 관찰 위치가 다릅니다.','목적지 주소와 출발지 주소를 분리해서 읽으세요.','Translation Table의 대응 기록을 확인하세요.']},
{title:'같은 외부 IP에서 두 통신을 어떻게 구분할까요?',brief:'Router A와 Router D가 같은 TCP/23 서비스에 연결합니다. 외부 IP와 Port의 대응 관계를 함께 봅니다.',hints:['IP 하나만으로 두 Flow를 구분할 수 있을까요?','두 TCP 출발지 Port를 비교하세요.','PAT라고 Port 번호가 반드시 바뀌는 것은 아닙니다.']},
{title:'응답은 어느 내부 장비로 돌아갈까요?',brief:'두 PAT Session이 이미 있는 조건입니다. 외부 응답의 Port와 Translation Table을 대조합니다.',hints:['두 내부 장비는 같은 Global IP를 공유합니다.','응답이 향하는 Global Port는 46258입니다.','그 Port와 연결된 Inside Local 기록을 찾으세요.']},
{title:'외부 서비스 Port는 어디로 연결될까요?',brief:'외부의 198.51.100.5:2323을 내부 서비스에 연결하는 고정 기록을 관찰합니다.',hints:['이번에는 외부에서 연결을 시작합니다.','Source 변환과 Destination 변환을 구분하세요.','Global :2323에 연결된 Local endpoint를 확인하세요.']},
{title:'NAT 대상에서 빠지면 바로 차단될까요?',brief:'Router D만 NAT 대상에서 빠졌습니다. 요청의 전달 여부와 주소 변환 여부를 각각 확인합니다.',hints:['NAT 선택 목록을 보안 ACL과 같은 뜻으로 읽지 않습니다.','CP23에서 요청 자체가 보이는지 먼저 확인하세요.','외부 장비가 미변환 주소로 응답할 경로도 필요합니다.']},
{title:'NAT inside 역할이 없으면 어떻게 될까요?',brief:'Router A 쪽 인터페이스의 NAT inside 역할만 제거했습니다. Router D는 같은 시점의 대조 통신입니다.',hints:['Routing과 NAT 역할은 별도로 확인합니다.','Router A와 Router D의 Translation 기록을 비교하세요.','완료 후 역할 복구 장면을 확인할 수 있습니다.']}
]};
const originalReset=adapter.reset;adapter.reset=i=>{originalReset(i);S.clear();};
function mapping(items){S.rows('translationList',items);}
adapter.buildPlan=(i,mode='normal')=>{
 const s=lessons[i],m=s.mode,E=S.event,M=S.move;
 if(mode==='recover')return[E('NAT 조건 원복','기존 검증에서 NAT 선택 조건 또는 inside 역할을 복구합니다.',()=>S.clear()),M('내부 요청 다시 전달','두 내부 장비가 다시 정상 변환되는지 확인합니다.',['r1','r2','r3'],'ICMP'),E('변환 기록 복구','Router A와 Router D에 각각 변환 기록이 있습니다.',()=>mapping([['Router A','변환됨'],['Router D','변환됨']])),M('응답 경로 확인','응답이 원래 내부 장비로 돌아갑니다.',['r3','r2','r4'],'Echo Reply',()=>{},'return'),E('복구 결과 확인','두 내부 장비의 Ping은 각각 3/3으로 복구됐습니다.',()=>apply('recover'))];
 if(mode!=='normal')return null;
 const start=E('관찰 위치 확인','CP11은 Router A, CP14는 Router D의 내부 링크입니다. CP23은 NAT 바깥쪽입니다.',()=>S.clear()),done=()=>S.finish(s,()=>apply(m));
 if(m==='basic')return[start,M('내부 요청 전달','CP11에서 출발지는 10.0.11.2입니다.',['r1','r2'],'ICMP'),E('주소 대응 기록','Inside Local 10.0.11.2와 Inside Global 198.51.100.5를 연결합니다.',()=>mapping([['Inside Local','10.0.11.2'],['Inside Global','198.51.100.5']])),M('외부에서 같은 요청 관찰','CP23에서는 출발지가 198.51.100.5로 보이고 목적지는 유지됩니다.',['r2','r3'],'ICMP .5'),M('응답 역변환','Translation Table을 이용해 원래 내부 장비로 돌아갑니다.',['r3','r2','r1'],'Echo Reply',()=>{},'return'),done()];
 if(m==='pat')return[start,M('첫 번째 TCP Flow','Router A의 출발지 Port는 25473입니다.',['r1','r2'],'TCP :25473'),E('첫 변환 기록','외부 IP .5에 첫 Flow의 Port를 연결합니다.',()=>mapping([['Router A','10.0.11.2:25473 ↔ .5:25473']])),M('두 번째 TCP Flow','Router D의 출발지 Port는 46258입니다.',['r4','r2'],'TCP :46258'),E('두 기록 비교','두 Flow는 외부 IP를 공유하며 서로 다른 endpoint로 구분됩니다. 이번 관측에서는 원래 Port가 보존됐습니다.',()=>mapping([['Router A','10.0.11.2:25473 ↔ .5:25473'],['Router D','10.0.14.2:46258 ↔ .5:46258']])),M('외부 전달 확인','두 TCP Session은 같은 Global IP를 통해 외부 서비스에 연결됐습니다.',['r2','r3'],'TCP'),done()];
 if(m==='return')return[start,E('기존 변환 기록 확인','이 문제는 앞선 PAT의 두 Session이 살아 있는 조건입니다.',()=>mapping([['Router A','10.0.11.2:25473 ↔ .5:25473'],['Router D','10.0.14.2:46258 ↔ .5:46258']])),M('외부 응답 도착','응답의 목적지 Global endpoint는 .5:46258입니다.',['r3','r2'],'TCP :46258'),E('일치하는 기록 조회','46258 기록은 Router D의 10.0.14.2:46258과 연결됩니다.',()=>{$('translationList').children[1].classList.add('so-current');}),M('원래 내부 Flow로 전달','CP14로 전달하고 Router A 쪽 CP11에는 이 응답을 보내지 않습니다.',['r2','r4'],'TCP Reply',()=>{},'return'),done()];
 if(m==='static')return[start,M('외부 연결 요청','Router C는 Global 198.51.100.5:2323으로 SYN을 보냅니다.',['r3','r2'],'TCP :2323'),E('고정 변환 기록 조회','Global :2323은 Router A의 Local 10.0.11.2:23과 연결돼 있습니다.',()=>mapping([['Global','.5:2323'],['Local','10.0.11.2:23']])),M('내부 서비스로 전달','CP11에서 목적지는 10.0.11.2:23으로 바뀝니다.',['r2','r1'],'TCP :23'),M('응답의 역변환','응답은 다시 Global endpoint로 대응돼 외부로 전달됩니다.',['r1','r2','r3'],'SYN-ACK',()=>{},'return'),done()];
 const source=m==='selectionFail'?'r4':'r1',name=m==='selectionFail'?'Router D':'Router A',address=m==='selectionFail'?'10.0.14.2':'10.0.11.2';
 return[start,M('내부 요청 도착',name+'의 요청이 NAT 경계까지 전달됩니다.',[source,'r2'],'ICMP'),E('NAT 조건 확인',m==='selectionFail'?'Router D는 NAT 선택 대상에 포함되지 않습니다.':'Router A 쪽 인터페이스에 NAT inside 역할이 없습니다.',()=>mapping([[name,'변환 기록 없음'],['다른 내부 장비','정상 대조 통신']])),M('미변환 상태로 외부 전달','보안 차단이 아닙니다. CP23에서 출발지 '+address+'가 그대로 보입니다.',['r2','r3'],'ICMP 원주소'),E('응답 경로 확인','Router C에는 이 내부 주소로 돌아갈 Route가 없어 응답이 돌아오지 않습니다.',()=>{$('r3').classList.add('failure');$('resultBox').textContent='요청 전달됨 · 변환 없음 · 응답 경로 실패';}),done()];
};

NetworkSimulator.mount(adapter);
})();
