function applyDeviceConfig(){
  const d=state.openDevice;
  if(d==="pc1"||d==="pc2"||d==="pc3"){
    const ip=$("#cfgIp").value.trim(), prefix=+$("#cfgPrefix").value, gw=$("#cfgGw").value.trim();
    if(!isUsableInterfaceIp(ip,prefix)){
      alert("Host IP는 현재 Prefix에서 사용 가능한 unicast 주소여야 합니다. Network/Broadcast/Loopback/Multicast 주소는 지원하지 않습니다.");return;
    }
    if(!isUnicastIpv4(gw)){alert("Gateway는 유효한 unicast IPv4 주소여야 합니다.");return}
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
    if(e0===e1||duplicateInterfaceIp(e0,"r2e0")||duplicateInterfaceIp(e1,"r2e1")){
      alert("R2/Host 간 중복 인터페이스 IP는 지원하지 않습니다.");return;
    }
    state.r2e0Ip=e0;state.r2e0Mask=m0;
    state.r2e1Ip=e1;state.r2e1Mask=m1;
  }
  state.arp={};state.r2Arp={};state.last=null;resetPacketStudy();renderArp();renderState();renderLessonStatus();
  log(`${d.toUpperCase()} 설정 적용 · 다음 PING부터 새 구성 사용`);
  openDeviceConfig(d);
}

function resetPacketStudy(){
  state.snapshots=[];state.snapshotIndex=-1;
  $("#packetEmpty").style.display="block";
  $("#packetStudyContent").style.display="none";
  $("#packetStages").innerHTML="";
  $("#compareBox").classList.remove("show");
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
  $("#packetEmpty").style.display="none";
  $("#packetStudyContent").style.display="block";
  $("#protocolBadge").textContent=s.protocol;
  $("#protocolBadge").className="protocol-badge "+(s.protocol==="ICMP"?"icmp":"");
  $("#packetSceneTitle").textContent=s.title;
  $("#packetOneLine").textContent=s.oneLine;
  $("#addressLayerLabel").textContent=s.protocol==="ARP"?"ARP · ADDRESS RESOLUTION":"L3 · IPv4";
  $("#addressLayerTitle").textContent=s.protocol==="ARP"?"누구의 MAC 주소를 묻는가?":"최종 목적지는 누구인가?";
  $("#addrLabel1").textContent=s.protocol==="ARP"?"Sender IP":"Source IP";
  $("#addrLabel2").textContent=s.protocol==="ARP"?"Target IP":"Destination IP";
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
  $("#cmpSrcIpA").textContent=a.srcIp;$("#cmpSrcIpB").textContent=b.srcIp;
  $("#cmpDstIpA").textContent=a.dstIp;$("#cmpDstIpB").textContent=b.dstIp;
  $("#cmpSrcMacA").textContent=a.srcMac;$("#cmpSrcMacB").textContent=b.srcMac;
  $("#cmpDstMacA").textContent=a.dstMac;$("#cmpDstMacB").textContent=b.dstMac;
  $("#cmpTtlA").textContent=a.ttl;$("#cmpTtlB").textContent=b.ttl;
}
function addArpSnapshot(target,local){
  const dest=selectedDestination();
  addSnapshot({
    key:"arp-request",protocol:"ARP",short:"MAC 주소 질문",
    hop:local?"PC1 → LAN A 전체":"PC1 → LAN A 전체",
    title:`ARP Request · “${target}의 MAC 주소가 누구인가?”`,
    oneLine:local
      ?`PC1이 같은 LAN에 있는 ${target}의 MAC 주소를 모르기 때문에 LAN A 전체에 Broadcast로 묻습니다.`
      :`PC1이 원격 목적지로 바로 보내는 것이 아니라, 먼저 Next-hop ${target}의 MAC 주소를 알아내기 위해 LAN A 전체에 Broadcast로 묻습니다.`,
    srcIp:state.pc1Ip,dstIp:target,srcMac:MAC.pc1,dstMac:"ff:ff:ff:ff:ff:ff",
    nextHop:target,ttl:"해당 없음",
    ipMeaning:"ARP의 Sender IP와 Target IP입니다. ARP Frame 자체에는 IPv4/ICMP Header가 없으며, 필요한 neighbor resolution이 끝난 뒤 IPv4 Packet을 Ethernet Frame에 실어 전송합니다.",
    macMeaning:"ARP Request는 같은 LAN의 모든 장비가 볼 수 있도록 목적지 MAC ff:ff:ff:ff:ff:ff(Broadcast)를 사용합니다.",
    nextHopMeaning:local?"PC1이 목적지를 on-link로 판단했으므로 최종 목적지 자신이 next-hop입니다.":"목적지가 on-link가 아니므로 Default Gateway가 현재 LAN에서의 next-hop입니다.",
    ttlMeaning:"TTL은 IPv4 헤더의 필드입니다. ARP Frame에는 IPv4 TTL이 없습니다.",
    why:local
      ?`PC1은 ${state.pc1Ip}/${state.mask} 계산으로 ${dest.name}(${dest.ip})을 <b>on-link</b>로 판단했습니다. 그래서 Gateway가 아니라 목적지 IPv4 주소의 MAC을 직접 찾습니다.`
      :`PC1은 ${state.pc1Ip}/${state.mask} 계산으로 ${dest.name}(${dest.ip})이 <b>on-link가 아니라고</b> 판단했습니다. 따라서 최종 목적지 Host가 아니라 <b>Default Gateway ${target}</b>의 MAC부터 찾습니다.`
  });
}
function addArpReplySnapshot(target,local,responderName,responderMac){
  addSnapshot({
    key:"arp-reply",protocol:"ARP",short:"ARP Reply",
    hop:`${responderName} → PC1`,
    title:`ARP Reply · “${target}은 ${responderMac}”`,
    oneLine:`${responderName}이 자신의 MAC 주소를 PC1에게 유니캐스트로 알려줍니다. 이 Reply를 받은 뒤 PC1 Neighbor(ARP) Table에 매핑이 저장됩니다.`,
    srcIp:target,dstIp:state.pc1Ip,srcMac:responderMac,dstMac:MAC.pc1,
    nextHop:state.pc1Ip,ttl:"해당 없음",
    ipMeaning:"ARP Reply의 Sender IP는 질문받은 IPv4 주소이며 Target IP는 요청자 PC1입니다.",
    macMeaning:"ARP Reply Ethernet Destination은 요청자 PC1 MAC입니다. Request의 Broadcast와 달리 일반적인 Reply는 요청자에게 Unicast됩니다.",
    nextHopMeaning:local?"PC1과 목적지가 같은 LAN에서 직접 neighbor resolution을 완료했습니다.":"PC1이 Default Gateway의 MAC을 확인했습니다.",
    ttlMeaning:"ARP는 IPv4가 아니므로 TTL 필드가 없습니다.",
    why:"ARP Request만으로 MAC을 학습하는 것이 아니라, 응답 장비의 ARP Reply를 통해 IPv4→MAC 매핑을 확인합니다."
  });
}
function addRouterArpRequestSnapshot(dest,route){
  addSnapshot({
    key:"r2-arp-request",protocol:"ARP",short:"R2의 MAC 질문",
    hop:`R2 ${route.egress} → LAN ${route.segment} 전체`,
    title:`R2 ARP Request · “${dest.ip}의 MAC 주소가 누구인가?”`,
    oneLine:`Route Lookup으로 ${route.egress}이 선택된 뒤, R2도 출력 Ethernet 구간에서 next-hop ${dest.ip}의 MAC을 알아야 새 Frame을 만들 수 있습니다.`,
    srcIp:route.routerIp,dstIp:dest.ip,srcMac:route.routerMac,dstMac:"ff:ff:ff:ff:ff:ff",
    nextHop:dest.ip,ttl:"해당 없음",
    ipMeaning:"이것은 R2가 출력 링크에서 수행하는 ARP입니다. 원래 ICMP Packet의 Source/Destination IP와 별개의 ARP Frame입니다.",
    macMeaning:"R2의 ARP Request도 Ethernet Broadcast로 해당 L2 Segment에 전파됩니다.",
    nextHopMeaning:`R2가 선택한 Connected Route ${route.network}의 출력 인터페이스는 ${route.egress}입니다.`,
    ttlMeaning:"ARP Frame에는 IPv4 TTL이 없습니다.",
    why:`PC1이 Gateway MAC을 알아냈다고 해서 R2가 ${dest.name} MAC까지 자동으로 아는 것은 아닙니다. 각 L2 Segment에서 송신 장비가 자기 next-hop의 MAC을 확인합니다.`
  });
}
function addRouterArpReplySnapshot(dest,route){
  addSnapshot({
    key:"r2-arp-reply",protocol:"ARP",short:"Host의 ARP Reply",
    hop:`${dest.name} → R2 ${route.egress}`,
    title:`ARP Reply · ${dest.name} → R2 ${route.egress}`,
    oneLine:`${dest.name}이 ${dest.ip}에 대한 MAC ${dest.mac}을 R2에게 알려줍니다. R2 Neighbor Table에 이 매핑이 저장됩니다.`,
    srcIp:dest.ip,dstIp:route.routerIp,srcMac:dest.mac,dstMac:route.routerMac,
    nextHop:route.routerIp,ttl:"해당 없음",
    ipMeaning:"ARP Reply의 Sender IP는 최종 Host의 IPv4 주소이고 Target IP는 R2의 해당 인터페이스 주소입니다.",
    macMeaning:"Reply는 R2 인터페이스 MAC으로 Unicast됩니다.",
    nextHopMeaning:"이 Reply 후 R2는 실제 IPv4 Packet을 해당 Host MAC으로 캡슐화할 수 있습니다.",
    ttlMeaning:"ARP에는 TTL이 없습니다.",
    why:"Route Lookup은 출력 인터페이스를 고르고, ARP/neighbor resolution은 그 출력 링크에서 사용할 Destination MAC을 제공합니다."
  });
}
function addLocalIcmpSnapshot(dest,mac){
  addSnapshot({
    key:"icmp-pc1-local",protocol:"ICMP",short:`${dest.name}로 실제 PING`,
    hop:`PC1 → ${dest.name}`,
    title:`ICMP Echo Request · PC1 → ${dest.name}`,
    oneLine:`${dest.name}가 PC1 기준 on-link이고 실제 LAN A에 있으므로 IP 최종 목적지와 Ethernet 현재 수신자가 모두 ${dest.name}입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:MAC.pc1,dstMac:mac,nextHop:dest.ip,ttl:"64",
    ipMeaning:`Source/Destination IP는 PC1 → ${dest.name}입니다.`,
    macMeaning:`같은 Ethernet Segment에서 직접 전달하므로 Destination MAC도 ${dest.name} MAC입니다.`,
    nextHopMeaning:`on-link 목적지에서는 최종 목적지 ${dest.name} 자체가 next-hop입니다.`,
    ttlMeaning:"라우터를 통과하지 않으므로 TTL 64가 감소하지 않습니다.",
    why:`<b>on-link 전달의 핵심:</b> PC1이 목적지를 직접 전달 대상으로 판단했고, 실제로 같은 LAN A에 해당 IPv4 주소의 Host가 있으므로 Gateway를 거치지 않습니다.`
  });
}
function addPc1ToR2Snapshot(dest,mac){
  addSnapshot({
    key:"icmp-pc1-r2",protocol:"ICMP",short:"PC1에서 R2로",
    hop:"LAN A · PC1 → R2",
    title:"ICMP Echo Request · PC1 → R2",
    oneLine:`최종 목적지는 ${dest.ip}(${dest.name})이지만, LAN A에서 지금 당장 Frame을 받을 장비는 Default Gateway R2(${state.r2e0Ip})입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:MAC.pc1,dstMac:mac,nextHop:state.r2e0Ip,ttl:"64",
    ipMeaning:`Destination IP ${dest.ip}은 최종 목적지 ${dest.name}을 계속 가리킵니다. NAT 없는 이 Lab에서는 R2 주소로 바뀌지 않습니다.`,
    macMeaning:"LAN A에서는 Ethernet Destination MAC이 R2 eth0입니다. SW1이 Frame을 전달하는 동안 이 MAC pair를 다시 쓰지는 않습니다.",
    nextHopMeaning:`PC1 입장에서 현재 next-hop은 설정된 Default Gateway ${state.gw}입니다. R2 eth0는 ${state.r2e0Ip}입니다.`,
    ttlMeaning:"PC1이 만든 IPv4 Packet의 TTL은 64입니다. R2가 라우팅하여 전달할 때 1 감소합니다.",
    why:"IP Destination은 end-to-end 목적지를, Ethernet Destination MAC은 현재 L2 Segment의 next-hop을 나타냅니다."
  });
}
function addR2ToDestinationSnapshot(dest,route){
  addSnapshot({
    key:"icmp-r2-dest",protocol:"ICMP",short:`R2에서 ${dest.name}로`,
    hop:`LAN ${route.segment} · R2 → ${dest.name}`,
    title:`라우팅 후 새 Ethernet Frame · R2 → ${dest.name}`,
    oneLine:`R2는 IPv4 Packet을 ${route.egress}으로 전달하면서 출력 링크용 새 Ethernet Frame으로 재캡슐화하고 TTL을 1 줄입니다.`,
    srcIp:state.pc1Ip,dstIp:dest.ip,srcMac:route.routerMac,dstMac:dest.mac,nextHop:dest.ip,ttl:"63",
    ipMeaning:`Source/Destination IP 주소는 여전히 ${state.pc1Ip} → ${dest.ip}입니다. NAT 없는 일반 라우팅에서는 최종 목적지 IP가 R2로 바뀌지 않습니다.`,
    macMeaning:`출력 LAN ${route.segment}에서는 Source MAC이 R2 ${route.egress}, Destination MAC이 ${dest.name} MAC입니다.`,
    nextHopMeaning:`R2의 Connected Route ${route.network}가 ${route.egress}을 선택했고, 이 링크에서는 ${dest.name}이 직접 next-hop입니다.`,
    ttlMeaning:"R2를 한 번 통과했으므로 TTL이 64에서 63으로 감소했습니다.",
    why:"라우터는 수신 Ethernet Frame의 L2 Header를 제거하고 routing 후 출력 링크용 새 Ethernet Frame을 생성합니다. 같은 L2 Segment 내부의 스위치 통과만으로 MAC pair가 바뀌는 것은 아닙니다."
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
