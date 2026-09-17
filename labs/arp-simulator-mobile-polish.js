(() => {
  if (window.__arpMobilePolishLoaded) return;
  window.__arpMobilePolishLoaded = true;

  const hero=document.querySelector(".hero");
  const guide=document.querySelector(".start-guide");
  if(hero&&guide){
    const help=document.createElement("button");
    help.type="button";
    help.className="mobile-help-toggle";
    help.textContent="처음인가요? 사용 방법 보기";
    help.addEventListener("click",()=>{
      const open=guide.classList.toggle("mobile-expanded");
      help.textContent=open?"사용 방법 접기":"처음인가요? 사용 방법 보기";
    });
    hero.appendChild(help);
  }

  function syncPingLabel(){
    const btn=document.querySelector("#pingBtn");
    if(!btn)return;
    const name=state.dest==="pc3"?"PC3":"PC2";
    btn.textContent=state.busy?`${name}로 PING 전송 중…`:`▶ ${name}로 PING 보내기`;
  }

  const baseChooseDest=chooseDest;
  chooseDest=function(dest){
    baseChooseDest(dest);
    syncPingLabel();
  };

  const compareBox=document.querySelector("#compareBox");
  let mobileCompare=null;
  if(compareBox){
    mobileCompare=document.createElement("div");
    mobileCompare.className="mobile-compare-cards";
    compareBox.appendChild(mobileCompare);
  }
  function renderMobileComparison(){
    if(!mobileCompare)return;
    const a=state.snapshots.find(x=>x.key==="icmp-pc1-r2");
    const b=state.snapshots.find(x=>x.key==="icmp-r2-pc2");
    if(!a||!b){mobileCompare.innerHTML="";return}
    const rows=[
      ["Source IP",a.srcIp,b.srcIp,"그대로","same"],
      ["Destination IP",a.dstIp,b.dstIp,"그대로","same"],
      ["Source MAC",a.srcMac,b.srcMac,"링크마다 변경","changed"],
      ["Destination MAC",a.dstMac,b.dstMac,"링크마다 변경","changed"],
      ["TTL",a.ttl,b.ttl,"라우터 통과 시 1 감소","changed"]
    ];
    mobileCompare.innerHTML=rows.map(([name,before,after,meaning,kind])=>`
      <article class="mobile-compare-card">
        <h5>${name}</h5>
        <div class="mobile-compare-row"><b>PC1 → R2</b><code>${before??"—"}</code></div>
        <div class="mobile-compare-row"><b>R2 → PC2</b><code>${after??"—"}</code></div>
        <div class="mobile-compare-meaning ${kind}">${meaning}</div>
      </article>`).join("");
  }

  const baseRenderComparison=renderComparison;
  renderComparison=function(){
    baseRenderComparison();
    renderMobileComparison();
  };

  const baseConfigureLesson=configureLesson;
  configureLesson=function(i){
    baseConfigureLesson(i);
    syncPingLabel();
    renderMobileComparison();
  };

  const basePing=ping;
  ping=async function(){
    const task=basePing();
    syncPingLabel();
    try{
      await task;
    }finally{
      syncPingLabel();
      renderMobileComparison();
    }
  };

  const pingButton=document.querySelector("#pingBtn");
  if(pingButton)pingButton.onclick=()=>ping();

  syncPingLabel();
  renderMobileComparison();
})();