async function moveSvgDot(id,points){
  const el=$("#"+id);el.classList.add("show");
  let prev=points[0];el.setAttribute("cx",prev[0]);el.setAttribute("cy",prev[1]);
  for(let i=1;i<points.length;i++){
    const start=prev,end=points[i],dur=360,steps=20;
    for(let s=1;s<=steps;s++){
      const t=s/steps,x=start[0]+(end[0]-start[0])*t,y=start[1]+(end[1]-start[1])*t;
      el.setAttribute("cx",x);el.setAttribute("cy",y);await sleep(dur/steps);
    }
    prev=end;
  }
  await sleep(100);el.classList.remove("show");
}
async function animateArpBroadcast(targetKind){
  hidePacketStop();
  setPacketVisual("request");
  if(!effectiveLinkUp("pc1sw1")){
    const reason=linkDownReason("pc1sw1");
    await move(partialPath(paths.pc1sw1,reason==="CABLE"?.48:.9));
    showPacketStop("pc1sw1",reason);
    return {ok:false,key:"pc1sw1",reason};
  }
  await move(paths.pc1sw1);markRequest(["pc1sw1"]);
  setLiveEvent("arp","SW1 · ARP Broadcast Flooding",
    `PC1의 ARP Request가 SW1에 도착했습니다. 스위치는 목적지 MAC이 Broadcast이므로 들어온 포트를 제외한 같은 LAN의 다른 포트로 복제해 보냅니다.`);
  const jobs=[];
  if(effectiveLinkUp("sw1pc3"))jobs.push(moveSvgDot("arpBranchPc3",paths.sw1pc3));
  if(effectiveLinkUp("sw1r2"))jobs.push(moveSvgDot("arpBranchR2",paths.sw1r2));
  await Promise.all(jobs);
  const targetLink=targetKind==="pc3"?"sw1pc3":"sw1r2";
  if(!effectiveLinkUp(targetLink)){
    const reason=linkDownReason(targetLink);
    showPacketStop(targetLink,reason);
    return {ok:false,key:targetLink,reason};
  }
  markRequest([targetLink]);
  return {ok:true};
}
async function animateReply(keys){
  setPacketVisual("reply");
  for(const key of keys){
    const route=key==="pc3sw1"?[...paths.sw1pc3].reverse():
                key==="pc2sw2"?[...paths.sw2pc2].reverse():
                key==="sw2r2"?[...paths.r2sw2].reverse():
                key==="r2sw1"?[...paths.sw1r2].reverse():
                key==="sw1pc1"?[...paths.pc1sw1].reverse():[];
    if(route.length)await move(route);
  }
  markReply(keys);
  setPacketVisual("request");
}
async function showRouteLookup(destIp,ok){
  setLiveEvent("route","R2 · Route Lookup",
    ok?`${destIp}가 ${networkAddress(state.r2e1Ip,state.r2e1Mask)}에 매칭되어 eth1으로 전달합니다.`:
       `${destIp}와 일치하는 Connected Route를 찾지 못했습니다.`);
  const card=$("#routeLookupCard");card.classList.add("show");
  $("#routeLookupDst").textContent=`Destination: ${destIp}`;
  const r1=$("#routeStep1"),r2=$("#routeStep2"),r3=$("#routeStep3");
  [r1,r2,r3].forEach(x=>x.classList.remove("fail"));
  if(ok){
    $("#routeLookupState").textContent="MATCH";
    $("#routeResult").textContent=`${networkAddress(state.r2e1Ip,state.r2e1Mask)} → eth1`;
    $("#routeTtl").textContent="64 → 63";
    $("#routeL2").textContent=`Src R2 eth1 → Dst PC2`;
  }else{
    $("#routeLookupState").textContent="NO ROUTE";
    $("#routeResult").textContent=`Connected route 없음`;r1.classList.add("fail");
    $("#routeTtl").textContent="전달 안 함";r2.classList.add("fail");
    $("#routeL2").textContent="새 Frame 생성 안 함";r3.classList.add("fail");
  }
  await sleep(1050);
  card.classList.remove("show");
}

function renderState(){
  $("#maskInput").value=state.mask;$("#gwInput").value=state.gw;
  $("#ethBtn").textContent="R2 eth0: "+(state.eth0?"UP":"DOWN");

  $("#pc1IpLabel").textContent=`${state.pc1Ip}/${state.mask}`;
  $("#pc3IpLabel").textContent=`${state.pc3Ip}/${state.pc3Mask}`;
  $("#pc2IpLabel").textContent=`${state.pc2Ip}/${state.pc2Mask}`;

  $("#pc1GwLabel").textContent=`GW ${state.gw}`;
  $("#pc3GwLabel").textContent=`GW ${state.pc3Gw}`;
  $("#pc2GwLabel").textContent=`GW ${state.pc2Gw}`;

  $("#pc1GwLabel").setAttribute("class","gateway-label "+(gatewayLooksValid(state.pc1Ip,state.mask,state.gw,state.r2e0Ip)?"ok":"bad"));
  $("#pc3GwLabel").setAttribute("class","gateway-label "+(gatewayLooksValid(state.pc3Ip,state.pc3Mask,state.pc3Gw,state.r2e0Ip)?"ok":"bad"));
  $("#pc2GwLabel").setAttribute("class","gateway-label "+(gatewayLooksValid(state.pc2Ip,state.pc2Mask,state.pc2Gw,state.r2e1Ip)?"ok":"bad"));

  $("#r2Eth0Label").textContent=`eth0  ${state.r2e0Ip}/${state.r2e0Mask} · ${state.eth0?"UP":"DOWN"}`;
  $("#r2Eth1Label").textContent=`eth1  ${state.r2e1Ip}/${state.r2e1Mask} · ${state.eth1?"UP":"DOWN"}`;
  $("#r2Eth0Label").setAttribute("fill",state.eth0?"#172b43":"#b93545");
  $("#r2Eth1Label").setAttribute("fill",state.eth1?"#172b43":"#b93545");

  $("#lanAGwSummary").textContent=`LAN A · R2 eth0 ${state.r2e0Ip}/${state.r2e0Mask} · ${state.eth0?"UP":"DOWN"}`;
  $("#lanBGwSummary").textContent=`LAN B · R2 eth1 ${state.r2e1Ip}/${state.r2e1Mask} · ${state.eth1?"UP":"DOWN"}`;

  $("#destPc3Ip").textContent=`${state.pc3Ip} · LAN A`;
  $("#destPc2Ip").textContent=`${state.pc2Ip} · LAN B`;

  $("#quickPc1").textContent=`${state.pc1Ip}/${state.mask} · GW ${state.gw}`;
  $("#quickPc3").textContent=`${state.pc3Ip}/${state.pc3Mask} · GW ${state.pc3Gw}`;
  $("#quickPc2").textContent=`${state.pc2Ip}/${state.pc2Mask} · GW ${state.pc2Gw}`;
  $("#quickR2").textContent=`eth0 ${state.r2e0Ip} ${state.eth0?"UP":"DOWN"} · eth1 ${state.r2e1Ip} ${state.eth1?"UP":"DOWN"}`;

  $("#pc1NetLabel").textContent=`NET ${networkAddress(state.pc1Ip,state.mask)}`;
  $("#pc3NetLabel").textContent=`NET ${networkAddress(state.pc3Ip,state.pc3Mask)}`;
  $("#pc2NetLabel").textContent=`NET ${networkAddress(state.pc2Ip,state.pc2Mask)}`;
  const pc1GwOk=sameSubnet(state.pc1Ip,state.gw,state.mask);
  const pc3GwOk=sameSubnet(state.pc3Ip,state.pc3Gw,state.pc3Mask);
  const pc2GwOk=sameSubnet(state.pc2Ip,state.pc2Gw,state.pc2Mask);
  $("#pc1LogicalChip").setAttribute("class","logical-chip "+(pc1GwOk?"":"bad"));
  $("#pc3LogicalChip").setAttribute("class","logical-chip "+(pc3GwOk?"":"bad"));
  $("#pc2LogicalChip").setAttribute("class","logical-chip "+(pc2GwOk?"":"bad"));

  const target=state.dest==="pc3"?state.pc3Ip:state.pc2Ip;
  const seesLocal=sameSubnet(state.pc1Ip,target,state.mask);
  $("#pc1DecisionLabel").textContent=`${state.dest.toUpperCase()} ${target} = ${seesLocal?"LOCAL":"REMOTE"}`;
  const suspicious=state.dest==="pc2"&&seesLocal;
  $("#pc1DecisionChip").setAttribute("class","logical-chip "+(suspicious?"warn":""));

  $("#r2Eth0NetLabel").textContent=`CONNECTED ${networkAddress(state.r2e0Ip,state.r2e0Mask)}`;
  $("#r2Eth1NetLabel").textContent=`CONNECTED ${networkAddress(state.r2e1Ip,state.r2e1Mask)}`;
  renderLinks();
}

function deviceFormField(label,id,value,type="text",options=null){
  if(type==="select"){
    return `<div class="device-form-field"><label>${label}</label><select id="${id}">${options.map(v=>`<option value="${v}" ${String(v)===String(value)?"selected":""}>/${v}</option>`).join("")}</select></div>`;
  }
  return `<div class="device-form-field"><label>${label}</label><input id="${id}" value="${value}"></div>`;
}
function openDeviceConfig(device){
  state.openDevice=device;
  const d=$("#deviceDrawer"), body=$("#drawerBody"), title=$("#drawerTitle");
  d.classList.add("show");
  const prefixes=[8,12,16,20,22,23,24,25,26,27,28,29,30];
  if(device==="pc1"||device==="pc2"||device==="pc3"){
    const name=device.toUpperCase();
    const ip=device==="pc1"?state.pc1Ip:device==="pc2"?state.pc2Ip:state.pc3Ip;
    const prefix=device==="pc1"?state.mask:device==="pc2"?state.pc2Mask:state.pc3Mask;
    const gw=device==="pc1"?state.gw:device==="pc2"?state.pc2Gw:state.pc3Gw;
    title.textContent=`${name} 네트워크 설정`;
    body.innerHTML=`
      <div class="device-form-grid">
        ${deviceFormField("IP ADDRESS","cfgIp",ip)}
        ${deviceFormField("PREFIX","cfgPrefix",prefix,"select",prefixes)}
        ${deviceFormField("DEFAULT GATEWAY","cfgGw",gw)}
      </div>
      <div class="drawer-help">
        <b>실시간 반영:</b> IP/Prefix/Gateway는 다음 PING에서 Local/Remote 판단, ARP 대상, Reply 경로 계산에 사용됩니다.
        특히 Gateway를 바꾸면 토폴로지의 <b>${name} 아래 GW 표시</b>도 즉시 바뀝니다.
      </div>
      <div class="drawer-actions"><button id="drawerResetDevice">기본값</button><button class="apply" id="drawerApply">이 설정 적용</button></div>`;
  }else if(device==="r2"){
    title.textContent="R2 Router 설정";
    body.innerHTML=`
      <div class="device-form-grid router">
        ${deviceFormField("ETH0 IP","cfgR2e0Ip",state.r2e0Ip)}
        ${deviceFormField("ETH0 PREFIX","cfgR2e0Mask",state.r2e0Mask,"select",[16,20,22,23,24,25,26,27,28,29,30])}
        ${deviceFormField("ETH1 IP","cfgR2e1Ip",state.r2e1Ip)}
        ${deviceFormField("ETH1 PREFIX","cfgR2e1Mask",state.r2e1Mask,"select",[16,20,22,23,24,25,26,27,28,29,30])}
      </div>
      <div class="action-bar" style="margin-top:10px">
        <button id="cfgEth0Btn" class="${state.eth0?"on":"off"}">eth0 ${state.eth0?"UP":"DOWN"}</button>
        <button id="cfgEth1Btn" class="${state.eth1?"on":"off"}">eth1 ${state.eth1?"UP":"DOWN"}</button>
      </div>
      <div class="drawer-help"><b>실시간 반영:</b> R2 인터페이스 주소·Prefix·UP/DOWN 상태는 Connected Network와 패킷 전달 경로에 바로 반영됩니다. Cable 자체의 상태는 Physical Link 설정에서 별도로 바꿀 수 있습니다.</div>
      <div class="drawer-actions"><button id="drawerResetDevice">기본값</button><button class="apply" id="drawerApply">이 설정 적용</button></div>`;
    $("#cfgEth0Btn").onclick=()=>{state.eth0=!state.eth0;openDeviceConfig("r2");renderState()};
    $("#cfgEth1Btn").onclick=()=>{state.eth1=!state.eth1;openDeviceConfig("r2");renderState()};
  }
  $("#drawerApply").onclick=applyDeviceConfig;
  $("#drawerResetDevice").onclick=resetOpenDevice;
  setTimeout(()=>d.scrollIntoView({behavior:"smooth",block:"nearest"}),20);
}
function resetOpenDevice(){
  const d=state.openDevice;
  if(d==="pc1"){state.pc1Ip=GOOD.pc1Ip;state.mask=GOOD.pc1Mask;state.gw=GOOD.pc1Gw}
  if(d==="pc3"){state.pc3Ip=GOOD.pc3Ip;state.pc3Mask=GOOD.pc3Mask;state.pc3Gw=GOOD.pc3Gw}
  if(d==="pc2"){state.pc2Ip=GOOD.pc2Ip;state.pc2Mask=GOOD.pc2Mask;state.pc2Gw=GOOD.pc2Gw}
  if(d==="r2"){
    state.r2e0Ip=GOOD.r2e0Ip;state.r2e0Mask=GOOD.r2e0Mask;state.r2e1Ip=GOOD.r2e1Ip;state.r2e1Mask=GOOD.r2e1Mask;
    state.eth0=true;state.eth1=true;
  }
  state.arp={};state.last=null;resetPacketStudy();renderArp();renderState();renderLessonStatus();
  log(`${d.toUpperCase()} 설정을 기본값으로 복원`);
  openDeviceConfig(d);
}
