const SIM_INITIAL_TTL=64;
const MAC={pc1:"00:50:79:66:68:00",pc2:"00:50:79:66:68:02",pc3:"00:50:79:66:68:03",r2e0:"02:42:d4:39:68:00",r2e1:"02:42:d4:39:68:01"};
const GOOD={
  pc1Ip:"192.168.10.10",pc1Mask:24,pc1Gw:"192.168.10.1",
  pc3Ip:"192.168.10.20",pc3Mask:24,pc3Gw:"192.168.10.1",
  pc2Ip:"192.168.20.10",pc2Mask:24,pc2Gw:"192.168.20.1",
  r2e0Ip:"192.168.10.1",r2e0Mask:24,r2e1Ip:"192.168.20.1",r2e1Mask:24
};
const lessons=[
  {
    dest:"pc3",
    title:"같은 네트워크면 누구를 ARP할까요?",
    text:"PC3는 PC1과 같은 192.168.10.0/24에 있습니다. 이번 실습에서는 PC1이 누구의 MAC 주소를 알아내는지만 확인합니다.",
    type:"normal",
    prediction:{
      question:"PC3가 PC1과 같은 네트워크(on-link)에 있다면 PC1은 누구의 MAC 주소를 ARP로 알아낼까요?",
      options:[
        ["pc3","PC3의 MAC 주소"],
        ["gw","Default Gateway의 MAC 주소"],
        ["pc2","PC2의 MAC 주소"]
      ],
      correct:"pc3",
      explain:"같은 네트워크(on-link) 목적지는 Gateway를 거치지 않습니다. PC1은 최종 목적지 PC3의 MAC 주소를 직접 ARP로 알아냅니다."
    },
    hints:[
      "PC1과 PC3는 모두 192.168.10.0/24에 있습니다.",
      "같은 네트워크(on-link)라면 Default Gateway를 거치지 않습니다.",
      "따라서 PC1은 PC3의 IPv4 주소 192.168.10.20에 대한 MAC 주소를 ARP로 확인합니다."
    ]
  },
  {
    dest:"pc2",
    title:"다른 네트워크면 누구를 ARP할까요?",
    text:"PC2는 192.168.20.0/24에 있습니다. 이번에는 최종 목적지 PC2가 아니라 현재 LAN에서 누구에게 먼저 프레임을 넘기는지 확인합니다.",
    type:"normal",
    prediction:{
      question:"PC2가 다른 네트워크에 있다면 PC1은 누구의 MAC 주소를 먼저 ARP로 알아낼까요?",
      options:[
        ["pc2","최종 목적지 PC2의 MAC 주소"],
        ["gw","Default Gateway 192.168.10.1의 MAC 주소"],
        ["r2e1","R2 eth1 192.168.20.1의 MAC 주소"]
      ],
      correct:"gw",
      explain:"원격 목적지는 PC1의 현재 Ethernet 구간에 직접 있지 않습니다. PC1은 next-hop인 Default Gateway 192.168.10.1의 MAC 주소를 ARP로 확인합니다."
    },
    hints:[
      "PC1은 192.168.10.0/24, PC2는 192.168.20.0/24입니다.",
      "원격 목적지로 갈 때 현재 LAN에서의 next-hop은 Default Gateway입니다.",
      "PC1이 ARP하는 주소는 PC2가 아니라 192.168.10.1입니다."
    ]
  },
  {
    dest:"pc2",
    title:"Gateway 주소가 틀리면 어디서 실패할까요?",
    text:"PC1의 Default Gateway가 192.168.10.254로 잘못 설정되어 있습니다. 이 주소는 같은 LAN에 있지만 실제 장비가 사용하지 않습니다.",
    type:"gw",
    prediction:{
      question:"PC1이 원격 PC2로 보내려 할 때, 잘못 설정된 Gateway 192.168.10.254 때문에 어떤 일이 먼저 일어날까요?",
      options:[
        ["badgw","192.168.10.254를 ARP하지만 Reply가 없어 실패"],
        ["pc2","PC2 192.168.20.10을 직접 ARP"],
        ["route","ARP 없이 R2가 자동으로 전달"]
      ],
      correct:"badgw",
      explain:"PC1은 설정된 Default Gateway를 next-hop으로 믿습니다. 192.168.10.254를 ARP하지만 그 주소의 소유자가 없으므로 ARP Reply를 받지 못하고 전송이 중단됩니다."
    },
    hints:[
      "원격 목적지이면 PC1은 설정된 Default Gateway를 next-hop으로 사용합니다.",
      "현재 Gateway 값은 192.168.10.254입니다.",
      "LAN A에 그 주소를 가진 장비가 없으므로 ARP Reply를 받을 수 없습니다."
    ]
  },
  {
    dest:"pc2",
    title:"Subnet Mask가 틀리면 판단이 어떻게 달라질까요?",
    text:"PC1의 Prefix가 /16으로 잘못 설정되어 PC2를 같은 네트워크라고 착각합니다. 이번 실습은 잘못된 on-link 판단이 ARP 대상까지 바꾸는 과정을 봅니다.",
    type:"mask",
    prediction:{
      question:"PC1이 /16 때문에 PC2를 on-link로 잘못 판단하면 누구를 ARP할까요?",
      options:[
        ["pc2","PC2 192.168.20.10을 직접 ARP"],
        ["gw","Default Gateway 192.168.10.1을 ARP"],
        ["none","ARP를 하지 않고 즉시 실패"]
      ],
      correct:"pc2",
      explain:"잘못된 /16은 PC2를 같은 네트워크(on-link)로 보이게 합니다. 그래서 PC1은 Gateway가 아니라 PC2의 IPv4 주소를 LAN A에서 직접 ARP하고 Reply를 받지 못합니다."
    },
    hints:[
      "PC1의 현재 Prefix는 /16입니다.",
      "/16 기준에서는 192.168.10.10과 192.168.20.10이 같은 네트워크로 판단됩니다.",
      "그래서 PC1은 Gateway가 아니라 PC2를 직접 ARP합니다."
    ]
  },
  {
    dest:"pc2",
    title:"Gateway가 응답하지 않으면 무엇이 달라질까요?",
    text:"주소와 Gateway 설정은 정상이고 ARP 대상도 맞습니다. 하지만 R2 eth0가 Down이라 Gateway가 ARP Reply를 보낼 수 없습니다.",
    type:"link",
    prediction:{
      question:"ARP 대상 192.168.10.1은 맞지만 R2 eth0가 Down이면 결과는 어떻게 될까요?",
      options:[
        ["noreply","Gateway를 ARP하지만 Reply가 없어 실패"],
        ["pc2","PC2를 대신 직접 ARP"],
        ["success","기존 설정만으로 정상 통신"]
      ],
      correct:"noreply",
      explain:"경로 판단과 ARP 대상 선택은 맞지만 실제 Gateway 인터페이스가 응답할 수 없습니다. 따라서 192.168.10.1에 대한 ARP Reply를 얻지 못해 다음 Ethernet 전송으로 진행하지 못합니다."
    },
    hints:[
      "이번 실습의 ARP Target은 정상적으로 192.168.10.1입니다.",
      "문제는 주소가 아니라 R2 eth0의 상태입니다.",
      "Gateway 인터페이스가 Down이면 ARP Reply를 보낼 수 없습니다."
    ]
  }
]
const state={
  lesson:0,dest:"pc3",
  pc1Ip:GOOD.pc1Ip,mask:GOOD.pc1Mask,gw:GOOD.pc1Gw,
  pc3Ip:GOOD.pc3Ip,pc3Mask:GOOD.pc3Mask,pc3Gw:GOOD.pc3Gw,
  pc2Ip:GOOD.pc2Ip,pc2Mask:GOOD.pc2Mask,pc2Gw:GOOD.pc2Gw,
  r2e0Ip:GOOD.r2e0Ip,r2e0Mask:GOOD.r2e0Mask,eth0:true,
  r2e1Ip:GOOD.r2e1Ip,r2e1Mask:GOOD.r2e1Mask,eth1:true,
  arp:{},pc2Arp:{},pc3Arp:{},r2Arp:{},busy:false,last:null,snapshots:[],snapshotIndex:-1,
  completed:Array(5).fill(false),failureSeen:Array(5).fill(false),hintLevel:0,openDevice:null,
  predictionChoice:null,predictionLocked:false,
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
function isUnicastIpv4(ip){
  if(!isValidIp(ip))return false;
  const first=+ip.split(".")[0];
  return first!==0 && first!==127 && first<224;
}
function isUsableInterfaceIp(ip,prefix){
  if(!isUnicastIpv4(ip))return false;
  if(prefix>=31)return true;
  const n=ipToInt(ip),m=maskInt(prefix),net=(n&m)>>>0,bcast=(net|(~m>>>0))>>>0;
  return n!==net && n!==bcast;
}
function interfaceIpList(exclude=null){
  return [
    ["pc1",state.pc1Ip],["pc3",state.pc3Ip],["pc2",state.pc2Ip],
    ["r2e0",state.r2e0Ip],["r2e1",state.r2e1Ip]
  ].filter(([name])=>name!==exclude);
}
function duplicateInterfaceIp(ip,exclude=null){
  return interfaceIpList(exclude).some(([,existing])=>existing===ip);
}
function gatewayLooksValid(ip,prefix,gw,routerIp){
  return isUnicastIpv4(gw) && sameSubnet(ip,gw,prefix) && gw===routerIp;
}
function hostByKey(key){
  if(key==="pc1")return {key:"pc1",name:"PC1",ip:state.pc1Ip,prefix:state.mask,gw:state.gw,mac:MAC.pc1,segment:"A",accessLink:"pc1sw1"};
  if(key==="pc3")return {key:"pc3",name:"PC3",ip:state.pc3Ip,prefix:state.pc3Mask,gw:state.pc3Gw,mac:MAC.pc3,segment:"A",accessLink:"sw1pc3"};
  if(key==="pc2")return {key:"pc2",name:"PC2",ip:state.pc2Ip,prefix:state.pc2Mask,gw:state.pc2Gw,mac:MAC.pc2,segment:"B",accessLink:"sw2pc2"};
  return null;
}
function selectedDestination(){return hostByKey(state.dest)}
function neighborCacheFor(key){
  if(key==="pc1")return state.arp;
  if(key==="pc2")return state.pc2Arp;
  if(key==="pc3")return state.pc3Arp;
  if(key==="r2")return state.r2Arp;
  return null;
}
function learnNeighbor(key,ip,mac){
  const cache=neighborCacheFor(key);
  if(cache)cache[ip]=mac;
}
function clearNeighborCache(key){
  const cache=neighborCacheFor(key);
  if(cache)Object.keys(cache).forEach(ip=>delete cache[ip]);
}
function clearAllNeighborCaches(){
  state.arp={};state.pc2Arp={};state.pc3Arp={};state.r2Arp={};
}
function physicalHostByIp(ip,segment){
  return ["pc1","pc3","pc2"].map(hostByKey).find(h=>h&&h.segment===segment&&h.ip===ip)||null;
}
function lanAEndpointByIp(ip){
  if(ip===state.r2e0Ip)return {key:"r2",name:"R2 eth0",ip:state.r2e0Ip,mac:MAC.r2e0,segment:"A",accessLink:"sw1r2",up:state.eth0};
  return physicalHostByIp(ip,"A");
}
function routerInterfaceForSegment(segment){
  return segment==="A"
    ?{name:"eth0",segment:"A",ip:state.r2e0Ip,prefix:state.r2e0Mask,mac:MAC.r2e0,up:state.eth0,link:"sw1r2"}
    :{name:"eth1",segment:"B",ip:state.r2e1Ip,prefix:state.r2e1Mask,mac:MAC.r2e1,up:state.eth1,link:"r2sw2"};
}
function routerRouteFor(ip){
  const candidates=[];
  if(state.eth0&&sameSubnet(state.r2e0Ip,ip,state.r2e0Mask)){
    candidates.push({egress:"eth0",segment:"A",routerIp:state.r2e0Ip,prefix:state.r2e0Mask,routerMac:MAC.r2e0,network:networkAddress(state.r2e0Ip,state.r2e0Mask)});
  }
  if(state.eth1&&sameSubnet(state.r2e1Ip,ip,state.r2e1Mask)){
    candidates.push({egress:"eth1",segment:"B",routerIp:state.r2e1Ip,prefix:state.r2e1Mask,routerMac:MAC.r2e1,network:networkAddress(state.r2e1Ip,state.r2e1Mask)});
  }
  candidates.sort((a,b)=>b.prefix-a.prefix);
  return candidates[0]||null;
}
function destinationIsOnPhysicalSegment(dest,segment){return dest.segment===segment}

function setLiveEvent(kind,title,detail){
  const strip=$("#liveEventStrip");
  const iconMap={arp:"ARP",icmp:"ICMP",route:"R",reply:"↩",error:"!",ready:"●"};
  const labelMap={arp:"ARP",icmp:"ICMP",route:"경로 판단",reply:"응답",error:"오류",ready:"대기"};
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
  $("#s1").innerHTML='<div class="n">단계 1</div><strong>라우팅 판단</strong><p>목적지가 on-link인지, Gateway를 거쳐야 하는지 확인합니다.</p>';
  $("#s2").innerHTML='<div class="n">단계 2</div><strong>ARP 대상 선택</strong><p>누구의 MAC 주소가 필요한지 결정합니다.</p>';
  $("#s3").innerHTML='<div class="n">단계 3</div><strong>Ethernet 전송</strong><p>현재 링크에서 받을 장비의 MAC으로 보냅니다.</p>';
  $("#s4").innerHTML='<div class="n">단계 4</div><strong>통신 결과</strong><p>PING 성공/실패와 원인을 확인합니다.</p>';
  $("#resultHint").textContent="PING을 보내면 순서대로 표시됩니다.";
}
function setStep(id,title,text,status="done"){
  const e=$("#"+id);e.className="flow-step "+(status==="error"?"error":"active done");
  e.innerHTML=`<div class="n">${e.querySelector(".n")?.textContent||""}</div><strong>${title}</strong><p>${text}</p>`;
}
function renderArp(){
  const renderBody=(selector,rows,emptyText,meaningFn)=>{
    const body=$(selector);if(!body)return;
    body.innerHTML=rows.length?rows.map(([ip,mac])=>`<tr><td>${ip}</td><td style="font-family:monospace">${mac}</td><td>${meaningFn(ip)}</td></tr>`).join("")
      :`<tr><td colspan="3" style="color:#7a90a3">${emptyText}</td></tr>`;
  };
  renderBody("#arpBody",Object.entries(state.arp),"아직 PC1이 학습한 ARP 항목이 없습니다.",ip=>
    ip===state.r2e0Ip?"원격 목적지로 보낼 때 PC1이 사용할 R2 eth0":
    ip===state.pc3Ip?"LAN A의 PC3":
    "PC1이 LAN A에서 학습한 이웃");
  renderBody("#pc3ArpBody",Object.entries(state.pc3Arp),"아직 PC3가 학습한 ARP 항목이 없습니다.",ip=>
    ip===state.pc1Ip?"LAN A의 PC1":
    ip===state.r2e0Ip?"PC3가 remote Reply에 사용할 R2 eth0":
    "PC3가 LAN A에서 학습한 이웃");
  renderBody("#pc2ArpBody",Object.entries(state.pc2Arp),"아직 PC2가 학습한 ARP 항목이 없습니다.",ip=>
    ip===state.r2e1Ip?"PC2가 remote Reply에 사용할 R2 eth1":
    ip===state.pc1Ip?"PC2가 on-link로 판단한 PC1":
    "PC2가 LAN B에서 학습한 이웃");
  renderBody("#r2ArpBody",Object.entries(state.r2Arp),"아직 R2가 학습한 ARP 항목이 없습니다.",ip=>
    ip===state.pc1Ip?"LAN A의 PC1":
    ip===state.pc2Ip?"LAN B의 PC2":
    ip===state.pc3Ip?"LAN A의 PC3":
    "R2가 출력 링크에서 학습한 이웃");
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
  state.last=null;resetPacketStudy();renderArp();renderLinks();renderLessonStatus();
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

const TRACE_REQ={
  pc1sw1:"traceReqPc1Sw1",sw1pc1:"traceReqSw1Pc1",
  pc3sw1:"traceReqPc3Sw1",sw1pc3:"traceReqSw1Pc3",
  pc2sw2:"traceReqPc2Sw2",sw2pc2:"traceReqSw2Pc2",
  sw1r2:"traceReqSw1R2",r2sw1:"traceReqR2Sw1",
  sw2r2:"traceReqSw2R2",r2sw2:"traceReqR2Sw2"
};
const TRACE_REP={
  pc1sw1:"traceRepPc1Sw1",sw1pc1:"traceRepSw1Pc1",
  pc3sw1:"traceRepPc3Sw1",sw1pc3:"traceRepSw1Pc3",
  pc2sw2:"traceRepPc2Sw2",sw2pc2:"traceRepSw2Pc2",
  sw2r2:"traceRepSw2R2",r2sw2:"traceRepR2Sw2",
  sw1r2:"traceRepSw1R2",r2sw1:"traceRepR2Sw1"
};
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
