(() => {
 const $=id=>document.getElementById(id);

 let learningMode='basic';
 function setLearningMode(mode,{scrollToAdvanced=false}={}){
  learningMode=mode==='advanced'?'advanced':'basic';
  const advanced=learningMode==='advanced';

  document.documentElement.dataset.learningMode=learningMode;
  document.querySelectorAll('[data-learning-level="advanced"]').forEach(section=>{section.hidden=!advanced;});
  document.querySelectorAll('[data-mode-link="advanced"]').forEach(link=>{link.hidden=!advanced;});
  document.querySelectorAll('[data-basic-only]').forEach(el=>{el.hidden=advanced;});
  document.querySelectorAll('[data-learning-mode]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.learningMode===learningMode));
  });

  const note=$('learning-mode-note');
  if(note){
   note.textContent=advanced
    ? '고급 모드: 기본 학습 내용에 MAC Move·Flapping, 운영 판단 문제, CLI 흐름, 원본 검증 자료를 추가로 표시합니다.'
    : '기본 모드: Source MAC Learning → Destination MAC 조회 → Known/Unknown/Broadcast → ARP와 FDB 분리 순서만 먼저 봅니다.';
  }

  if(advanced&&scrollToAdvanced){
   const target=$('practical-extension');
   if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
  }
 }

 document.querySelectorAll('[data-learning-mode]').forEach(button=>button.addEventListener('click',()=>{
  setLearningMode(button.dataset.learningMode);
 }));
 const enableAdvanced=$('enable-advanced');
 if(enableAdvanced) enableAdvanced.addEventListener('click',()=>setLearningMode('advanced',{scrollToAdvanced:true}));
 setLearningMode('basic');

 const modes={
 known:{title:'Known Unicast · 목적지 포트를 알고 있음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 2번 포트',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'2번 포트로만 전달',copy:'목적지 MAC은 PC2 그대로',observer:'PC3 링크: 이 요청을 전달하지 않음',scope:'PC1 → PC2 통신 · 근거 실험 02',scenario:'02-known-unicast',flood:false},
 unknown:{title:'Unknown Unicast · 목적지 포트 정보가 없음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 등록 없음',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'동일 VLAN에서 수신 1번 제외 → 2·3번으로 Flooding',copy:'복사본도 목적지 MAC은 PC2 그대로',observer:'PC3 링크에도 관찰 · PC3행 프레임은 아님',scope:'PC1 → PC2 통신 · 근거 실험 04. 링크 관찰은 PC3 내부 처리·응답을 증명하지 않습니다.',scenario:'04-unknown-unicast',flood:true},
 broadcast:{title:'Broadcast · 처음부터 동일 Broadcast Domain에 보내는 주소',dst:'목적지 MAC: ff:ff:ff:ff:ff:ff',src:'출발지 MAC: PC1 · ARP 질문 대상 IP: PC3 (192.168.10.30)',table:'목적지 한 포트를 찾는 Unicast 조회가 아님',learn:'이 요청에서도 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'동일 VLAN에서 수신 1번 제외 → 2·3번으로 Broadcast 전달',copy:'처음부터 끝까지 Broadcast 목적지 MAC 유지',observer:'PC2·PC3 링크에 전달 · ARP가 묻는 IP는 PC3',scope:'실제 실험 03은 PC3를 찾는 ARP입니다. Known/Unknown의 PC2행 ICMP와 대상·프레임 종류가 다릅니다.',scenario:'03-broadcast',flood:true}
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
  const mobileSource=$('mobile-source-device');
  const mobileSourceDetail=$('mobile-source-detail');
  const mobilePrimaryLabel=$('mobile-primary-label');
  const mobileSecondaryLabel=$('mobile-secondary-label');
  if(mobileSwitch&&mobilePc2&&mobilePc3&&mobileSource&&mobileSourceDetail&&mobilePrimaryLabel&&mobileSecondaryLabel){
   mobileSecondaryLabel.textContent='PC3 링크';

   if(selected==='unknown'&&step==='reply'){
    mobileSource.textContent='PC2';
    mobileSourceDetail.textContent='응답 프레임을 SW1으로 전송';
    mobileSwitch.textContent='PC2를 port 2에 학습 · PC1 MAC → 1번 포트';
    mobilePrimaryLabel.textContent='PC1 링크';
    mobilePc2.textContent='Known Unicast 응답 전달';
    mobilePc3.textContent='전달하지 않음';
   }else if(selected==='unknown'&&step==='next'){
    mobileSource.textContent='PC1';
    mobileSourceDetail.textContent='재학습 이후 다음 요청 전송';
    mobileSwitch.textContent='PC2 MAC → 2번 포트';
    mobilePrimaryLabel.textContent='PC2 링크';
    mobilePc2.textContent='Known Unicast 전달';
    mobilePc3.textContent='전달하지 않음';
   }else if(selected==='known'){
    mobileSource.textContent='PC1';
    mobileSourceDetail.textContent='프레임을 SW1으로 전송';
    mobileSwitch.textContent='PC2 MAC → 2번 포트';
    mobilePrimaryLabel.textContent='PC2 링크';
    mobilePc2.textContent='Known Unicast 전달';
    mobilePc3.textContent='전달하지 않음';
   }else if(selected==='unknown'){
    mobileSource.textContent='PC1';
    mobileSourceDetail.textContent='PC2 목적지 Unicast를 SW1으로 전송';
    mobileSwitch.textContent='PC2 MAC → 등록 없음';
    mobilePrimaryLabel.textContent='PC2 링크';
    mobilePc2.textContent='Flooding 복사본 전달';
    mobilePc3.textContent='Flooding 복사본 전달';
   }else{
    mobileSource.textContent='PC1';
    mobileSourceDetail.textContent='ARP Broadcast를 SW1으로 전송';
    mobileSwitch.textContent='Destination = ff:ff:ff:ff:ff:ff';
    mobilePrimaryLabel.textContent='PC2 링크';
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


 const cliStates=[
  {
   kicker:'STEP 1 · MAC LOCATION',
   title:'먼저 MAC이 현재 어느 포트에서 학습되는지 확인합니다.',
   goal:'현상이 실제 MAC Move인지 확인',
   goalDetail:'VLAN과 포트를 함께 보고 시간에 따라 위치가 바뀌는지 확인합니다.',
   observation:'VLAN 20 · AA:AA → port 12 ↔ port 18',
   observationDetail:'한 번의 이동인지 반복 이동인지 구분합니다.',
   commands:{
    aruba:'show mac-address',
    cisco:'show mac address-table address aaaa.aaaa.aa01 vlan 20'
   },
   notes:{
    aruba:'출력에서 대상 MAC의 VLAN과 Port를 확인합니다. 필요하면 장비 버전에 맞는 필터를 추가합니다.',
    cisco:'대상 MAC과 VLAN을 지정해 현재 학습 포트를 확인합니다.'
   },
   output:'MAC Address         Port   VLAN\nAA:AA:AA:AA:AA:01  12     20\n\n잠시 후 다시 확인:\nAA:AA:AA:AA:AA:01  18     20',
   canSay:'<b>같은 VLAN의 동일 MAC 위치가 시간에 따라 바뀌고 있다</b>는 사실입니다.',
   cannotSay:'<b>“L2 Loop가 확실하다”</b>고 단정할 단계는 아닙니다.',
   next:'port 12와 18의 상태와 역할을 확인합니다.'
  },
  {
   kicker:'STEP 2 · PORT STATUS',
   title:'MAC이 관찰된 두 포트의 물리·논리 상태를 봅니다.',
   goal:'포트가 정상 Link인지, 오류나 비정상 변화가 있는지 확인',
   goalDetail:'Link Up/Down, 속도, Duplex, Error/Discard, 포트 이름과 역할을 함께 봅니다.',
   observation:'port 12 = Access? · port 18 = Uplink?',
   observationDetail:'두 포트의 역할이 다르면 MAC 이동의 의미도 달라집니다.',
   commands:{
    aruba:'show interfaces brief\nshow interfaces 12,18',
    cisco:'show interfaces status\nshow interfaces GigabitEthernet1/0/12\nshow interfaces GigabitEthernet1/0/18'
   },
   notes:{
    aruba:'show interfaces brief로 전체 상태를 보고, 관련 포트를 상세 확인합니다.',
    cisco:'상태 요약 후 관련 인터페이스의 카운터·에러·상태를 상세 확인합니다.'
   },
   output:'Port  Type       Enabled  Status   Mode\n12    1000T      Yes      Up       1000FDx\n18    1000T      Yes      Up       1000FDx\n\n관찰: 두 포트 모두 Up · 역할 확인 필요',
   canSay:'두 포트 모두 실제 Forwarding 경로 후보라는 점과 <b>물리 상태의 즉시 이상 유무</b>를 볼 수 있습니다.',
   cannotSay:'Link가 Up이라는 이유만으로 <b>토폴로지가 정상</b>이라고 볼 수는 없습니다.',
   next:'각 포트가 어느 VLAN에 어떻게 참여하는지 확인합니다.'
  },
  {
   kicker:'STEP 3 · VLAN CONTEXT',
   title:'두 포트가 같은 VLAN/Forwarding Domain에 속하는지 확인합니다.',
   goal:'MAC Move 비교가 같은 L2 문맥에서 일어난 것인지 확인',
   goalDetail:'Tagged/Untagged와 VLAN 20의 포트 멤버십을 확인합니다.',
   observation:'port 12와 18 모두 VLAN 20 전달 가능',
   observationDetail:'같은 MAC이라도 VLAN이 다르면 같은 FDB 엔트리로 단순 비교하면 안 됩니다.',
   commands:{
    aruba:'show vlan ports 12,18 detail\nshow vlans',
    cisco:'show interfaces GigabitEthernet1/0/12 switchport\nshow interfaces GigabitEthernet1/0/18 switchport'
   },
   notes:{
    aruba:'포트별 VLAN membership과 Tagged/Untagged 상태를 확인합니다.',
    cisco:'각 포트의 access/trunk 상태와 허용 VLAN을 확인합니다.'
   },
   output:'Port 12 : VLAN 20 Untagged\nPort 18 : VLAN 10,20,30 Tagged\n\n관찰: VLAN 20은 두 포트 모두에서 전달 가능',
   canSay:'MAC 이동이 <b>동일 VLAN 20 안에서 관찰되는 현상</b>임을 확인할 수 있습니다.',
   cannotSay:'같은 VLAN이 두 포트에 있다는 것 자체는 <b>Loop의 증거가 아닙니다.</b>',
   next:'두 포트 뒤에 실제로 어떤 장비가 연결되어 있는지 확인합니다.'
  },
  {
   kicker:'STEP 4 · LLDP / NEIGHBOR',
   title:'포트 번호를 실제 토폴로지의 장비와 연결합니다.',
   goal:'port 12와 18 뒤에 무엇이 있는지 확인',
   goalDetail:'Switch, AP, Phone, Hypervisor 등 연결 대상에 따라 정상적인 MAC 이동 가능성을 해석합니다.',
   observation:'port 12 = Access Switch B · port 18 = Access Switch C',
   observationDetail:'두 포트가 모두 다른 스위치로 향한다면 경로 구조를 더 확인해야 합니다.',
   commands:{
    aruba:'show lldp info remote-device 12\nshow lldp info remote-device 18',
    cisco:'show lldp neighbors detail'
   },
   notes:{
    aruba:'LLDP Remote Device 정보로 각 로컬 포트의 이웃 장비와 원격 포트를 확인합니다.',
    cisco:'LLDP Neighbor Detail에서 Local/Port ID/System Name을 확인합니다.'
   },
   output:'Local Port 12 → SW-B / uplink 48\nLocal Port 18 → SW-C / uplink 48\n\n관찰: 동일 단말 MAC이 서로 다른 하위 스위치 경로에서 올라옴',
   canSay:'문제가 단말 한 포트 내부가 아니라 <b>두 L2 경로 사이에서 나타난다</b>는 방향성을 얻습니다.',
   cannotSay:'이웃 장비가 두 대라는 사실만으로 <b>어느 장비가 잘못됐는지</b>는 알 수 없습니다.',
   next:'STP가 이 이중 경로를 어떻게 제어하고 있는지 확인합니다.'
  },
  {
   kicker:'STEP 5 · SPANNING TREE',
   title:'L2 이중 경로가 STP에 의해 정상적으로 제어되는지 봅니다.',
   goal:'Port Role/State와 Topology Change 단서 확인',
   goalDetail:'Forwarding/Blocking 상태, Root 방향, 최근 topology 변화가 현상과 연관되는지 봅니다.',
   observation:'두 경로가 모두 Forwarding인지, 변화가 반복되는지 확인',
   observationDetail:'STP 정보는 Loop 가능성을 좁히는 핵심 근거 중 하나입니다.',
   commands:{
    aruba:'show spanning-tree',
    cisco:'show spanning-tree vlan 20'
   },
   notes:{
    aruba:'전체 STP 상태에서 관련 포트의 Role/State와 토폴로지 변화를 확인합니다.',
    cisco:'VLAN 20의 Root, Role, State 및 관련 포트를 확인합니다.'
   },
   output:'VLAN / Instance 20\nport 12 : Forwarding\nport 18 : Forwarding\nTopology changes : 증가 중\n\n관찰: 추가 조사 가치가 높은 상태',
   canSay:'MAC Flapping과 함께 <b>STP Topology Change가 같은 시간대에 증가</b>한다면 Loop/경로 불안정 가설이 강해집니다.',
   cannotSay:'STP 출력 한 번만으로 <b>원인 장비나 케이블 위치</b>까지 확정할 수는 없습니다.',
   next:'로그와 인터페이스 오류를 시간축으로 대조합니다.'
  },
  {
   kicker:'STEP 6 · LOG / ERROR CORRELATION',
   title:'MAC 이동, STP 변화, Link 이벤트가 같은 시간에 발생했는지 확인합니다.',
   goal:'현상의 시간 상관관계를 확보',
   goalDetail:'로그와 인터페이스 카운터를 통해 반복 패턴과 선후관계를 확인합니다.',
   observation:'MAC move + topology change + link event 시간 비교',
   observationDetail:'여러 독립 증거가 같은 시점을 가리키는지 봅니다.',
   commands:{
    aruba:'show logging\nshow interfaces 12,18',
    cisco:'show logging\nshow interfaces GigabitEthernet1/0/12\nshow interfaces GigabitEthernet1/0/18'
   },
   notes:{
    aruba:'Event Log와 포트 상태/카운터를 함께 보고 MAC 이동 시간과 대조합니다.',
    cisco:'Syslog와 인터페이스 카운터에서 flap, protocol event, error를 시간순으로 확인합니다.'
   },
   output:'10:31:04  STP topology change\n10:31:05  MAC AA:AA moved 12 → 18\n10:31:07  MAC AA:AA moved 18 → 12\n10:31:08  STP topology change\n\n관찰: 이벤트 시간대가 강하게 겹침',
   canSay:'서로 다른 증거가 같은 시간대를 가리키므로 <b>L2 경로 불안정 가설에 근거가 쌓였다</b>고 말할 수 있습니다.',
   cannotSay:'여전히 <b>무조건 임의 포트를 Shutdown</b>할 단계는 아닙니다. 영향 범위와 실제 배선을 확인해야 합니다.',
   next:'토폴로지와 서비스 영향도를 포함해 조치 여부를 결정합니다.'
  },
  {
   kicker:'STEP 7 · EVIDENCE-BASED DECISION',
   title:'수집한 증거를 한 문장으로 연결한 뒤 조치를 결정합니다.',
   goal:'가설·근거·영향·조치를 분리해서 판단',
   goalDetail:'“무엇을 봤기 때문에 무엇을 의심하고, 어떤 추가 확인/조치를 할 것인지”를 명확하게 정리합니다.',
   observation:'MAC Move + 두 L2 경로 + STP 변화 + 동일 시간대 로그',
   observationDetail:'단일 명령이 아니라 여러 증거가 같은 방향을 가리킵니다.',
   commands:{
    aruba:'# 추가 명령보다 수집한 증거를 종합',
    cisco:'# 추가 명령보다 수집한 증거를 종합'
   },
   notes:{
    aruba:'실제 조치 전 하위 SW-B/SW-C 배선과 영향도를 확인하고 필요하면 한 경로를 통제된 방식으로 격리합니다.',
    cisco:'실제 조치 전 하위 스위치 배선과 영향도를 확인하고 필요하면 한 경로를 통제된 방식으로 격리합니다.'
   },
   output:'가설: VLAN 20의 L2 경로가 불안정하거나 Loop 가능성 있음\n근거: MAC 이동 + 두 이웃 경로 + STP 변화 + 동시간대 로그\n추가 확인: SW-B/SW-C 하위 배선·이중 연결·포트채널/Bonding\n조치: 영향도 확인 후 원인 경로를 통제된 방식으로 격리',
   canSay:'이제 <b>Loop/이중 경로 계열 문제를 우선 가설로 두고 현장 토폴로지를 확인할 충분한 근거</b>가 있습니다.',
   cannotSay:'증거 없이 “특정 포트가 범인”이라고 단정하거나 <b>업링크를 즉시 차단</b>하면 서비스 영향이 커질 수 있습니다.',
   next:'조치 후 MAC 위치, STP 상태, 로그가 안정화되는지 다시 검증합니다.'
  }
 ];
 let cliStep=0;
 let cliVendor='aruba';

 function renderCli(){
  const state=cliStates[cliStep];
  if(!state) return;

  document.querySelectorAll('[data-cli-step]').forEach(button=>{
   button.setAttribute('aria-pressed',String(Number(button.dataset.cliStep)===cliStep));
  });
  document.querySelectorAll('[data-cli-vendor]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.cliVendor===cliVendor));
  });

  const textValues={
   'cli-kicker':state.kicker,
   'cli-title':state.title,
   'cli-goal':state.goal,
   'cli-goal-detail':state.goalDetail,
   'cli-observation':state.observation,
   'cli-observation-detail':state.observationDetail,
   'cli-command':state.commands[cliVendor],
   'cli-command-note':state.notes[cliVendor],
   'cli-output':state.output,
   'cli-next-check':state.next,
   'cli-step-count':String(cliStep+1),
   'cli-vendor-label':cliVendor==='aruba'?'ARUBA AOS-SWITCH · 예시':'CISCO IOS XE · 예시'
  };
  for(const [id,value] of Object.entries(textValues)){
   const el=$(id);
   if(el) el.textContent=value;
  }

  const canSay=$('cli-can-say');
  const cannotSay=$('cli-cannot-say');
  if(canSay) canSay.innerHTML=state.canSay;
  if(cannotSay) cannotSay.innerHTML=state.cannotSay;

  const progress=$('cli-progress-bar');
  if(progress) progress.style.width=((cliStep+1)/cliStates.length*100)+'%';

  const prev=$('cli-prev');
  const next=$('cli-next-button');
  if(prev) prev.disabled=cliStep===0;
  if(next){
   next.disabled=cliStep===cliStates.length-1;
   next.textContent=cliStep===cliStates.length-1?'완료':'다음 →';
  }
 }

 document.querySelectorAll('[data-cli-step]').forEach(button=>button.addEventListener('click',()=>{
  cliStep=Number(button.dataset.cliStep);
  renderCli();
 }));

 document.querySelectorAll('[data-cli-vendor]').forEach(button=>button.addEventListener('click',()=>{
  cliVendor=button.dataset.cliVendor;
  renderCli();
 }));

 const cliPrev=$('cli-prev');
 if(cliPrev) cliPrev.addEventListener('click',()=>{
  if(cliStep>0){cliStep--;renderCli();}
 });
 const cliNextButton=$('cli-next-button');
 if(cliNextButton) cliNextButton.addEventListener('click',()=>{
  if(cliStep<cliStates.length-1){cliStep++;renderCli();}
 });

 const cliCopy=$('cli-copy-command');
 if(cliCopy) cliCopy.addEventListener('click',async()=>{
  const command=cliStates[cliStep]?.commands?.[cliVendor]||'';
  if(!command) return;
  const original=cliCopy.textContent;
  try{
   await navigator.clipboard.writeText(command);
   cliCopy.textContent='복사됨 ✓';
  }catch(error){
   const area=document.createElement('textarea');
   area.value=command;
   area.style.position='fixed';
   area.style.opacity='0';
   document.body.appendChild(area);
   area.select();
   document.execCommand('copy');
   area.remove();
   cliCopy.textContent='복사됨 ✓';
  }
  setTimeout(()=>{cliCopy.textContent=original;},1200);
 });
 renderCli();

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
