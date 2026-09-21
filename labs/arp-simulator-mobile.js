(function(){
  const mq=window.matchMedia("(max-width: 720px)");
  const mount=document.querySelector("#topologyMount");
  if(!mount)return;

  const mobile=document.createElement("div");
  mobile.id="mobileTopology";
  mobile.className="mobile-topology";
  mobile.innerHTML=`
    <div class="mt-head">
      <strong>모바일 토폴로지</strong>
      <span id="mtDest" class="mt-dest">PC3 · ON-LINK</span>
    </div>
    <div class="mt-direction-note"><b>초록</b> = 요청 방향 · <b>파랑</b> = 응답 방향 · ARP/ICMP 프로토콜 색상 구분이 아닙니다.</div>

    <section class="mt-zone">
      <div class="mt-zone-title"><span>LAN A · SW1 SIDE</span><span id="mtLanANet">R2 eth0</span></div>

      <article id="mtPc1" class="mt-device">
        <div class="mt-device-head">
          <div class="mt-device-name"><span class="mt-icon">PC</span>PC1</div>
          <div class="mt-device-actions"><button class="mt-mini-btn" data-m-device="pc1">⚙ 설정</button></div>
        </div>
        <div class="mt-info">
          <div class="mt-kv"><b>IP / PREFIX</b><span id="mtPc1Ip">—</span></div>
          <div class="mt-kv" id="mtPc1GwBox"><b>GATEWAY</b><span id="mtPc1Gw">—</span></div>
          <div class="mt-kv full"><b>CALCULATED NETWORK</b><span id="mtPc1Net">—</span></div>
          <div class="mt-kv full" id="mtDecisionBox"><b>현재 목적지 판단</b><span id="mtPc1Decision">—</span></div>
        </div>
      </article>

      <button class="mt-link" data-m-link="pc1sw1" aria-label="PC1 SW1 링크 상태 변경"><i class="mt-break">×</i><span class="mt-link-status"></span></button>

      <div id="mtSw1" class="mt-switch">SW1 · Ethernet Switch</div>

      <div class="mt-branch">
        <div class="mt-branch-row">
          <button class="mt-branch-elbow" data-m-link="sw1pc3" aria-label="SW1 PC3 링크 상태 변경"></button>
          <article id="mtPc3" class="mt-device">
            <div class="mt-device-head">
              <div class="mt-device-name"><span class="mt-icon">PC</span>PC3</div>
              <div class="mt-device-actions">
                <button class="mt-mini-btn select" data-m-dest="pc3">목적지</button>
                <button class="mt-mini-btn" data-m-device="pc3">⚙</button>
              </div>
            </div>
            <div class="mt-info">
              <div class="mt-kv"><b>IP / PREFIX</b><span id="mtPc3Ip">—</span></div>
              <div class="mt-kv" id="mtPc3GwBox"><b>GATEWAY</b><span id="mtPc3Gw">—</span></div>
              <div class="mt-kv full"><b>NETWORK</b><span id="mtPc3Net">—</span></div>
            </div>
          </article>
        </div>
        <div class="mt-branch-note">PC3는 SW1의 다른 포트에 연결된 같은 LAN의 호스트입니다.</div>
      </div>

      <button class="mt-link mt-main-after-branch" data-m-link="sw1r2" aria-label="SW1 R2 링크 상태 변경"><i class="mt-break">×</i><span class="mt-link-status"></span></button>
    </section>

    <article id="mtR2" class="mt-device mt-router">
      <div class="mt-device-head">
        <div class="mt-device-name"><span class="mt-icon">R</span>R2 · Router</div>
        <div class="mt-device-actions"><button class="mt-mini-btn" data-m-device="r2">⚙ 설정</button></div>
      </div>
      <div class="mt-info">
        <div class="mt-if"><div><b>eth0 · LAN A</b><span id="mtR2e0">—</span></div><div class="mt-if-state"><i id="mtR2e0Led" class="mt-led"></i><b id="mtR2e0State">UP</b></div></div>
        <div class="mt-if"><div><b>eth1 · LAN B</b><span id="mtR2e1">—</span></div><div class="mt-if-state"><i id="mtR2e1Led" class="mt-led"></i><b id="mtR2e1State">UP</b></div></div>
      </div>
    </article>

    <button class="mt-link" data-m-link="r2sw2" aria-label="R2 SW2 링크 상태 변경"><i class="mt-break">×</i><span class="mt-link-status"></span></button>

    <section class="mt-zone lan-b">
      <div class="mt-zone-title"><span>LAN B · SW2 SIDE</span><span id="mtLanBNet">R2 eth1</span></div>
      <div id="mtSw2" class="mt-switch">SW2 · Ethernet Switch</div>
      <button class="mt-link" data-m-link="sw2pc2" aria-label="SW2 PC2 링크 상태 변경"><i class="mt-break">×</i><span class="mt-link-status"></span></button>

      <article id="mtPc2" class="mt-device">
        <div class="mt-device-head">
          <div class="mt-device-name"><span class="mt-icon">PC</span>PC2</div>
          <div class="mt-device-actions">
            <button class="mt-mini-btn select" data-m-dest="pc2">목적지</button>
            <button class="mt-mini-btn" data-m-device="pc2">⚙</button>
          </div>
        </div>
        <div class="mt-info">
          <div class="mt-kv"><b>IP / PREFIX</b><span id="mtPc2Ip">—</span></div>
          <div class="mt-kv" id="mtPc2GwBox"><b>GATEWAY</b><span id="mtPc2Gw">—</span></div>
          <div class="mt-kv full"><b>NETWORK</b><span id="mtPc2Net">—</span></div>
        </div>
      </article>
    </section>

    <div class="mt-event-mini">
      <b id="mtEventTitle">패킷 이벤트 대기</b>
      <span id="mtEventDetail">PING을 보내면 현재 처리 단계가 토폴로지에 강조됩니다.</span>
    </div>
  `;
  mount.appendChild(mobile);

  const backdrop=document.createElement("div");
  backdrop.id="mobileSheetBackdrop";
  backdrop.className="mobile-sheet-backdrop";
  document.body.appendChild(backdrop);

  const $m=(s)=>mobile.querySelector(s);
  const $$m=(s)=>[...mobile.querySelectorAll(s)];
  let lastEvent={kind:"ready",title:"패킷 이벤트 대기",detail:"PING을 보내면 현재 처리 단계가 토폴로지에 강조됩니다."};

  function gwOk(ip,prefix,gw,routerIp){
    try{return isValidIp(gw)&&sameSubnet(ip,gw,prefix)&&gw===routerIp}catch(e){return false}
  }
  function setText(id,value){const e=$m(id);if(e)e.textContent=value}
  function clearActivity(){
    $$m(".active,.reply-active,.error-active").forEach(e=>e.classList.remove("active","reply-active","error-active"));
    $$m(".mt-link.reply").forEach(e=>e.classList.remove("reply"));
  }
  function linkState(key,el){
    if(!el)return;
    const cableUp=!!state.cables[key];
    const ifDown=cableUp&&((key==="sw1r2"&&!state.eth0)||(key==="r2sw2"&&!state.eth1));
    el.classList.toggle("down",!cableUp);
    el.classList.toggle("ifdown",ifDown);
    const st=el.querySelector(".mt-link-status");
    if(st)st.textContent=!cableUp?"CABLE DOWN":ifDown?(key==="sw1r2"?"eth0 DOWN":"eth1 DOWN"):"";
  }
  function syncLinks(){
    $$m("[data-m-link]").forEach(el=>linkState(el.dataset.mLink,el));
  }
  function syncTopology(){
    setText("#mtPc1Ip",`${state.pc1Ip}/${state.mask}`);
    setText("#mtPc1Gw",state.gw);
    setText("#mtPc1Net",networkAddress(state.pc1Ip,state.mask));
    setText("#mtPc3Ip",`${state.pc3Ip}/${state.pc3Mask}`);
    setText("#mtPc3Gw",state.pc3Gw);
    setText("#mtPc3Net",networkAddress(state.pc3Ip,state.pc3Mask));
    setText("#mtPc2Ip",`${state.pc2Ip}/${state.pc2Mask}`);
    setText("#mtPc2Gw",state.pc2Gw);
    setText("#mtPc2Net",networkAddress(state.pc2Ip,state.pc2Mask));
    setText("#mtR2e0",`${state.r2e0Ip}/${state.r2e0Mask} · ${networkAddress(state.r2e0Ip,state.r2e0Mask)}`);
    setText("#mtR2e1",`${state.r2e1Ip}/${state.r2e1Mask} · ${networkAddress(state.r2e1Ip,state.r2e1Mask)}`);
    setText("#mtR2e0State",state.eth0?"UP":"DOWN");
    setText("#mtR2e1State",state.eth1?"UP":"DOWN");
    setText("#mtLanANet",networkAddress(state.r2e0Ip,state.r2e0Mask));
    setText("#mtLanBNet",networkAddress(state.r2e1Ip,state.r2e1Mask));
    $m("#mtR2e0Led").classList.toggle("down",!state.eth0);
    $m("#mtR2e1Led").classList.toggle("down",!state.eth1);

    const target=state.dest==="pc3"?state.pc3Ip:state.pc2Ip;
    const local=sameSubnet(state.pc1Ip,target,state.mask);
    setText("#mtPc1Decision",`${state.dest.toUpperCase()} ${target} → ${local?"ON-LINK":"VIA GATEWAY"}`);
    const destBadge=$m("#mtDest");
    destBadge.textContent=`${state.dest.toUpperCase()} · ${local?"ON-LINK":"VIA GATEWAY"}`;
    destBadge.classList.toggle("remote",!local);
    $m("#mtDecisionBox").classList.toggle("warn",state.dest==="pc2"&&local);

    $m("#mtPc1GwBox").classList.toggle("bad",!gwOk(state.pc1Ip,state.mask,state.gw,state.r2e0Ip));
    $m("#mtPc3GwBox").classList.toggle("bad",!gwOk(state.pc3Ip,state.pc3Mask,state.pc3Gw,state.r2e0Ip));
    $m("#mtPc2GwBox").classList.toggle("bad",!gwOk(state.pc2Ip,state.pc2Mask,state.pc2Gw,state.r2e1Ip));

    $m("#mtPc3").classList.toggle("dest-selected",state.dest==="pc3");
    $m("#mtPc2").classList.toggle("dest-selected",state.dest==="pc2");
    $$m("[data-m-dest]").forEach(b=>{
      const on=b.dataset.mDest===state.dest;
      b.classList.toggle("on",on);
      b.textContent=on?"✓ 목적지":"목적지";
    });
    syncLinks();
    syncEventVisual();
  }
  function markDevices(ids,cls="active"){ids.forEach(id=>{const e=$m("#"+id);if(e)e.classList.add(cls)})}
  function markLinks(keys,reply=false){
    keys.forEach(key=>{
      const el=$m(`[data-m-link="${key}"]`);
      if(el){el.classList.add("active");if(reply)el.classList.add("reply")}
    });
  }
  function syncEventVisual(){
    clearActivity();
    const {kind,title,detail}=lastEvent;
    setText("#mtEventTitle",title);
    setText("#mtEventDetail",detail);

    if(kind==="ready")return;
    if(title.includes("목적지 네트워크 판단")){
      markDevices(["mtPc1"]);
    }else if(title.includes("SW1 · ARP")){
      markDevices(["mtPc1","mtSw1"]);
      markLinks(["pc1sw1","sw1pc3","sw1r2"]);
    }else if(title.includes("PC1 → PC3")){
      markDevices(["mtPc1","mtSw1","mtPc3"]);markLinks(["pc1sw1","sw1pc3"]);
    }else if(title.includes("PC1 → R2")){
      markDevices(["mtPc1","mtSw1","mtR2"]);markLinks(["pc1sw1","sw1r2"]);
    }else if(title.includes("R2 · Route Lookup")){
      markDevices(["mtR2"]);
    }else if(title.includes("R2 → PC2")){
      markDevices(["mtR2","mtSw2","mtPc2"]);markLinks(["r2sw2","sw2pc2"]);
    }else if(title.includes("R2 → PC3")){
      markDevices(["mtR2","mtSw1","mtPc3"]);markLinks(["sw1r2","sw1pc3"]);
    }else if(kind==="reply"&&title.includes("ARP Reply")){
      if(title.startsWith("PC3 → PC1")){
        markDevices(["mtPc3","mtSw1","mtPc1"],"reply-active");markLinks(["sw1pc3","pc1sw1"],true);
      }else if(title.startsWith("PC3 → R2")){
        markDevices(["mtPc3","mtSw1","mtR2"],"reply-active");markLinks(["sw1pc3","sw1r2"],true);
      }else if(title.startsWith("PC2 → R2")){
        markDevices(["mtPc2","mtSw2","mtR2"],"reply-active");markLinks(["sw2pc2","r2sw2"],true);
      }else if(title.startsWith("R2")&&title.includes("→ PC3")){
        markDevices(["mtR2","mtSw1","mtPc3"],"reply-active");markLinks(["sw1r2","sw1pc3"],true);
      }else if(title.startsWith("R2")&&title.includes("→ PC2")){
        markDevices(["mtR2","mtSw2","mtPc2"],"reply-active");markLinks(["r2sw2","sw2pc2"],true);
      }else if(title.startsWith("R2")&&title.includes("→ PC1")){
        markDevices(["mtR2","mtSw1","mtPc1"],"reply-active");markLinks(["sw1r2","pc1sw1"],true);
      }
    }else if(kind==="reply"&&title.includes("Echo Reply")){
      if(title.startsWith("PC3 → PC1")){
        markDevices(["mtPc3","mtSw1","mtPc1"],"reply-active");markLinks(["sw1pc3","pc1sw1"],true);
      }else if(title.startsWith("PC3 → R2")){
        markDevices(["mtPc3","mtSw1","mtR2"],"reply-active");markLinks(["sw1pc3","sw1r2"],true);
      }else if(title.startsWith("PC2 → R2")){
        markDevices(["mtPc2","mtSw2","mtR2"],"reply-active");markLinks(["sw2pc2","r2sw2"],true);
      }else if(title.startsWith("R2 → PC1")){
        markDevices(["mtR2","mtSw1","mtPc1"],"reply-active");markLinks(["sw1r2","pc1sw1"],true);
      }
    }else if(kind==="error"){
      const map=[["PC1↔SW1","pc1sw1"],["SW1↔PC3","sw1pc3"],["SW1↔R2","sw1r2"],["R2↔SW2","r2sw2"],["SW2↔PC2","sw2pc2"]];
      let matched=false;
      map.forEach(([label,key])=>{
        if((title+" "+detail).includes(label)){
          const el=$m(`[data-m-link="${key}"]`);if(el)el.classList.add("active");
          matched=true;
        }
      });
      if(!matched)markDevices(["mtPc1"],"error-active");
    }
  }

  $$m("[data-m-device]").forEach(b=>b.addEventListener("click",()=>{if(typeof isAdvancedMode==="function"&&isAdvancedMode())openDeviceConfig(b.dataset.mDevice)}));
  $$m("[data-m-dest]").forEach(b=>b.addEventListener("click",()=>{chooseDest(b.dataset.mDest);syncTopology()}));
  $$m("[data-m-link]").forEach(b=>b.addEventListener("click",()=>{if(typeof isAdvancedMode==="function"&&isAdvancedMode()){toggleCable(b.dataset.mLink);syncTopology()}}));

  function closeSheet(){
    const d=document.querySelector("#deviceDrawer");
    if(d)d.classList.remove("show");
    state.openDevice=null;
    backdrop.classList.remove("show");
    document.body.classList.remove("mobile-sheet-open");
  }
  backdrop.addEventListener("click",closeSheet);
  const drawer=document.querySelector("#deviceDrawer");
  if(drawer){
    const obs=new MutationObserver(()=>{
      const shown=drawer.classList.contains("show")&&mq.matches;
      backdrop.classList.toggle("show",shown);
      document.body.classList.toggle("mobile-sheet-open",shown);
      if(shown)setTimeout(syncTopology,0);
    });
    obs.observe(drawer,{attributes:true,attributeFilter:["class"]});
  }
  const drawerClose=document.querySelector("#drawerClose");
  if(drawerClose)drawerClose.addEventListener("click",()=>{
    backdrop.classList.remove("show");document.body.classList.remove("mobile-sheet-open");
  });

  const baseRenderState=renderState;
  renderState=function(){baseRenderState();syncTopology()};

  const baseRenderLinks=renderLinks;
  renderLinks=function(){baseRenderLinks();syncLinks()};

  const baseSetLiveEvent=setLiveEvent;
  setLiveEvent=function(kind,title,detail){
    baseSetLiveEvent(kind,title,detail);
    lastEvent={kind,title,detail};
    syncEventVisual();
  };

  mq.addEventListener?.("change",()=>{syncTopology();if(!mq.matches)closeSheet()});
  $$m("[data-m-device],[data-m-link]").forEach(el=>el.setAttribute("aria-disabled",String(!(typeof isAdvancedMode==="function"&&isAdvancedMode()))));
  syncTopology();
})();
