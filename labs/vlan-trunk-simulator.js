(() => {
  const $ = id => document.getElementById(id);

  const scenarios = [
    {
      id:'path20',
      claim:'VLAN-01 / VLAN-02',
      tab:'1 · Tagged/Untagged는 어디서 달라질까?',
      title:'같은 VLAN 20 Frame이 링크별로 Tagged/Untagged로 어떻게 보이는지 비교합니다.',
      text:'표준 관점에서는 VLAN membership과 802.1Q Tag 유무를 봅니다. 이번 Cisco 검증에서는 Host-facing Access Link는 Untagged, Switch 간 Trunk는 VLAN 20 Tagged였습니다.',
      start:['PC20A Port = Access VLAN 20','SW1↔SW2 = Trunk','Native VLAN = 99'],
      question:'PC20A → PC20B VLAN 20 Frame은 각 링크에서 어떻게 보일까요?',
      options:[
        ['tagged','Access Untagged → Trunk VLAN20 Tagged → Access Untagged'],
        ['alltag','모든 링크에서 VLAN20 Tagged'],
        ['alluntag','모든 링크에서 Untagged']
      ],
      correct:'tagged',
      reason:'핵심은 ingress Frame을 VLAN 20에 분류하고 링크 간에 VLAN ID가 필요할 때 802.1Q Tag로 전달하는 것입니다. 이번 Cisco 구현에서는 이를 Access → Trunk → Access로 확인했습니다.',
      metric1:['Access Link','Untagged'],
      metric2:['Trunk Link','802.1Q · VLAN 20'],
      conclusion:'공통 원리는 VLAN membership과 802.1Q Tag입니다. Access/Trunk는 이번 Cisco 구현에서 그 원리를 구성하는 방식입니다.',
      steps:[
        {kind:'ACCESS IN',title:'PC20A → SW1 · Untagged',detail:'PC20A의 일반 Ethernet Frame이 SW1 Access VLAN 20 Port로 들어옵니다.',lane20:'active',nodes:['v20a','v20trunk'],links:{v20left:'active'},arrows:{v20left:'→'}},
        {kind:'TRUNK',title:'SW1 → SW2 · 802.1Q VLAN 20',detail:'VLAN 20은 Native VLAN이 아니므로 Trunk에서 VLAN ID 20 Tag가 관찰됩니다.',lane20:'active',nodes:['v20trunk'],links:{v20left:'active',v20right:'tagged'},arrows:{v20left:'→',v20right:'→ 20'}},
        {kind:'ACCESS OUT',title:'SW2 → PC20B · Untagged',detail:'SW2는 VLAN 20을 유지한 채 PC20B Access VLAN 20 Port로 Untagged Frame을 내보냅니다.',lane20:'active',nodes:['v20trunk','v20b'],links:{v20right:'active'},arrows:{v20right:'→'}}
      ]
    },
    {
      id:'separation',
      claim:'VLAN-03',
      tab:'2 · 같은 Trunk에서 VLAN은 섞일까?',
      title:'하나의 Trunk를 공유해도 Broadcast Domain은 분리됩니다.',
      text:'VLAN 20 ARP Broadcast가 VLAN 20 경로에는 보였지만 VLAN 10 Access Link에는 보이지 않았고, VLAN 10 Positive Control은 정상 수집됐습니다.',
      start:['VLAN 10 / 20 모두 Trunk Allowed','PC20A ARP Cache 초기화','PC10 경로 Positive Control 정상'],
      question:'PC20A의 VLAN 20 ARP Broadcast는 어디까지 전달될까요?',
      options:[
        ['v20only','VLAN20 Trunk/Access 경로에만 전달'],
        ['allvlans','VLAN10과 VLAN20 모든 Access Port로 전달'],
        ['localonly','SW1 안에서만 전달되고 Trunk는 넘지 않음']
      ],
      correct:'v20only',
      reason:'802.1Q Trunk는 여러 VLAN을 운반하지만 VLAN ID를 유지합니다. VLAN 20 Broadcast는 VLAN 20 Broadcast Domain에만 속하며 VLAN 10 Access Port로 새지 않습니다.',
      metric1:['VLAN20 ARP','Trunk VLAN 20 + PC20B Access에서 관찰'],
      metric2:['VLAN10 Access','같은 VLAN20 ARP는 0개 · 별도 Positive Control 정상'],
      conclusion:'Trunk 하나를 공유해도 VLAN별 Layer 2 Broadcast Domain은 분리됩니다.',
      steps:[
        {kind:'BROADCAST',title:'PC20A · ARP Broadcast',detail:'PC20A가 VLAN 20에서 ARP Broadcast를 시작합니다.',lane20:'active',nodes:['v20a'],links:{v20left:'active'},arrows:{v20left:'→'}},
        {kind:'TRUNK VLAN20',title:'SW1 → SW2 · VLAN 20 Tagged',detail:'Broadcast이지만 VLAN 20 Traffic이므로 Trunk에서는 VLAN ID 20으로 운반됩니다.',lane20:'active',nodes:['v20trunk'],links:{v20right:'tagged'},arrows:{v20right:'→ 20'}},
        {kind:'SEPARATION',title:'VLAN 20 Access로만 전달',detail:'PC20B 쪽에는 전달되지만 PC10B VLAN 10 Access Link에는 같은 Broadcast이 나타나지 않습니다.',lane20:'active',nodes:['v20b'],links:{v20right:'active'},arrows:{v20right:'→'},lane10:'blocked'},
        {kind:'POSITIVE CONTROL',title:'VLAN 10 경로 자체는 정상',detail:'별도 VLAN 10 ARP/Ping은 PC10B 링크에서 정상 수집되어 단순 Capture 실패가 아님을 확인했습니다.',lane10:'active',nodes:['v10a','v10trunk','v10b'],links:{v10left:'active',v10right:'tagged'},arrows:{v10left:'→',v10right:'→ 10'}}
      ]
    },
    {
      id:'native',
      claim:'VLAN-04',
      tab:'3 · Native VLAN은 왜 예외일까?',
      title:'이번 Cisco 검증에서 Native VLAN 99는 Trunk에서도 Untagged였습니다.',
      text:'양쪽 Trunk Native VLAN은 99였고 global native tagging은 비활성 상태였습니다.',
      start:['Native VLAN = 99 양쪽 일치','Global native tagging = disabled','VLAN 10/20은 Non-native'],
      question:'이번 검증에서 VLAN 99 Traffic은 SW1↔SW2 Trunk에서 어떻게 보였을까요?',
      options:[
        ['untagged','802.1Q Tag 없이 Untagged'],
        ['tag99','802.1Q VLAN 99 Tagged'],
        ['blocked','Native VLAN이라 Trunk를 통과하지 않음']
      ],
      correct:'untagged',
      reason:'기본 Cisco 802.1Q Native VLAN 동작에서, 그리고 이번 실제 Run에서 VLAN 99 Traffic은 Trunk에서도 Untagged였습니다. 같은 Trunk의 VLAN 10/20은 Tagged였습니다.',
      metric1:['Native VLAN 99','Trunk에서 Untagged'],
      metric2:['Non-native VLAN 10/20','같은 Trunk에서 Tagged'],
      conclusion:'Trunk의 모든 Frame이 항상 Tagged인 것은 아닙니다.',
      steps:[
        {kind:'ACCESS 99',title:'PC99A → SW1 · Untagged',detail:'PC99A Access VLAN 99 Frame이 SW1로 들어옵니다.',lane99:'active',nodes:['v99a'],links:{v99left:'active'},arrows:{v99left:'→'}},
        {kind:'NATIVE TRUNK',title:'SW1 → SW2 · Untagged',detail:'VLAN 99는 Native VLAN이고 native tagging이 비활성이라 Trunk에서도 Tag 없이 관찰됐습니다.',lane99:'active',nodes:['v99trunk'],links:{v99right:'native'},arrows:{v99right:'→ native'}},
        {kind:'COMPARE',title:'VLAN 20은 Tagged',detail:'같은 Trunk에서 Non-native VLAN 20은 802.1Q VLAN ID 20 Tag를 사용합니다.',lane20:'active',nodes:['v20trunk'],links:{v20right:'tagged'},arrows:{v20right:'→ 20'}}
      ]
    },
    {
      id:'allowed',
      claim:'VLAN-05',
      tab:'4 · Allowed VLAN에서 20을 빼면?',
      title:'Trunk Link가 Up이어도 VLAN 20만 끊길 수 있습니다.',
      text:'SW1 Trunk Allowed 목록에서 VLAN 20만 제거했습니다. VLAN 10/99는 그대로 유지했습니다.',
      start:['Trunk Physical/Mode = Up','Allowed = 10,99','VLAN 20만 제거'],
      question:'이 상태에서 PC20A → PC20B VLAN 20 통신은 어떻게 될까요?',
      options:[
        ['blocked','SW1 Access까지 오지만 Trunk VLAN20 Egress에서 차단'],
        ['works','Trunk가 Up이므로 VLAN20도 정상 통과'],
        ['allfail','VLAN20 제거 때문에 VLAN10/99도 모두 실패']
      ],
      correct:'blocked',
      reason:'Allowed VLAN 목록은 그 Trunk를 통과할 VLAN을 제한합니다. 이번 Run에서는 PC20A ARP가 SW1 Access Link에는 있었지만 Trunk/PC20B 쪽에는 없었고 VLAN10/99는 계속 성공했습니다.',
      metric1:['Failure','Allowed = 10,99 · VLAN20 Trunk egress 없음'],
      metric2:['Recovery','VLAN20 복구 + STP Forwarding 확인 후 통신 정상'],
      conclusion:'Trunk Up 상태와 특정 VLAN의 통과 가능 여부는 별개입니다.',
      steps:[
        {kind:'FAILURE',title:'PC20A → SW1 · ARP 도착',detail:'VLAN 20 ARP는 PC20A Access Link에서 실제로 관찰됩니다.',lane20:'active',nodes:['v20a','v20trunk'],links:{v20left:'active'},arrows:{v20left:'→'}},
        {kind:'STOP',title:'SW1 Trunk · VLAN 20 Allowed 아님',detail:'VLAN 20은 Allowed 목록에서 빠져 있어 SW1→SW2 Trunk로 나오지 않습니다.',lane20:'blocked',nodes:['v20trunk'],links:{v20right:'blocked'},arrows:{v20right:'×'}},
        {kind:'CONTROL',title:'VLAN 10 / 99는 계속 정상',detail:'다른 Allowed VLAN의 대조군 통신은 계속 성공했습니다.',lane10:'active',lane99:'active',nodes:['v10trunk','v99trunk'],links:{v10right:'tagged',v99right:'native'},arrows:{v10right:'→ 10',v99right:'→ native'}},
        {kind:'RECOVERY',title:'VLAN 20 Allowed 복구',detail:'Allowed 10,20,99로 복구하고 STP Forwarding을 확인한 뒤 VLAN 20 통신과 Tagged Frame이 다시 나타났습니다.',lane20:'active',nodes:['v20a','v20trunk','v20b'],links:{v20left:'active',v20right:'tagged'},arrows:{v20left:'→',v20right:'→ 20'}}
      ]
    },
    {
      id:'mismatch',
      claim:'VLAN-06',
      tab:'5 · Access VLAN이 한쪽만 다르면?',
      title:'Trunk는 정상이어도 마지막 Access VLAN에서 통신이 멈출 수 있습니다.',
      text:'SW2의 PC20B Port만 Access VLAN 20에서 VLAN 10으로 바꿨습니다. Trunk와 Allowed 목록은 정상 상태를 유지했습니다.',
      start:['PC20A = Access VLAN 20','PC20B Port = Access VLAN 10','Trunk Allowed = 10,20,99'],
      question:'PC20A의 VLAN 20 ARP Broadcast은 어디에서 멈출까요?',
      options:[
        ['pc20b','Trunk까지 VLAN20으로 가지만 PC20B Access Link로는 나오지 않음'],
        ['sw1','SW1에서 바로 멈춰 Trunk에도 안 나감'],
        ['works','PC20B IP가 같으므로 VLAN이 달라도 전달됨']
      ],
      correct:'pc20b',
      reason:'SW1과 Trunk는 VLAN 20을 정상 처리했습니다. 하지만 SW2의 PC20B Port가 VLAN 10이므로 VLAN 20 Broadcast은 그 Access Link로 전달되지 않았습니다.',
      metric1:['Trunk','VLAN20 Tagged Frame 정상'],
      metric2:['PC20B Access','VLAN20 Frame 없음 · VLAN10 Positive Control 정상'],
      conclusion:'Access VLAN mismatch는 Link Up 상태에서도 Host를 다른 L2 Broadcast Domain에 놓습니다.',
      steps:[
        {kind:'VLAN20',title:'PC20A → SW1 → Trunk',detail:'VLAN 20 ARP는 Access에서 들어와 Trunk에서 VLAN20 Tagged로 정상 통과합니다.',lane20:'active',nodes:['v20a','v20trunk'],links:{v20left:'active',v20right:'tagged'},arrows:{v20left:'→',v20right:'→ 20'},pc20b:'Access 10'},
        {kind:'MISMATCH',title:'SW2 · PC20B Port는 VLAN 10',detail:'VLAN 20 Frame은 VLAN 10 Access Port인 PC20B 방향으로 Egress되지 않습니다.',lane20:'blocked',nodes:['v20b'],links:{v20right:'blocked'},arrows:{v20right:'×'},pc20b:'Access 10'},
        {kind:'CONTROL',title:'PC20B Link 자체는 살아 있음',detail:'장애 구간에서 VLAN 10 Broadcast이 PC20B Link에 보였으므로 Capture/Port 자체 문제는 아닙니다.',lane10:'active',nodes:['v10trunk','v20b'],links:{v10right:'tagged'},arrows:{v10right:'→ 10'},pc20b:'Access 10'},
        {kind:'RECOVERY',title:'PC20B Port를 Access VLAN 20으로 복구',detail:'원복 후 VLAN 20 Traffic이 PC20B Access Link에 다시 나타나고 Ping이 정상화됐습니다.',lane20:'active',nodes:['v20a','v20trunk','v20b'],links:{v20left:'active',v20right:'tagged'},arrows:{v20left:'→',v20right:'→ 20'},pc20b:'Access 20'}
      ]
    }
  ];

  const answers=scenarios.map(()=>({selected:null,submitted:false,correct:false}));
  let lesson=0,stepIndex=0,reviewReturn=false,busy=false;

  function optionLabel(s,id){return s.options.find(x=>x[0]===id)?.[1]||'—';}
  function counts(){
    const submitted=answers.filter(a=>a.submitted).length;
    const correct=answers.filter(a=>a.submitted&&a.correct).length;
    return {submitted,correct,wrong:submitted-correct,pending:answers.length-submitted};
  }

  function renderTabs(){
    $('lessonTabs').innerHTML=scenarios.map((s,i)=>{
      const cls=['lesson-tab',i===lesson?'active':'',answers[i].submitted?'done':''].filter(Boolean).join(' ');
      return '<button class="'+cls+'" data-lesson="'+i+'">'+s.tab+'</button>';
    }).join('');
    $('lessonTabs').querySelectorAll('[data-lesson]').forEach(btn=>btn.addEventListener('click',()=>{
      if(busy)return;reviewReturn=false;loadLesson(Number(btn.dataset.lesson));
    }));
  }

  function renderProgress(){
    const c=counts();
    $('courseBar').style.width=(c.submitted/scenarios.length*100)+'%';
    $('courseCount').textContent='결과 확인 '+c.submitted+' / '+scenarios.length+' · 정답 '+c.correct;
    renderTabs();
  }

  function renderChoices(){
    const s=scenarios[lesson],a=answers[lesson];
    $('choices').innerHTML=s.options.map(([id,label])=>{
      const cls=['choice',a.selected===id?'selected':''];
      if(a.submitted&&id===s.correct)cls.push('correct-answer');
      if(a.submitted&&a.selected===id&&id!==s.correct)cls.push('wrong-answer');
      return '<button class="'+cls.filter(Boolean).join(' ')+'" data-choice="'+id+'"'+(a.submitted?' disabled':'')+'>'+label+'</button>';
    }).join('');
    $('choices').querySelectorAll('[data-choice]').forEach(btn=>btn.addEventListener('click',()=>{
      if(busy||answers[lesson].submitted)return;
      answers[lesson].selected=btn.dataset.choice;
      renderChoices();updateControls();
    }));
  }

  const nodeBase={
    pc10a:'device-node host vlan10 pc10a',pc20a:'device-node host vlan20 pc20a',pc99a:'device-node host vlan99 pc99a',
    sw1:'device-node switch sw1',sw2:'device-node switch sw2',
    pc10b:'device-node host vlan10 pc10b',pc20b:'device-node host vlan20 pc20b',pc99b:'device-node host vlan99 pc99b'
  };
  const linkBase={
    link10L:'topo-link access-left link10l',link20L:'topo-link access-left link20l',link99L:'topo-link access-left link99l',
    trunkLink:'topo-link trunk',
    link10R:'topo-link access-right link10r',link20R:'topo-link access-right link20r',link99R:'topo-link access-right link99r'
  };
  const stateIds={link10L:'state10L',link20L:'state20L',link99L:'state99L',trunkLink:'stateTrunk',link10R:'state10R',link20R:'state20R',link99R:'state99R'};

  function clearTopology(){
    Object.entries(nodeBase).forEach(([id,cls])=>$(id).className=cls);
    Object.entries(linkBase).forEach(([id,cls])=>{
      $(id).className=cls;
      $(stateIds[id]).textContent='';
    });
    $('pc20bVlan').textContent='Access VLAN 20';
  }

  function markNodes(ids,cls='active'){
    (ids||[]).forEach(id=>$(id)?.classList.add(cls));
  }

  function markLink(id,cls,label){
    const el=$(id); if(!el)return;
    cls.split(/\s+/).filter(Boolean).forEach(c=>el.classList.add(c));
    if(/active|tagged|native|control/.test(cls))el.classList.add('has-flow');
    $(stateIds[id]).textContent=label||'';
  }

  function visualStateFor(scenarioId,index,step){
    const S={nodes:[],control:[],stop:[],excluded:[],links:[],pc20b:step.pc20b||null};
    const L=(id,cls,label)=>S.links.push([id,cls,label]);
    if(scenarioId==='path20'){
      if(index===0){S.nodes=['pc20a','sw1'];L('link20L','active','UNTAGGED');}
      if(index===1){S.nodes=['sw1','sw2'];L('trunkLink','tagged','802.1Q · VLAN 20');}
      if(index===2){S.nodes=['sw2','pc20b'];L('link20R','active','UNTAGGED');}
    }else if(scenarioId==='separation'){
      if(index===0){S.nodes=['pc20a','sw1'];L('link20L','active','ARP BROADCAST');}
      if(index===1){S.nodes=['sw1','sw2'];L('trunkLink','tagged','BROADCAST · TAG 20');}
      if(index===2){
        S.nodes=['sw2','pc20b'];S.excluded=['pc10b'];
        L('link20R','active','VLAN 20');L('link10R','isolated','VLAN 20 아님');
      }
      if(index===3){
        S.control=['pc10a','sw1','sw2','pc10b'];
        L('link10L','control','VLAN 10');L('trunkLink','tagged','POSITIVE CONTROL · TAG 10');L('link10R','control','VLAN 10');
      }
    }else if(scenarioId==='native'){
      if(index===0){S.nodes=['pc99a','sw1'];L('link99L','active','UNTAGGED');}
      if(index===1){S.nodes=['sw1','sw2'];L('trunkLink','native','UNTAGGED · NATIVE 99');}
      if(index===2){S.nodes=['sw1','sw2'];L('trunkLink','tagged','COMPARE · TAG 20');}
    }else if(scenarioId==='allowed'){
      if(index===0){S.nodes=['pc20a','sw1'];L('link20L','active','ARP BROADCAST');}
      if(index===1){S.nodes=['sw1'];L('trunkLink','blocked','VLAN 20 · NOT ALLOWED');}
      if(index===2){
        S.control=['sw1','sw2'];L('trunkLink','control','VLAN 10 ✓ · VLAN 99 ✓');
      }
      if(index===3){
        S.nodes=['pc20a','sw1','sw2','pc20b'];
        L('link20L','active','UNTAGGED');L('trunkLink','tagged','RECOVERY · TAG 20');L('link20R','active','UNTAGGED');
      }
    }else if(scenarioId==='mismatch'){
      if(index===0){
        S.nodes=['pc20a','sw1','sw2'];S.pc20b='Access VLAN 10';
        L('link20L','active','VLAN 20');L('trunkLink','tagged','TAG 20');
      }
      if(index===1){
        S.nodes=['sw2'];S.stop=['pc20b'];S.pc20b='Access VLAN 10';
        L('trunkLink','tagged','VLAN 20 정상 도착');L('link20R','blocked','PORT = ACCESS VLAN 10');
      }
      if(index===2){
        S.control=['pc10a','sw1','sw2','pc20b'];S.pc20b='Access VLAN 10';
        L('link10L','control','VLAN 10');L('trunkLink','tagged','POSITIVE CONTROL · TAG 10');L('link20R','control','ACCESS VLAN 10');
      }
      if(index===3){
        S.nodes=['pc20a','sw1','sw2','pc20b'];S.pc20b='Access VLAN 20';
        L('link20L','active','UNTAGGED');L('trunkLink','tagged','RECOVERY · TAG 20');L('link20R','active','UNTAGGED');
      }
    }
    return S;
  }

  function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex];
    clearTopology();
    const v=visualStateFor(s.id,stepIndex,step);
    markNodes(v.nodes,'active');markNodes(v.control,'control');markNodes(v.stop,'stop');markNodes(v.excluded,'excluded');
    v.links.forEach(([id,cls,label])=>markLink(id,cls,label));
    if(v.pc20b)$('pc20bVlan').textContent=v.pc20b;
    $('eventKind').textContent=step.kind;
    $('eventTitle').textContent=step.title;
    $('eventDetail').textContent=step.detail;
    $('stepCount').textContent=(stepIndex+1)+' / '+s.steps.length;
    $('prevStepBtn').disabled=stepIndex===0;
    $('nextStepBtn').disabled=stepIndex===s.steps.length-1;
  }

  function renderObservation(){
    const s=scenarios[lesson];
    $('metric1Label').textContent=s.metric1[0];$('metric1Value').textContent=s.metric1[1];
    $('metric2Label').textContent=s.metric2[0];$('metric2Value').textContent=s.metric2[1];
    $('observationConclusion').textContent=s.conclusion;
    applyStep();
  }

  function renderFeedback(){
    const s=scenarios[lesson],a=answers[lesson];
    if(!a.submitted){$('feedback').hidden=true;$('observation').hidden=true;return;}
    $('feedback').hidden=false;$('observation').hidden=false;
    $('feedback').className='feedback '+(a.correct?'correct':'incorrect');
    $('feedbackBadge').textContent=a.correct?'✓ 정답입니다':'✕ 오답입니다';
    $('myAnswer').textContent=optionLabel(s,a.selected);
    $('correctAnswer').textContent=optionLabel(s,s.correct);
    $('feedbackReason').textContent=s.reason;
    renderObservation();
  }

  function updateControls(){
    const a=answers[lesson];
    $('runBtn').disabled=busy||!a.selected||a.submitted;
    $('resetBtn').disabled=busy||a.submitted||!a.selected;
    $('retryBtn').hidden=!a.submitted;
    $('nextLessonBtn').disabled=!a.submitted;
    $('summaryBackBtn').hidden=!reviewReturn;
    if(reviewReturn)$('nextLessonBtn').textContent='전체 결과로 돌아가기 →';
    else if(lesson===scenarios.length-1)$('nextLessonBtn').textContent='학습 결과 보기 →';
    else $('nextLessonBtn').textContent='다음 문제 →';
  }

  function loadLesson(i){
    lesson=i;stepIndex=0;
    const s=scenarios[i],a=answers[i];
    $('summaryPanel').hidden=true;$('labMain').hidden=false;
    $('coachIcon').textContent=String(i+1);
    $('coachTitle').textContent=s.title;
    $('coachText').textContent=s.text;
    $('startState').innerHTML=s.start.map(x=>'<span>'+x+'</span>').join('');
    $('question').textContent=s.question;
    renderChoices();renderFeedback();renderProgress();updateControls();
    if(a.submitted)renderObservation();
  }

  function submitCurrent(){
    const a=answers[lesson];
    if(busy||a.submitted||!a.selected)return;
    busy=true;
    a.submitted=true;a.correct=a.selected===scenarios[lesson].correct;
    stepIndex=scenarios[lesson].steps.length-1;
    renderChoices();renderFeedback();renderProgress();
    busy=false;updateControls();
    requestAnimationFrame(()=>$('feedback').focus({preventScroll:true}));
    $('feedback').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function resetSelection(){
    const a=answers[lesson];if(busy||a.submitted)return;
    a.selected=null;renderChoices();updateControls();
  }

  function retryCurrent(){
    if(busy)return;
    answers[lesson]={selected:null,submitted:false,correct:false};
    stepIndex=0;loadLesson(lesson);
  }

  function goNext(){
    if(!answers[lesson].submitted)return;
    if(reviewReturn){showSummary();return;}
    if(lesson<scenarios.length-1){
      loadLesson(lesson+1);
      window.scrollTo({top:$('labMain').offsetTop-20,behavior:'smooth'});
    }else showSummary();
  }

  function renderSummary(){
    const c=counts();
    $('submittedCount').textContent=c.submitted;$('correctCount').textContent=c.correct;
    $('wrongCount').textContent=c.wrong;$('pendingCount').textContent=c.pending;
    $('summaryList').innerHTML=scenarios.map((s,i)=>{
      const a=answers[i],status=!a.submitted?'pending':a.correct?'correct':'incorrect';
      const label=!a.submitted?'미응답':a.correct?'✓ 정답':'✕ 오답';
      const detail=!a.submitted?'아직 답을 제출하지 않았습니다.':'내 답 · '+optionLabel(s,a.selected);
      const button=!a.submitted?'문제 풀기':a.correct?'정답 복습':'오답 해설 보기';
      return '<article class="summary-card '+status+'"><div><strong>'+(i+1)+'. '+s.title+'</strong><span class="status-badge">'+label+'</span><p>'+detail+'</p></div><button class="btn" data-review="'+i+'">'+button+'</button></article>';
    }).join('');
    $('summaryList').querySelectorAll('[data-review]').forEach(btn=>btn.addEventListener('click',()=>{
      reviewReturn=true;loadLesson(Number(btn.dataset.review));window.scrollTo({top:$('labMain').offsetTop-20,behavior:'smooth'});
    }));
    const target=answers.findIndex(a=>!a.submitted||!a.correct);
    $('continueBtn').hidden=target<0;
    if(target>=0){
      $('continueBtn').textContent=answers[target].submitted?'오답 문제 다시 보기 →':'미응답 문제로 이동 →';
      $('continueBtn').dataset.target=String(target);
    }
  }

  function showSummary(){
    reviewReturn=false;renderSummary();
    $('labMain').hidden=true;$('summaryPanel').hidden=false;
    requestAnimationFrame(()=>$('summaryPanel').focus({preventScroll:true}));
    $('summaryPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('runBtn').addEventListener('click',submitCurrent);
  $('resetBtn').addEventListener('click',resetSelection);
  $('retryBtn').addEventListener('click',retryCurrent);
  $('nextLessonBtn').addEventListener('click',goNext);
  $('summaryBackBtn').addEventListener('click',showSummary);
  $('prevStepBtn').addEventListener('click',()=>{if(stepIndex>0){stepIndex--;applyStep();}});
  $('nextStepBtn').addEventListener('click',()=>{if(stepIndex<scenarios[lesson].steps.length-1){stepIndex++;applyStep();}});
  $('continueBtn').addEventListener('click',()=>{
    const target=Number($('continueBtn').dataset.target);
    reviewReturn=true;loadLesson(Number.isFinite(target)?target:0);
    window.scrollTo({top:$('labMain').offsetTop-20,behavior:'smooth'});
  });

  loadLesson(0);
})();