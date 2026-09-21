function renderPrediction(){
  const l=lessons[state.lesson];
  state.predictionChoice=null;
  state.predictionLocked=false;
  const title=$("#predictionTitle"),help=$("#predictionHelp"),options=$("#predictionOptions"),feedback=$("#predictionFeedback");
  if(!title||!help||!options||!feedback)return;
  title.textContent=l.prediction.question;
  help.textContent=state.lesson<2
    ?"정답을 몰라도 괜찮습니다. 먼저 예상한 뒤 실제 ARP 대상과 비교해 보세요."
    :"먼저 실패 원인을 예상한 뒤 실제로 PING을 보내 어느 단계에서 멈추는지 비교해 보세요.";
  feedback.hidden=true;
  feedback.className="prediction-feedback";
  feedback.textContent="";
  options.innerHTML="";
  l.prediction.options.forEach(([id,label])=>{
    const btn=document.createElement("button");
    btn.type="button";
    btn.dataset.prediction=id;
    btn.setAttribute("aria-pressed","false");
    btn.textContent=label;
    btn.onclick=()=>{
      if(state.busy||state.predictionLocked)return;
      state.predictionChoice=id;
      $$("[data-prediction]").forEach(b=>{
        const active=b.dataset.prediction===id;
        b.classList.toggle("selected",active);
        b.setAttribute("aria-pressed",String(active));
      });
      updatePredictionControls();
    };
    options.appendChild(btn);
  });
  updatePredictionControls();
}
function updatePredictionControls(){
  const btn=$("#pingBtn"); if(!btn)return;
  if(typeof isAdvancedMode==="function"&&isAdvancedMode()){
    btn.disabled=state.busy;
  }else{
    btn.disabled=state.busy||!state.predictionChoice;
  }
}
function revealPrediction(){
  const l=lessons[state.lesson];
  if(!state.predictionChoice||state.predictionLocked)return;
  state.predictionLocked=true;
  const picked=l.prediction.options.find(x=>x[0]===state.predictionChoice);
  const expected=l.prediction.options.find(x=>x[0]===l.prediction.correct);
  const correct=state.predictionChoice===l.prediction.correct;
  const box=$("#predictionFeedback");
  if(box){
    box.hidden=false;
    box.className="prediction-feedback "+(correct?"correct":"incorrect");
    box.innerHTML="<b>"+(correct?"예상이 맞았습니다.":"예상과 실제 동작이 달랐습니다.")+"</b>"
      +"<span>내 예상: "+(picked?picked[1]:"—")+"</span>"
      +"<span>실제: "+(expected?expected[1]:"—")+"</span>"
      +"<p>"+l.prediction.explain+"</p>";
  }
  $$("[data-prediction]").forEach(b=>b.disabled=true);
  updatePredictionControls();
}

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
    const conceptOnly=state.lesson>=2 && state.failureSeen[state.lesson] && !recoveryCorrect();
    verdict.innerHTML=state.lesson<2
      ?"<b>학습 완료:</b> 예상한 ARP 대상과 실제 패킷 흐름을 비교했습니다."
      :conceptOnly
        ?"<b>개념 확인 완료:</b> 실패 지점과 원인을 확인했습니다. 직접 설정을 고쳐보는 복구 실습은 고급 모드에서 선택적으로 진행할 수 있습니다."
        :"<b>복구 완료:</b> 장애 원인을 수정하고 재PING 성공까지 확인했습니다.";
    next.disabled=false;
    next.textContent=state.lesson===lessons.length-1?"전체 완료 결과 보기 →":"다음 실습 →";
  }else if(state.lesson>=2 && state.failureSeen[state.lesson]){
    badge.textContent=recoveryCorrect()?"복구 후 재검증 필요":"장애 재현 완료";
    badge.className="status-badge failure";
    verdict.className="verdict failure";
    verdict.innerHTML=recoveryCorrect()
      ?"<b>설정은 정상으로 돌아왔습니다.</b> 마지막으로 PING을 다시 보내 실제 통신이 복구됐는지 검증하세요."
      :"<b>장애 재현 완료.</b> 기본 모드에서는 원인 흐름을 확인하고, 설정 변경이 필요하면 <b>고급 모드</b>로 전환해 복구하세요.";
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
    revealPrediction();
    if(typeof isAdvancedMode==="function"&&!isAdvancedMode()){
      if(i===0)setExplain("<b>한 줄 결론:</b> 같은 네트워크(on-link) 목적지는 <b>최종 목적지 자신의 MAC</b>을 ARP로 알아내고 직접 전달합니다.");
      if(i===1)setExplain("<b>한 줄 결론:</b> 다른 네트워크 목적지는 <b>최종 PC의 MAC이 아니라 Default Gateway의 MAC</b>을 ARP로 알아낸 뒤 Gateway에 먼저 전달합니다.","remote");
    }
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
  if(state.lesson>=2 && state.hintLevel>=2){
    if(typeof isAdvancedMode==="function" && isAdvancedMode()){
      $("#advancedPanel").open=true;
    }else{
      box.innerHTML+=`<div><button type="button" class="recovery-mode-btn" data-open-advanced-mode>고급 모드에서 복구 설정 열기</button></div>`;
    }
  }
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
    revealPrediction();
    if(typeof isAdvancedMode==="function"&&!isAdvancedMode()&&state.predictionChoice){
      state.completed[state.lesson]=true;
    }
    if(typeof isAdvancedMode==="function"&&!isAdvancedMode()){
      if(state.lesson===2)setExplain("<b>한 줄 결론:</b> 원격 목적지에서는 설정된 Default Gateway를 next-hop으로 믿습니다. Gateway 주소가 틀리면 그 잘못된 주소를 ARP하다가 Reply를 받지 못해 멈춥니다.","error");
      if(state.lesson===3)setExplain("<b>한 줄 결론:</b> Subnet Mask가 틀리면 on-link 판단부터 잘못되어, Gateway 대신 원격 PC를 같은 LAN에서 직접 ARP할 수 있습니다.","error");
      if(state.lesson===4)setExplain("<b>한 줄 결론:</b> ARP 대상이 올바른 Gateway여도 실제 인터페이스가 Down이면 ARP Reply를 받을 수 없어 Ethernet 전송으로 진행하지 못합니다.","error");
    }
    $("#recoveryNudge").classList.add("show");
    const advancedAction=(typeof isAdvancedMode==="function"&&!isAdvancedMode())
      ?'<br><button type="button" class="recovery-mode-btn" data-open-advanced-mode>고급 모드로 전환해 직접 복구하기</button>'
      :'';
    $("#recoveryNudge").innerHTML="<b>실패 지점 확인 완료.</b> 예상과 실제 실패 원인을 비교해 보세요. 설정을 직접 수정해 보고 싶다면 고급 모드에서 복구 실습을 이어갈 수 있습니다."+advancedAction;
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
