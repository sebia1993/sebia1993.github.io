function renderLessonStatus(){
  const items=checklistState();
  $("#checkList").innerHTML=items.map(([title,desc,done])=>`
    <div class="check-item ${done?"done":""}">
      <div class="check-dot">${done?"✓":"·"}</div>
      <div><b>${title}</b><span>${desc}</span></div>
    </div>`).join("");
  const badge=$("#lessonBadge"), verdict=$("#verdictBox"), next=$("#nextBtn");
  if(state.completed[state.lesson]){
    badge.textContent="완료";badge.className="status-badge success";
    verdict.className="verdict success";
    verdict.innerHTML=state.lesson<2
      ?"<b>실습 완료:</b> 패킷 흐름과 ARP 동작이 정상적으로 확인됐습니다."
      :"<b>복구 완료:</b> 장애를 재현한 뒤 원인을 수정하고 재PING 성공까지 확인했습니다.";
    next.disabled=false;
    next.textContent=state.lesson===lessons.length-1?"전체 완료 결과 보기 →":"다음 실습 →";
  }else if(state.lesson>=2 && state.failureSeen[state.lesson]){
    badge.textContent=recoveryCorrect()?"복구 후 재검증 필요":"장애 재현 완료";
    badge.className="status-badge failure";
    verdict.className="verdict failure";
    verdict.innerHTML=recoveryCorrect()
      ?"<b>설정은 정상으로 돌아왔습니다.</b> 마지막으로 PING을 다시 보내 실제 통신이 복구됐는지 검증하세요."
      :"<b>장애 재현 완료.</b> 이제 패킷 단서와 고급 실습 설정을 이용해 원인을 찾아 복구하세요.";
    next.disabled=true;next.textContent="복구 완료 후 다음 실습 →";
  }else{
    badge.textContent="진행 중";badge.className="status-badge";
    verdict.className="verdict";
    verdict.textContent=state.lesson<2
      ?"PING을 보내 패킷 흐름을 직접 확인하면 조건이 자동으로 체크됩니다."
      :"먼저 실패를 재현해야 복구 실습이 시작됩니다.";
    next.disabled=true;next.textContent="완료 후 다음 실습 →";
  }
  renderCourseProgress();
}
function completeCurrentLessonIfReady(){
  const i=state.lesson;
  const items=checklistState();
  if(items.every(x=>x[2])){
    state.completed[i]=true;
    renderLessonStatus();
    if(i===lessons.length-1 && state.completed.every(Boolean)){
      setTimeout(()=>$("#courseComplete").scrollIntoView({behavior:"smooth",block:"center"}),350);
    }
    return true;
  }
  renderLessonStatus();
  return false;
}
function showHint(){
  const l=lessons[state.lesson];
  state.hintLevel=Math.min(state.hintLevel+1,3);
  const box=$("#hintBox");
  box.classList.add("show");
  box.innerHTML=`<b>힌트 ${state.hintLevel}/3</b><br>${l.hints[state.hintLevel-1]}`;
  $("#hintBtn").textContent=state.hintLevel<3?`다음 힌트 ${state.hintLevel+1}/3`:"힌트 모두 확인";
  if(state.lesson>=2 && state.hintLevel>=2)$("#advancedPanel").open=true;
}
function resetHint(){
  state.hintLevel=0;
  $("#hintBox").classList.remove("show");
  $("#hintBox").innerHTML="";
  $("#hintBtn").textContent="막혔나요? 힌트 1/3";
}
function recordFailure(){
  if(state.lesson>=2){
    state.failureSeen[state.lesson]=true;
    $("#recoveryNudge").classList.add("show");
    $("#recoveryNudge").innerHTML="<b>1단계 완료 · 장애 재현 성공.</b> 이제 실패 지점을 근거로 원인을 좁혀보세요. 막히면 힌트를 한 단계씩 사용할 수 있습니다.";
  }
  renderLessonStatus();
}

function chooseDest(dest){
  state.dest=dest;renderState();
  $$(".dest-btn").forEach(b=>b.classList.toggle("active",b.dataset.dest===dest));
  $("#clickPc3").classList.toggle("selected",dest==="pc3");$("#clickPc2").classList.toggle("selected",dest==="pc2");
  renderLessonStatus();
  if(state.lesson<2){
    $("#coachTitle").textContent=dest==="pc3"?"PC3를 선택했습니다":"PC2를 선택했습니다";
    $("#coachText").textContent=dest==="pc3"?"이제 PING 보내기를 눌러 패킷이 어디로 가는지 확인하세요.":"이제 PING 보내기를 눌러 Gateway를 거치는지 확인하세요.";
  }
}
function setExplain(html,kind="same"){
  const e=$("#explainBox");e.className="explain "+(kind==="remote"?"remote":kind==="error"?"error":"");e.innerHTML=html;
}
function resetPacket(){
  $("#packet").style.display="none";$("#packetRing").style.display="none";hidePacketStop();
  $$(".arp-branch").forEach(x=>x.classList.remove("show"));
  setPacketVisual("request");
}
async function move(points){
  const p=$("#packet"),r=$("#packetRing");p.style.display="block";r.style.display="block";
  let prev=points[0];p.setAttribute("cx",prev[0]);p.setAttribute("cy",prev[1]);r.setAttribute("cx",prev[0]);r.setAttribute("cy",prev[1]);
  for(let i=1;i<points.length;i++){
    const start=prev,end=points[i],dur=420,steps=24;
    for(let s=1;s<=steps;s++){
      const t=s/steps,x=start[0]+(end[0]-start[0])*t,y=start[1]+(end[1]-start[1])*t;
      p.setAttribute("cx",x);p.setAttribute("cy",y);r.setAttribute("cx",x);r.setAttribute("cy",y);
      await sleep(dur/steps);
    }
    prev=end;
  }
  await sleep(180);
}
const paths={
  pc1sw1:[[140,239],[292,239],[292,294],[433,308]],
  sw1pc3:[[433,308],[292,326],[292,426],[140,426]],
  sw1r2:[[433,308],[640,308],[702,308]],
  r2sw2:[[702,308],[949,308],[1002,308]],
  sw2pc2:[[1002,308],[1193,308],[1230,308]]
};
function join(...parts){let out=[];parts.forEach(a=>out.push(...a.slice(out.length?1:0)));return out}
function rev(a){return [...a].reverse()}
