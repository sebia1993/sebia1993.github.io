function configureLesson(i){
  state.lesson=i;
  state.pc1Ip=GOOD.pc1Ip;state.mask=GOOD.pc1Mask;state.gw=GOOD.pc1Gw;
  state.pc3Ip=GOOD.pc3Ip;state.pc3Mask=GOOD.pc3Mask;state.pc3Gw=GOOD.pc3Gw;
  state.pc2Ip=GOOD.pc2Ip;state.pc2Mask=GOOD.pc2Mask;state.pc2Gw=GOOD.pc2Gw;
  state.r2e0Ip=GOOD.r2e0Ip;state.r2e0Mask=GOOD.r2e0Mask;state.eth0=true;
  state.r2e1Ip=GOOD.r2e1Ip;state.r2e1Mask=GOOD.r2e1Mask;state.eth1=true;
  state.cables={pc1sw1:true,sw1pc3:true,sw1r2:true,r2sw2:true,sw2pc2:true};
  clearAllNeighborCaches();state.last=null;state.failureSeen[i]=false;resetHint();
  const l=lessons[i];
  if(l.type==="gw")state.gw="192.168.10.254";
  if(l.type==="mask")state.mask=16;
  if(l.type==="link")state.eth0=false;
  chooseDest(l.dest);renderState();renderArp();resetFlow();resetPacketStudy();resetPacket();
  $("#deviceDrawer").classList.remove("show");state.openDevice=null;
  $("#coachIcon").textContent=i+1;$("#coachTitle").textContent=l.title;$("#coachText").textContent=l.text;
  $("#recoveryNudge").classList.remove("show");$("#recoveryNudge").innerHTML="";
  $$(".lesson-tab").forEach((b,idx)=>b.classList.toggle("active",idx===i));
  $("#advancedNote").innerHTML=(i<2?
    "토폴로지 장비의 ⚙ 설정을 눌러 주소를 바꿀 수 있습니다. 다음 PING에서는 PC1의 on-link 판단, Gateway 유효성, R2 Connected Route와 PC1·PC2·PC3·R2의 독립 Neighbor Cache를 사용합니다. Reply 방향에서도 Cache가 없으면 ARP Request/Reply를 수행합니다. ":
    "<b>복구 목표:</b> 장애를 재현한 뒤 토폴로지 장비 설정을 직접 수정하고 다시 PING하여 성공시키세요. ")+
    "<b>지원 범위:</b> IPv4/Ethernet · R2 Connected Route · LAN A/B는 각각 하나의 L2 Broadcast Domain(VLAN 미사용). PC1/PC2/PC3는 End Host이며 IP forwarding을 하지 않습니다. Switch MAC learning·Unknown Unicast·VLAN/Trunk·STP, Proxy ARP·Static Route·NAT·동적 라우팅, ICMP Redirect·Destination Unreachable·Time Exceeded, ARP aging/state transition은 모델링하지 않습니다.";
  setExplain(i===0?"먼저 <b>PC3</b>가 선택된 상태에서 <b>PING 보내기</b>를 눌러보세요.":
             i===1?"이번에는 <b>PC2</b>로 PING을 보내 Gateway를 거치는지 확인하세요.":
             "먼저 <b>PING 보내기</b>로 장애를 재현하세요. 이후 해당 장비의 ⚙ 설정에서 실제 값을 수정할 수 있습니다.",
             i===1?"remote":i>=2?"error":"same");
  renderLessonStatus();
  log(`--- Lesson ${i+1}: ${l.title} ---`);
}
function runCmd(c){
  const cmd=c.trim();if(!cmd)return;log(`PC1> ${cmd}`);
  const p=cmd.split(/\s+/);
  const showCache=(key,label)=>{
    const cache=neighborCacheFor(key),rows=Object.entries(cache||{});
    log(rows.length?`${label} Neighbor Table\n`+rows.map(x=>x.join("  ")).join("\n"):`${label} Neighbor Table empty`);
  };
  if(cmd==="show ip")log(`PC1 ${state.pc1Ip}/${state.mask}\nGATEWAY ${state.gw}`);
  else if(p[0]==="show"&&p[1]==="arp"){
    const key=(p[2]||"pc1").toLowerCase();
    if(["pc1","pc2","pc3","r2"].includes(key))showCache(key,key.toUpperCase());
    else log("사용법: show arp [pc1|pc2|pc3|r2]");
  }
  else if(cmd==="show r2")log(`eth0 ${state.r2e0Ip}/${state.r2e0Mask} ${state.eth0?"UP":"DOWN"}\neth1 ${state.r2e1Ip}/${state.r2e1Mask} ${state.eth1?"UP":"DOWN"}`);
  else if(cmd==="show pc2")log(`PC2 ${state.pc2Ip}/${state.pc2Mask}\nGATEWAY ${state.pc2Gw}`);
  else if(cmd==="show pc3")log(`PC3 ${state.pc3Ip}/${state.pc3Mask}\nGATEWAY ${state.pc3Gw}`);
  else if(p[0]==="clear"&&p[1]==="arp"){
    const key=(p[2]||"pc1").toLowerCase();
    if(key==="all"){clearAllNeighborCaches();renderArp();log("ALL Neighbor caches cleared");}
    else if(["pc1","pc2","pc3","r2"].includes(key)){clearNeighborCache(key);renderArp();log(`${key.toUpperCase()} Neighbor cache cleared`);}
    else log("사용법: clear arp [pc1|pc2|pc3|r2|all]");
  }
  else if(p[0]==="ping"&&p[1]){
    if(p[1]===state.pc3Ip)chooseDest("pc3");
    else if(p[1]===state.pc2Ip)chooseDest("pc2");
    else {log(`현재 실습 목적지: PC3 ${state.pc3Ip}, PC2 ${state.pc2Ip}`);return}
    ping();
  }
  else log("지원 명령: show ip | show arp [pc1|pc2|pc3|r2] | show r2 | show pc2 | show pc3 | clear arp [대상|all] | ping <PC2/PC3 IP>");
}
function isAdvancedMode(){return document.body.dataset.simMode==="advanced"}
function setViewMode(mode,{openPanel=false,scroll=false}={}){
  const next=mode==="advanced"?"advanced":"basic";
  document.body.dataset.simMode=next;
  const advanced=next==="advanced";
  $$("[data-view-mode]").forEach(btn=>{
    const active=btn.dataset.viewMode===next;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",String(active));
  });
  const summary=$("#viewModeSummary");
  if(summary){
    summary.textContent=advanced
      ?"고급 모드 · 패킷 상세, 독립 Neighbor Table, 장비 설정과 링크 조작을 확인할 수 있습니다."
      :"기본 모드 · 처음에는 목적지 판단 → ARP 대상 → Ethernet 전달 → 결과의 핵심 흐름에 집중합니다.";
  }
  if(!advanced){
    $("#deviceDrawer")?.classList.remove("show");
    state.openDevice=null;
    if($("#advancedPanel"))$("#advancedPanel").open=false;
    if($("#packetStudyPanel"))$("#packetStudyPanel").open=false;
  }else if(openPanel){
    const panel=$("#advancedPanel");
    if(panel){
      panel.open=true;
      if(scroll)setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),20);
    }
  }
  $$("[data-m-device],[data-m-link]").forEach(el=>el.setAttribute("aria-disabled",String(!advanced)));
}
window.setArpViewMode=setViewMode;

$$(".lesson-tab").forEach((b,i)=>b.onclick=()=>configureLesson(i));
$$(".dest-btn").forEach(b=>b.onclick=()=>chooseDest(b.dataset.dest));
$$(".device-config-hit").forEach(x=>x.onclick=()=>{if(isAdvancedMode())openDeviceConfig(x.dataset.device)});
$$(".link-badge").forEach(x=>x.onclick=(e)=>{e.stopPropagation();if(isAdvancedMode())toggleCable(x.dataset.link)});
const PATH_TO_LINK={pathPc1Sw1:"pc1sw1",pathPc3Sw1:"sw1pc3",pathSw1R2:"sw1r2",pathR2Sw2:"r2sw2",pathSw2Pc2:"sw2pc2"};
Object.entries(PATH_TO_LINK).forEach(([id,key])=>{
  $("#"+id).onclick=(e)=>{e.stopPropagation();if(isAdvancedMode())toggleCable(key)};
});
$$('[data-cable]').forEach(x=>x.onclick=()=>{if(isAdvancedMode())toggleCable(x.dataset.cable)});
$$('[data-open-device]').forEach(x=>x.onclick=()=>{if(isAdvancedMode())openDeviceConfig(x.dataset.openDevice)});
$("#drawerClose").onclick=()=>{$("#deviceDrawer").classList.remove("show");state.openDevice=null};
$("#pingBtn").onclick=ping;
$("#hintBtn").onclick=showHint;
$("#nextBtn").onclick=()=>{
  if(!state.completed[state.lesson])return;
  if(state.lesson<lessons.length-1)configureLesson(state.lesson+1);
  else $("#courseComplete").scrollIntoView({behavior:"smooth",block:"center"});
};
$("#resetBtn").onclick=()=>configureLesson(state.lesson);
$("#applyBtn").onclick=()=>{
  const nextMask=+$("#maskInput").value,nextGw=$("#gwInput").value.trim();
  if(!isUsableInterfaceIp(state.pc1Ip,nextMask)){alert("현재 PC1 IP는 선택한 Prefix에서 Network/Broadcast 주소가 되어 사용할 수 없습니다.");return}
  if(!isUsableInterfaceIp(nextGw,nextMask)){alert("Gateway는 선택한 Prefix 기준으로 Network/Broadcast가 아닌 사용 가능한 unicast host 주소여야 합니다.");return}
  state.mask=nextMask;state.gw=nextGw;
  clearAllNeighborCaches();state.last=null;resetPacketStudy();renderState();renderArp();
  log(`PC1 빠른 설정 적용: ${state.pc1Ip}/${state.mask}, GW ${state.gw}`);renderLessonStatus()
};
$("#ethBtn").onclick=()=>{state.eth0=!state.eth0;state.last=null;renderState();log(`R2 eth0 → ${state.eth0?"UP":"DOWN"}`);renderLessonStatus()};
$("#clearArpBtn").onclick=()=>{clearNeighborCache("pc1");renderArp();log("PC1 Neighbor cache cleared")};
$$("[data-clear-neighbor]").forEach(btn=>btn.onclick=()=>{
  const key=btn.dataset.clearNeighbor;
  if(!["pc1","pc2","pc3","r2"].includes(key))return;
  clearNeighborCache(key);renderArp();log(`${key.toUpperCase()} Neighbor cache cleared`);
});
$$("[data-view-mode]").forEach(btn=>btn.onclick=()=>setViewMode(btn.dataset.viewMode));
document.addEventListener("click",e=>{
  const trigger=e.target.closest?.("[data-open-advanced-mode]");
  if(!trigger)return;
  setViewMode("advanced",{openPanel:true,scroll:true});
});
$("#termInput").onkeydown=e=>{if(e.key==="Enter"){const v=e.target.value;e.target.value="";runCmd(v)}};

setViewMode("basic");
configureLesson(0);

(function loadMobileSimulatorLayer(){
  const version="20260921-mode9";
  const css=document.createElement("link");
  css.rel="stylesheet";
  css.href=`arp-simulator-mobile.css?v=${version}`;
  document.head.appendChild(css);

  const followCss=document.createElement("link");
  followCss.rel="stylesheet";
  followCss.href=`arp-simulator-mobile-follow.css?v=${version}`;
  document.head.appendChild(followCss);

  const js=document.createElement("script");
  js.src=`arp-simulator-mobile.js?v=${version}`;
  js.async=false;
  js.onload=()=>{
    const polish=document.createElement("script");
    polish.src=`arp-simulator-mobile-polish.js?v=${version}`;
    polish.async=false;
    polish.onload=()=>{
      const follow=document.createElement("script");
      follow.src=`arp-simulator-mobile-follow-v2.js?v=${version}`;
      follow.async=false;
      document.body.appendChild(follow);
    };
    document.body.appendChild(polish);
  };
  document.body.appendChild(js);
})();
