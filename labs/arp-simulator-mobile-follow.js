(() => {
  if (window.__arpMobileFollowLoaded) return;
  window.__arpMobileFollowLoaded = true;

  const mq=window.matchMedia("(max-width: 720px)");
  const mobile=document.querySelector("#mobileTopology");
  if(!mobile)return;

  let autoFollow=localStorage.getItem("arpMobileAutoFollow")!=="off";
  let userPauseUntil=0;
  let pauseTimer=null;
  let lastTarget=null;
  let lastFocusAt=0;

  const head=mobile.querySelector(".mt-head");
  const control=document.createElement("div");
  control.className="mobile-follow-control";
  control.innerHTML=`
    <div class="mobile-follow-left">
      <i class="mobile-follow-dot"></i>
      <div class="mobile-follow-text"><b>패킷 따라가기</b><span id="mobileFollowStatus">자동 이동 ON</span></div>
    </div>
    <button type="button" class="mobile-follow-toggle" id="mobileFollowToggle">ON</button>`;
  if(head)head.insertAdjacentElement("afterend",control);

  const status=control.querySelector("#mobileFollowStatus");
  const toggle=control.querySelector("#mobileFollowToggle");

  function setControlState(message){
    const paused=autoFollow && Date.now()<userPauseUntil;
    control.classList.toggle("off",!autoFollow);
    control.classList.toggle("paused",paused);
    toggle.textContent=autoFollow?"ON":"OFF";
    status.textContent=message || (!autoFollow?"자동 이동 꺼짐":paused?"수동 스크롤 감지 · 잠시 멈춤":"자동 이동 ON");
  }
  setControlState();

  function pauseForUser(){
    if(!mq.matches || !autoFollow || !state.busy)return;
    userPauseUntil=Date.now()+3200;
    setControlState();
    clearTimeout(pauseTimer);
    pauseTimer=setTimeout(()=>{
      if(autoFollow){userPauseUntil=0;setControlState("다음 패킷부터 자동 추적");}
    },3250);
  }
  window.addEventListener("touchmove",pauseForUser,{passive:true});
  window.addEventListener("wheel",pauseForUser,{passive:true});

  toggle.addEventListener("click",()=>{
    autoFollow=!autoFollow;
    localStorage.setItem("arpMobileAutoFollow",autoFollow?"on":"off");
    userPauseUntil=0;
    setControlState(autoFollow?"자동 이동 ON":"화면을 자유롭게 이동할 수 있습니다");
    if(autoFollow)focusForEvent(window.__arpLastMobileEvent||{kind:"ready",title:"",detail:""},true);
  });

  function visibleEnough(el){
    const r=el.getBoundingClientRect();
    const topSafe=96;
    const bottomSafe=window.innerHeight-108;
    return r.top>=topSafe && r.bottom<=bottomSafe;
  }
  function flash(el){
    if(!el)return;
    el.classList.remove("mobile-follow-focus");
    void el.offsetWidth;
    el.classList.add("mobile-follow-focus");
    setTimeout(()=>el.classList.remove("mobile-follow-focus"),750);
  }
  function focusElement(el,{force=false,label=""}={}){
    if(!mq.matches || !autoFollow || !el)return;
    if(document.body.classList.contains("mobile-sheet-open"))return;
    if(!force && Date.now()<userPauseUntil)return;
    const now=Date.now();
    if(el===lastTarget && now-lastFocusAt<500)return;
    lastTarget=el;lastFocusAt=now;
    if(visibleEnough(el)){flash(el);if(label)setControlState(label);return;}
    const r=el.getBoundingClientRect();
    const center=window.scrollY+r.top+r.height/2;
    const top=Math.max(0,center-window.innerHeight*.43);
    window.scrollTo({top,behavior:"smooth"});
    flash(el);
    if(label)setControlState(label);
  }
  function focusRegion(selectors,opts={}){
    const els=selectors.map(s=>mobile.querySelector(s)).filter(Boolean);
    if(!els.length)return;
    if(els.length===1){focusElement(els[0],opts);return;}
    const first=els[0],last=els[els.length-1];
    const a=first.getBoundingClientRect(),b=last.getBoundingClientRect();
    const unionTop=Math.min(a.top,b.top),unionBottom=Math.max(a.bottom,b.bottom);
    const fakeCenter=window.scrollY+(unionTop+unionBottom)/2;
    if(!opts.force && Date.now()<userPauseUntil)return;
    const topSafe=96,bottomSafe=window.innerHeight-108;
    if(unionTop>=topSafe && unionBottom<=bottomSafe){flash(last);if(opts.label)setControlState(opts.label);return;}
    window.scrollTo({top:Math.max(0,fakeCenter-window.innerHeight*.43),behavior:"smooth"});
    flash(last);if(opts.label)setControlState(opts.label);
  }

  function targetFromPoint(point){
    if(!point)return null;
    const [x,y]=point;
    const nodes=[
      [[140,239],"#mtPc1","PC1"],[[433,308],"#mtSw1","SW1"],[[140,426],"#mtPc3","PC3"],
      [[702,308],"#mtR2","R2"],[[1002,308],"#mtSw2","SW2"],[[1230,308],"#mtPc2","PC2"]
    ];
    let best=null,dist=Infinity;
    nodes.forEach(([p,sel,name])=>{const d=Math.hypot(x-p[0],y-p[1]);if(d<dist){dist=d;best={sel,name}}});
    return dist<95?best:null;
  }

  if(typeof move==="function"){
    const baseMove=move;
    move=async function(points){
      if(mq.matches && autoFollow && state.busy && Array.isArray(points) && points.length){
        const t=targetFromPoint(points[points.length-1]);
        if(t)focusElement(mobile.querySelector(t.sel),{label:`현재 위치 · ${t.name}`});
      }
      return baseMove(points);
    };
  }

  if(typeof showPacketStop==="function"){
    const baseStop=showPacketStop;
    showPacketStop=function(key,reason=""){
      const result=baseStop(key,reason);
      if(mq.matches && autoFollow){
        const map={pc1sw1:"[data-m-link='pc1sw1']",sw1pc3:"[data-m-link='sw1pc3']",sw1r2:"[data-m-link='sw1r2']",r2sw2:"[data-m-link='r2sw2']",sw2pc2:"[data-m-link='sw2pc2']"};
        const el=mobile.querySelector(map[key]);
        focusElement(el,{force:true,label:`장애 지점 · ${reason||"LINK DOWN"}`});
      }
      return result;
    };
  }

  function focusForEvent(evt,force=false){
    if(!mq.matches || !autoFollow || !evt)return;
    const title=evt.title||"",detail=evt.detail||"",kind=evt.kind||"";
    if(kind==="ready")return;
    if(title.includes("목적지 네트워크 판단"))return focusElement(mobile.querySelector("#mtPc1"),{force,label:"판단 중 · PC1"});
    if(title.includes("SW1 · ARP"))return focusRegion(["#mtSw1","#mtPc3"],{force,label:"ARP Broadcast · SW1"});
    if(title.includes("PC1 → PC3"))return focusRegion(["#mtSw1","#mtPc3"],{force,label:"ICMP · PC3 방향"});
    if(title.includes("PC1 → R2"))return focusRegion(["#mtSw1","#mtR2"],{force,label:"ICMP · R2 방향"});
    if(title.includes("R2 · Route Lookup"))return focusElement(mobile.querySelector("#mtR2"),{force,label:"Route Lookup · R2"});
    if(title.includes("R2 → PC2"))return focusRegion(["#mtSw2","#mtPc2"],{force,label:"ICMP · PC2 방향"});
    if(kind==="reply"&&title.includes("PC3"))return focusRegion(["#mtSw1","#mtPc1"],{force,label:"Reply · PC1로 복귀"});
    if(kind==="reply"&&title.includes("PC2"))return focusElement(mobile.querySelector("#mtPc2"),{force,label:"Reply 시작 · PC2"});
    if(kind==="error"){
      const pairs=[["PC1↔SW1","pc1sw1"],["SW1↔PC3","sw1pc3"],["SW1↔R2","sw1r2"],["R2↔SW2","r2sw2"],["SW2↔PC2","sw2pc2"]];
      for(const [label,key] of pairs){if((title+" "+detail).includes(label))return focusElement(mobile.querySelector(`[data-m-link='${key}']`),{force:true,label:`장애 · ${label}`});}
      if(title.includes("PC2")||detail.includes("PC2"))return focusElement(mobile.querySelector("#mtPc2"),{force:true,label:"장애 · PC2"});
      if(title.includes("R2")||detail.includes("R2"))return focusElement(mobile.querySelector("#mtR2"),{force:true,label:"장애 · R2"});
      return focusElement(mobile.querySelector("#mtPc1"),{force:true,label:"장애 원인 확인"});
    }
  }

  if(typeof setLiveEvent==="function"){
    const baseSetLiveEvent=setLiveEvent;
    setLiveEvent=function(kind,title,detail){
      window.__arpLastMobileEvent={kind,title,detail};
      const result=baseSetLiveEvent(kind,title,detail);
      setTimeout(()=>focusForEvent(window.__arpLastMobileEvent,kind==="error"),90);
      return result;
    };
  }

  mq.addEventListener?.("change",()=>{if(!mq.matches)setControlState();});
})();