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
NetworkSimulator.mount(adapter);
})();
