function applyDeviceConfig(){
  const d=state.openDevice;
  if(d==="pc1"||d==="pc2"||d==="pc3"){
    const ip=$("#cfgIp").value.trim(), prefix=+$("#cfgPrefix").value, gw=$("#cfgGw").value.trim();
    if(!isValidIp(ip)||!isValidIp(gw)){alert("IP 주소와 Gateway 형식을 확인하세요.");return}
    if(d==="pc1"){state.pc1Ip=ip;state.mask=prefix;state.gw=gw}
    if(d==="pc3"){state.pc3Ip=ip;state.pc3Mask=prefix;state.pc3Gw=gw}
    if(d==="pc2"){state.pc2Ip=ip;state.pc2Mask=prefix;state.pc2Gw=gw}
  }else if(d==="r2"){
    const e0=$("#cfgR2e0Ip").value.trim(),e1=$("#cfgR2e1Ip").value.trim();
    if(!isValidIp(e0)||!isValidIp(e1)){alert("R2 인터페이스 IP 형식을 확인하세요.");return}
    state.r2e0Ip=e0;state.r2e0Mask=+$("#cfgR2e0Mask").value;
    state.r2e1Ip=e1;state.r2e1Mask=+$("#cfgR2e1Mask").value;
  }
  state.arp={};state.last=null;resetPacketStudy();renderArp();renderState();renderLessonStatus();
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
  const b=state.snapshots.find(x=>x.key==="icmp-r2-pc2");
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
  addSnapshot({
    key:"arp-request",protocol:"ARP",short:"MAC 주소 질문",
    hop:local?"PC1 → LAN A 전체":"PC1 → LAN A 전체",
    title:`ARP Request · “${target}의 MAC 주소가 누구인가?”`,
    oneLine:local
      ?`PC1이 같은 LAN에 있는 ${target}의 MAC 주소를 모르기 때문에 LAN A 전체에 Broadcast로 묻습니다.`
      :`PC1이 원격 목적지로 바로 보내는 것이 아니라, 먼저 Next-hop ${target}의 MAC 주소를 알아내기 위해 LAN A 전체에 Broadcast로 묻습니다.`,
    srcIp:state.pc1Ip,dstIp:target,srcMac:MAC.pc1,dstMac:"ff:ff:ff:ff:ff:ff",
    nextHop:target,ttl:"해당 없음",
    ipMeaning:"ARP의 Sender IP와 Target IP입니다. 이 단계에는 아직 ICMP용 IPv4 헤더가 만들어져 전달되는 것이 아닙니다.",
    macMeaning:"ARP Request는 같은 LAN의 모든 장비가 볼 수 있도록 목적지 MAC ff:ff:ff:ff:ff:ff(Broadcast)를 사용합니다.",
    nextHopMeaning:local?"같은 LAN이므로 최종 목적지 자신이 Next-hop입니다.":"다른 네트워크이므로 Default Gateway가 현재 LAN에서의 Next-hop입니다.",
    ttlMeaning:"TTL은 IPv4 헤더의 필드입니다. ARP 프레임에는 IPv4 TTL이 없습니다.",
    why:local
      ?`PC1은 ${state.pc1Ip}/${state.mask} 계산으로 목적지가 <b>같은 네트워크</b>라고 판단했습니다. 그래서 Gateway가 아니라 목적지 ${target}의 MAC을 직접 찾습니다.`
      :`PC1은 ${state.pc1Ip}/${state.mask} 계산으로 목적지가 <b>다른 네트워크</b>라고 판단했습니다. 따라서 최종 목적지 PC2가 아니라 <b>Default Gateway ${target}</b>의 MAC부터 찾습니다.`
  });
}
function addLocalIcmpSnapshot(destIp,mac){
  addSnapshot({
    key:"icmp-pc1-pc3",protocol:"ICMP",short:"PC3로 실제 PING",
    hop:"PC1 → PC3",
    title:"ICMP Echo Request · PC1 → PC3",
    oneLine:"PC3가 같은 LAN에 있으므로 IP의 최종 목적지와 Ethernet의 현재 수신자가 모두 PC3입니다.",
    srcIp:state.pc1Ip,dstIp:destIp,srcMac:MAC.pc1,dstMac:mac,nextHop:destIp,ttl:"64",
    ipMeaning:"Source/Destination IP는 통신의 처음과 최종 상대를 나타냅니다. 여기서는 PC1 → PC3입니다.",
    macMeaning:"같은 LAN이므로 Ethernet 목적지 MAC도 PC3 MAC입니다. 라우터를 거치지 않습니다.",
    nextHopMeaning:"같은 네트워크에서는 최종 목적지 PC3 자신이 바로 Next-hop입니다.",
    ttlMeaning:"PC3까지 라우터를 통과하지 않으므로 TTL 64가 감소하지 않습니다.",
    why:`<b>같은 Subnet의 핵심:</b> 목적지 IP도 PC3, 현재 링크의 전달 대상도 PC3입니다. 그래서 <b>IP 목적지와 MAC 목적지가 같은 장비</b>를 가리킵니다.`
  });
}
function addPc1ToR2Snapshot(destIp,mac){
  addSnapshot({
    key:"icmp-pc1-r2",protocol:"ICMP",short:"PC1에서 R2로",
    hop:"LAN A · PC1 → R2",
    title:"ICMP Echo Request · PC1 → R2",
    oneLine:`최종 목적지는 ${destIp}이지만, LAN A에서 지금 당장 프레임을 받을 장비는 Default Gateway R2(${state.r2e0Ip})입니다.`,
    srcIp:state.pc1Ip,dstIp:destIp,srcMac:MAC.pc1,dstMac:mac,nextHop:state.r2e0Ip,ttl:"64",
    ipMeaning:"Destination IP 192.168.20.10은 최종 목적지 PC2를 계속 가리킵니다. 아직 R2로 바뀌지 않습니다.",
    macMeaning:"LAN A에서는 PC1이 직접 PC2의 MAC으로 보낼 수 없으므로 Ethernet 목적지 MAC은 R2 eth0입니다.",
    nextHopMeaning:`PC1 입장에서 지금 당장 넘길 다음 장비는 설정된 Default Gateway ${state.gw}입니다. 현재 R2 eth0는 ${state.r2e0Ip}입니다.`,
    ttlMeaning:"PC1이 만든 IPv4 패킷의 TTL은 64입니다. R2가 라우팅하여 전달할 때 1 감소합니다.",
    why:`여기서 가장 중요한 차이는 <b>IP 목적지와 MAC 목적지가 다르다</b>는 점입니다. IP는 “최종적으로 PC2까지 가라”, MAC은 “현재 LAN에서는 일단 R2에게 건네라”는 역할입니다.`
  });
}
function addR2ToPc2Snapshot(destIp){
  addSnapshot({
    key:"icmp-r2-pc2",protocol:"ICMP",short:"R2에서 PC2로",
    hop:"LAN B · R2 → PC2",
    title:"라우팅 후 새 Ethernet Frame · R2 → PC2",
    oneLine:`R2는 같은 IP 패킷을 LAN B로 전달하면서 Ethernet 헤더를 LAN B에 맞게 새로 만들고 TTL을 1 줄입니다. R2 eth1=${state.r2e1Ip}/${state.r2e1Mask}`,
    srcIp:state.pc1Ip,dstIp:destIp,srcMac:MAC.r2e1,dstMac:MAC.pc2,nextHop:destIp,ttl:"63",
    ipMeaning:"Source/Destination IP는 여전히 PC1 → PC2입니다. 일반 라우팅에서는 최종 목적지 IP가 R2로 바뀌지 않습니다.",
    macMeaning:"새 링크인 LAN B에서는 Source MAC이 R2 eth1, Destination MAC이 PC2로 바뀝니다.",
    nextHopMeaning:"R2에게 192.168.20.0/24는 직접 연결된 네트워크이므로 이제 PC2 자신이 다음 전달 대상입니다.",
    ttlMeaning:"라우터 R2를 한 번 통과했으므로 TTL이 64에서 63으로 감소했습니다.",
    why:`라우터는 기존 Ethernet 프레임을 그대로 밀어 보내는 것이 아니라 <b>입력 프레임의 L2 헤더를 벗기고, 다음 링크용 Ethernet 헤더를 새로 만들어</b> 전달합니다. 그래서 MAC은 바뀌지만 IP 목적지는 그대로입니다.`
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
    ["Router 비교","라우터 전/후 헤더 차이 확인",state.snapshots.some(x=>x.key==="icmp-pc1-r2") && state.snapshots.some(x=>x.key==="icmp-r2-pc2")]
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
