function applyDeviceConfig(){
  const d=state.openDevice;
  if(d==="pc1"||d==="pc2"||d==="pc3"){
    const ip=$("#cfgIp").value.trim(), prefix=+$("#cfgPrefix").value, gw=$("#cfgGw").value.trim();
    if(!isUsableInterfaceIp(ip,prefix)){
      alert("Host IP는 현재 Prefix에서 사용 가능한 unicast 주소여야 합니다. Network/Broadcast/Loopback/Multicast 주소는 지원하지 않습니다.");return;
    }
    if(!isUsableInterfaceIp(gw,prefix)){alert("Gateway는 해당 Prefix 형식에서 Network/Broadcast가 아닌 사용 가능한 unicast host 주소여야 합니다.");return}
    if(duplicateInterfaceIp(ip,d)){alert("같은 토폴로지에서 중복된 인터페이스 IP는 지원하지 않습니다.");return}
    if(d==="pc1"){state.pc1Ip=ip;state.mask=prefix;state.gw=gw}
    if(d==="pc3"){state.pc3Ip=ip;state.pc3Mask=prefix;state.pc3Gw=gw}
    if(d==="pc2"){state.pc2Ip=ip;state.pc2Mask=prefix;state.pc2Gw=gw}
  }else if(d==="r2"){
    const e0=$("#cfgR2e0Ip").value.trim(),e1=$("#cfgR2e1Ip").value.trim();
    const m0=+$("#cfgR2e0Mask").value,m1=+$("#cfgR2e1Mask").value;
    if(!isUsableInterfaceIp(e0,m0)||!isUsableInterfaceIp(e1,m1)){
      alert("R2 인터페이스 IP는 각 Prefix에서 사용 가능한 unicast 주소여야 합니다.");return;
    }
    const hostIps=[state.pc1Ip,state.pc2Ip,state.pc3Ip];
    if(e0===e1||hostIps.includes(e0)||hostIps.includes(e1)){
      alert("R2/Host 간 중복 인터페이스 IP는 지원하지 않습니다.");return;
    }
    state.r2e0Ip=e0;state.r2e0Mask=m0;
    state.r2e1Ip=e1;state.r2e1Mask=m1;
  }
  clearAllNeighborCaches();state.last=null;resetPacketStudy();renderArp();renderState();renderLessonStatus();
  log(`${d.toUpperCase()} 설정 적용 · 다음 PING부터 새 구성 사용`);
  openDeviceConfig(d);
}

function resetPacketStudy(){
  state.snapshots=[];state.snapshotIndex=-1;
  $("#packetEmpty").style.display="block";
  $("#packetStudyContent").style.display="none";
  $("#packetStages").innerHTML="";
  $("#compareBox").classList.remove("show");
  const arpHardware=$("#arpHardwareCard");if(arpHardware)arpHardware.style.display="none";
}
function addSnapshot(s){
  state.snapshots.push(s);
  if(state.snapshots.length===1) $("#packetStudyPanel").open=true;
  renderSnapshot(state.snapshots.length-1);
  renderComparison();
}
function renderSnapshot(i){
  const s=state.snapshots[i]; if(!s)return;
  state.snapshotIndex=i;
  const isArp=s.protocol==="ARP";
  $("#packetEmpty").style.display="none";
  $("#packetStudyContent").style.display="block";
  $("#protocolBadge").textContent=s.protocol;
  $("#protocolBadge").className="protocol-badge "+(s.protocol==="ICMP"?"icmp":"");
  $("#packetSceneTitle").textContent=s.title;
  $("#packetOneLine").textContent=s.oneLine;
  $("#addressLayerLabel").textContent=isArp?"ARP · PROTOCOL ADDRESS":"L3 · IPv4";
  $("#addressLayerTitle").textContent=isArp
    ?(s.arpOp==="reply"?"누가 어떤 IPv4→MAC 매핑을 알려주는가?":"누구의 MAC 주소를 알아내려 하는가?")
    :"최종 목적지는 누구인가?";
  $("#addrLabel1").textContent=isArp?"Sender IP":"Source IP";
  $("#addrLabel2").textContent=isArp?"Target IP":"Destination IP";
  $("#srcIp").textContent=s.srcIp??"—";
  $("#dstIp").textContent=s.dstIp??"—";
  $("#srcMac").textContent=s.srcMac??"—";
  $("#dstMac").textContent=s.dstMac??"—";
  $("#nextHop").textContent=s.nextHop??"—";
  $("#ttl").textContent=s.ttl??"해당 없음";
  $("#ipMeaning").textContent=s.ipMeaning;
  $("#macMeaning").textContent=s.macMeaning;
  $("#nextHopMeaning").textContent=s.nextHopMeaning;
  $("#ttlMeaning").textContent=s.ttlMeaning;
  $("#packetWhy").innerHTML=s.why;

  const arpCard=$("#arpHardwareCard");
  if(arpCard){
    arpCard.style.display=isArp?"block":"none";
    if(isArp){
      $("#arpSenderHardware").textContent=s.arpSenderMac??s.srcMac??"—";
      $("#arpTargetHardware").textContent=s.arpTargetMac??"—";
      $("#arpHardwareMeaning").textContent=s.arpHardwareMeaning||
        "Ethernet Source/Destination MAC은 Frame 전달용 필드이고, ARP Sender/Target Hardware Address는 ARP payload 내부의 별도 필드입니다.";
    }
  }

  $("#packetStages").innerHTML=state.snapshots.map((x,idx)=>
    `<button class="packet-stage-btn ${idx===i?"active":""}" data-snap="${idx}">${idx+1}. ${x.short}<span>${x.protocol} · ${x.hop}</span></button>`
  ).join("");
  $$("#packetStages .packet-stage-btn").forEach(b=>b.onclick=()=>renderSnapshot(+b.dataset.snap));
}
function renderComparison(){
  const a=state.snapshots.find(x=>x.key==="icmp-pc1-r2");
  const b=state.snapshots.find(x=>x.key==="icmp-r2-dest");
  const box=$("#compareBox");
  if(!a||!b){box.classList.remove("show");return}
  box.classList.add("show");
  $("#cmpHopB").textContent=b.compareLabel||"R2 → 목적지";
  $("#cmpSrcIpA").textContent=a.srcIp;$("#cmpSrcIpB").textContent=b.srcIp;
  $("#cmpDstIpA").textContent=a.dstIp;$("#cmpDstIpB").textContent=b.dstIp;
  $("#cmpSrcMacA").textContent=a.srcMac;$("#cmpSrcMacB").textContent=b.srcMac;
  $("#cmpDstMacA").textContent=a.dstMac;$("#cmpDstMacB").textContent=b.dstMac;
  $("#cmpTtlA").textContent=a.ttl;$("#cmpTtlB").textContent=b.ttl;
}

function addArpRequestDetail({key,short,sourceName,sourceIp,sourceMac,targetIp,segment,nextHopMeaning,why,oneLine}){
  addSnapshot({
    key,protocol:"ARP",arpOp:"request",short,
    hop:`${sourceName} → LAN ${segment} 전체`,
    title:`ARP Request · “${targetIp}의 MAC 주소가 누구인가?”`,
    oneLine:oneLine||`${sourceName}이 ${targetIp}의 MAC을 알아내기 위해 LAN ${segment}에서 Ethernet Broadcast로 묻습니다.`,
    srcIp:sourceIp,dstIp:targetIp,srcMac:sourceMac,dstMac:"ff:ff:ff:ff:ff:ff",
    arpSenderMac:sourceMac,arpTargetMac:"미확정 · 요청 시 아직 모름",
    nextHop:targetIp,ttl:"해당 없음",
    ipMeaning:"ARP Sender IP와 Target IP는 ARP payload의 protocol address 필드입니다. ARP Frame 자체에는 IPv4/ICMP Header가 없습니다.",
    macMeaning:"Ethernet Destination은 ff:ff:ff:ff:ff:ff Broadcast입니다. 이것은 ARP Target Hardware Address와 다른 필드입니다.",
    arpHardwareMeaning:"ARP Request의 Sender Hardware Address에는 요청자 MAC이 들어가고, Target Hardware Address는 아직 알아내려는 값이므로 미확정 상태입니다.",
    nextHopMeaning,
    ttlMeaning:"ARP는 IPv4 Packet이 아니므로 IPv4 TTL 필드가 없습니다.",
    why
  });
}
function addArpReplyDetail({key,short,responderName,responderIp,responderMac,requesterName,requesterIp,requesterMac,nextHopMeaning,why}){
  addSnapshot({
    key,protocol:"ARP",arpOp:"reply",short,
    hop:`${responderName} → ${requesterName}`,
    title:`ARP Reply · “${responderIp}은 ${responderMac}”`,
    oneLine:`${responderName}이 자신의 IPv4→MAC 매핑을 ${requesterName}에게 알려줍니다.`,
    srcIp:responderIp,dstIp:requesterIp,srcMac:responderMac,dstMac:requesterMac,
    arpSenderMac:responderMac,arpTargetMac:requesterMac,
    nextHop:requesterIp,ttl:"해당 없음",
    ipMeaning:"ARP Reply의 Sender IP는 응답자의 IPv4 주소이고 Target IP는 요청자의 IPv4 주소입니다.",
    macMeaning:`Ethernet Destination은 요청자 ${requesterName} MAC으로, 일반적인 ARP Reply는 요청자에게 Unicast됩니다.`,
    arpHardwareMeaning:"ARP Reply에서는 Sender Hardware Address에 응답자 MAC, Target Hardware Address에 요청자 MAC이 명시됩니다.",
    nextHopMeaning,
    ttlMeaning:"ARP에는 IPv4 TTL 필드가 없습니다.",
    why
  });
}
function addArpSnapshot(target,local){
  const dest=selectedDestination();
  addArpRequestDetail({
    key:"arp-request",short:"PC1의 MAC 질문",sourceName:"PC1",sourceIp:state.pc1Ip,sourceMac:MAC.pc1,
    targetIp:target,segment:"A",
    oneLine:local
      ?`PC1이 on-link로 판단한 ${dest.name}(${target})의 MAC을 알아내기 위해 LAN A에 Broadcast합니다.`
      :`PC1이 remote 목적지로 보내기 전에 next-hop ${target}의 MAC을 알아내기 위해 LAN A에 Broadcast합니다.`,
    nextHopMeaning:local?"PC1이 목적지를 on-link로 판단했으므로 최종 목적지 자신이 next-hop입니다.":"목적지가 on-link가 아니므로 설정된 Default Gateway가 현재 LAN의 next-hop입니다.",
    why:local
      ?`PC1은 ${state.pc1Ip}/${state.mask} 기준으로 ${dest.name}(${dest.ip})을 <b>on-link</b>로 판단했습니다.`
      :`PC1은 ${state.pc1Ip}/${state.mask} 기준으로 ${dest.name}(${dest.ip})이 <b>on-link가 아니라고</b> 판단해 Default Gateway ${target}을 ARP합니다.`
  });
}
function addArpReplySnapshot(target,local,responderName,responderMac){
  addArpReplyDetail({
    key:"arp-reply",short:"PC1이 받는 ARP Reply",
    responderName,responderIp:target,responderMac,
    requesterName:"PC1",requesterIp:state.pc1Ip,requesterMac:MAC.pc1,
    nextHopMeaning:local?"PC1이 on-link 목적지의 MAC을 확인했습니다.":"PC1이 Default Gateway의 MAC을 확인했습니다.",
    why:"PC1은 ARP Reply를 받은 뒤 해당 IPv4→MAC 매핑을 자신의 Neighbor(ARP) Table에 저장합니다."
  });
}
function addRouterArpRequestSnapshot(dest,route){
  addArpRequestDetail({
    key:"r2-arp-request",short:"R2의 MAC 질문",
    sourceName:`R2 ${route.egress}`,sourceIp:route.routerIp,sourceMac:route.routerMac,
    targetIp:dest.ip,segment:route.segment,
    nextHopMeaning:`R2의 Connected Route ${route.network}가 ${route.egress}을 선택했고, 이 출력 Ethernet 구간에서 ${dest.ip}의 MAC이 필요합니다.`,
    why:`PC1이 Gateway MAC을 알고 있어도 R2가 ${dest.name} MAC까지 자동으로 아는 것은 아닙니다. 각 L2 Segment에서 송신 장비가 자신의 next-hop MAC을 확인합니다.`
  });
}
function addRouterArpReplySnapshot(dest,route){
  addArpReplyDetail({
    key:"r2-arp-reply",short:`${dest.name}의 ARP Reply`,
    responderName:dest.name,responderIp:dest.ip,responderMac:dest.mac,
    requesterName:`R2 ${route.egress}`,requesterIp:route.routerIp,requesterMac:route.routerMac,
    nextHopMeaning:`R2가 ${dest.ip} → ${dest.mac} 매핑을 확인했습니다.`,
    why:"이 Reply 후 R2는 원래 IPv4 Packet을 출력 링크용 Ethernet Frame으로 재캡슐화할 수 있습니다."
  });
}
function addHostArpRequestSnapshot(host,targetIp,targetName,purpose){
  addArpRequestDetail({
    key:`reply-arp-request-${host.key}`,short:`${host.name}의 Reply용 ARP`,
    sourceName:host.name,sourceIp:host.ip,sourceMac:host.mac,targetIp,segment:host.segment,
    nextHopMeaning:`${host.name}이 Echo Reply를 보내기 전에 ${targetName}의 MAC을 확인합니다.`,
    why:purpose
  });
}
function addHostArpReplySnapshot(responder,requester,purpose){
  addArpReplyDetail({
    key:`reply-arp-reply-${requester.key}`,short:`${requester.name}이 받는 ARP Reply`,
    responderName:responder.name,responderIp:responder.ip,responderMac:responder.mac,
    requesterName:requester.name,requesterIp:requester.ip,requesterMac:requester.mac,
    nextHopMeaning:`${requester.name}이 ${responder.ip} → ${responder.mac} 매핑을 확인했습니다.`,
    why:purpose
  });
}
function addR2ReturnArpRequestSnapshot(host,route){
  addArpRequestDetail({
    key:"return-r2-arp-request",short:"R2의 Return ARP",
    sourceName:`R2 ${route.egress}`,sourceIp:route.routerIp,sourceMac:route.routerMac,
    targetIp:host.ip,segment:route.segment,
    nextHopMeaning:`Echo Reply를 PC1로 전달하려면 R2도 출력 LAN ${route.segment}에서 PC1 MAC이 필요합니다.`,
    why:"Return Route가 존재하는 것과 Ethernet Destination MAC을 이미 알고 있는 것은 별개입니다."
  });
}
function addR2ReturnArpReplySnapshot(host,route){
  addArpReplyDetail({
    key:"return-r2-arp-reply",short:"PC1의 Return ARP Reply",
    responderName:host.name,responderIp:host.ip,responderMac:host.mac,
    requesterName:`R2 ${route.egress}`,requesterIp:route.routerIp,requesterMac:route.routerMac,
    nextHopMeaning:"R2가 Return Path에서 사용할 PC1 MAC을 확인했습니다.",
    why:"R2는 이제 Echo Reply를 LAN A용 새 Ethernet Frame으로 만들어 PC1에 전달할 수 있습니다."
  });
}
function addLocalIcmpSnapshot(dest,mac){
  addSnapshot({
    key:"icmp-pc1-local",protocol:"ICMP",short:`${dest.name}로 실제 PING`,
    hop:`PC1 → ${dest.name}`,title:`ICMP Echo Request · PC1 → ${dest.name}`,
    oneLine:`${dest.name}가 PC1 기준 on-link이고 실제 LAN A에 있으므로 IPv4 최종 목적지와 Ethernet 현재 수신자가 모두 ${dest.name}입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:MAC.pc1,dstMac:mac,nextHop:dest.ip,ttl:String(SIM_INITIAL_TTL),
    ipMeaning:`Source/Destination IP는 PC1 → ${dest.name}입니다.`,
    macMeaning:`같은 Ethernet Segment에서 직접 전달하므로 Destination MAC도 ${dest.name} MAC입니다.`,
    nextHopMeaning:`on-link 목적지에서는 최종 목적지 ${dest.name} 자체가 next-hop입니다.`,
    ttlMeaning:`이 Simulator의 초기 IPv4 TTL은 ${SIM_INITIAL_TTL}입니다. 이 경로에서는 Router forwarding이 없으므로 감소하지 않습니다.`,
    why:"같은 L2 Segment에서 SW1이 Frame을 전달해도 Source/Destination MAC pair를 라우터처럼 다시 작성하지 않습니다."
  });
}
function addPc1ToR2Snapshot(dest,mac){
  addSnapshot({
    key:"icmp-pc1-r2",protocol:"ICMP",short:"PC1에서 R2로",
    hop:"LAN A · PC1 → R2",title:"ICMP Echo Request · PC1 → R2",
    oneLine:`최종 목적지는 ${dest.ip}(${dest.name})이지만, LAN A에서 현재 Frame을 받을 next-hop은 R2 eth0(${state.r2e0Ip})입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:MAC.pc1,dstMac:mac,nextHop:state.r2e0Ip,ttl:String(SIM_INITIAL_TTL),
    ipMeaning:`Destination IP ${dest.ip}은 최종 목적지 ${dest.name}을 계속 가리킵니다. NAT 없는 이 Lab에서는 R2 주소로 바뀌지 않습니다.`,
    macMeaning:"LAN A에서 Ethernet Destination은 R2 eth0 MAC입니다. SW1을 통과할 때 이 MAC pair가 바뀌지는 않습니다.",
    nextHopMeaning:`PC1의 현재 next-hop은 Default Gateway ${state.gw}입니다.`,
    ttlMeaning:`PC1이 만든 IPv4 Packet의 초기 TTL은 ${SIM_INITIAL_TTL}이며, R2가 forwarding할 때 1 감소합니다.`,
    why:"IP Destination은 end-to-end 목적지를, Ethernet Destination MAC은 현재 L2 Segment의 next-hop을 나타냅니다."
  });
}
function addPc1ToWrongGatewaySnapshot(dest,gatewayHost){
  addSnapshot({
    key:"icmp-pc1-wrong-gateway-host",protocol:"ICMP",short:"잘못된 Gateway Host로 전달",
    hop:`PC1 → ${gatewayHost.name}`,title:`ICMP Echo Request · Ethernet은 ${gatewayHost.name}, IP는 ${dest.name}`,
    oneLine:`PC1은 Default Gateway로 설정된 ${gatewayHost.name}의 MAC을 알아냈기 때문에 Frame은 ${gatewayHost.name}에게 전달하지만 IPv4 Destination은 여전히 ${dest.ip}입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:MAC.pc1,dstMac:gatewayHost.mac,nextHop:gatewayHost.ip,ttl:String(SIM_INITIAL_TTL),
    ipMeaning:`IPv4 Destination은 최종 목적지 ${dest.name}(${dest.ip})을 유지합니다.`,
    macMeaning:`Ethernet Destination은 잘못 설정된 Gateway ${gatewayHost.name} MAC입니다.`,
    nextHopMeaning:`${gatewayHost.name}는 이 Simulator에서 IP forwarding을 하지 않는 End Host이므로 Router 역할을 할 수 없습니다.`,
    ttlMeaning:`Router forwarding이 일어나지 않으므로 TTL은 ${SIM_INITIAL_TTL} 상태에서 폐기됩니다.`,
    why:"잘못된 Gateway 주소가 실제 Host의 IPv4 주소라면 ARP 자체는 성공할 수 있습니다. 그러나 그 Host가 Router가 아니면 원격 목적지로 Packet을 forwarding하지 않습니다."
  });
}
function addR2ToDestinationSnapshot(dest,route){
  addSnapshot({
    key:"icmp-r2-dest",protocol:"ICMP",short:`R2에서 ${dest.name}로`,
    hop:`LAN ${route.segment} · R2 → ${dest.name}`,compareLabel:`R2 → ${dest.name}`,
    title:`라우팅 후 새 Ethernet Frame · R2 → ${dest.name}`,
    oneLine:`R2는 IPv4 Packet을 ${route.egress}으로 forwarding하면서 출력 링크용 새 Ethernet Frame으로 재캡슐화하고 TTL을 1 감소시킵니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:route.routerMac,dstMac:dest.mac,nextHop:dest.ip,ttl:String(SIM_INITIAL_TTL-1),
    ipMeaning:`Source/Destination IP 주소는 여전히 ${state.pc1Ip} → ${dest.ip}입니다. NAT 없는 일반 라우팅에서는 최종 목적지 IP가 R2로 바뀌지 않습니다.`,
    macMeaning:`출력 LAN ${route.segment}에서는 Source MAC이 R2 ${route.egress}, Destination MAC이 ${dest.name} MAC입니다.`,
    nextHopMeaning:`R2의 Connected Route ${route.network}가 ${route.egress}을 선택했고, 이 링크에서는 ${dest.name}이 직접 next-hop입니다.`,
    ttlMeaning:`이 Simulator는 초기 TTL ${SIM_INITIAL_TTL}을 사용하며 R2가 한 번 forwarding했으므로 ${SIM_INITIAL_TTL-1}이 되었습니다.`,
    why:"라우터는 수신 Ethernet Frame의 L2 Header를 제거하고 routing 후 출력 링크용 새 Ethernet Frame을 생성합니다. 같은 L2 Segment의 Switch forwarding만으로 MAC pair가 바뀌는 것은 아닙니다."
  });
}

function recoveryCorrect(i=state.lesson){
  const t=lessons[i].type;
  if(t==="gw")return state.gw===GOOD.pc1Gw;
  if(t==="mask")return state.mask===GOOD.pc1Mask;
  if(t==="link")return state.eth0===true;
  return true;
}
function checklistState(){
  const i=state.lesson,l=lessons[i];
  if(state.completed[i]){
    if(i===0)return [
      ["PC3 선택","같은 LAN의 목적지 선택",true],
      ["PING 성공","PC1 ↔ PC3 통신 확인",true],
      ["ARP 학습","PC3 MAC을 직접 학습",true]
    ];
    if(i===1)return [
      ["PC2 통신","원격 LAN으로 PING 성공",true],
      ["Gateway ARP","192.168.10.1 MAC 학습",true],
      ["Router 비교","라우터 전/후 헤더 차이 확인",true]
    ];
    return [
      ["장애 재현","정상 상태가 아님을 PING으로 확인",true],
      ["원인 복구","잘못된 설정/상태를 정상화",true],
      ["재PING 성공","복구 후 End-to-End 통신 확인",true]
    ];
  }
  if(i===0)return [
    ["PC3 선택","같은 LAN의 목적지 선택",state.dest==="pc3"],
    ["PING 성공","PC1 ↔ PC3 통신 확인",!!state.last?.ok && state.dest==="pc3"],
    ["ARP 학습","PC3 MAC을 직접 학습",!!state.arp[state.pc3Ip]]
  ];
  if(i===1)return [
    ["PC2 통신","원격 LAN으로 PING 성공",!!state.last?.ok && state.dest==="pc2"],
    ["Gateway ARP","192.168.10.1 MAC 학습",!!state.arp[state.r2e0Ip]],
    ["Router 비교","라우터 전/후 헤더 차이 확인",state.snapshots.some(x=>x.key==="icmp-pc1-r2") && state.snapshots.some(x=>x.key==="icmp-r2-dest")]
  ];
  return [
    ["장애 재현","정상 상태가 아님을 PING으로 확인",state.failureSeen[i]],
    ["원인 복구","잘못된 설정/상태를 정상화",recoveryCorrect(i)],
    ["재PING 성공","복구 후 End-to-End 통신 확인",state.failureSeen[i] && !!state.last?.ok && state.dest==="pc2" && recoveryCorrect(i)]
  ];
}
function renderCourseProgress(){
  const done=state.completed.filter(Boolean).length;
  $("#courseCount").textContent=`${done} / ${lessons.length} 완료`;
  $("#courseBar").style.width=`${done/lessons.length*100}%`;
  $$(".lesson-tab").forEach((b,i)=>b.classList.toggle("completed",state.completed[i]));
  $("#courseComplete").classList.toggle("show",done===lessons.length);
}
