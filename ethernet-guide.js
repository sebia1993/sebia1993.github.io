(() => {
 const $=id=>document.getElementById(id);
 const modes={
 known:{title:'Known Unicast · 목적지 포트를 알고 있음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 2번 포트',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'2번 포트로만 전달',copy:'목적지 MAC은 PC2 그대로',observer:'PC3 링크: 이 요청을 전달하지 않음',scope:'PC1 → PC2 통신 · 근거 실험 02',scenario:'02-known-unicast',flood:false},
 unknown:{title:'Unknown Unicast · 목적지 포트 정보가 없음',dst:'목적지 MAC: PC2',src:'출발지 MAC: PC1 · PC2행 ICMP 요청',table:'PC2 MAC → 등록 없음',learn:'받은 요청의 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'수신 1번 제외 → 2·3번으로 복사',copy:'복사본도 목적지 MAC은 PC2 그대로',observer:'PC3 링크에도 관찰 · PC3행 프레임은 아님',scope:'PC1 → PC2 통신 · 근거 실험 04. 링크 관찰은 PC3 내부 처리·응답을 증명하지 않습니다.',scenario:'04-unknown-unicast',flood:true},
 broadcast:{title:'Broadcast · 처음부터 같은 LAN에 보내는 주소',dst:'목적지 MAC: ff:ff:ff:ff:ff:ff',src:'출발지 MAC: PC1 · ARP 질문 대상 IP: PC3 (192.168.10.30)',table:'목적지 한 포트를 찾는 Unicast 조회가 아님',learn:'이 요청에서도 출발지 PC1 MAC → 1번 포트 학습·갱신',forward:'수신 1번 제외 → 2·3번으로 전달',copy:'처음부터 끝까지 Broadcast 목적지 MAC 유지',observer:'PC2·PC3 링크에 전달 · ARP가 묻는 IP는 PC3',scope:'실제 실험 03은 PC3를 찾는 ARP입니다. Known/Unknown의 PC2행 ICMP와 대상·프레임 종류가 다릅니다.',scenario:'03-broadcast',flood:true}
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
 }
 document.querySelectorAll('[data-path]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.path;document.querySelectorAll('[data-path]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.step)));
 render();
})();

(() => {
 const hero=document.querySelector('.preview-hero');
 if(!hero || document.getElementById('beginner-first')) return;

 const heroLead=hero.querySelector('h1 + p');
 if(heroLead){
  heroLead.innerHTML='이 Lab의 목표는 하나입니다. <b>스위치가 MAC 주소를 어떻게 배우고, 어느 포트로 보낼지 어떻게 결정하는지</b> 이해하는 것입니다.<br>처음에는 아래 <b>00 · 처음 읽기</b>만 이해해도 충분합니다.';
 }

 const metricArticles=hero.querySelectorAll('.result-metrics article');
 const metricValues=[
  ['6','전체 실험 · 패킷 5 + Aging 1'],
  ['15','원본 PCAP · 5개 실험 × 3지점'],
  ['7 / 7','핵심 동작 검증 통과'],
  ['1','저장된 GNS3 Lab']
 ];
 metricArticles.forEach((article,index)=>{
  if(!metricValues[index]) return;
  const strong=article.querySelector('strong');
  const span=article.querySelector('span');
  if(strong) strong.textContent=metricValues[index][0];
  if(span) span.textContent=metricValues[index][1];
 });

 const heroNote=hero.querySelector('.method-note');
 if(heroNote){
  heroNote.innerHTML='<b>처음부터 PCAP이나 FDB 명령을 해석할 필요는 없습니다.</b> 먼저 아래 초급 설명으로 흐름을 잡고, 그다음 실험 결과를 “정말 그렇게 동작했는지 확인하는 증거”로 보면 됩니다.';
 }

 const nav=document.querySelector('header .nav');
 if(nav && !nav.querySelector('a[href="#beginner-first"]')){
  const link=document.createElement('a');
  link.href='#beginner-first';
  link.textContent='처음 읽기';
  nav.prepend(link);
 }

 hero.insertAdjacentHTML('afterend', `
<section id="beginner-first">
 <div class="shell">
  <div class="section-head">
   <div>
    <div class="eyebrow">00 · BEGINNER FIRST</div>
    <h2>실험보다 먼저, 이것만 이해하세요.</h2>
   </div>
   <p>처음 배우는 단계에서는 용어를 외우기보다<br><b>스위치가 프레임 하나를 처리하는 순서</b>를 따라가면 됩니다.</p>
  </div>

  <div class="test-guide">
   <h3>30초 요약 · 딱 두 문장부터</h3>
   <p><b>① Source MAC(출발지 MAC)은 “누가 어느 포트에서 왔는지” 배우는 데 사용합니다.</b></p>
   <p><b>② Destination MAC(목적지 MAC)은 “어느 포트로 내보낼지” 결정하는 데 사용합니다.</b></p>
   <p>즉, 스위치는 <b>출발지를 보고 학습</b>하고, <b>목적지를 보고 전달 방향을 결정</b>합니다.</p>
  </div>

  <div class="path-facts">
   <article>
    <span>① 프레임을 받음</span>
    <h3>Source MAC부터 기록</h3>
    <p>PC1의 프레임이 1번 포트로 들어오면<br><b>PC1 MAC → 1번 포트</b>를 MAC Table에 학습·갱신합니다.</p>
   </article>
   <article>
    <span>② 목적지를 확인</span>
    <h3>Destination MAC을 조회</h3>
    <p>프레임의 목적지가 PC2라면<br>MAC Table에서 <b>PC2 MAC이 어느 포트에 있는지</b> 찾습니다.</p>
   </article>
   <article>
    <span>③ 출력 포트를 결정</span>
    <h3>알면 한 곳 · 모르면 여러 곳</h3>
    <p>PC2 위치를 알면 그 포트로만 보냅니다.<br>모르면 같은 LAN의 다른 포트들로 <b>Flooding</b>합니다.</p>
   </article>
  </div>

  <div class="note">
   <b>가장 중요한 오개념 정리:</b> 스위치는 <b>목적지 MAC을 배우려고 Flooding하는 것이 아닙니다.</b> Flooding은 목적지의 출력 포트를 모를 때 프레임을 여러 포트로 전달하는 동작입니다. PC2가 나중에 프레임을 보내고, 그 프레임의 <b>Source MAC이 PC2</b>로 들어와야 스위치가 <b>PC2 MAC → 들어온 포트</b>를 학습합니다.
  </div>

  <div class="section-head">
   <div>
    <div class="eyebrow">KNOWN · UNKNOWN · BROADCAST</div>
    <h2>세 가지를 이렇게 구별하면 됩니다.</h2>
   </div>
  </div>
  <div class="table-scroll">
   <table>
    <thead><tr><th>상황</th><th>프레임의 목적지 MAC</th><th>스위치가 아는 것</th><th>스위치 동작</th><th>초급자식 표현</th></tr></thead>
    <tbody>
     <tr><th scope="row">Known Unicast</th><td>PC2의 실제 MAC</td><td>PC2 MAC → 2번 포트를 알고 있음</td><td><b>2번 포트로만 전달</b></td><td>“PC2가 어디 있는지 안다.”</td></tr>
     <tr><th scope="row">Unknown Unicast</th><td>PC2의 실제 MAC</td><td>PC2가 어느 포트인지 모름</td><td>수신 포트를 제외한 같은 LAN의 포트로 <b>Flooding</b></td><td>“PC2에게 가야 하는 건 알지만, 어느 문으로 나갈지 모른다.”</td></tr>
     <tr><th scope="row">Broadcast</th><td><code>ff:ff:ff:ff:ff:ff</code></td><td>특정 목적지 포트를 찾는 상황이 아님</td><td>수신 포트를 제외한 같은 LAN의 포트로 전달</td><td>“처음부터 같은 LAN 모두에게 보내는 주소다.”</td></tr>
    </tbody>
   </table>
  </div>
  <p class="method-note"><b>Unknown Unicast와 Broadcast는 결과적으로 여러 포트로 나갈 수 있지만 같은 것이 아닙니다.</b> Unknown Unicast의 목적지 MAC은 여전히 PC2의 실제 MAC이고, Broadcast만 목적지 MAC이 <code>ff:ff:ff:ff:ff:ff</code>입니다.</p>

  <div class="section-head">
   <div>
    <div class="eyebrow">FIRST PING · FULL FLOW</div>
    <h2>아무것도 모르는 상태에서 첫 Ping은 어떻게 시작될까요?</h2>
   </div>
   <p>PC1과 PC2가 같은 서브넷에 있고,<br>ARP Cache와 MAC Table이 비어 있다고 가정합니다.</p>
  </div>
  <div class="grid grid3">
   <article class="card">
    <span class="tag learn">STEP 1</span>
    <h3>PC1이 PC2의 MAC을 모름</h3>
    <p>PC1은 바로 ICMP를 보내지 못합니다. 먼저 <b>ARP Request</b>로 “192.168.10.20의 MAC 주소가 뭐야?”라고 묻습니다.</p>
   </article>
   <article class="card">
    <span class="tag learn">STEP 2</span>
    <h3>ARP Request가 Switch에 들어옴</h3>
    <p>ARP Request의 Source MAC은 PC1입니다. 스위치는 <b>PC1 MAC → 들어온 포트</b>를 먼저 학습합니다. ARP Request는 Broadcast이므로 다른 포트로 전달됩니다.</p>
   </article>
   <article class="card">
    <span class="tag learn">STEP 3</span>
    <h3>PC2가 ARP Reply를 보냄</h3>
    <p>PC2의 응답이 스위치에 들어오면 Source MAC이 PC2이므로 <b>PC2 MAC → 들어온 포트</b>를 학습합니다. 이제 스위치는 PC1과 PC2의 위치를 압니다.</p>
   </article>
   <article class="card">
    <span class="tag prod">STEP 4</span>
    <h3>그다음 Ping은 Known Unicast</h3>
    <p>PC1은 ARP Cache에서 PC2 MAC을 알고, 스위치는 MAC Table에서 PC2 포트를 압니다. 따라서 ICMP Echo Request는 <b>PC2 포트로만</b> 전달됩니다.</p>
   </article>
  </div>

  <div class="section-head">
   <div>
    <div class="eyebrow">ARP TABLE vs MAC TABLE</div>
    <h2>PC가 아는 것과 Switch가 아는 것은 다릅니다.</h2>
   </div>
  </div>
  <div class="table-scroll">
   <table>
    <thead><tr><th>정보</th><th>주로 누가 가지고 있나?</th><th>저장하는 관계</th><th>쉽게 말하면</th></tr></thead>
    <tbody>
     <tr><th scope="row">ARP Cache / ARP Table</th><td>PC, Router 등 IP 장비</td><td><b>IP → MAC</b></td><td>“192.168.10.20은 어떤 MAC을 쓰지?”</td></tr>
     <tr><th scope="row">MAC Table / FDB</th><td>Switch / Bridge</td><td><b>MAC → Port</b></td><td>“이 MAC은 어느 포트 쪽에 있지?”</td></tr>
    </tbody>
   </table>
  </div>
  <div class="test-guide">
   <h3>그래서 ARP에는 있는데 MAC Table에는 없을 수도 있습니다.</h3>
   <p>PC1이 <b>PC2의 MAC 주소</b>를 알고 있어도, 스위치가 <b>PC2가 연결된 포트</b>를 모를 수 있습니다. 이 Lab의 Unknown Unicast 실험이 바로 그 상태를 일부러 만든 것입니다.</p>
  </div>

  <details class="test-commands">
   <summary>용어가 아직 헷갈리면 여기만 펼쳐보세요</summary>
   <p><b>MAC Table = FDB(Forwarding Database)</b> · 이 페이지에서는 거의 같은 의미로 보면 됩니다.</p>
   <p><b>Learning</b> · 들어온 프레임의 Source MAC과 수신 포트를 기록하는 것.</p>
   <p><b>Forwarding</b> · 목적지 MAC을 보고 적절한 출력 포트로 프레임을 보내는 것.</p>
   <p><b>Flooding</b> · 출력 포트를 하나로 정할 수 없거나 Broadcast일 때, 같은 LAN의 여러 포트로 프레임을 전달하는 것.</p>
   <p><b>Aging</b> · 일정 시간 동안 갱신되지 않은 동적 MAC Table 항목을 지우는 것.</p>
  </details>
  <p class="method-note">여기까지 이해했다면 아래 01번부터는 “새 개념”이라기보다 위 동작을 실제 GNS3·FDB·PCAP으로 확인하는 과정입니다. 한 번에 전부 이해하려 하지 말고, 먼저 <b>Source MAC = 학습 / Destination MAC = 전달 결정</b>만 확실히 잡으면 됩니다.</p>
 </div>
</section>`);
})();
