(() => {
  const $ = id => document.getElementById(id);

  const scenarios = [
    {
      id: 'echo',
      claim: 'ICMP-01',
      tab: '1 · Ping은 무엇을 확인할까?',
      title: 'Echo Request와 Echo Reply를 한 쌍으로 봅니다.',
      text: '정상 Route가 있는 R1 → R3 Ping입니다. 성공을 직접 확인하는 응답이 무엇인지 먼저 예상하세요.',
      start: ['R1 → R3 Route 정상', 'R3 Return Route 정상', 'ICMP Echo 5회'],
      question: 'R1의 Ping 성공을 직접 확인하는 ICMP 응답은 무엇일까요?',
      options: [
        ['reply', 'Echo Reply · Type 0'],
        ['time', 'Time Exceeded · Type 11'],
        ['unreach', 'Destination Unreachable · Type 3']
      ],
      correct: 'reply',
      reason: 'Ping은 Echo Request(Type 8)를 보내고 대응 Echo Reply(Type 0)가 돌아오는지 확인합니다. Request/Reply의 Identifier와 Sequence를 연결해 같은 왕복인지 확인할 수 있습니다.',
      metric1: ['Request', 'Type 8 · Code 0'],
      metric2: ['Reply', 'Type 0 · Code 0'],
      conclusion: 'Echo Request와 대응 Echo Reply가 왕복하면 Ping 성공을 확인할 수 있습니다.',
      steps: [
        {kind:'REQUEST',title:'R1 · Echo Request 전송',detail:'R1이 R3로 ICMP Type 8 Code 0을 보냅니다.',nodes:{r1:'active'},links:{l12:'active'},arrows:{l12:'→',l23:'·'}},
        {kind:'FORWARD',title:'R2 · Request Forwarding',detail:'R2가 목적지 Route를 사용해 R3 방향으로 전달합니다.',nodes:{r2:'active'},links:{l23:'active'},arrows:{l12:'→',l23:'→'}},
        {kind:'REPLY',title:'R3 · Echo Reply 반환',detail:'R3가 같은 Identifier/Sequence에 대응하는 Type 0 Code 0을 반환합니다.',nodes:{r3:'reply'},links:{l23:'reply'},arrows:{l12:'·',l23:'←'}},
        {kind:'SUCCESS',title:'R1 · Reply 수신',detail:'R1이 대응 Reply를 받아 왕복 도달을 확인합니다.',nodes:{r1:'reply'},links:{l12:'reply'},arrows:{l12:'←',l23:'←'}}
      ]
    },
    {
      id: 'ttl',
      claim: 'ICMP-02',
      tab: '2 · Router를 지나면 TTL은?',
      title: '같은 Packet의 Router 전·후 TTL을 비교합니다.',
      text: '검증 Run에서 같은 Echo Request가 CP1 TTL 255, CP2 TTL 254로 관찰됐습니다.',
      start: ['R1 송신 TTL = 255', 'R2에서 Forwarding', '같은 Echo Request 대조'],
      question: 'R2가 같은 IPv4 Echo Request를 Forward한 뒤 TTL은 얼마일까요?',
      options: [
        ['255', '255 · 그대로 유지'],
        ['254', '254 · 1 감소'],
        ['253', '253 · 2 감소']
      ],
      correct: '254',
      reason: 'IPv4 Router는 Packet을 Forward할 때 TTL을 감소시킵니다. 이번 검증에서는 동일 Echo Request가 R2 전 255, R2 후 254로 관찰됐습니다.',
      metric1: ['R2 전 · CP1', 'TTL 255'],
      metric2: ['R2 후 · CP2', 'TTL 254'],
      conclusion: 'Router Forwarding을 한 번 거치며 TTL이 1 감소했습니다.',
      steps: [
        {kind:'BEFORE',title:'CP1 · R2 들어가기 전',detail:'같은 Echo Request의 IPv4 TTL은 255입니다.',nodes:{r1:'active'},links:{l12:'active'},arrows:{l12:'→',l23:'·'}},
        {kind:'ROUTER',title:'R2 · Forwarding 판단',detail:'R2가 Route를 찾아 R3 방향으로 Packet을 Forward합니다.',nodes:{r2:'active'},links:{l12:'active'},arrows:{l12:'→',l23:'·'}},
        {kind:'AFTER',title:'CP2 · R2를 지난 뒤',detail:'동일 Echo Request의 TTL이 254로 관찰됩니다.',nodes:{r2:'active',r3:'active'},links:{l23:'active'},arrows:{l12:'·',l23:'→'}}
      ]
    },
    {
      id: 'expiry',
      claim: 'ICMP-03',
      tab: '3 · TTL이 1이면?',
      title: 'TTL이 만료되면 다음 Hop으로 보내지 않습니다.',
      text: 'R1이 TTL=1인 Probe를 보내 R2에서 TTL 만료를 의도적으로 만듭니다.',
      start: ['UDP Probe TTL = 1', 'R2가 첫 Hop', 'CP1 / CP2 동시 관찰'],
      question: 'TTL=1인 Probe가 R2에 도착하면 R2는 어떻게 할까요?',
      options: [
        ['forward', 'TTL을 그대로 두고 R3로 Forward'],
        ['time', 'Packet을 폐기하고 Type 11 Code 0 반환'],
        ['unreach', 'R3로 보낸 뒤 Type 3 반환']
      ],
      correct: 'time',
      reason: 'R2가 Forwarding하면서 TTL을 0으로 만들게 되므로 원래 Probe는 폐기됩니다. R2는 Source로 ICMP Time Exceeded Type 11 Code 0을 반환합니다.',
      metric1: ['TTL=1 Probe', 'R2에서 만료'],
      metric2: ['R2 응답', 'Type 11 · Code 0'],
      conclusion: 'TTL 만료 Packet은 다음 링크로 Forward되지 않고 Time Exceeded가 돌아옵니다.',
      steps: [
        {kind:'PROBE',title:'R1 · TTL=1 Probe 전송',detail:'UDP Probe가 R2 방향으로 들어갑니다.',nodes:{r1:'active'},links:{l12:'active'},arrows:{l12:'→',l23:'·'}},
        {kind:'EXPIRE',title:'R2 · TTL 만료',detail:'Forwarding 시 TTL이 0이 되므로 원래 Probe를 폐기합니다.',nodes:{r2:'stop'},links:{l12:'active',l23:'blocked'},arrows:{l12:'→',l23:'×'}},
        {kind:'TIME EXCEEDED',title:'R2 → R1 · Type 11 Code 0',detail:'R2가 원래 Probe Header를 포함한 ICMP Time Exceeded를 Source로 돌려보냅니다.',nodes:{r2:'reply',r1:'reply'},links:{l12:'reply',l23:'blocked'},arrows:{l12:'←',l23:'×'}}
      ]
    },
    {
      id: 'trace',
      claim: 'ICMP-04',
      tab: '4 · Traceroute는 Hop을 어떻게 찾을까?',
      title: 'TTL을 늘려가며 어느 Router에서 응답하는지 봅니다.',
      text: '이번 Cisco IOS 검증은 UDP Probe를 사용했습니다. Windows tracert의 Probe 방식과는 구분합니다.',
      start: ['Cisco IOS traceroute', 'UDP Probe', 'R1 → R2 → R3'],
      question: 'Cisco IOS traceroute가 첫 번째 Hop R2를 알아내는 핵심 응답은 무엇일까요?',
      options: [
        ['time', 'R2의 Time Exceeded · Type 11'],
        ['echo', 'R3의 Echo Reply · Type 0'],
        ['arp', 'R2의 ARP Reply']
      ],
      correct: 'time',
      reason: '첫 UDP Probe는 TTL=1이라 R2에서 만료되고 R2의 Time Exceeded가 돌아옵니다. 다음 Probe는 TTL을 늘려 R3까지 도달하며, 이번 Cisco IOS 구현에서는 R3의 Port Unreachable로 최종 도달을 확인했습니다.',
      metric1: ['첫 Probe', 'TTL 1 · UDP 33434'],
      metric2: ['다음 Probe', 'TTL 2 · UDP 33435'],
      conclusion: 'Time Exceeded 응답의 Source를 따라 중간 Hop을 단계적으로 드러냅니다.',
      steps: [
        {kind:'TTL 1',title:'R1 → R2 · UDP 33434',detail:'첫 Probe는 TTL=1이라 R2에서 만료됩니다.',nodes:{r1:'active',r2:'stop'},links:{l12:'active',l23:'blocked'},arrows:{l12:'→',l23:'×'}},
        {kind:'HOP 1',title:'R2 → R1 · Time Exceeded',detail:'R1은 응답 Source 10.10.12.2를 첫 번째 Hop으로 기록합니다.',nodes:{r2:'reply',r1:'reply'},links:{l12:'reply'},arrows:{l12:'←',l23:'·'}},
        {kind:'TTL 2',title:'R1 → R2 → R3 · UDP 33435',detail:'두 번째 Probe는 TTL=2로 R2를 지나 R3까지 도달합니다.',nodes:{r1:'active',r2:'active',r3:'active'},links:{l12:'active',l23:'active'},arrows:{l12:'→',l23:'→'}},
        {kind:'DESTINATION',title:'R3 → R1 · Type 3 Code 3',detail:'Cisco IOS UDP traceroute는 R3의 Port Unreachable로 목적지 도달을 확인하고 종료합니다.',nodes:{r3:'reply',r1:'reply'},links:{l12:'reply',l23:'reply'},arrows:{l12:'←',l23:'←'}}
      ]
    },
    {
      id: 'unreachable',
      claim: 'ICMP-05',
      tab: '5 · Route가 없으면?',
      title: '실제 Cisco 결과와 RFC 표준 의미를 구분합니다.',
      text: 'R2의 목적지 /32 Route만 제거했고 Default Route도 없는 상태입니다. 원래 Expected와 실제 Cisco 응답이 달랐습니다.',
      start: ['R2 목적지 Route 없음', 'R2 Default Route 없음', 'R3 링크는 정상'],
      question: '이번 실제 Cisco IOL 검증에서 R2가 반환한 ICMP 결과는 무엇이었을까요?',
      options: [
        ['host', 'Type 3 Code 1 · Host Unreachable'],
        ['net', 'Type 3 Code 0 · Network Unreachable'],
        ['silent', 'ICMP 없이 모두 무응답']
      ],
      correct: 'host',
      reason: 'RFC 1812의 no-route 표준 기대는 Code 0이지만, 이번 Cisco IOS 실제 관찰과 Cisco 공식 문서는 no-route 상황에서 Host Unreachable(Code 1)을 보여줍니다. 따라서 Code만 보지 말고 생성 Router의 Route Table과 함께 해석해야 합니다.',
      metric1: ['RFC no-route 의미', 'Code 0 · Network Unreachable'],
      metric2: ['Cisco Lab 실제', 'Code 1 · Host Unreachable'],
      conclusion: '표준 의미와 Vendor 구현을 구분하고 Route Table Evidence와 함께 해석합니다.',
      steps: [
        {kind:'REQUEST',title:'R1 → R2 · Echo Request',detail:'R1의 요청은 CP1에서 R2까지 실제로 도달했습니다.',nodes:{r1:'active',r2:'active'},links:{l12:'active'},arrows:{l12:'→',l23:'·'}},
        {kind:'NO ROUTE',title:'R2 · 목적지 Route 없음',detail:'198.51.100.3/32 Route와 Default Route가 모두 없어 R3 방향으로 Forward할 수 없습니다.',nodes:{r2:'stop'},links:{l23:'blocked'},arrows:{l12:'·',l23:'×'}},
        {kind:'UNREACHABLE',title:'R2 → R1 · Type 3 Code 1',detail:'이번 Cisco IOL Run에서는 Host Unreachable이 Source로 반환됐습니다.',nodes:{r2:'reply',r1:'reply'},links:{l12:'reply',l23:'blocked'},arrows:{l12:'←',l23:'×'}},
        {kind:'INTERPRET',title:'Code + Route Table을 함께 확인',detail:'원래 Expected(Code 0)는 FAIL로 보존했습니다. 이 차이를 Cisco 구현 차이로 해결해 학습에 반영합니다.',nodes:{r1:'active',r2:'stop'},links:{l12:'active',l23:'blocked'},arrows:{l12:'↔',l23:'×'}}
      ]
    }
  ];

  const answers = scenarios.map(() => ({ selected: null, submitted: false, correct: false }));
  let lesson = 0;
  let stepIndex = 0;
  let reviewReturn = false;
  let busy = false;

  function optionLabel(scenario, id) {
    return scenario.options.find(x => x[0] === id)?.[1] || '—';
  }

  function counts() {
    const submitted = answers.filter(a => a.submitted).length;
    const correct = answers.filter(a => a.submitted && a.correct).length;
    return { submitted, correct, wrong: submitted - correct, pending: answers.length - submitted };
  }

  function renderTabs() {
    $('lessonTabs').innerHTML = scenarios.map((s, i) => {
      const cls = ['lesson-tab', i === lesson ? 'active' : '', answers[i].submitted ? 'done' : ''].filter(Boolean).join(' ');
      return '<button class="' + cls + '" data-lesson="' + i + '">' + s.tab + '</button>';
    }).join('');
    $('lessonTabs').querySelectorAll('[data-lesson]').forEach(btn => btn.addEventListener('click', () => {
      if (busy) return;
      reviewReturn = false;
      loadLesson(Number(btn.dataset.lesson));
    }));
  }

  function renderProgress() {
    const c = counts();
    $('courseBar').style.width = (c.submitted / scenarios.length * 100) + '%';
    $('courseCount').textContent = '결과 확인 ' + c.submitted + ' / ' + scenarios.length + ' · 정답 ' + c.correct;
    renderTabs();
  }

  function renderChoices() {
    const s = scenarios[lesson];
    const a = answers[lesson];
    $('choices').innerHTML = s.options.map(([id, label]) => {
      const cls = ['choice', a.selected === id ? 'selected' : ''];
      if (a.submitted && id === s.correct) cls.push('correct-answer');
      if (a.submitted && a.selected === id && id !== s.correct) cls.push('wrong-answer');
      return '<button class="' + cls.filter(Boolean).join(' ') + '" data-choice="' + id + '"' + (a.submitted ? ' disabled' : '') + '>' + label + '</button>';
    }).join('');
    $('choices').querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => {
      if (busy || answers[lesson].submitted) return;
      answers[lesson].selected = btn.dataset.choice;
      renderChoices();
      updateControls();
    }));
  }

  function clearTopology() {
    ['nodeR1','nodeR2','nodeR3'].forEach(id => $(id).className = 'topo-node');
    ['link12','link23'].forEach(id => $(id).className = 'topo-link');
    $('link12Arrow').textContent = '·';
    $('link23Arrow').textContent = '·';
  }

  function applyStep() {
    const s = scenarios[lesson];
    const step = s.steps[stepIndex];
    clearTopology();
    const nodeMap = {r1:'nodeR1',r2:'nodeR2',r3:'nodeR3'};
    Object.entries(step.nodes || {}).forEach(([key, cls]) => $(nodeMap[key]).classList.add(cls));
    const linkMap = {l12:'link12',l23:'link23'};
    Object.entries(step.links || {}).forEach(([key, cls]) => $(linkMap[key]).classList.add(cls));
    $('link12Arrow').textContent = step.arrows?.l12 || '·';
    $('link23Arrow').textContent = step.arrows?.l23 || '·';
    $('eventKind').textContent = step.kind;
    $('eventTitle').textContent = step.title;
    $('eventDetail').textContent = step.detail;
    $('stepCount').textContent = (stepIndex + 1) + ' / ' + s.steps.length;
    $('prevStepBtn').disabled = stepIndex === 0;
    $('nextStepBtn').disabled = stepIndex === s.steps.length - 1;
  }

  function renderObservation() {
    const s = scenarios[lesson];
    $('metric1Label').textContent = s.metric1[0];
    $('metric1Value').textContent = s.metric1[1];
    $('metric2Label').textContent = s.metric2[0];
    $('metric2Value').textContent = s.metric2[1];
    $('observationConclusion').textContent = s.conclusion;
    applyStep();
  }

  function renderFeedback() {
    const s = scenarios[lesson];
    const a = answers[lesson];
    if (!a.submitted) {
      $('feedback').hidden = true;
      $('observation').hidden = true;
      return;
    }
    $('feedback').hidden = false;
    $('observation').hidden = false;
    $('feedback').className = 'feedback ' + (a.correct ? 'correct' : 'incorrect');
    $('feedbackBadge').textContent = a.correct ? '✓ 정답입니다' : '✕ 오답입니다';
    $('myAnswer').textContent = optionLabel(s, a.selected);
    $('correctAnswer').textContent = optionLabel(s, s.correct);
    $('feedbackReason').textContent = s.reason;
    renderObservation();
  }

  function updateControls() {
    const a = answers[lesson];
    $('runBtn').disabled = busy || !a.selected || a.submitted;
    $('resetBtn').disabled = busy || a.submitted || !a.selected;
    $('retryBtn').hidden = !a.submitted;
    $('nextLessonBtn').disabled = !a.submitted;
    $('summaryBackBtn').hidden = !reviewReturn;
    if (reviewReturn) {
      $('nextLessonBtn').textContent = '전체 결과로 돌아가기 →';
    } else if (lesson === scenarios.length - 1) {
      $('nextLessonBtn').textContent = '학습 결과 보기 →';
    } else {
      $('nextLessonBtn').textContent = '다음 문제 →';
    }
    updateQuick();
  }

  function updateQuick() {
    const a = answers[lesson];
    if ($('labMain').hidden) {
      $('quickNext').hidden = true;
      return;
    }
    let action = '';
    let label = '';
    if (!a.submitted && a.selected) {
      action = 'run';
      label = '② 실행해서 확인하기';
      $('quickLabel').textContent = '예상 선택 완료';
    } else if (a.submitted) {
      action = 'next';
      label = reviewReturn ? '전체 결과로 돌아가기 →' : (lesson === scenarios.length - 1 ? '학습 결과 보기 →' : '다음 문제 →');
      $('quickLabel').textContent = a.correct ? '결과 확인 완료 · 정답' : '결과 확인 완료 · 오답';
    }
    $('quickNext').hidden = !action;
    $('quickNext').dataset.action = action;
    $('quickBtn').textContent = label;
  }

  function loadLesson(i) {
    lesson = i;
    stepIndex = 0;
    const s = scenarios[i];
    const a = answers[i];
    $('summaryPanel').hidden = true;
    $('labMain').hidden = false;
    $('coachIcon').textContent = String(i + 1);
    $('coachTitle').textContent = s.title;
    $('coachText').textContent = s.text;
    $('startState').innerHTML = s.start.map(x => '<span>' + x + '</span>').join('');
    $('question').textContent = s.question;
    renderChoices();
    renderFeedback();
    renderProgress();
    updateControls();
    if (a.submitted) renderObservation();
  }

  function submitCurrent() {
    const a = answers[lesson];
    if (busy || a.submitted || !a.selected) return;
    busy = true;
    a.submitted = true;
    a.correct = a.selected === scenarios[lesson].correct;
    stepIndex = scenarios[lesson].steps.length - 1;
    renderChoices();
    renderFeedback();
    renderProgress();
    busy = false;
    updateControls();
    requestAnimationFrame(() => $('feedback').focus({preventScroll:true}));
    $('feedback').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function resetSelection() {
    const a = answers[lesson];
    if (busy || a.submitted) return;
    a.selected = null;
    renderChoices();
    updateControls();
  }

  function retryCurrent() {
    if (busy) return;
    answers[lesson] = { selected: null, submitted: false, correct: false };
    stepIndex = 0;
    loadLesson(lesson);
    requestAnimationFrame(() => $('question').focus?.());
  }

  function goNext() {
    if (!answers[lesson].submitted) return;
    if (reviewReturn) {
      showSummary();
      return;
    }
    if (lesson < scenarios.length - 1) {
      loadLesson(lesson + 1);
      window.scrollTo({top: $('labMain').offsetTop - 20, behavior:'smooth'});
    } else {
      showSummary();
    }
  }

  function renderSummary() {
    const c = counts();
    $('submittedCount').textContent = c.submitted;
    $('correctCount').textContent = c.correct;
    $('wrongCount').textContent = c.wrong;
    $('pendingCount').textContent = c.pending;
    $('summaryList').innerHTML = scenarios.map((s, i) => {
      const a = answers[i];
      const status = !a.submitted ? 'pending' : a.correct ? 'correct' : 'incorrect';
      const label = !a.submitted ? '미응답' : a.correct ? '✓ 정답' : '✕ 오답';
      const detail = !a.submitted ? '아직 답을 제출하지 않았습니다.' : '내 답 · ' + optionLabel(s, a.selected);
      const button = !a.submitted ? '문제 풀기' : a.correct ? '정답 복습' : '오답 해설 보기';
      return '<article class="summary-card ' + status + '"><div><strong>' + (i+1) + '. ' + s.title + '</strong><span class="status-badge">' + label + '</span><p>' + detail + '</p></div><button class="btn" data-review="' + i + '">' + button + '</button></article>';
    }).join('');
    $('summaryList').querySelectorAll('[data-review]').forEach(btn => btn.addEventListener('click', () => {
      reviewReturn = true;
      loadLesson(Number(btn.dataset.review));
      window.scrollTo({top: $('labMain').offsetTop - 20, behavior:'smooth'});
    }));
    const target = answers.findIndex(a => !a.submitted || !a.correct);
    $('continueBtn').hidden = target < 0;
    if (target >= 0) {
      $('continueBtn').textContent = answers[target].submitted ? '오답 문제 다시 보기 →' : '미응답 문제로 이동 →';
      $('continueBtn').dataset.target = String(target);
    }
  }

  function showSummary() {
    reviewReturn = false;
    renderSummary();
    $('labMain').hidden = true;
    $('summaryPanel').hidden = false;
    $('quickNext').hidden = true;
    requestAnimationFrame(() => $('summaryPanel').focus({preventScroll:true}));
    $('summaryPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('runBtn').addEventListener('click', submitCurrent);
  $('resetBtn').addEventListener('click', resetSelection);
  $('retryBtn').addEventListener('click', retryCurrent);
  $('nextLessonBtn').addEventListener('click', goNext);
  $('summaryBackBtn').addEventListener('click', showSummary);
  $('prevStepBtn').addEventListener('click', () => {
    if (stepIndex > 0) { stepIndex--; applyStep(); }
  });
  $('nextStepBtn').addEventListener('click', () => {
    if (stepIndex < scenarios[lesson].steps.length - 1) { stepIndex++; applyStep(); }
  });
  $('continueBtn').addEventListener('click', () => {
    const target = Number($('continueBtn').dataset.target);
    reviewReturn = true;
    loadLesson(Number.isFinite(target) ? target : 0);
    window.scrollTo({top: $('labMain').offsetTop - 20, behavior:'smooth'});
  });
  $('quickBtn').addEventListener('click', () => {
    const action = $('quickNext').dataset.action;
    if (action === 'run') submitCurrent();
    if (action === 'next') goNext();
  });

  loadLesson(0);
})();