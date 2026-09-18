(() => {
 const $=id=>document.getElementById(id);
 const modes={
 known:{title:'Known Unicast · 목적지 포트를 알고 있음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 2번 포트',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'2번 포트로만 전달',copy:'목적지 MAC은 PC2 그대로',observer:'PC3 링크: 이 요청을 전달하지 않음',scope:'PC1 → PC2 통신 · 근거 실험 02',scenario:'02-known-unicast',flood:false},
 unknown:{title:'Unknown Unicast · 목적지 포트 정보가 없음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 등록 없음',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'동일 VLAN에서 수신 1번 제외 → 2·3번으로 Flooding',copy:'복사본도 목적지 MAC은 PC2 그대로',observer:'PC3 링크에도 관찰 · PC3행 프레임은 아님',scope:'PC1 → PC2 통신 · 근거 실험 04. 링크 관찰은 PC3 내부 처리·응답을 증명하지 않습니다.',scenario:'04-unknown-unicast',flood:true},
 broadcast:{title:'Broadcast · 처음부터 같은 LAN에 보내는 주소',dst:'목적지 MAC: ff:ff:ff:ff:ff:ff',src:'출발지 MAC: PC1 · ARP 질문 대상 IP: PC3 (192.168.10.30)',table:'목적지 한 포트를 찾는 Unicast 조회가 아님',learn:'이 요청에서도 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'동일 VLAN에서 수신 1번 제외 → 2·3번으로 Broadcast 전달',copy:'처음부터 끝까지 Broadcast 목적지 MAC 유지',observer:'PC2·PC3 링크에 전달 · ARP가 묻는 IP는 PC3',scope:'실제 실험 03은 PC3를 찾는 ARP입니다. Known/Unknown의 PC2행 ICMP와 대상·프레임 종류가 다릅니다.',scenario:'03-broadcast',flood:true}
 };
 let selected='known';
 function render(step='request'){
  let m={...modes[selected]};const reply=selected==='unknown'&&step==='reply';
  if(reply)m={...m,title:'PC2 응답 · 출발지 MAC과 수신 포트로 학습',dst:'목적지 MAC: PC1',src:'출발지 MAC: PC2 · PC1행 ICMP 응답',table:'PC2 MAC → 2번 포트 등록',learn:'PC2 응답의 출발지 MAC + 들어온 2번 포트로 학습',forward:'PC1의 1번 포트로 전달',copy:'응답 목적지 MAC은 PC1 · 새 Broadcast를 만들지 않음',observer:'PC3: 이번 응답의 전달 경로에 포함되지 않음',flood:false};
  if(selected==='unknown'&&step==='next')m={...modes.known,title:'재학습 후 다음 요청 · Known Unicast',scope:'PC1 → PC2 요청을 다시 실행 · 근거 실험 05',scenario:'05-mac-relearning'};
  for(const [id,key] of Object.entries({'frame-destination':'dst','frame-source':'src','table-state':'table','source-learning':'learn','forward-state':'forward','copy-state':'copy','observer-state':'observer','scope-state':'scope','path-title':'title'}))$(id).textContent=m[key];
  $('path-detail').textContent=m.forward+' · '+m.copy; $('diagram-destination').textContent=m.dst+(selected==='broadcast'?'':' · 변경 없음');
  $('path-pc1').setAttribute('d',reply?'M641 294H465V225H322':'M316 225H465V294H635');
  $('path-pc2').setAttribute('d',reply?'M316 416H465V326H635':'M641 326H465V416H322');
  $('path-pc3').setAttribute('visibility',m.flood?'visible':'hidden');
  $('learning-steps').hidden=selected!=='unknown';
  document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.step===step)));
  const primary=selected==='broadcast'?'pc3-sw1':'pc2-sw1';
  $('path-evidence').href='../ethernet-viewer.html?mode=packets&scenario='+m.scenario+'&point='+primary;
  $('path-evidence').textContent=reply?'PC2 응답과 요청 캡처 확인 →':selected==='broadcast'?'PC3 ARP 요청·응답 확인 →':'PC2 전달 패킷 확인 →';
  $('path-compare').href='../ethernet-viewer.html?mode=packets&scenario='+m.scenario+'&point='+(selected==='broadcast'?'pc2-sw1':'pc3-sw1');
  $('path-compare').textContent=selected==='broadcast'?'PC2에도 전달된 ARP 비교 →':m.flood?'PC3에 복사된 요청 비교 →':'PC3 미전달 비교 →';

  const mobileSwitch=$('mobile-switch-state');
  const mobilePc2=$('mobile-pc2-state');
  const mobilePc3=$('mobile-pc3-state');
  if(mobileSwitch&&mobilePc2&&mobilePc3){
   if(selected==='known'){
    mobileSwitch.textContent='PC2 MAC → 2번 포트';
    mobilePc2.textContent='Known Unicast 전달';
    mobilePc3.textContent='전달하지 않음';
   }else if(selected==='unknown'){
    mobileSwitch.textContent='PC2 MAC → 등록 없음';
    mobilePc2.textContent='Flooding 복사본 전달';
    mobilePc3.textContent='Flooding 복사본 전달';
   }else{
    mobileSwitch.textContent='Destination = ff:ff:ff:ff:ff:ff';
    mobilePc2.textContent='Broadcast 전달';
    mobilePc3.textContent='Broadcast 전달';
   }
  }
 }
 document.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.path;document.querySelectorAll('[data-path]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.step)));


 const pingStates=[
  {
   phase:'READY · BEFORE TRAFFIC',
   title:'ARP Cache와 FDB가 비어 있습니다.',
   description:'PC1은 PC2의 MAC 주소를 모르고, SW1도 PC1·PC2의 위치를 아직 학습하지 않은 상태에서 시작합니다.',
   frame:'아직 전송된 프레임 없음',
   arp:'PC2 항목 없음',
   arpDetail:'192.168.10.20의 MAC을 아직 모름',
   fdb:'동적 PC 엔트리 없음',
   fdbDetail:'PC1·PC2가 어느 포트인지 아직 모름',
   forward:'대기',
   forwardDetail:'프레임이 들어오면 Source 학습 후 Destination을 판단'
  },
  {
   phase:'STEP 1 · ARP REQUEST · BROADCAST',
   title:'PC1이 “PC2의 MAC이 뭐야?”라고 묻습니다.',
   description:'PC1이 ARP Request를 Broadcast로 전송합니다. SW1은 먼저 Source MAC인 PC1을 port 1에 학습한 뒤 Broadcast를 다른 전달 가능 포트로 내보냅니다.',
   frame:'DST ff:ff:ff:ff:ff:ff · SRC PC1 · EtherType ARP',
   arp:'PC2 항목 없음',
   arpDetail:'질문을 보냈지만 아직 ARP Reply를 받기 전',
   fdb:'PC1 MAC → port 1',
   fdbDetail:'ARP Request의 Source MAC으로 PC1 위치 학습',
   forward:'Broadcast Flooding',
   forwardDetail:'수신 port 1 제외 → 동일 VLAN의 port 2·3으로 전달'
  },
  {
   phase:'STEP 2 · ARP REPLY · UNICAST',
   title:'PC2의 응답으로 PC와 Switch의 표가 각각 채워집니다.',
   description:'PC2가 ARP Reply를 보내면 SW1은 Source MAC인 PC2를 port 2에 학습합니다. PC1은 Reply를 받아 PC2의 IP → MAC 정보를 ARP Cache에 저장합니다.',
   frame:'DST PC1 MAC · SRC PC2 · EtherType ARP',
   arp:'192.168.10.20 → PC2 MAC',
   arpDetail:'PC1이 PC2의 MAC 주소를 알게 됨',
   fdb:'PC1 → port 1 · PC2 → port 2',
   fdbDetail:'SW1이 양쪽 단말의 L2 위치를 모두 학습',
   forward:'Known Unicast → port 1',
   forwardDetail:'PC1 MAC의 위치를 이미 알고 있으므로 port 1로만 전달'
  },
  {
   phase:'STEP 3 · ICMP ECHO REQUEST · KNOWN UNICAST',
   title:'이제 실제 Ping 요청은 PC2 포트로만 갑니다.',
   description:'PC1은 ARP Cache에서 PC2 MAC을 사용해 ICMP Echo Request를 Ethernet Frame에 담습니다. SW1도 PC2의 위치를 알고 있어 port 2로만 전달합니다.',
   frame:'DST PC2 MAC · SRC PC1 · EtherType IPv4 · ICMP Echo Request',
   arp:'192.168.10.20 → PC2 MAC',
   arpDetail:'새 ARP 없이 바로 Ethernet Frame 생성 가능',
   fdb:'PC1 → port 1 · PC2 → port 2',
   fdbDetail:'Source PC1 항목은 다시 학습·갱신될 수 있음',
   forward:'Known Unicast → port 2',
   forwardDetail:'PC3 링크에는 이 요청을 전달하지 않음'
  },
  {
   phase:'STEP 4 · ICMP ECHO REPLY · KNOWN UNICAST',
   title:'PC2의 Ping 응답도 PC1 포트로만 돌아옵니다.',
   description:'PC2가 ICMP Echo Reply를 보내면 Source MAC은 PC2, Destination MAC은 PC1입니다. SW1은 이미 PC1의 위치를 알고 있어 port 1로만 전달합니다.',
   frame:'DST PC1 MAC · SRC PC2 · EtherType IPv4 · ICMP Echo Reply',
   arp:'192.168.10.20 → PC2 MAC',
   arpDetail:'PC1의 ARP Cache는 그대로 유지',
   fdb:'PC1 → port 1 · PC2 → port 2',
   fdbDetail:'양쪽 Source MAC 관찰로 동적 엔트리 타이머가 갱신될 수 있음',
   forward:'Known Unicast → port 1',
   forwardDetail:'첫 Ping 왕복의 L2 전달 흐름 완료'
  }
 ];
 let pingStep=0;
 let pingTimer=null;

 function renderPing(step){
  const state=pingStates[step];
  if(!state) return;
  pingStep=step;
  document.querySelectorAll('[data-ping-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.pingStep)===step)));
  const values={
   'ping-phase':state.phase,
   'ping-title':state.title,
   'ping-description':state.description,
   'ping-arp-state':state.arp,
   'ping-arp-detail':state.arpDetail,
   'ping-fdb-state':state.fdb,
   'ping-fdb-detail':state.fdbDetail,
   'ping-forward-state':state.forward,
   'ping-forward-detail':state.forwardDetail
  };
  for(const [id,value] of Object.entries(values)){
   const el=$(id);
   if(el) el.textContent=value;
  }
  const frame=$('ping-frame');
  if(frame) frame.innerHTML='<span>'+state.frame+'</span>';
  const progress=$('ping-progress');
  if(progress) progress.style.width=(step/(pingStates.length-1)*100)+'%';
 }

 function stopPingAutoplay(){
  if(pingTimer){clearInterval(pingTimer);pingTimer=null;}
  const auto=$('ping-autoplay');
  if(auto){auto.textContent='▶ 자동 재생';auto.setAttribute('aria-pressed','false');}
 }

 function startPingAutoplay(){
  stopPingAutoplay();
  renderPing(0);
  const auto=$('ping-autoplay');
  if(auto){auto.textContent='■ 재생 중';auto.setAttribute('aria-pressed','true');}
  pingTimer=setInterval(()=>{
   if(pingStep>=pingStates.length-1){stopPingAutoplay();return;}
   renderPing(pingStep+1);
  },1400);
 }

 document.querySelectorAll('[data-ping-step]').forEach(button=>button.addEventListener('click',()=>{
  stopPingAutoplay();
  renderPing(Number(button.dataset.pingStep));
 }));
 const pingAuto=$('ping-autoplay');
 if(pingAuto) pingAuto.addEventListener('click',()=>pingTimer?stopPingAutoplay():startPingAutoplay());
 const pingReset=$('ping-reset');
 if(pingReset) pingReset.addEventListener('click',()=>{stopPingAutoplay();renderPing(0);});
 renderPing(0);


 const drillState=new Map();

 function updateDrillSummary(){
  const answered=drillState.size;
  const correct=Array.from(drillState.values()).filter(Boolean).length;
  const answeredEl=$('drill-answered');
  const correctEl=$('drill-correct');
  if(answeredEl) answeredEl.textContent=String(answered);
  if(correctEl) correctEl.textContent=String(correct);

  const finish=$('drill-finish');
  if(!finish) return;
  if(answered<5){
   finish.hidden=true;
   return;
  }

  finish.hidden=false;
  const title=$('drill-finish-title');
  const copy=$('drill-finish-copy');
  if(title) title.textContent='5문항을 모두 확인했습니다. · '+correct+'/5';
  if(copy){
   if(correct===5){
    copy.innerHTML='모든 상황에서 핵심 구분을 잡았습니다. 이제 중요한 것은 실제 장비에서 <b>VLAN·포트 역할·시간 변화·로그·토폴로지</b>를 근거로 같은 판단 과정을 반복하는 것입니다.';
   }else if(correct>=3){
    copy.innerHTML='핵심 흐름은 잡혀 있습니다. 틀린 문제에서는 정답 자체보다 <b>왜 MAC Table 한 줄만으로 원인을 확정하면 안 되는지</b>와 “다음 확인” 항목을 다시 보세요.';
   }else{
    copy.innerHTML='먼저 <b>Source MAC Learning / Destination MAC Lookup / VLAN + MAC / ARP와 FDB의 분리</b>를 다시 확인한 뒤 이 문제를 다시 풀면 연결이 더 잘 됩니다.';
   }
  }
 }

 document.querySelectorAll('.drill-card').forEach(card=>{
  const drillId=card.dataset.drill;
  const buttons=Array.from(card.querySelectorAll('[data-choice]'));
  const feedback=card.querySelector('.drill-feedback');
  const result=card.querySelector('.drill-result');

  buttons.forEach(button=>button.addEventListener('click',()=>{
   if(drillState.has(drillId)) return;

   const isCorrect=button.dataset.correct==='true';
   drillState.set(drillId,isCorrect);

   buttons.forEach(choice=>{
    const correctChoice=choice.dataset.correct==='true';
    choice.disabled=true;
    choice.setAttribute('aria-pressed',String(choice===button));
    if(choice===button) choice.classList.add(isCorrect?'selected-correct':'selected-wrong');
    if(correctChoice) choice.classList.add('answer-correct');
   });

   card.dataset.result=isCorrect?'correct':'review';
   if(feedback) feedback.hidden=false;
   if(result){
    result.textContent=isCorrect?'✓ 정답입니다.':'다시 확인해보세요. 정답과 이유는 아래와 같습니다.';
    result.dataset.state=isCorrect?'correct':'review';
   }
   updateDrillSummary();
  }));
 });

 const drillReset=$('drill-reset');
 if(drillReset) drillReset.addEventListener('click',()=>{
  drillState.clear();
  document.querySelectorAll('.drill-card').forEach(card=>{
   delete card.dataset.result;
   card.querySelectorAll('[data-choice]').forEach(choice=>{
    choice.disabled=false;
    choice.setAttribute('aria-pressed','false');
    choice.classList.remove('selected-correct','selected-wrong','answer-correct');
   });
   const feedback=card.querySelector('.drill-feedback');
   if(feedback) feedback.hidden=true;
  });
  updateDrillSummary();
  const first=document.querySelector('.drill-card');
  if(first) first.scrollIntoView({behavior:'smooth',block:'center'});
 });
 updateDrillSummary();

 document.querySelectorAll('[data-prediction]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-prediction]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  const result=$('prediction-result');
  if(!result) return;
  const correct=button.dataset.prediction==='yes';
  result.hidden=false;
  result.dataset.state=correct?'correct':'review';
  result.innerHTML=correct
   ? '<b>정답입니다.</b> SW1은 PC2 MAC의 출력 포트를 모르므로 목적지 MAC을 바꾸지 않은 채 동일 VLAN의 다른 전달 가능 포트로 Flooding합니다. 따라서 <b>PC3 링크에서도 PC2 목적지 Unicast 프레임이 관찰</b>됩니다. 다만 PC3를 목적지로 만든 프레임은 아닙니다. <a href="../ethernet-viewer.html?mode=packets&scenario=04-unknown-unicast&point=pc3-sw1">실제 PC3 링크 PCAP 확인 →</a>'
   : '<b>정답은 “보인다”입니다.</b> PC1이 PC2의 MAC을 아는 것과 SW1이 PC2의 출력 포트를 아는 것은 별개입니다. SW1 FDB에 PC2 항목이 없으면 Unknown Unicast Flooding이 발생해 PC3 링크에서도 프레임이 관찰됩니다. <a href="../ethernet-viewer.html?mode=packets&scenario=04-unknown-unicast&point=pc3-sw1">실제 PC3 링크 PCAP 확인 →</a>';
 }));

 render();
})();
