function replyPathFromHostToRouter(host){
  return host.key==="pc2"?["pc2sw2","sw2r2"]:["pc3sw1","sw1r2"];
}
function replyPathFromRouterToHost(host){
  return host.key==="pc2"?["r2sw2","sw2pc2"]:
         host.key==="pc3"?["r2sw1","sw1pc3"]:
         ["r2sw1","sw1pc1"];
}
function replyPathDirectToPc1(host){
  return host.key==="pc3"?["pc3sw1","sw1pc1"]:[];
}
function arpReplyPathToHost(responder,requester){
  if(responder.key==="r2")return requester.key==="pc2"?["r2sw2","sw2pc2"]:["r2sw1","sw1pc3"];
  if(responder.key==="pc1"&&requester.key==="pc3")return ["pc1sw1","sw1pc3"];
  return [];
}

async function ensureHostNeighbor(host,target,purpose){
  const cache=neighborCacheFor(host.key);
  const cached=cache?.[target.ip]||null;
  if(cached){
    setLiveEvent("arp",`${host.name} · ARP Cache HIT`,`${target.ip} → ${cached} 매핑을 재사용합니다. 새 ARP Request는 발생하지 않습니다.`);
    await sleep(220);
    return {ok:true,mac:cached,cacheHit:true};
  }

  addHostArpRequestSnapshot(host,target.ip,target.name,purpose);
  const targetKind=target.key==="r2"?"r2":target.key;
  const req=await animateHostArpRequest(host,targetKind);
  if(!req.ok)return {ok:false,stage:"link",...req};

  const targetAvailable=
    target.segment===host.segment &&
    (target.key!=="r2" || target.up);
  if(!targetAvailable){
    setLiveEvent("error",`${host.name} · ARP Reply 없음`,`LAN ${host.segment}에서 ${target.ip}을 소유한 사용 가능한 장비의 Reply를 받지 못했습니다.`);
    return {ok:false,stage:"no-reply"};
  }

  if(target.key==="r2")learnNeighbor("r2",host.ip,host.mac);
  else learnNeighbor(target.key,host.ip,host.mac);
  renderArp();

  addHostArpReplySnapshot(target,host,purpose);
  setLiveEvent("reply",`${target.name} → ${host.name} · ARP Reply`,`${target.ip} → ${target.mac} 매핑을 알려줍니다.`);
  const keys=arpReplyPathToHost(target,host);
  const rep=keys.length?await animateReply(keys):{ok:true};
  if(!rep.ok)return {ok:false,stage:"reply-link",...rep};

  learnNeighbor(host.key,target.ip,target.mac);
  renderArp();
  return {ok:true,mac:target.mac,cacheHit:false};
}

async function ensureRouterNeighbor(host,route,phase="forward"){
  const cached=state.r2Arp[host.ip]||null;
  if(cached){
    setLiveEvent("arp","R2 · ARP Cache HIT",`${host.ip} → ${cached} 매핑을 재사용합니다. 새 ARP Request는 발생하지 않습니다.`);
    await sleep(220);
    return {ok:true,mac:cached,cacheHit:true};
  }

  if(phase==="return")addR2ReturnArpRequestSnapshot(host,route);
  else addRouterArpRequestSnapshot(host,route);

  const req=await animateRouterArp(route,host);
  if(!req.ok)return {ok:false,stage:"link",...req};

  if(!destinationIsOnPhysicalSegment(host,route.segment)){
    setLiveEvent("error","R2 · ARP Reply 없음",`R2는 LAN ${route.segment}에서 ${host.ip}을 ARP했지만 ${host.name}은 실제 LAN ${host.segment}에 있습니다.`);
    return {ok:false,stage:"no-reply"};
  }

  // ARP Request를 받은 Host는 요청자의 Sender IP/MAC을 학습할 수 있습니다.
  learnNeighbor(host.key,route.routerIp,route.routerMac);
  renderArp();

  if(phase==="return")addR2ReturnArpReplySnapshot(host,route);
  else addRouterArpReplySnapshot(host,route);

  setLiveEvent("reply",`${host.name} → R2 · ARP Reply`,`${host.ip} → ${host.mac} 매핑을 R2가 학습합니다.`);
  const rep=await animateRouterArpReply(route,host);
  if(!rep.ok)return {ok:false,stage:"reply-link",...rep};

  learnNeighbor("r2",host.ip,host.mac);
  renderArp();
  return {ok:true,mac:host.mac,cacheHit:false};
}

async function completeEchoReply(dest){
  const pc1=hostByKey("pc1");
  const destSeesPc1OnLink=sameSubnet(dest.ip,pc1.ip,dest.prefix);

  if(destSeesPc1OnLink){
    const direct=await ensureHostNeighbor(
      dest,
      pc1,
      `${dest.name}은 자신의 Prefix /${dest.prefix} 기준으로 PC1(${pc1.ip})을 on-link로 판단했기 때문에 Echo Reply를 직접 보내려 합니다.`
    );
    if(!direct.ok){
      setStep("s4","PING 실패 · Reply ARP",`${dest.name}이 PC1 MAC을 확인하지 못해 Echo Reply를 보낼 수 없습니다.`,"error");
      setExplain(`<b>Reply 방향 ARP 실패:</b> ${dest.name}은 PC1을 on-link로 판단했지만 실제 Physical Segment가 다르거나 ARP Reply 경로가 끊겼습니다.`,"error");
      return {ok:false,stage:"reply-arp",detail:direct};
    }
    if(dest.segment!=="A"){
      setStep("s4","PING 실패 · Reply Physical Segment",`${dest.name}은 PC1을 on-link로 판단했지만 PC1은 실제 LAN A에 있습니다.`,"error");
      return {ok:false,stage:"reply-segment"};
    }

    setLiveEvent("reply",`${dest.name} → PC1 · ICMP Echo Reply`,"Neighbor cache를 사용해 같은 LAN A에서 직접 Reply합니다.");
    const keys=replyPathDirectToPc1(dest);
    const rr=keys.length?await animateReply(keys):{ok:false,key:"",reason:"NO_PATH"};
    if(!rr.ok)return {ok:false,stage:"reply-link",detail:rr};

    setStep("s4","PING 성공",`${dest.name}이 PC1을 on-link로 판단하고 필요한 Neighbor 정보를 확인한 뒤 직접 Echo Reply를 보냈습니다.`);
    setExplain(`<b>End-to-End 성공:</b> 요청과 Reply 모두 올바른 Physical Segment와 독립 Neighbor Cache를 사용했습니다.`);
    return {ok:true};
  }

  const rif=routerInterfaceForSegment(dest.segment);
  const gwOnLink=sameSubnet(dest.ip,dest.gw,dest.prefix);
  if(!gwOnLink||dest.gw!==rif.ip||!rif.up){
    setStep("s4","PING 실패 · Destination Gateway",`Echo Request는 도착했지만 ${dest.name}이 Reply에 사용할 유효한 Gateway를 만들지 못합니다.`,"error");
    setLiveEvent("error",`${dest.name} · Reply Gateway 오류`,`Gateway ${dest.gw}가 ${dest.name} 기준 on-link이고 R2 ${rif.name} ${rif.ip}와 일치하는지 확인하세요.`);
    setExplain(`<b>Reply 방향 Gateway 오류:</b> ${dest.name}=${dest.ip}/${dest.prefix}, Gateway=${dest.gw}, R2 ${rif.name}=${rif.ip}입니다.`,"error");
    return {ok:false,stage:"reply-gateway"};
  }

  const gateway={key:"r2",name:`R2 ${rif.name}`,ip:rif.ip,mac:rif.mac,segment:rif.segment,up:rif.up};
  const gwNeighbor=await ensureHostNeighbor(
    dest,
    gateway,
    `${dest.name}은 PC1을 remote로 판단했으므로 Echo Reply의 next-hop인 Default Gateway ${gateway.ip}의 MAC이 필요합니다.`
  );
  if(!gwNeighbor.ok){
    setStep("s4","PING 실패 · Reply Gateway ARP",`${dest.name}이 Gateway MAC을 확인하지 못했습니다.`,"error");
    return {ok:false,stage:"reply-gateway-arp",detail:gwNeighbor};
  }

  setLiveEvent("reply",`${dest.name} → ${gateway.name} · ICMP Echo Reply`,"Destination Host가 자신의 Default Gateway MAC으로 Echo Reply Frame을 전송합니다.");
  const toRouter=await animateReply(replyPathFromHostToRouter(dest));
  if(!toRouter.ok)return {ok:false,stage:"reply-to-router-link",detail:toRouter};

  const returnRoute=routerRouteFor(pc1.ip);
  await showRouteLookup(pc1.ip,returnRoute);
  if(!returnRoute||returnRoute.segment!=="A"){
    setStep("s4","PING 실패 · Return Route","R2가 PC1이 실제 연결된 LAN A로 Reply를 전달할 Connected Route를 선택하지 못합니다.","error");
    setExplain(`<b>Return Path 문제:</b> R2의 Connected Route와 PC1 ${pc1.ip}/${pc1.prefix}를 확인하세요.`,"error");
    return {ok:false,stage:"return-route"};
  }

  const pc1Neighbor=await ensureRouterNeighbor(pc1,returnRoute,"return");
  if(!pc1Neighbor.ok){
    setStep("s4","PING 실패 · R2 Return ARP","R2가 Return Path에서 PC1 MAC을 확인하지 못했습니다.","error");
    return {ok:false,stage:"return-arp",detail:pc1Neighbor};
  }

  setLiveEvent("reply","R2 → PC1 · ICMP Echo Reply",`R2가 ${returnRoute.egress} 출력용 새 Ethernet Frame으로 재캡슐화해 PC1에 Reply를 전달합니다.`);
  const finalReply=await animateReply(replyPathFromRouterToHost(pc1));
  if(!finalReply.ok)return {ok:false,stage:"return-link",detail:finalReply};

  setStep("s4","PING 성공",`${dest.name}이 Gateway를 통해 Reply했고, R2가 Return Route와 PC1 Neighbor 정보를 확인해 Echo Reply를 전달했습니다.`);
  setExplain(`<b>End-to-End 성공:</b> PC1·${dest.name}·R2가 각자의 Neighbor Cache와 routing 판단을 사용해 왕복 경로를 완성했습니다.`,"remote");
  return {ok:true};
}

async function ping(){
  if(state.busy)return;
  if(typeof isAdvancedMode==="function"&&!isAdvancedMode()&&!state.predictionChoice)return;
  state.busy=true;resetFlow();resetPacketStudy();state.last=null;
  const dest=selectedDestination();
  const destIp=dest.ip;
  const onLink=sameSubnet(state.pc1Ip,destIp,state.mask);
  $("#pingBtn").disabled=true;
  $("#resultHint").textContent="현재 설정값으로 경로/ARP/Neighbor 흐름를 계산하고 있습니다.";

  setStep("s1",onLink?"ON-LINK · 직접 전달":"VIA GATEWAY · 원격 경로",
    onLink
      ?`PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}을 on-link로 판단합니다.`
      :`PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}은 on-link가 아니므로 Default Gateway ${state.gw}를 사용합니다.`);
  setLiveEvent("route","PC1 · 경로 판단",
    onLink
      ?`${destIp}을 on-link로 판단했습니다. 목적지 IPv4 주소의 MAC을 확인합니다.`
      :`${destIp}은 remote 목적지이므로 next-hop은 Default Gateway ${state.gw}입니다.`);
  await sleep(350);

  if(!onLink && !sameSubnet(state.pc1Ip,state.gw,state.mask)){
    setStep("s2","Gateway가 on-link가 아님",`PC1 ${state.pc1Ip}/${state.mask}에서 Gateway ${state.gw}는 직접 ARP할 수 있는 on-link 주소가 아닙니다.`,"error");
    setStep("s4","PING 실패","유효한 next-hop을 만들 수 없어 ARP/ICMP 전송을 시작하지 못했습니다.","error");
    setExplain(`<b>Gateway 설정 오류:</b> Default Gateway는 송신 Host가 자신의 Ethernet 구간에서 직접 도달할 수 있는 on-link 주소여야 합니다.`,"error");
    log(`ping ${destIp} → FAIL · gateway ${state.gw} is not on-link`);
    state.last={ok:false,stage:"gateway-offlink"};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const arpTarget=onLink?destIp:state.gw;
  let firstHopMac=state.arp[arpTarget]||null;
  let firstHopEndpoint=lanAEndpointByIp(arpTarget);
  setStep("s2",firstHopMac?`ARP Cache HIT · ${arpTarget}`:`ARP → ${arpTarget}`,
    firstHopMac
      ?`PC1 Neighbor Table의 기존 IPv4→MAC 매핑 ${firstHopMac}을 재사용합니다.`
      :onLink?"목적지 Host의 MAC을 직접 확인합니다.":"설정된 Default Gateway IPv4 주소의 MAC을 확인합니다.");

  if(!firstHopMac){
    addArpSnapshot(arpTarget,onLink);
    const targetKind=firstHopEndpoint?.key==="pc3"?"pc3":firstHopEndpoint?.key==="r2"&&firstHopEndpoint.up?"r2":"none";
    const req=await animateArpBroadcast(targetKind);
    if(!req.ok){
      setStep("s3",`ARP 경로 실패 · ${LINK_UI[req.key].label}`,"필요한 ARP 교환을 완료하지 못했습니다.","error");
      setStep("s4","PING 실패","next-hop MAC을 얻지 못해 IPv4 Packet을 Ethernet으로 전달할 수 없습니다.","error");
      setExplain(`<b>ARP Link 실패:</b> ${LINK_UI[req.key].label} 상태 때문에 ${arpTarget}에 대한 Neighbor Resolution을 완료하지 못했습니다.`,"error");
      log(`ping ${destIp} → FAIL · ARP path down`);
      state.last={ok:false,stage:"arp-link",link:req.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    firstHopEndpoint=lanAEndpointByIp(arpTarget);
    if(!firstHopEndpoint||firstHopEndpoint.key==="pc1"||(firstHopEndpoint.key==="r2"&&!firstHopEndpoint.up)){
      setStep("s3","ARP Reply 없음",`${arpTarget}의 MAC 주소를 얻지 못했습니다.`,"error");
      setStep("s4","PING 실패","ARP/neighbor resolution 단계에서 중단되었습니다.","error");
      let why;
      if(onLink&&dest.segment!=="A"){
        why=`PC1의 Prefix /${state.mask} 때문에 물리적으로 LAN ${dest.segment}에 있는 ${dest.name}(${dest.ip})을 on-link로 판단해 LAN A에서 직접 ARP했습니다. ARP Broadcast는 Router를 넘어 다른 Broadcast Domain으로 전달되지 않습니다.`;
      }else if(!onLink&&arpTarget===state.r2e0Ip&&!state.eth0){
        why=`Gateway IPv4 주소는 R2 eth0와 일치하지만 eth0가 DOWN이라 ARP Reply가 없습니다.`;
      }else{
        why=`현재 LAN A에서 ${arpTarget}을 소유한 사용 가능한 next-hop 장비가 ARP Reply를 보내지 않았습니다.`;
      }
      setExplain(`<b>실패 지점 · ARP</b><br>${why}`,"error");
      setLiveEvent("error","ARP Reply 없음",`${arpTarget}의 IPv4→MAC 매핑을 얻지 못했습니다.`);
      log(`ping ${destIp} → FAIL · ARP ${arpTarget} no reply`);
      state.last={ok:false,stage:"arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    // ARP Request를 실제로 받은 응답자는 PC1의 Sender IP/MAC을 학습할 수 있습니다.
    if(firstHopEndpoint.key==="r2")learnNeighbor("r2",state.pc1Ip,MAC.pc1);
    else learnNeighbor(firstHopEndpoint.key,state.pc1Ip,MAC.pc1);
    renderArp();

    addArpReplySnapshot(arpTarget,onLink,firstHopEndpoint.name,firstHopEndpoint.mac);
    setLiveEvent("reply",`${firstHopEndpoint.name} → PC1 · ARP Reply`,`${arpTarget} → ${firstHopEndpoint.mac} 매핑을 알려줍니다.`);
    const replyKeys=firstHopEndpoint.key==="r2"?["r2sw1","sw1pc1"]:["pc3sw1","sw1pc1"];
    const rep=await animateReply(replyKeys);
    if(!rep.ok){
      setStep("s3","ARP Reply 경로 실패",`${LINK_UI[rep.key].label}에서 Reply가 돌아오지 못했습니다.`,"error");
      setStep("s4","PING 실패","PC1이 ARP Reply를 수신하지 못했습니다.","error");
      state.last={ok:false,stage:"arp-reply-link"};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    firstHopMac=firstHopEndpoint.mac;
    learnNeighbor("pc1",arpTarget,firstHopMac);
    renderArp();
  }else{
    setLiveEvent("arp","PC1 · ARP Cache HIT",`${arpTarget} → ${firstHopMac} 매핑을 재사용합니다. 새 ARP Request는 발생하지 않습니다.`);
    await sleep(250);
    firstHopEndpoint=lanAEndpointByIp(arpTarget);
  }

  if(!onLink && firstHopEndpoint?.key!=="r2"){
    if(firstHopEndpoint?.key==="pc3"){
      setStep("s3","Ethernet Dst → PC3 MAC",`잘못 설정된 Gateway ${state.gw}가 실제 PC3이므로 ARP는 성공했습니다.`);
      addPc1ToWrongGatewaySnapshot(dest,firstHopEndpoint);
      setLiveEvent("icmp","PC1 → PC3 · 잘못된 Gateway로 ICMP 전달",`Ethernet Frame은 PC3로 가지만 IPv4 Destination은 ${dest.ip}(${dest.name})입니다.`);
      const badPath=await animateLinks(["pc1sw1","sw1pc3"]);
      if(badPath.ok)markRequest(["pc1sw1","sw1pc3"]);
      if(!badPath.ok){
        setStep("s4","PING 실패 · Gateway Host Link",`${LINK_UI[badPath.key].label}에서 Frame이 중단됐습니다.`,"error");
      }else{
        setStep("s4","PING 실패 · Gateway가 Router가 아님",`PC3는 Frame을 받았지만 이 Simulator에서 IP forwarding을 하지 않는 End Host이므로 ${dest.name}으로 전달하지 않습니다.`,"error");
        setExplain("<b>중요:</b> 잘못된 Gateway 주소가 실제 Host IP라면 ARP는 성공할 수 있습니다. 그러나 ARP 성공은 그 장비가 Router라는 뜻이 아니며, 일반 End Host인 PC3는 원격 IPv4 Packet을 forwarding하지 않습니다.","error");
      }
      log(`ping ${destIp} → FAIL · gateway points to non-forwarding PC3`);
      state.last={ok:false,stage:"gateway-not-router"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    setStep("s4","PING 실패 · 유효한 Router next-hop 없음","PC1이 원격 목적지로 사용할 next-hop이 R2가 아닙니다.","error");
    state.last={ok:false,stage:"gateway-not-router"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  setStep("s3",onLink?`Ethernet Dst → ${dest.name} MAC`:"Ethernet Dst → R2 eth0 MAC",
    onLink?`${firstHopMac}`:`${firstHopMac} · IPv4 Destination ${destIp}은 최종 Host를 유지`);

  if(onLink){
    if(dest.segment!=="A"){
      // 정상적으로는 앞선 ARP 단계에서 Reply를 못 받아 여기까지 오지 않습니다.
      setStep("s4","PING 실패 · 잘못된 on-link 판단",`${dest.name}은 실제 LAN ${dest.segment}에 있습니다.`,"error");
      state.last={ok:false,stage:"physical-segment"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    addLocalIcmpSnapshot(dest,firstHopMac);
    setLiveEvent("icmp",`PC1 → ${dest.name} · ICMP Echo Request`,`PC1이 ${dest.name} MAC ${firstHopMac}으로 직접 전송합니다.`);
    const localAnim=await animateLinks(["pc1sw1","sw1pc3"]);
    if(localAnim.ok)markRequest(["pc1sw1","sw1pc3"]);
    if(!localAnim.ok){
      setStep("s4",`PING 실패 · ${LINK_UI[localAnim.key].label} DOWN`,"ARP 이후 ICMP Echo Request가 링크에서 중단됐습니다.","error");
      state.last={ok:false,stage:"link",link:localAnim.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    const reply=await completeEchoReply(dest);
    if(reply.ok){
      log(`ping ${destIp} → SUCCESS · direct LAN A`);
      state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
    }else{
      log(`ping ${destIp} → FAIL · ${reply.stage}`);
      state.last={ok:false,stage:reply.stage};recordFailure();
    }
    resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const toR2=await animateLinks(["pc1sw1","sw1r2"]);
  if(toR2.ok)markRequest(["pc1sw1","sw1r2"]);
  if(!toR2.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toR2.key].label} DOWN`,"ICMP Echo Request가 R2까지 도달하지 못했습니다.","error");
    state.last={ok:false,stage:"link",link:toR2.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }
  addPc1ToR2Snapshot(dest,firstHopMac);

  const route=routerRouteFor(destIp);
  await showRouteLookup(destIp,route);
  if(!route){
    setStep("s4","PING 실패 · R2 NO ROUTE","R2에 목적지 IPv4 주소와 매칭되는 UP 상태의 Connected Route가 없습니다.","error");
    setExplain(`R2의 eth0=${state.r2e0Ip}/${state.r2e0Mask}, eth1=${state.r2e1Ip}/${state.r2e1Mask}와 목적지 ${destIp}을 비교하세요. 이 Simulator에는 Static Route가 없습니다.`,"error");
    log(`ping ${destIp} → FAIL · R2 no connected route`);
    state.last={ok:false,stage:"route"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const forwardNeighbor=await ensureRouterNeighbor(dest,route,"forward");
  if(!forwardNeighbor.ok){
    setStep("s4","PING 실패 · R2 Neighbor Resolution","R2가 출력 링크에서 목적지 Host MAC을 확인하지 못했습니다.","error");
    setExplain(`<b>R2 출력 ARP 실패:</b> Route는 ${route.network} → ${route.egress}을 선택했지만 LAN ${route.segment}에서 ${dest.ip}에 대한 Neighbor Resolution을 완료하지 못했습니다.`,"error");
    log(`ping ${destIp} → FAIL · R2 neighbor resolution`);
    state.last={ok:false,stage:"r2-arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  addR2ToDestinationSnapshot(dest,route);
  setLiveEvent("icmp",`R2 → ${dest.name} · 새 Ethernet Frame`,
    `R2가 ${route.egress} 출력 링크용 새 Ethernet Frame으로 재캡슐화하고 TTL을 ${SIM_INITIAL_TTL}→${SIM_INITIAL_TTL-1}로 감소시킵니다.`);
  const toDest=await animateR2ToDestination(route,dest);
  if(!toDest.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toDest.key]?.label||toDest.key} DOWN`,"R2는 Route와 Neighbor 정보를 알고 있지만 실제 Frame 전달이 중단됐습니다.","error");
    state.last={ok:false,stage:"link",link:toDest.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const reply=await completeEchoReply(dest);
  if(reply.ok){
    log(`ping ${destIp} → SUCCESS · routed via ${state.gw}`);
    state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
  }else{
    log(`ping ${destIp} → FAIL · ${reply.stage}`);
    state.last={ok:false,stage:reply.stage};recordFailure();
  }
  resetPacket();$("#pingBtn").disabled=false;state.busy=false;
}
