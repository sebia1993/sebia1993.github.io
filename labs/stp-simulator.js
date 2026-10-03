(() => {
  const $ = id => document.getElementById(id);

  const roleMaps = {
    equal: {
      root:'sw1',
      sw1:'Et0/0 Desg/FWD c4\nEt0/1 Desg/FWD c4',
      sw2:'Et0/0 Root/FWD c4\nEt0/1 Desg/FWD c4',
      sw3:'Et0/0 Root/FWD c4\nEt0/1 Altn/BLK c4'
    },
    baseline: {
      root:'sw1',
      sw1:'Et0/0 Desg/FWD c4\nEt0/1 Desg/FWD c4',
      sw2:'Et0/0 Root/FWD c4\nEt0/1 Desg/FWD c4',
      sw3:'Et0/0 Root/FWD c4\nEt0/1 Altn/BLK c4'
    },
    cost: {
      root:'sw1',
      sw1:'Et0/0 Desg/FWD c4\nEt0/1 Desg/FWD c4',
      sw2:'Et0/0 Root/FWD c4\nEt0/1 Desg/FWD c4',
      sw3:'Et0/0 Altn/BLK c20\nEt0/1 Root/FWD c4'
    },
    down: {
      root:'sw1',
      sw1:'Et0/0 Desg/FWD c4\nEt0/1 Desg/FWD c4',
      sw2:'Et0/0 Root/FWD c4\nEt0/1 Desg/FWD c4',
      sw3:'Et0/0 DOWN\nEt0/1 Root/FWD c4'
    },
    rootChange: {
      root:'sw3',
      sw1:'Et0/0 Desg/FWD c4\nEt0/1 Root/FWD c4',
      sw2:'Et0/0 Altn/BLK c4\nEt0/1 Root/FWD c4',
      sw3:'Et0/0 Desg/FWD c4\nEt0/1 Desg/FWD c4'
    }
  };

  const scenarios = [
    {
      id:'root-baseline',
      claim:'STP-01 / STP-02',
      tab:'1 · Root와 Baseline Tree',
      title:'Priority와 MAC으로 Root를 예측하고 Port Role을 확인합니다.',
      text:'같은 Priority에서는 MAC/BID Tie-break를 먼저 예측한 뒤, SW1/SW2/SW3에 서로 다른 Priority를 적용한 Baseline을 확인합니다.',
      start:['Equal Priority = 32768','MAC SW1 < SW2 < SW3','Baseline SW1 24576 / SW2 28672 / SW3 32768'],
      question:'세 Switch의 Base Priority가 모두 32768이라면 이번 Lab의 Root는 누구일까요?',
      options:[
        ['sw1','SW1 · 가장 낮은 Bridge MAC/BID'],
        ['sw2','SW2 · Triangle 가운데 Switch'],
        ['sw3','SW3 · PC3에 연결된 Switch']
      ],
      correct:'sw1',
      reason:'Priority가 같으면 Bridge ID의 MAC 부분이 Tie-break가 됩니다. 실제 Base MAC은 SW1 < SW2 < SW3였고, STP 출력을 보기 전에 SW1을 Root로 예측한 뒤 CLI/BPDU에서 일치함을 확인했습니다.',
      metric1:['Equal Priority Root','SW1 · lowest BID'],
      metric2:['Baseline Standby','SW3-L23 · Alternate/BLK'],
      conclusion:'Root를 먼저 정한 뒤 각 Non-root가 Root까지 가장 좋은 Port를 선택해 하나의 Tree를 만듭니다.',
      steps:[
        {
          kind:'PREDICTION',
          title:'세 Switch의 Priority는 모두 32768',
          detail:'STP 출력 전에 Base MAC을 확인했습니다: SW1 aabb.cc00.0100 < SW2 .0200 < SW3 .0300.',
          mode:'equal',
          links:{l12:'bpdu',l23:'bpdu',l31:'bpdu'},
          labels:{l12:'L12 · BPDU',l23:'L23 · BPDU',l31:'L31 · BPDU'},
          active:['sw1','sw2','sw3'],
          marker:{text:'BPDU',type:'bpdu',left:328,top:151}
        },
        {
          kind:'ROOT ELECTION',
          title:'Equal Priority Root = SW1',
          detail:'예측한 Lowest BID SW1이 실제 Root가 됐고 세 Inter-switch Link의 BPDU Root ID도 SW1을 가리켰습니다.',
          mode:'equal',
          links:{l12:'forwarding',l23:'alternate',l31:'forwarding'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · FWD'},
          active:['sw1'],
          marker:{text:'ROOT',type:'bpdu',left:179,top:132}
        },
        {
          kind:'PRIORITY OVERRIDE',
          title:'Baseline Priority를 서로 다르게 설정',
          detail:'SW1 24576 / SW2 28672 / SW3 32768로 설정해 MAC Tie-break보다 Priority 차이가 먼저 적용되는 Baseline을 만들었습니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'alternate',l31:'forwarding'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · FWD'},
          active:['sw1']
        },
        {
          kind:'DATA TREE',
          title:'PC1 → PC3 User Data는 L31 Direct Path',
          detail:'SW3-L23는 Alternate/BLK이고 warmed unicast는 PC1 → SW1 → L31 → SW3 → PC3로 전달됐습니다.',
          mode:'baseline',
          links:{pc1:'active-data',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · DATA'},
          active:['pc1','sw1','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:345,top:198}
        }
      ]
    },
    {
      id:'alternate',
      claim:'STP-03',
      tab:'2 · Alternate는 죽은 Port일까?',
      title:'Alternate/Discarding은 Cable Down이 아니라 Control Plane에 참여하는 Standby입니다.',
      text:'Baseline에서 SW3 Ethernet0/1(L23)은 Altn BLK였습니다. 같은 Link에서 실제 RSTP BPDU가 관찰됐습니다.',
      start:['Root = SW1','SW3-L23 = Alternate/BLK','L23 Cable = Up'],
      question:'SW3-L23가 Alternate/Discarding이라는 뜻으로 맞는 것은 무엇일까요?',
      options:[
        ['standby','User Data Forwarding은 제외 · BPDU Control Plane에는 참여'],
        ['down','Cable이 물리적으로 Down되어 아무 Frame도 볼 수 없음'],
        ['forward','User Data와 BPDU 모두 정상 Forwarding']
      ],
      correct:'standby',
      reason:'Alternate/Discarding은 논리적 Standby 역할입니다. User Data의 Active Tree에서는 제외되지만 L23 Capture에서 RSTP BPDU는 실제로 관찰됐습니다.',
      metric1:['SW3-L23 Role','Alternate / BLK'],
      metric2:['L23 Control Plane','RSTP BPDU 관찰'],
      conclusion:'Discarding은 “죽은 Link”가 아니라 Loop를 막기 위해 Data Forwarding을 대기시키는 상태입니다.',
      steps:[
        {
          kind:'ROLE',
          title:'SW3-L23 = Alternate / BLK',
          detail:'Cable은 Up이지만 이 Port는 Baseline User Data Forwarding Tree에서 제외됩니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'alternate',l31:'forwarding'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · FWD'},
          active:['sw3']
        },
        {
          kind:'CONTROL PLANE',
          title:'L23에서 RSTP BPDU는 계속 관찰',
          detail:'CP2의 IEEE LLC RSTP version 2 BPDU는 Root ID SW1을 가리켰습니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'bpdu',l31:'forwarding'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT · BPDU',l31:'L31 · FWD'},
          active:['sw2','sw3'],
          marker:{text:'BPDU',type:'bpdu',left:398,top:132}
        },
        {
          kind:'USER DATA',
          title:'PC1 → PC3 Data는 L31만 사용',
          detail:'Warmed Echo Request는 L31과 PC3 Edge에서 대응됐고 같은 Flow가 L23 Active Path로 전달되지 않았습니다.',
          mode:'baseline',
          links:{pc1:'active-data',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · DATA'},
          active:['pc1','sw1','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:345,top:198}
        },
        {
          kind:'ENDPOINT',
          title:'PC3에는 요청당 한 개의 Echo Request',
          detail:'3개 warmed request가 PC3 Edge에서 각각 한 번씩만 관찰됐고 Ping은 정상 완료됐습니다.',
          mode:'baseline',
          links:{pc1:'forwarding',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · DATA'},
          active:['pc3'],
          marker:{text:'IPv4',type:'data',left:555,top:178}
        }
      ]
    },
    {
      id:'cost',
      claim:'STP-04',
      tab:'3 · Cost를 바꾸면 Root Port는?',
      title:'Direct Cable보다 누적 Root Path Cost가 더 낮은 경로가 우선합니다.',
      text:'SW3→SW1 Direct Link Cost만 4에서 20으로 높였습니다. SW3→SW2 Cost 4 + SW2 Root Cost 4 = 총 8입니다.',
      start:['Root = SW1','SW3-L31 Cost = 20','SW3→SW2→SW1 Total Cost = 8'],
      question:'Cost 변경 후 SW3의 새 Root Port는 어느 Link일까요?',
      options:[
        ['l23','L23 · SW3→SW2 경유 Cost 8'],
        ['l31','L31 · SW3→SW1 Direct Cost 20'],
        ['both','L23와 L31을 동시에 Root Port로 사용']
      ],
      correct:'l23',
      reason:'Root Port는 Root까지의 가장 낮은 누적 Cost 경로를 선택합니다. Direct L31은 20, SW2 경유는 8이므로 SW3-L23가 Root/FWD가 되고 L31은 Alternate/BLK가 됐습니다.',
      metric1:['SW3 Root Path','L23 via SW2 · total cost 8'],
      metric2:['새 Standby','L31 · Alternate/BLK cost 20'],
      conclusion:'“직접 연결”보다 Root까지의 누적 Path Cost가 Root Port 선택 기준입니다.',
      steps:[
        {
          kind:'BASELINE',
          title:'변경 전 SW3 Root Port = L31',
          detail:'Cost가 모두 4일 때 SW3는 SW1 Direct L31을 Root Port로 사용합니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'alternate',l31:'active-data'},
          labels:{l12:'L12 · FWD c4',l23:'L23 · ALT c4',l31:'L31 · ROOT c4'},
          active:['sw3']
        },
        {
          kind:'COST CHANGE',
          title:'SW3-L31 Cost 4 → 20',
          detail:'다른 Priority, Link, Cost는 변경하지 않았습니다.',
          mode:'cost',
          links:{l12:'forwarding',l23:'forwarding',l31:'alternate'},
          labels:{l12:'L12 · FWD c4',l23:'L23 · ROOT c4',l31:'L31 · ALT c20'},
          active:['sw3']
        },
        {
          kind:'NEW DATA PATH',
          title:'PC1 → SW1 → SW2 → SW3 → PC3',
          detail:'실제 warmed request/reply가 CP1 + CP2 + CP4에 나타났고 CP3 L31은 Active Unicast Path가 아니었습니다.',
          mode:'cost',
          links:{pc1:'active-data',l12:'active-data',l23:'active-data',l31:'alternate',pc3:'active-data'},
          labels:{l12:'L12 · DATA',l23:'L23 · DATA',l31:'L31 · ALT c20'},
          active:['pc1','sw1','sw2','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:356,top:92}
        },
        {
          kind:'RECOVERY',
          title:'L31 Cost를 4로 원복',
          detail:'SW3 Root Port가 다시 L31로 돌아오고 L23은 Alternate/BLK, Direct Data Path도 복구됐습니다.',
          mode:'baseline',
          links:{pc1:'forwarding',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD c4',l23:'L23 · ALT c4',l31:'L31 · ROOT c4'},
          active:['sw3']
        }
      ]
    },
    {
      id:'link-failure',
      claim:'STP-05',
      tab:'4 · Root-Port Link가 끊기면?',
      title:'Alternate Path가 Root/FWD로 승격되어 연결성을 유지합니다.',
      text:'SW3의 기존 Root Port인 L31만 shutdown했습니다. Priority와 Cost는 Baseline 그대로 유지했습니다.',
      start:['Root = SW1','L31 = SW3 Root Port','L23 = Alternate/BLK'],
      question:'L31 장애 후 PC1→PC3의 새 경로는 무엇일까요?',
      options:[
        ['via-sw2','PC1 → SW1 → L12 → SW2 → L23 → SW3 → PC3'],
        ['fail','대체 경로가 있어도 통신은 계속 실패'],
        ['same','L31 Down 상태에서도 기존 L31로 전달']
      ],
      correct:'via-sw2',
      reason:'L31이 Down되자 SW3-L23가 Root/FWD로 승격됐고 실제 Data Path가 SW1→SW2→SW3로 전환됐습니다. 100개 Probe는 100/100 Reply였으며 중복 Endpoint Request도 없었습니다.',
      metric1:['Observed Delivery Gap','약 0.202초 · 200ms probe 기반'],
      metric2:['Endpoint Result','100 Request / 100 Reply · loss 0'],
      conclusion:'RSTP는 기존 Standby Path를 새 Forwarding Tree에 포함해 자동으로 연결성을 복구할 수 있습니다.',
      steps:[
        {
          kind:'BASELINE',
          title:'장애 전 Direct L31 Path',
          detail:'SW3 Root Port는 L31, L23은 Alternate/BLK입니다.',
          mode:'baseline',
          links:{pc1:'active-data',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · ROOT/DATA'},
          active:['pc1','sw1','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:345,top:198}
        },
        {
          kind:'LINK DOWN',
          title:'SW3 Ethernet0/0 · L31 shutdown',
          detail:'Alternate/Discarding과 달리 이번에는 실제 Interface가 administratively down입니다.',
          mode:'down',
          links:{l12:'forwarding',l23:'forwarding',l31:'down'},
          labels:{l12:'L12 · FWD',l23:'L23 · ROOT/FWD',l31:'L31 · DOWN'},
          active:['sw3'],
          marker:{text:'STOP',type:'stop',left:356,top:198}
        },
        {
          kind:'RECONVERGED PATH',
          title:'L23가 Root/FWD로 승격',
          detail:'새 User Data Path는 PC1 → SW1 → L12 → SW2 → L23 → SW3 → PC3입니다.',
          mode:'down',
          links:{pc1:'active-data',l12:'active-data',l23:'active-data',l31:'down',pc3:'active-data'},
          labels:{l12:'L12 · DATA',l23:'L23 · ROOT/DATA',l31:'L31 · DOWN'},
          active:['pc1','sw1','sw2','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:358,top:92}
        },
        {
          kind:'MEASUREMENT',
          title:'100 probes · 100 replies · Data Path Transition Gap ≈ 0.202s',
          detail:'동일 PNET 게스트 Capture Clock에서 마지막 Direct Delivery와 첫 Alternate Delivery 사이를 관찰했습니다. 200ms Probe 간격 제한이 있어 정확한 내부 Protocol Convergence Time으로 일반화하지 않습니다.',
          mode:'down',
          links:{l12:'active-data',l23:'active-data',l31:'down',pc3:'active-data'},
          labels:{l12:'L12 · DATA',l23:'L23 · DATA',l31:'L31 · DOWN'},
          active:['pc3'],
          marker:{text:'100/100',type:'data',left:548,top:178}
        },
        {
          kind:'RECOVERY',
          title:'L31 Up → Original Direct Path 복귀',
          detail:'SW3 Root Port가 L31로 돌아오고 L23은 Alternate/BLK로 복귀했습니다. Final Ping도 3/3 정상입니다.',
          mode:'baseline',
          links:{pc1:'forwarding',l12:'forwarding',l23:'alternate',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · ROOT/DATA'},
          active:['sw3']
        }
      ]
    },
    {
      id:'root-change',
      claim:'STP-06',
      tab:'5 · Root가 SW3로 바뀌면?',
      title:'Root가 바뀌면 Port Role과 차단 위치도 새 Root 기준으로 이동합니다.',
      text:'Baseline에서 SW3 Priority만 32768에서 16384로 낮췄습니다. Cost와 Link 상태는 그대로입니다.',
      start:['Baseline Root = SW1','SW3 Priority = 16384','Inter-switch Cost = 4'],
      question:'SW3가 새 Root가 된 뒤 Alternate/BLK 위치는 어디로 이동할까요?',
      options:[
        ['sw2-l12','SW2-L12 · SW2 Ethernet0/0'],
        ['sw3-l23','기존과 동일하게 SW3-L23'],
        ['none','Root가 바뀌면 모든 Triangle Link가 Forwarding']
      ],
      correct:'sw2-l12',
      reason:'SW3가 Root가 되면 SW1은 L31, SW2는 L23을 Root Port로 선택합니다. L12 Segment에서는 SW1이 Designated가 되고 SW2-L12가 Alternate/BLK로 이동했습니다.',
      metric1:['새 Root','SW3 · Operational Priority 16394'],
      metric2:['새 Alternate','SW2-L12 · Alternate/BLK'],
      conclusion:'Root 변화는 물리 Cable을 바꾸지 않고 전체 Port Role과 Standby 위치를 다시 계산합니다.',
      steps:[
        {
          kind:'BASELINE',
          title:'변경 전 Root = SW1',
          detail:'SW3-L23가 Alternate/BLK이고 PC1→PC3는 L31 Direct Path입니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'alternate',l31:'active-data'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · DATA'},
          active:['sw1']
        },
        {
          kind:'PRIORITY CHANGE',
          title:'SW3 Base Priority 32768 → 16384',
          detail:'다른 Priority / Cost / Link 상태는 그대로 유지했습니다.',
          mode:'rootChange',
          links:{l12:'alternate',l23:'forwarding',l31:'forwarding'},
          labels:{l12:'L12 · ALT/BLK',l23:'L23 · ROOT/FWD',l31:'L31 · ROOT/FWD'},
          active:['sw3']
        },
        {
          kind:'NEW ROOT',
          title:'Root = SW3',
          detail:'SW3의 두 Inter-switch Port는 Designated/FWD, SW1은 L31을 Root Port, SW2는 L23을 Root Port로 선택했습니다.',
          mode:'rootChange',
          links:{l12:'alternate',l23:'bpdu',l31:'bpdu'},
          labels:{l12:'L12 · ALT/BLK',l23:'L23 · ROOT/BPDU',l31:'L31 · ROOT/BPDU'},
          active:['sw3'],
          marker:{text:'ROOT',type:'bpdu',left:472,top:132}
        },
        {
          kind:'DATA PATH',
          title:'PC1 → PC3는 여전히 L31 Direct',
          detail:'Root가 SW3로 바뀌었지만 이 Host Flow의 실제 최단 Forwarding Path는 SW1→L31→SW3였습니다.',
          mode:'rootChange',
          links:{pc1:'active-data',l12:'alternate',l23:'forwarding',l31:'active-data',pc3:'active-data'},
          labels:{l12:'L12 · ALT/BLK',l23:'L23 · FWD',l31:'L31 · DATA'},
          active:['pc1','sw1','sw3','pc3'],
          marker:{text:'IPv4',type:'data',left:345,top:198}
        },
        {
          kind:'RECOVERY',
          title:'SW3 Priority 32768로 원복',
          detail:'Root SW1, SW3-L31 Root/FWD, SW3-L23 Alternate/BLK의 Original Baseline으로 복귀했습니다.',
          mode:'baseline',
          links:{l12:'forwarding',l23:'alternate',l31:'forwarding'},
          labels:{l12:'L12 · FWD',l23:'L23 · ALT/BLK',l31:'L31 · ROOT/FWD'},
          active:['sw1']
        }
      ]
    }
  ];

  const answers = scenarios.map(() => ({selected:null,submitted:false,correct:false}));
  let lesson=0, stepIndex=0, reviewReturn=false, busy=false;

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
      if(busy)return;
      reviewReturn=false;
      loadLesson(Number(btn.dataset.lesson));
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
      renderChoices();
      updateControls();
    }));
  }

  function applyRoleMap(mode){
    const map=roleMaps[mode]||roleMaps.baseline;
    ['sw1','sw2','sw3'].forEach(id=>{
      $(id).className='stp-node';
      if(id===map.root)$(id).classList.add('root');
    });
    $('sw1Ports').textContent=map.sw1;
    $('sw2Ports').textContent=map.sw2;
    $('sw3Ports').textContent=map.sw3;
  }

  function resetLinks(){
    const defs={
      pc1:['linkPc1Svg','labelPc1','PC1 Edge'],
      l12:['link12Svg','label12','L12 · FWD'],
      l23:['link23Svg','label23','L23 · ALT/BLK'],
      l31:['link31Svg','label31','L31 · FWD'],
      pc3:['linkPc3Svg','labelPc3','PC3 Edge']
    };
    Object.entries(defs).forEach(([key,[lineId,labelId,label]])=>{
      const line=$(lineId), lab=$(labelId);
      line.setAttribute('class','stp-link '+(key==='l23'?'alternate':'forwarding'));
      lab.className='link-label'+(key==='l23'?' alt':'');
      lab.textContent=label;
    });
    $('packetMarker').className='packet-marker';
    $('packetMarker').textContent='IPv4';
  }

  function setLink(key,state,label){
    const map={
      pc1:['linkPc1Svg','labelPc1'],
      l12:['link12Svg','label12'],
      l23:['link23Svg','label23'],
      l31:['link31Svg','label31'],
      pc3:['linkPc3Svg','labelPc3']
    };
    const pair=map[key];
    if(!pair)return;
    const line=$(pair[0]),lab=$(pair[1]);
    line.setAttribute('class','stp-link '+state);
    lab.className='link-label';
    if(state==='alternate')lab.classList.add('alt');
    if(state==='down')lab.classList.add('down');
    if(state==='active-data'||state==='reply'||state==='forwarding')lab.classList.add('active');
    if(state==='bpdu')lab.classList.add('bpdu');
    if(label)lab.textContent=label;
  }

  function showMarker(marker){
    const el=$('packetMarker');
    if(!marker){el.className='packet-marker';return;}
    el.className='packet-marker show';
    if(marker.type==='reply')el.classList.add('reply');
    if(marker.type==='bpdu')el.classList.add('bpdu');
    if(marker.type==='stop')el.classList.add('stop');
    el.textContent=marker.text||'Frame';
    el.style.left=marker.left+'px';
    el.style.top=marker.top+'px';
  }

  function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex];
    applyRoleMap(step.mode);
    resetLinks();

    Object.entries(step.links||{}).forEach(([key,state])=>setLink(key,state,step.labels?.[key]));
    Object.entries(step.labels||{}).forEach(([key,label])=>{
      if(!(step.links||{})[key])setLink(key,key==='l23'?'alternate':'forwarding',label);
    });

    (step.active||[]).forEach(id=>{
      const el=$(id);
      if(el)el.classList.add(id.startsWith('pc')&&step.kind.includes('REPLY')?'reply':'active');
    });

    if(step.mode==='down')$('sw3').classList.add('stop');
    showMarker(step.marker);

    $('eventKind').textContent=step.kind;
    $('eventTitle').textContent=step.title;
    $('eventDetail').textContent=step.detail;
    $('stepCount').textContent=(stepIndex+1)+' / '+s.steps.length;
    $('prevStepBtn').disabled=stepIndex===0;
    $('nextStepBtn').disabled=stepIndex===s.steps.length-1;
  }

  function renderObservation(){
    const s=scenarios[lesson];
    $('metric1Label').textContent=s.metric1[0];
    $('metric1Value').textContent=s.metric1[1];
    $('metric2Label').textContent=s.metric2[0];
    $('metric2Value').textContent=s.metric2[1];
    $('observationConclusion').textContent=s.conclusion;
    applyStep();
  }

  function renderFeedback(){
    const s=scenarios[lesson],a=answers[lesson];
    if(!a.submitted){
      $('feedback').hidden=true;
      $('observation').hidden=true;
      return;
    }
    $('feedback').hidden=false;
    $('observation').hidden=false;
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
    lesson=i;
    stepIndex=0;
    const s=scenarios[i],a=answers[i];
    $('summaryPanel').hidden=true;
    $('labMain').hidden=false;
    $('coachIcon').textContent=String(i+1);
    $('coachTitle').textContent=s.title;
    $('coachText').textContent=s.text;
    $('startState').innerHTML=s.start.map(x=>'<span>'+x+'</span>').join('');
    $('question').textContent=s.question;
    renderChoices();
    renderFeedback();
    renderProgress();
    updateControls();
    if(a.submitted)renderObservation();
  }

  function submitCurrent(){
    const a=answers[lesson];
    if(busy||a.submitted||!a.selected)return;
    busy=true;
    a.submitted=true;
    a.correct=a.selected===scenarios[lesson].correct;
    stepIndex=scenarios[lesson].steps.length-1;
    renderChoices();
    renderFeedback();
    renderProgress();
    busy=false;
    updateControls();
    requestAnimationFrame(()=>$('feedback').focus({preventScroll:true}));
    $('feedback').scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function resetSelection(){
    const a=answers[lesson];
    if(busy||a.submitted)return;
    a.selected=null;
    renderChoices();
    updateControls();
  }

  function retryCurrent(){
    if(busy)return;
    answers[lesson]={selected:null,submitted:false,correct:false};
    stepIndex=0;
    loadLesson(lesson);
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
    $('submittedCount').textContent=c.submitted;
    $('correctCount').textContent=c.correct;
    $('wrongCount').textContent=c.wrong;
    $('pendingCount').textContent=c.pending;
    $('summaryList').innerHTML=scenarios.map((s,i)=>{
      const a=answers[i],status=!a.submitted?'pending':a.correct?'correct':'incorrect';
      const label=!a.submitted?'미응답':a.correct?'✓ 정답':'✕ 오답';
      const detail=!a.submitted?'아직 답을 제출하지 않았습니다.':'내 답 · '+optionLabel(s,a.selected);
      const button=!a.submitted?'문제 풀기':a.correct?'정답 복습':'오답 해설 보기';
      return '<article class="summary-card '+status+'"><div><strong>'+(i+1)+'. '+s.title+'</strong><span class="status-badge">'+label+'</span><p>'+detail+'</p></div><button class="btn" data-review="'+i+'">'+button+'</button></article>';
    }).join('');
    $('summaryList').querySelectorAll('[data-review]').forEach(btn=>btn.addEventListener('click',()=>{
      reviewReturn=true;
      loadLesson(Number(btn.dataset.review));
      window.scrollTo({top:$('labMain').offsetTop-20,behavior:'smooth'});
    }));
    const target=answers.findIndex(a=>!a.submitted||!a.correct);
    $('continueBtn').hidden=target<0;
    if(target>=0){
      $('continueBtn').textContent=answers[target].submitted?'오답 문제 다시 보기 →':'미응답 문제로 이동 →';
      $('continueBtn').dataset.target=String(target);
    }
  }

  function showSummary(){
    reviewReturn=false;
    renderSummary();
    $('labMain').hidden=true;
    $('summaryPanel').hidden=false;
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
    reviewReturn=true;
    loadLesson(Number.isFinite(target)?target:0);
    window.scrollTo({top:$('labMain').offsetTop-20,behavior:'smooth'});
  });

  loadLesson(0);
})();