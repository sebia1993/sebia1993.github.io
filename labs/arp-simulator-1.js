const MAC={pc1:"00:50:79:66:68:00",pc2:"00:50:79:66:68:02",pc3:"00:50:79:66:68:03",r2e0:"02:42:d4:39:68:00",r2e1:"02:42:d4:39:68:01"};
const GOOD={
  pc1Ip:"192.168.10.10",pc1Mask:24,pc1Gw:"192.168.10.1",
  pc3Ip:"192.168.10.20",pc3Mask:24,pc3Gw:"192.168.10.1",
  pc2Ip:"192.168.20.10",pc2Mask:24,pc2Gw:"192.168.20.1",
  r2e0Ip:"192.168.10.1",r2e0Mask:24,r2e1Ip:"192.168.20.1",r2e1Mask:24
};
const lessons=[
  {
    dest:"pc3",title:"PC3로 PING을 보내보세요",text:"PC3는 PC1과 같은 LAN A에 있습니다. 지금은 정답을 몰라도 됩니다.",type:"normal",
    hints:[
      "PC1과 PC3의 주소에서 /24 기준 네트워크 부분이 같은지 먼저 보세요.",
      "같은 네트워크라면 Default Gateway를 거치지 않고 목적지 장비의 MAC을 직접 알아냅니다.",
      "PC3를 선택한 뒤 PING을 보내고, ARP Table에 192.168.10.20이 생기는지 확인하세요."
    ]
  },
  {
    dest:"pc2",title:"이번에는 PC2로 보내보세요",text:"PC2는 다른 LAN B에 있습니다. 같은 방법으로 PING만 눌러 차이를 보세요.",type:"normal",
    hints:[
      "PC1은 192.168.10.0/24, PC2는 192.168.20.0/24입니다. 서로 같은 네트워크인지 보세요.",
      "원격 네트워크라면 PC1은 최종 목적지 PC2보다 먼저 Default Gateway에게 프레임을 넘겨야 합니다.",
      "ARP Table에서 PC2가 아니라 192.168.10.1(Default Gateway)의 MAC이 생기는지 확인하세요."
    ]
  },
  {
    dest:"pc2",title:"장애 실습 · Gateway가 잘못됐습니다",text:"PING이 실패합니다. 먼저 실패 과정을 보고, 고급 실습에서 Gateway를 고쳐보세요.",type:"gw",
    hints:[
      "PING 실패 시 ARP가 어떤 IP를 찾으려 했는지 먼저 확인하세요.",
      "고급 실습에서 `show ip` 또는 PC1 Default Gateway 값을 확인해 보세요.",
      "정상 Default Gateway는 192.168.10.1입니다."
    ]
  },
  {
    dest:"pc2",title:"장애 실습 · Subnet Mask가 잘못됐습니다",text:"PC1이 PC2를 같은 네트워크로 착각합니다. 패킷이 누구를 ARP하는지 보세요.",type:"mask",
    hints:[
      "실패한 패킷에서 PC1이 Gateway가 아니라 PC2를 직접 ARP하는지 보세요.",
      "PC1이 192.168.20.10을 Local로 판단한 이유는 IP 자체보다 Subnet Mask에 있습니다.",
      "PC1의 정상 Prefix는 /24입니다. 현재 /16을 /24로 복구하세요."
    ]
  },
  {
    dest:"pc2",title:"장애 실습 · R2 eth0가 DOWN입니다",text:"주소 설정은 정상입니다. Gateway가 응답할 수 없는 상태를 확인해 보세요.",type:"link",
    hints:[
      "ARP Target은 올바르게 192.168.10.1인데 Reply가 오지 않는지 확인하세요.",
      "고급 실습의 R2 상태 또는 `show r2`로 eth0 상태를 확인하세요.",
      "R2 eth0를 UP으로 복구해야 합니다."
    ]
  },]
const state={
  lesson:0,dest:"pc3",
  pc1Ip:GOOD.pc1Ip,mask:GOOD.pc1Mask,gw:GOOD.pc1Gw,
  pc3Ip:GOOD.pc3Ip,pc3Mask:GOOD.pc3Mask,pc3Gw:GOOD.pc3Gw,
  pc2Ip:GOOD.pc2Ip,pc2Mask:GOOD.pc2Mask,pc2Gw:GOOD.pc2Gw,
  r2e0Ip:GOOD.r2e0Ip,r2e0Mask:GOOD.r2e0Mask,eth0:true,
  r2e1Ip:GOOD.r2e1Ip,r2e1Mask:GOOD.r2e1Mask,eth1:true,
  arp:{},busy:false,last:null,snapshots:[],snapshotIndex:-1,
  completed:Array(5).fill(false),failureSeen:Array(5).fill(false),hintLevel:0,openDevice:null,
  cables:{pc1sw1:true,sw1pc3:true,sw1r2:true,r2sw2:true,sw2pc2:true}
};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function ipToInt(ip){return ip.split(".").reduce((a,o)=>(a<<8)+(+o),0)>>>0}
function maskInt(p){return p===0?0:(0xffffffff<<(32-p))>>>0}
function intToIp(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join(".")}
function networkAddress(ip,p){return `${intToIp((ipToInt(ip)&maskInt(p))>>>0)}/${p}`}
function sameSubnet(a,b,p){const m=maskInt(p);return (ipToInt(a)&m)===(ipToInt(b)&m)}
function log(t){const o=$("#termOut");o.textContent+=(o.textContent?"\n":"")+t;o.scrollTop=o.scrollHeight}
function isValidIp(ip){
  const p=String(ip).trim().split(".");
  return p.length===4 && p.every(x=>/^\d+$/.test(x) && +x>=0 && +x<=255);
}
function gatewayLooksValid(ip,prefix,gw,routerIp){
  return isValidIp(gw) && sameSubnet(ip,gw,prefix) && gw===routerIp;
}

function setLiveEvent(kind,title,detail){
  const strip=$("#liveEventStrip");
  const iconMap={arp:"ARP",icmp:"ICMP",route:"R",reply:"↩",error:"!",ready:"●"};
  const labelMap={arp:"ARP",icmp:"ICMP",route:"ROUTE",reply:"REPLY",error:"ERROR",ready:"READY"};
  strip.className="live-event-strip "+(kind==="ready"?"":kind);
  $("#liveEventIcon").textContent=iconMap[kind]||"●";
  $("#liveEventTitle").textContent=title;
  $("#liveEventDetail").textContent=detail;
  $("#liveEventKind").textContent=labelMap[kind]||String(kind).toUpperCase();
}

function resetFlow(){
  clearTracePaths();$("#routeLookupCard").classList.remove("show");
  setLiveEvent("ready","패킷 이벤트 대기","PING을 보내면 장비별 처리 내용을 이 영역에서 순서대로 설명합니다.");
  ["s1","s2","s3","s4"].forEach(id=>{$("#"+id).className="flow-step"});
  $("#s1").innerHTML='<div class="n">STEP 1</div><strong>네트워크 판단</strong><p>목적지가 Local인지 Remote인지 확인합니다.</p>';
  $("#s2").innerHTML='<div class="n">STEP 2</div><strong>ARP 대상 선택</strong><p>누구의 MAC 주소가 필요한지 결정합니다.</p>';
  $("#s3").innerHTML='<div class="n">STEP 3</div><strong>Ethernet 전송</strong><p>현재 링크에서 받을 장비의 MAC으로 보냅니다.</p>';
  $("#s4").innerHTML='<div class="n">STEP 4</div><strong>통신 결과</strong><p>PING 성공/실패와 원인을 확인합니다.</p>';
  $("#resultHint").textContent="PING을 보내면 순서대로 표시됩니다.";
}
function setStep(id,title,text,status="done"){
  const e=$("#"+id);e.className="flow-step "+(status==="error"?"error":"active done");
  e.innerHTML=`<div class="n">${e.querySelector(".n")?.textContent||""}</div><strong>${title}</strong><p>${text}</p>`;
}
function renderArp(){
  const rows=Object.entries(state.arp);
  $("#arpBody").innerHTML=rows.length?rows.map(([ip,mac])=>{
    const meaning=ip===state.r2e0Ip?"원격 네트워크로 나갈 때 사용할 PC1의 Default Gateway":
                  ip===state.pc3Ip?"같은 LAN에 있는 PC3":"현재 LAN에서 학습한 이웃";
    return `<tr><td>${ip}</td><td style="font-family:monospace">${mac}</td><td>${meaning}</td></tr>`;
  }).join(""):`<tr><td colspan="3" style="color:#7a90a3">아직 학습한 ARP 항목이 없습니다.</td></tr>`;
}

const LINK_UI={
  pc1sw1:{path:"pathPc1Sw1",badge:"badgePc1Sw1",text:"badgePc1Sw1Text",brk:"breakPc1Sw1",label:"PC1↔SW1",stop:[292,239]},
  sw1pc3:{path:"pathPc3Sw1",badge:"badgePc3Sw1",text:"badgePc3Sw1Text",brk:"breakPc3Sw1",label:"SW1↔PC3",stop:[292,379]},
  sw1r2:{path:"pathSw1R2",badge:"badgeSw1R2",text:"badgeSw1R2Text",brk:"breakSw1R2",label:"SW1↔R2",stop:[566,308]},
  r2sw2:{path:"pathR2Sw2",badge:"badgeR2Sw2",text:"badgeR2Sw2Text",brk:"breakR2Sw2",label:"R2↔SW2",stop:[852,308]},
  sw2pc2:{path:"pathSw2Pc2",badge:"badgeSw2Pc2",text:"badgeSw2Pc2Text",brk:"breakSw2Pc2",label:"SW2↔PC2",stop:[1126,308]}
};
function effectiveLinkUp(key){
  if(!state.cables[key])return false;
  if(key==="sw1r2" && !state.eth0)return false;
  if(key==="r2sw2" && !state.eth1)return false;
  return true;
}
function linkDownReason(key){
  if(!state.cables[key])return "CABLE";
  if(key==="sw1r2" && !state.eth0)return "eth0";
  if(key==="r2sw2" && !state.eth1)return "eth1";
  return "";
}
function renderLinks(){
  Object.entries(LINK_UI).forEach(([key,u])=>{
    const cableDown=!state.cables[key];
    const ifDown=state.cables[key] && ((key==="sw1r2"&&!state.eth0)||(key==="r2sw2"&&!state.eth1));
    const up=!cableDown&&!ifDown;
    const reason=cableDown?"CABLE":ifDown?(key==="sw1r2"?"eth0":"eth1"):"";
    const path=$("#"+u.path), badge=$("#"+u.badge), brk=$("#"+u.brk), tx=$("#"+u.text);
    path.classList.toggle("link-up",up);
    path.classList.toggle("link-down",cableDown);
    path.classList.toggle("link-ifdown",ifDown);
    badge.classList.toggle("down",cableDown);
    badge.classList.toggle("ifdown",ifDown);
    badge.style.display=up?"none":"block";
    brk.classList.toggle("show",cableDown);
    tx.textContent=up?"UP":`DOWN · ${reason}`;
  });
  $("#r2Eth0Led").setAttribute("class","port-led "+(state.eth0?"up":"down"));
  $("#r2Eth1Led").setAttribute("class","port-led "+(state.eth1?"up":"down"));
  $$('[data-cable]').forEach(b=>{
    const key=b.dataset.cable,up=state.cables[key];
    b.classList.toggle("down",!up);
    b.textContent=`${LINK_UI[key].label} · ${up?"UP":"DOWN"}`;
  });
}
function toggleCable(key){
  state.cables[key]=!state.cables[key];
  state.arp={};state.last=null;resetPacketStudy();renderArp();renderLinks();renderLessonStatus();
  log(`${LINK_UI[key].label} Cable → ${state.cables[key]?"UP":"DOWN"}`);
}
function showPacketStop(key,reason=""){
  const u=LINK_UI[key];
  let [x,y]=u.stop;
  if(reason==="eth0"){x=640;y=308}
  if(reason==="eth1"){x=758;y=308}
  $("#packetStopCircle").setAttribute("cx",x);$("#packetStopCircle").setAttribute("cy",y);
  $("#packetStopText").setAttribute("x",x);$("#packetStopText").setAttribute("y",y+4);
  $("#packetStop").classList.add("show");
}
function hidePacketStop(){$("#packetStop").classList.remove("show")}
function partialPath(points,ratio=.45){
  if(points.length<2)return points;
  let segs=[],total=0;
  for(let i=1;i<points.length;i++){const dx=points[i][0]-points[i-1][0],dy=points[i][1]-points[i-1][1],len=Math.hypot(dx,dy);segs.push(len);total+=len}
  const target=total*ratio;let walked=0,out=[points[0]];
  for(let i=1;i<points.length;i++){
    const len=segs[i-1];
    if(walked+len<=target){out.push(points[i]);walked+=len;continue}
    const remain=target-walked,t=len?remain/len:0;
    out.push([points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t]);
    break;
  }
  return out;
}
async function animateLinks(keys){
  hidePacketStop();
  for(const key of keys){
    const up=effectiveLinkUp(key);
    if(!up){
      const reason=linkDownReason(key);
      await move(partialPath(paths[key],reason==="CABLE"?.48:.9));
      showPacketStop(key,reason);
      setLiveEvent("error",`${LINK_UI[key].label} · LINK DOWN`,
        reason==="CABLE"?"케이블이 끊겨 패킷이 이 지점에서 멈췄습니다.":`${reason} 인터페이스가 DOWN이라 패킷이 장비를 통과하지 못합니다.`);
      return {ok:false,key,reason};
    }
    await move(paths[key]);
  }
  return {ok:true};
}

const TRACE_REQ={pc1sw1:"traceReqPc1Sw1",sw1pc3:"traceReqSw1Pc3",sw1r2:"traceReqSw1R2",r2sw2:"traceReqR2Sw2",sw2pc2:"traceReqSw2Pc2"};
const TRACE_REP={pc3sw1:"traceRepPc3Sw1",pc2sw2:"traceRepPc2Sw2",sw2r2:"traceRepSw2R2",r2sw1:"traceRepR2Sw1",sw1pc1:"traceRepSw1Pc1"};
function clearTracePaths(){
  $$(".trace-path").forEach(x=>x.classList.remove("show"));
  $$(".trace-label").forEach(x=>x.classList.remove("show"));
}
function markRequest(keys){
  keys.forEach(k=>{const id=TRACE_REQ[k];if(id)$("#"+id).classList.add("show")});
  $("#traceRequestLabel").classList.add("show");
}
function markReply(keys){
  keys.forEach(k=>{const id=TRACE_REP[k];if(id)$("#"+id).classList.add("show")});
  $("#traceReplyLabel").classList.add("show");
}
function setPacketVisual(mode){
  const p=$("#packet"),r=$("#packetRing");
  const c=mode==="reply"?"#2f7fd0":"#0ea77d";
  p.setAttribute("fill",c);r.setAttribute("stroke",c);
}
