async function ping(){
  if(state.busy)return;
  state.busy=true;resetFlow();resetPacketStudy();state.last=null;
  const dest=selectedDestination();
  const destIp=dest.ip;
  const onLink=sameSubnet(state.pc1Ip,destIp,state.mask);
  $("#pingBtn").disabled=true;
  $("#resultHint").textContent="현재 설정값으로 routing/ARP/packet 경로를 계산하고 있습니다.";

  setStep("s1",onLink?"ON-LINK · 직접 전달":"VIA GATEWAY · 원격 경로",
    onLink
      ?`PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}을 on-link로 판단합니다.`
      :`PC1 ${state.pc1Ip}/${state.mask} 기준 ${destIp}은 on-link가 아니므로 Default Gateway ${state.gw}를 사용합니다.`);
  setLiveEvent("route","PC1 · Routing 판단",
    onLink
      ?`${destIp}을 on-link로 판단했습니다. 목적지 자신의 MAC을 확인합니다.`
      :`${destIp}은 다른 IP network이므로 next-hop은 Default Gateway ${state.gw}입니다.`);
  await sleep(350);

  if(!onLink && !sameSubnet(state.pc1Ip,state.gw,state.mask)){
    setStep("s2","Gateway가 on-link가 아님",`PC1 ${state.pc1Ip}/${state.mask}에서 Gateway ${state.gw}는 직접 ARP할 수 있는 on-link 주소가 아닙니다.`,"error");
    setStep("s4","PING 실패","유효한 next-hop을 만들 수 없어 ARP/ICMP 전송을 시작하지 못했습니다.","error");
    setExplain(`<b>Gateway 설정 오류:</b> Default Gateway는 송신 Host가 자신의 Ethernet 구간에서 직접 도달할 수 있는 on-link 주소여야 합니다. 현재 PC1=${state.pc1Ip}/${state.mask}, Gateway=${state.gw}입니다.`,"error");
    log(`ping ${destIp} → FAIL · gateway ${state.gw} is not on-link`);
    state.last={ok:false,stage:"gateway-offlink"};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const arpTarget=onLink?destIp:state.gw;
  let firstHopMac=state.arp[arpTarget]||null;
  setStep("s2",firstHopMac?`ARP Cache HIT · ${arpTarget}`:`ARP → ${arpTarget}`,
    firstHopMac
      ?`PC1 Neighbor Table의 기존 IPv4→MAC 매핑 ${firstHopMac}을 재사용합니다.`
      :onLink?"목적지 Host의 MAC을 직접 확인합니다.":"설정된 Default Gateway의 MAC을 확인합니다.");

  if(!firstHopMac){
    addArpSnapshot(arpTarget,onLink);
    const targetKind=onLink
      ?(dest.key==="pc3"&&dest.segment==="A"?"pc3":"none")
      :(arpTarget===state.r2e0Ip?"r2":"none");
    const arpAnim=await animateArpBroadcast(targetKind);
    if(!arpAnim.ok){
      const interfaceDown=arpAnim.reason==="eth0"||arpAnim.reason==="eth1";
      setStep("s3",interfaceDown?"ARP Reply 불가 · Router Interface DOWN":`LINK DOWN · ${LINK_UI[arpAnim.key].label}`,
        interfaceDown
          ?"ARP Request는 LAN에 Broadcast되지만 해당 R2 인터페이스가 사용할 수 없어 Reply를 받지 못합니다."
          :`Physical link 문제로 필요한 ARP 교환을 완료하지 못했습니다. 원인: ${arpAnim.reason}`,"error");
      setStep("s4","PING 실패","next-hop MAC을 얻지 못해 IPv4 Packet을 Ethernet으로 전달할 수 없습니다.","error");
      setExplain(interfaceDown
        ?`<b>Interface DOWN:</b> PC1은 ${arpTarget}에 대한 ARP Request를 LAN A에 Broadcast했지만 R2 ${arpAnim.reason}가 DOWN이라 ARP Reply가 오지 않습니다.`
        :`<b>Physical Link 장애:</b> ${LINK_UI[arpAnim.key].label} 구간이 DOWN이라 ARP 교환이 완료되지 않습니다.`,"error");
      log(`ping ${destIp} → FAIL · ARP path ${LINK_UI[arpAnim.key].label} DOWN (${arpAnim.reason})`);
      state.last={ok:false,stage:"arp-link",link:arpAnim.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    let responder=null;
    if(onLink && dest.key==="pc3" && dest.segment==="A")responder={name:dest.name,mac:dest.mac,kind:"pc3"};
    if(!onLink && arpTarget===state.r2e0Ip && state.eth0)responder={name:"R2 eth0",mac:MAC.r2e0,kind:"r2"};
    if(!responder){
      setStep("s3","ARP Reply 없음",`${arpTarget}의 MAC 주소를 얻지 못했습니다.`,"error");
      setStep("s4","PING 실패","ARP/neighbor resolution 단계에서 중단되었습니다.","error");
      setLiveEvent("error","ARP Resolution 실패",`LAN A에서 ${arpTarget} IP를 가진 사용 가능한 장비가 Reply하지 않았습니다.`);
      let why;
      if(onLink && dest.segment!=="A"){
        why=`PC1의 Prefix /${state.mask} 때문에 물리적으로 LAN ${dest.segment}에 있는 ${dest.name}(${dest.ip})을 on-link로 판단해 LAN A에서 직접 ARP했습니다. ARP Broadcast는 Router를 넘어 다른 Broadcast Domain으로 전달되지 않습니다.`;
      }else if(!onLink && state.gw!==state.r2e0Ip){
        why=`PC1은 Gateway <b>${state.gw}</b>를 ARP하지만 이 학습 토폴로지의 LAN A Router 주소는 <b>${state.r2e0Ip}</b>입니다. 해당 IP를 소유한 Gateway가 없어 Reply가 없습니다.`;
      }else{
        why=`현재 LAN A에서 ${arpTarget}에 대한 ARP Reply를 받지 못했습니다. IP/Prefix/Gateway와 링크·인터페이스 상태를 확인하세요.`;
      }
      setExplain(`<b>실패 지점 · ARP</b><br>${why}`,"error");
      log(`ping ${destIp} → FAIL · ARP ${arpTarget} no reply`);
      state.last={ok:false,stage:"arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    addArpReplySnapshot(arpTarget,onLink,responder.name,responder.mac);
    setLiveEvent("reply",`${responder.name} · ARP Reply`,`${arpTarget}은 ${responder.mac}이라고 PC1에게 Unicast Reply합니다.`);
    const replyAnim=await animateReply(responder.kind==="pc3"?["pc3sw1","sw1pc1"]:["r2sw1","sw1pc1"]);
    if(!replyAnim.ok){
      setStep("s3","ARP Reply 경로 실패",`${LINK_UI[replyAnim.key].label}에서 Reply가 돌아오지 못했습니다.`,"error");
      setStep("s4","PING 실패","ARP Reply를 수신하지 못했습니다.","error");
      state.last={ok:false,stage:"arp-reply-link"};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    firstHopMac=responder.mac;
    state.arp[arpTarget]=firstHopMac;
    if(responder.kind==="r2")state.r2Arp[state.pc1Ip]=MAC.pc1;
    renderArp();
  }else{
    setLiveEvent("arp","PC1 · ARP Cache HIT",`${arpTarget} → ${firstHopMac} 매핑을 재사용합니다. 새 ARP Request는 발생하지 않습니다.`);
    await sleep(250);
  }

  setStep("s3",onLink?`Ethernet Dst → ${dest.name} MAC`:"Ethernet Dst → R2 eth0 MAC",
    onLink?`${firstHopMac}`:`${firstHopMac} · IPv4 Destination ${destIp}은 최종 Host를 유지`);

  if(onLink){
    addLocalIcmpSnapshot(dest,firstHopMac);
    setLiveEvent("icmp",`PC1 → ${dest.name} · ICMP Echo Request`,`PC1은 on-link 판단에 따라 ${dest.name} MAC ${firstHopMac}으로 직접 전송합니다.`);
    if(dest.segment!=="A"){
      setStep("s4","PING 실패 · 잘못된 on-link 판단",`${dest.name}은 실제로 LAN ${dest.segment}에 있어 LAN A의 직접 Frame을 받을 수 없습니다.`,"error");
      setExplain(`<b>Subnet/Prefix 오류:</b> PC1은 ${dest.ip}을 on-link라고 판단했지만 ${dest.name}은 물리적으로 LAN ${dest.segment}에 있습니다. 실제 LAN A에서 해당 IP의 ARP Reply가 없어야 하므로 이 상태는 앞 단계에서 정상적으로 실패해야 합니다.`,"error");
      state.last={ok:false,stage:"physical-segment"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    const localAnim=await animateLinks(["pc1sw1","sw1pc3"]);
    if(localAnim.ok)markRequest(["pc1sw1","sw1pc3"]);
    if(!localAnim.ok){
      setStep("s4",`PING 실패 · ${LINK_UI[localAnim.key].label} DOWN`,"ARP 이후 ICMP Echo Request가 링크에서 멈췄습니다.","error");
      setExplain(`<b>Link 장애:</b> ${LINK_UI[localAnim.key].label} 상태 때문에 Echo Request가 목적지까지 도달하지 못했습니다.`,"error");
      state.last={ok:false,stage:"link",link:localAnim.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
    }

    const destThinksPc1Local=sameSubnet(dest.ip,state.pc1Ip,dest.prefix);
    if(destThinksPc1Local){
      setStep("s4","PING 성공",`${dest.name}도 PC1을 on-link로 판단하여 직접 Echo Reply를 보냅니다.`);
      setExplain(`<b>성공:</b> PC1과 ${dest.name} 모두 상대를 on-link로 판단하며 실제로 같은 LAN A에 있습니다. 이 왕복에는 Default Gateway가 필요하지 않습니다.`);
      setLiveEvent("reply",`${dest.name} → PC1 · Echo Reply`,"같은 LAN A에서 직접 Reply를 돌려보냅니다.");
      const rr=await animateReply(["pc3sw1","sw1pc1"]);
      if(!rr.ok){
        setStep("s4","PING 실패 · Reply Link",`Echo Reply가 ${LINK_UI[rr.key].label}에서 중단됐습니다.`,"error");
        state.last={ok:false,stage:"reply-link"};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
      }
      log(`ping ${destIp} → SUCCESS · direct LAN A`);
      state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
    }else{
      const rif=routerInterfaceForSegment(dest.segment);
      const gwOnLink=sameSubnet(dest.ip,dest.gw,dest.prefix);
      if(!gwOnLink||dest.gw!==rif.ip||!rif.up){
        setStep("s4","PING 실패 · Reply Gateway",`${dest.name}는 PC1을 remote로 판단하지만 사용할 수 있는 Gateway가 없습니다.`,"error");
        setExplain(`<b>비대칭 Reply 실패:</b> 요청은 직접 도착했지만 ${dest.name}(${dest.ip}/${dest.prefix})은 PC1을 remote로 판단합니다. Gateway ${dest.gw}가 ${dest.name} 기준 on-link이며 R2 ${rif.name}(${rif.ip})와 일치하는지 확인하세요.`,"error");
        state.last={ok:false,stage:"reply-gateway"};recordFailure();
      }else{
        const returnRoute=routerRouteFor(state.pc1Ip);
        if(!returnRoute||returnRoute.segment!=="A"){
          setStep("s4","PING 실패 · Return Route","R2가 PC1이 실제 있는 LAN A로 돌아가는 Connected Route를 선택하지 못합니다.","error");
          setExplain("<b>Return Path 문제:</b> R2의 Connected Route와 PC1 주소/Prefix를 확인하세요.","error");
          state.last={ok:false,stage:"return-route"};recordFailure();
        }else{
          setStep("s4","PING 성공 · 비대칭 Reply",`${dest.name}는 Gateway ${dest.gw}를 통해 Reply하고 R2가 다시 LAN A의 PC1로 전달합니다.`);
          setExplain(`<b>비대칭 경로:</b> 요청은 PC1→${dest.name} 직접 전달, Reply는 ${dest.name}→R2→PC1로 전달됩니다. 설정이 달라도 통신이 성립할 수 있어 양쪽 Prefix/Gateway 확인이 중요합니다.`,"remote");
          const rr=await animateReply(["pc3sw1","sw1r2","r2sw1","sw1pc1"]);
          if(rr.ok){
            log(`ping ${destIp} → SUCCESS · asymmetric reply via ${dest.gw}`);
            state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
          }else{
            setStep("s4","PING 실패 · Reply Link",`Reply가 ${LINK_UI[rr.key].label}에서 중단됐습니다.`,"error");
            state.last={ok:false,stage:"reply-link"};recordFailure();
          }
        }
      }
    }
    resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const toR2=await animateLinks(["pc1sw1","sw1r2"]);
  if(toR2.ok)markRequest(["pc1sw1","sw1r2"]);
  if(!toR2.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toR2.key].label} DOWN`,"ICMP Echo Request가 R2까지 도달하지 못했습니다.","error");
    setExplain(`<b>Link 장애:</b> ${LINK_UI[toR2.key].label} 상태 때문에 ICMP Frame이 R2까지 도달하지 못했습니다.`,"error");
    state.last={ok:false,stage:"link",link:toR2.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }
  addPc1ToR2Snapshot(dest,firstHopMac);

  const route=routerRouteFor(destIp);
  await showRouteLookup(destIp,route);
  if(!route){
    setStep("s4","PING 실패 · R2 NO ROUTE","R2에 목적지 IP와 매칭되는 UP 상태의 Connected Route가 없습니다.","error");
    setExplain(`R2의 eth0=${state.r2e0Ip}/${state.r2e0Mask}, eth1=${state.r2e1Ip}/${state.r2e1Mask}와 목적지 ${destIp}을 비교하세요. 이 Simulator에는 Static Route가 없습니다.`,"error");
    log(`ping ${destIp} → FAIL · R2 no connected route`);
    state.last={ok:false,stage:"route"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  let destinationMac=state.r2Arp[destIp]||null;
  if(!destinationMac){
    addRouterArpRequestSnapshot(dest,route);
    const rArp=await animateRouterArp(route,dest);
    if(!rArp.ok){
      setStep("s4",`PING 실패 · ${LINK_UI[rArp.key].label} DOWN`,"R2의 출력 링크 ARP/neighbor resolution을 완료하지 못했습니다.","error");
      setExplain(`<b>R2 출력 링크 장애:</b> Route는 ${route.egress}을 선택했지만 ${LINK_UI[rArp.key].label} 때문에 next-hop MAC을 확인하지 못했습니다.`,"error");
      state.last={ok:false,stage:"r2-arp-link"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    if(!destinationIsOnPhysicalSegment(dest,route.segment)){
      setStep("s4","PING 실패 · R2 ARP Reply 없음",`R2는 LAN ${route.segment}에서 ${destIp}을 ARP했지만 해당 Physical Segment에 그 IP의 ${dest.name}가 없습니다.`,"error");
      setExplain(`<b>논리 Route와 물리 위치 불일치:</b> R2는 Destination IP 기준으로 ${route.network} → ${route.egress}을 선택했습니다. 그러나 선택한 ${dest.name}은 실제 LAN ${dest.segment}에 있으므로 LAN ${route.segment}의 ARP Request에 Reply하지 못합니다.`,"error");
      log(`ping ${destIp} → FAIL · R2 ARP no reply on LAN ${route.segment}`);
      state.last={ok:false,stage:"r2-arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    addRouterArpReplySnapshot(dest,route);
    setLiveEvent("reply",`${dest.name} → R2 · ARP Reply`,`${dest.ip} → ${dest.mac} 매핑을 R2가 학습합니다.`);
    const rReply=await animateRouterArpReply(route,dest);
    if(!rReply.ok){
      setStep("s4","PING 실패 · R2 ARP Reply 경로",`${LINK_UI[rReply.key].label}에서 ARP Reply가 중단됐습니다.`,"error");
      state.last={ok:false,stage:"r2-arp-reply"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
    destinationMac=dest.mac;state.r2Arp[destIp]=destinationMac;renderArp();
  }else{
    setLiveEvent("arp","R2 · ARP Cache HIT",`${destIp} → ${destinationMac} 매핑을 재사용합니다. R2는 새 ARP Request를 보내지 않습니다.`);
    await sleep(250);
  }

  addR2ToDestinationSnapshot(dest,route);
  setLiveEvent("icmp",`R2 → ${dest.name} · 새 Ethernet Frame`,
    `R2가 ${route.egress} 출력 링크용 새 Ethernet Frame으로 재캡슐화하고 TTL을 64→63으로 줄여 ${dest.name}에 전달합니다.`);
  const toDest=await animateR2ToDestination(route,dest);
  if(!toDest.ok){
    setStep("s4",`PING 실패 · ${LINK_UI[toDest.key].label} DOWN`,"R2는 Route와 MAC을 알고 있지만 실제 Frame 전달이 링크에서 중단됐습니다.","error");
    setExplain(`<b>Routing/ARP 판단은 완료</b>됐지만 ${LINK_UI[toDest.key].label} 상태 때문에 IPv4 Packet이 목적지까지 도달하지 못했습니다.`,"error");
    state.last={ok:false,stage:"link",link:toDest.key};recordFailure();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  const destThinksPc1Local=sameSubnet(dest.ip,state.pc1Ip,dest.prefix);
  if(destThinksPc1Local){
    if(dest.segment!=="A"){
      setStep("s4","PING 실패 · Reply ARP",`${dest.name}이 PC1(${state.pc1Ip})을 on-link로 오판하여 LAN ${dest.segment}에서 직접 ARP합니다.`,"error");
      setExplain(`<b>Echo Request는 ${dest.name}까지 도착했습니다.</b> 하지만 ${dest.name} Prefix /${dest.prefix} 때문에 PC1을 on-link로 판단합니다. PC1은 실제 LAN A에 있으므로 LAN ${dest.segment}의 ARP에는 Reply할 수 없습니다.`,"error");
      log(`ping ${destIp} → FAIL · destination treats PC1 as on-link on wrong LAN`);
      state.last={ok:false,stage:"reply-arp"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
  }else{
    const rif=routerInterfaceForSegment(dest.segment);
    const gwOnLink=sameSubnet(dest.ip,dest.gw,dest.prefix);
    if(!gwOnLink||dest.gw!==rif.ip||!rif.up){
      setStep("s4","PING 실패 · Destination Gateway",`Echo Request는 도착했지만 ${dest.name}이 Reply에 사용할 유효한 Gateway를 만들지 못합니다.`,"error");
      setLiveEvent("error",`${dest.name} · Reply 경로 실패`,`Gateway ${dest.gw}가 ${dest.name} 기준 on-link이고 R2 ${rif.name} ${rif.ip}와 일치하는지 확인하세요.`);
      setExplain(`<b>비대칭 장애:</b> ${dest.name}은 Reply를 Gateway로 보내야 하지만 현재 Gateway=${dest.gw}, R2 ${rif.name}=${rif.ip}입니다.`,"error");
      state.last={ok:false,stage:"reply-gateway"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
    }
  }

  const returnRoute=routerRouteFor(state.pc1Ip);
  if(!returnRoute||returnRoute.segment!=="A"){
    setStep("s4","PING 실패 · Return Route","R2가 PC1이 실제 연결된 LAN A로 Reply를 전달할 Connected Route를 선택하지 못합니다.","error");
    setExplain(`<b>Return Path 문제:</b> R2의 Connected Route와 PC1 ${state.pc1Ip}/${state.mask}를 확인하세요.`,"error");
    state.last={ok:false,stage:"return-route"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }

  let replyKeys;
  if(dest.segment==="B")replyKeys=["pc2sw2","sw2r2","r2sw1","sw1pc1"];
  else replyKeys=destThinksPc1Local?["pc3sw1","sw1pc1"]:["pc3sw1","sw1r2","r2sw1","sw1pc1"];
  setStep("s4","PING 성공",destThinksPc1Local
    ?`${dest.name}이 PC1을 on-link로 판단해 직접 Echo Reply를 반환합니다.`
    :`${dest.name}이 자신의 Gateway를 통해 Echo Reply를 보내고 R2가 LAN A의 PC1로 전달합니다.`);
  setExplain(destThinksPc1Local
    ?`<b>End-to-End 성공:</b> Request와 Reply가 모두 올바른 Physical Segment와 neighbor 정보를 사용했습니다.`
    :`<b>End-to-End 성공:</b> PC1의 Gateway, R2 Connected Route, ${dest.name}의 Reply Gateway가 모두 일관되어 왕복 경로가 성립했습니다.`,"remote");
  setLiveEvent("reply",`${dest.name} → PC1 · Echo Reply`,destThinksPc1Local?"같은 LAN A에서 직접 Reply합니다.":"Gateway와 R2를 통해 LAN A의 PC1로 Reply합니다.");
  const finalReply=await animateReply(replyKeys);
  if(!finalReply.ok){
    setStep("s4","PING 실패 · Reply Link",`Echo Reply가 ${LINK_UI[finalReply.key].label}에서 중단됐습니다.`,"error");
    state.last={ok:false,stage:"reply-link"};recordFailure();resetPacket();$("#pingBtn").disabled=false;state.busy=false;return;
  }
  log(`ping ${destIp} → SUCCESS · routed via ${state.gw}`);
  state.last={ok:true,stage:"done"};completeCurrentLessonIfReady();
  resetPacket();$("#pingBtn").disabled=false;state.busy=false;
}
