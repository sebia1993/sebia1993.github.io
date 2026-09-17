async function ping(){
  if(state.busy)return;
  state.busy=true;resetFlow();resetPacketStudy();state.last=null;
  const destIp=state.dest==="pc3"?state.pc3Ip:state.pc2Ip;
  const local=sameSubnet(state.pc1Ip,destIp,state.mask);
  const next=local?destIp:state.gw;
  $("#pingBtn").disabled=true;$("#resultHint").textContent="현재 설정값으로 패킷 경로를 계산하고 있습니다.";

  setStep("s1",local?"LOCAL · 같은 네트워크":"REMOTE · 다른 네트워크",
    local?`PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}을 같은 링크로 판단합니다.`:
          `PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}을 다른 네트워크로 판단 → Gateway ${state.gw} 사용`);
  setLiveEvent("route","PC1 · 목적지 네트워크 판단",
    local?`${destIp}을 LOCAL로 판단했습니다. Gateway 없이 목적지의 MAC을 직접 찾습니다.`:
          `${destIp}을 REMOTE로 판단했습니다. 다음 상대는 Default Gateway ${state.gw}입니다.`);
  await sleep(350);

  const arpTarget=next;
  setStep("s2",`ARP → ${arpTarget}`,local?"목적지 호스트의 MAC을 직접 찾습니다.":"PC1에 설정된 Default Gateway의 MAC을 찾습니다.");
  addArpSnapshot(arpTarget,local);

  const arpTargetKind=local?(state.dest==="pc3"?"pc3":"absent"):"r2";
  let arpAnim;
  if(arpTargetKind==="absent"){
    arpAnim=await animateArpBroadcast("r2");
  }else{
    arpAnim=await animateArpBroadcast(arpTargetKind);
  }
  if(!arpAnim.ok){
    setStep("s3",`LINK DOWN · ${LINK_UI[arpAnim.key].label}`,`패킷이 빨간 × 지점에서 멈췄습니다. 원인: ${arpAnim.reason}`,"error");
    setStep("s4","PING 실패","ARP Request조차 대상 구간까지 도달하지 못했습니다.","error");
    setExplain(arpAnim.reason==="CABLE"
      ?`<b>Physical Cable 장애:</b> <b>${LINK_UI[arpAnim.key].label}</b> 케이블이 DOWN입니다. 빨간 점선과 ×가 끊긴 지점입니다.`
      :`<b>Interface 장애:</b> 케이블은 연결돼 있지만 R2 <b>${arpAnim.reason}</b>가 DOWN입니다. 링크는 주황 실선으로 남고 R2 포트 LED가 빨간색으로 표시됩니다.`, "error");
    log(`ping ${destIp} → FAIL · ${LINK_UI[arpAnim.key].label} DOWN (${arpAnim.reason})`);
    state.last={ok:false,stage:"link",link:arpAnim.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  let mac=null;
  if(local && state.dest==="pc3" && arpTarget===state.pc3Ip){
    mac=MAC.pc3;state.arp[arpTarget]=mac;
  }else if(!local && arpTarget===state.r2e0Ip && state.eth0){
    mac=MAC.r2e0;state.arp[arpTarget]=mac;
  }
  renderArp();

  if(!mac){
    setStep("s3","ARP Reply 없음",`${arpTarget}의 MAC 주소를 얻지 못해 ICMP를 전달할 수 없습니다.`,"error");
    setStep("s4","PING 실패","ARP 단계에서 중단되었습니다.","error");
    setLiveEvent("error","ARP Resolution 실패",`${arpTarget}의 MAC 주소를 얻지 못해 ICMP를 전송할 수 없습니다.`);
    let why;
    if(local && state.dest==="pc2"){
      why=`PC1의 Prefix /${state.mask} 때문에 물리적으로 LAN B에 있는 PC2(${state.pc2Ip})를 같은 LAN이라고 오판하여 <b>PC2를 직접 ARP</b>했습니다. Broadcast는 LAN A를 벗어나지 못합니다.`;
    }else if(!local && state.gw!==state.r2e0Ip){
      why=`PC1의 Gateway는 <b>${state.gw}</b>인데 실제 LAN A의 R2 eth0 주소는 <b>${state.r2e0Ip}</b>입니다. PC1은 ${state.gw}를 ARP하지만 응답할 장비가 없습니다.`;
    }else if(!state.eth0){
      why=`Gateway 주소는 맞지만 <b>R2 eth0가 DOWN</b>이라 ${state.r2e0Ip}에 대한 ARP Reply를 보낼 수 없습니다.`;
    }else{
      why=`현재 LAN A에서 ${arpTarget} IP를 가진 장비가 응답하지 않습니다. IP/Prefix/Gateway와 R2 eth0 상태를 확인하세요.`;
    }
    setExplain(`<b>실패 지점 · ARP</b><br>${why}`,"error");
    log(`ping ${destIp} → FAIL · ARP ${arpTarget} no reply`);
    state.last={ok:false,stage:"arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  setStep("s3",local?`Ethernet Dst → PC3 MAC`:`Ethernet Dst → R2 eth0 MAC`,
    local?mac:`${mac} · 최종 IP 목적지 ${destIp}은 그대로`);
  if(local){
    addLocalIcmpSnapshot(destIp,mac);
    setLiveEvent("icmp","PC1 → PC3 · ICMP Echo Request",`같은 LAN이므로 PC3 MAC ${mac}으로 직접 전송합니다.`);
  }else{
    addPc1ToR2Snapshot(destIp,mac);
    setLiveEvent("icmp","PC1 → R2 · ICMP Echo Request",`최종 목적지 IP는 ${destIp}이지만 현재 LAN의 Ethernet 목적지는 R2 eth0 MAC ${mac}입니다.`);
  }

  if(local){
    const localAnim=await animateLinks(["pc1sw1","sw1pc3"]);
    if(localAnim.ok)markRequest(["pc1sw1","sw1pc3"]);
    if(!localAnim.ok){
      setStep("s4",`PING 실패 · ${LINK_UI[localAnim.key].label} DOWN`,"ARP 이후 실제 ICMP가 링크에서 멈췄습니다.","error");
      setExplain(localAnim.reason==="CABLE"
        ?`<b>Cable DOWN:</b> ${LINK_UI[localAnim.key].label} 구간의 케이블이 끊겨 Echo Request가 중단됐습니다.`
        :`<b>Interface DOWN:</b> ${localAnim.reason} 포트가 내려가 Echo Request가 중단됐습니다.`,"error");
      state.last={ok:false,stage:"link",link:localAnim.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    const pc3ThinksLocal=sameSubnet(state.pc3Ip,state.pc1Ip,state.pc3Mask);
    if(pc3ThinksLocal){
      setStep("s4","PING 성공",`PC3도 PC1을 Local로 판단하여 직접 Echo Reply를 보냅니다.`);
      setExplain(`<b>성공:</b> PC1은 PC3를 같은 LAN으로 판단했고, PC3 역시 PC1을 같은 LAN으로 판단했습니다. 이 통신에서는 두 PC의 Gateway를 사용하지 않습니다.`);
      setLiveEvent("reply","PC3 → PC1 · Echo Reply","PC3가 같은 LAN에서 PC1에게 직접 Reply를 돌려보냅니다.");
      await animateReply(["pc3sw1","sw1pc1"]);
      log(`ping ${destIp} → SUCCESS · direct LAN A`);
      state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
    }else if(state.pc3Gw===state.r2e0Ip && state.eth0){
      setStep("s4","PING 성공 · 비대칭 Reply",`PC3는 PC1을 Remote로 판단하여 Gateway ${state.pc3Gw}를 통해 Reply합니다.`);
      setExplain(`<b>주의할 점:</b> 요청은 PC1→PC3로 직접 갔지만 PC3 Prefix /${state.pc3Mask} 때문에 Reply는 Gateway를 사용했습니다. 설정이 달라도 통신이 우연히 성립할 수 있어 양쪽 설정 확인이 중요합니다.`,"remote");
      markReply(["pc3sw1","r2sw1","sw1pc1"]);
      log(`ping ${destIp} → SUCCESS · PC3 reply via gateway ${state.pc3Gw}`);
      state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
    }else{
      setStep("s4","PING 실패 · Reply 경로",`Echo Request는 PC3에 도착했지만 PC3가 Reply를 돌려보내지 못합니다.`,"error");
      setExplain(`<b>요청은 도착했습니다.</b> 하지만 PC3(${state.pc3Ip}/${state.pc3Mask})는 PC1(${state.pc1Ip})을 원격으로 판단하고 Gateway <b>${state.pc3Gw}</b>를 사용하려 합니다. PC3 Gateway 설정을 확인하세요.`,"error");
      log(`ping ${destIp} → FAIL · request reached PC3, reply path failed`);
      state.last={ok:false,stage:"reply"};recordFailure();
    }
    resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const toR2=await animateLinks(["pc1sw1","sw1r2"]);
  if(toR2.ok)markRequest(["pc1sw1","sw1r2"]);
  if(!toR2.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toR2.key].label} DOWN`,"ICMP Echo Request가 R2까지 도달하지 못했습니다.","error");
    setExplain(`<b>LINK DOWN:</b> 토폴로지의 빨간 × 위치에서 ICMP가 중단됐습니다.`,"error");
    state.last={ok:false,stage:"link",link:toR2.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const r2CanReachPc2=state.eth1 && sameSubnet(state.r2e1Ip,state.pc2Ip,state.r2e1Mask);
  await showRouteLookup(destIp,r2CanReachPc2);
  if(!r2CanReachPc2){
    setStep("s4","PING 실패 · R2 이후",state.eth1?"R2 eth1 Connected Network에 PC2가 포함되지 않습니다.":"R2 eth1가 DOWN입니다.","error");
    setExplain(state.eth1
      ?`R2 eth1은 <b>${state.r2e1Ip}/${state.r2e1Mask}</b>, PC2는 <b>${state.pc2Ip}/${state.pc2Mask}</b>입니다. 현재 시뮬레이터에는 Static Route가 없으므로 Connected Route가 없으면 PC2로 전달할 수 없습니다.`
      :`R2 eth1가 DOWN이라 LAN B로 프레임을 내보낼 수 없습니다.`,"error");
    log(`ping ${destIp} → FAIL · R2 cannot reach PC2 network`);
    state.last={ok:false,stage:"route"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  setLiveEvent("icmp","R2 → PC2 · 새 Ethernet Frame",
    `R2가 LAN B용 Ethernet Header를 새로 만들고 TTL을 64→63으로 줄여 PC2 ${state.pc2Ip}로 전달합니다.`);
  const toPc2=await animateLinks(["r2sw2","sw2pc2"]);
  if(toPc2.ok)markRequest(["r2sw2","sw2pc2"]);
  if(!toPc2.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toPc2.key].label} DOWN`,"R2는 경로를 알지만 물리 링크가 끊겨 PC2까지 전달하지 못합니다.","error");
    setExplain(`<b>Routing 판단은 정상</b>이지만 <b>${LINK_UI[toPc2.key].label}</b> 링크가 DOWN이라 패킷이 빨간 ×에서 멈췄습니다.`,"error");
    state.last={ok:false,stage:"link",link:toPc2.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }
  addR2ToPc2Snapshot(destIp);

  const pc2ThinksPc1Local=sameSubnet(state.pc2Ip,state.pc1Ip,state.pc2Mask);
  if(pc2ThinksPc1Local){
    setStep("s4","PING 실패 · PC2 Reply ARP",`PC2가 PC1(${state.pc1Ip})을 같은 LAN이라고 오판하여 LAN B에서 직접 ARP합니다.`,"error");
    setExplain(`<b>Echo Request는 PC2까지 도착했습니다.</b> 하지만 PC2 Prefix /${state.pc2Mask} 때문에 PC1을 Local로 판단하여 LAN B에서 PC1을 직접 ARP합니다. PC1은 LAN A에 있으므로 Reply가 돌아오지 않습니다.`,"error");
    log(`ping ${destIp} → FAIL · PC2 treats PC1 as on-link`);
    state.last={ok:false,stage:"reply"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  if(state.pc2Gw!==state.r2e1Ip || !state.eth1){
    setStep("s4","PING 실패 · PC2 Gateway",`요청은 PC2까지 도착했지만 Echo Reply의 Next-hop을 찾지 못합니다.`,"error");
    setLiveEvent("error","PC2 · Reply 경로 실패",`Echo Request는 PC2에 도착했지만 PC2 Gateway ${state.pc2Gw}가 R2 eth1 ${state.r2e1Ip}와 맞지 않아 Reply가 돌아오지 않습니다.`);
    setExplain(`<b>중요한 비대칭 장애:</b> PC2는 Echo Request를 받았지만 Reply를 보내려는 Gateway가 <b>${state.pc2Gw}</b>입니다. 실제 R2 eth1은 <b>${state.r2e1Ip}</b>이므로 PC2 Gateway가 잘못되면 요청은 도착해도 PING은 실패합니다.`,"error");
    log(`ping ${destIp} → FAIL · request reached PC2, PC2 gateway ${state.pc2Gw} invalid`);
    state.last={ok:false,stage:"reply-gateway"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const r2CanReturnPc1=state.eth0 && sameSubnet(state.r2e0Ip,state.pc1Ip,state.r2e0Mask);
  if(!r2CanReturnPc1){
    setStep("s4","PING 실패 · Return Route",`PC2 Reply는 R2에 도착하지만 R2가 PC1 네트워크로 돌려보낼 수 없습니다.`,"error");
    setExplain(`<b>Return Path 문제:</b> R2 eth0 ${state.r2e0Ip}/${state.r2e0Mask}에서 PC1 ${state.pc1Ip}/${state.mask} 쪽 Connected Route를 확인하세요.`,"error");
    log(`ping ${destIp} → FAIL · return route to PC1 missing`);
    state.last={ok:false,stage:"return-route"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  setStep("s4","PING 성공","PC2가 자신의 Gateway R2 eth1을 통해 Echo Reply를 돌려보냅니다.");
  setExplain(`<b>End-to-End 성공:</b> PC1 Gateway=${state.gw}, R2 eth0=${state.r2e0Ip}, R2 eth1=${state.r2e1Ip}, PC2 Gateway=${state.pc2Gw}가 모두 일관되게 연결되어 요청과 Reply가 왕복했습니다.`,"remote");
  setLiveEvent("reply","PC2 → R2 → PC1 · Echo Reply",
    `PC2는 Gateway ${state.pc2Gw}를 통해 Reply를 보내고 R2가 LAN A의 PC1로 다시 전달합니다.`);
  await animateReply(["pc2sw2","sw2r2","r2sw1","sw1pc1"]);
  log(`ping ${destIp} → SUCCESS · PC2 reply via ${state.pc2Gw}`);
  state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
  resetPacket();$("#pingBtn").disabled=false;state.busy=false;
}
