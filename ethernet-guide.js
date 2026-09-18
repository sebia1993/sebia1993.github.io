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
