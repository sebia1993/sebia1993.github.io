// Existing lesson data and topic renderer retained from stp-simulator; playback is shared.
(()=>{
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


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function applyRoleMap(mode){
    const map=roleMaps[mode]||roleMaps.baseline;
    ['pc1','pc3'].forEach(id=>$(id).className='stp-node');
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
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;applyRoleMap('baseline');resetLinks();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};
// Presentation-only adaptation: verified scenarios above remain unchanged.
adapter.presentation={
 names:{SW1:'Switch A',SW2:'Switch B',SW3:'Switch C',PC1:'PC A',PC3:'PC C'},
 labels:{'Lab':'실습','State':'상태','Layer':'계층','Logical':'논리','Physical':'물리','Control Plane':'제어 정보','Data':'데이터','Learning Topology':'학습 토폴로지','Common Model':'공통 학습 모델','Actual':'관찰 결과','User Data':'사용자 데이터','Direct Path':'직접 경로','Standby':'대기','Baseline':'기준 상태','Equal Priority':'동일 Priority','lowest BID':'가장 낮은 BID','Root와 Baseline Tree':'Root와 기준 전달 경로','Triangle':'삼각형','Cable':'케이블','Control Plane':'제어 정보','Data Path':'데이터 경로','Endpoint Result':'목적지 관찰 결과','Observed Delivery Gap':'관찰한 전달 간격','ROOT ELECTION':'Root 선출','PRIORITY OVERRIDE':'Priority 적용','DATA TREE':'전달 경로','PREDICTION':'조건 비교','ROLE':'포트 역할','USER DATA':'사용자 데이터','ENDPOINT':'목적지 도착','BASELINE':'기준 상태','COST CHANGE':'Cost 변경','NEW DATA PATH':'새 전달 경로','RECOVERY':'복구','LINK DOWN':'링크 장애','RECONVERGED PATH':'대체 경로','MEASUREMENT':'측정 결과','PRIORITY CHANGE':'Priority 변경','NEW ROOT':'새 Root','DATA PATH':'전달 경로','CONTROL PLANE':'BPDU 교환','STOP':'전달 중단','Edge':'연결','Root Path':'Root 경로'},
 lessons:[
  {title:'Priority가 같으면 어떤 Switch가 Root가 될까요?',brief:'학습 페이지의 Root 선출을 확인합니다. 같은 Priority에서 MAC을 비교한 뒤 각 포트 역할이 정해지는 순서를 관찰하세요.',hints:['Root Bridge는 Bridge ID를 비교해 정합니다.','Priority가 같을 때 비교할 다음 값은 MAC입니다.','이번 조건의 MAC 순서는 Switch A < Switch B < Switch C입니다.']},
  {title:'Alternate 포트에도 BPDU가 보일까요?',brief:'물리 링크 Up과 사용자 데이터 Forwarding을 구분합니다. BPDU와 PC A의 데이터가 사용하는 링크를 각각 관찰하세요.',hints:['케이블 Up과 데이터 Forwarding은 다른 상태입니다.','Alternate는 사용자 데이터 경로를 대기시키는 역할입니다.','BPDU 제어 정보와 사용자 데이터를 따로 확인하세요.']},
  {title:'직접 연결의 Cost를 높이면 Root Port는?',brief:'Switch C의 직접 경로 Cost 20과 Switch B를 거치는 누적 Cost 8을 비교합니다.',hints:['장비 수보다 Root까지의 누적 Cost를 비교합니다.','경유 경로의 링크 Cost를 더하세요.','4 + 4와 20 중 더 작은 값을 찾으세요.']},
  {title:'직접 링크가 끊기면 어떤 길이 살아남을까요?',brief:'Switch A와 Switch C의 직접 링크에 장애를 적용합니다. 대기 포트가 바뀐 뒤 데이터가 전달되는 경로를 관찰하세요.',hints:['물리 삼각형에는 다른 경로가 남아 있습니다.','Switch C의 Alternate 포트가 향하는 장비를 확인하세요.','관찰한 전달 간격을 모든 RSTP의 수렴 시간으로 일반화하지 않습니다.']},
  {title:'Root를 바꾸면 대기 포트도 바뀔까요?',brief:'Switch C의 Priority만 낮춥니다. 물리 연결은 유지하면서 새 Root와 포트 역할을 관찰하세요.',hints:['다른 조건보다 Priority를 먼저 비교합니다.','각 Switch에서 새 Root까지 가는 경로를 생각하세요.','Root가 바뀌어도 모든 링크로 데이터를 보내지는 않습니다.']}
 ]
};
const stpLinks={pc1:['linkPc1Svg','pc1','sw1','labelPc1'],l12:['link12Svg','sw1','sw2','label12'],l23:['link23Svg','sw2','sw3','label23'],l31:['link31Svg','sw1','sw3','label31'],pc3:['linkPc3Svg','sw3','pc3','labelPc3']};
function stpCenter(id){const stage=$('topologyStage').getBoundingClientRect(),r=$(id).getBoundingClientRect();return{x:r.left-stage.left+r.width/2,y:r.top-stage.top+r.height/2,w:r.width,h:r.height};}
function stpLayout(){
 const stage=$('topologyStage'),svg=stage.querySelector('.topology-svg');if(!stage.clientWidth)return;
 svg.setAttribute('viewBox',`0 0 ${stage.clientWidth} ${stage.clientHeight}`);
 Object.values(stpLinks).forEach(([id,a,b,label])=>{const p=stpCenter(a),q=stpCenter(b),dx=q.x-p.x,dy=q.y-p.y;
  const edge=(r,sign)=>{const t=Math.min(r.w/2/(Math.abs(dx)||1),r.h/2/(Math.abs(dy)||1));return{x:r.x+sign*dx*t,y:r.y+sign*dy*t};};
  const p1=edge(p,1),p2=edge(q,-1);Object.entries({x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y}).forEach(([k,v])=>$(id).setAttribute(k,v));
  const lab=$(label),mobile=matchMedia('(max-width:900px)').matches;lab.style.left=((p1.x+p2.x)/2)+'px';lab.style.top=((p1.y+p2.y)/2+(mobile?0:-15))+'px';lab.style.transform='translate(-50%,-50%)';
 });
}
function stpMotion(route,progress){stpLayout();const pts=route.map(stpCenter),t=Math.min(pts.length-1-0.00001,Math.max(0,progress)*(pts.length-1)),a=pts[Math.floor(t)],b=pts[Math.floor(t)+1];const marker=$('packetMarker');marker.style.left=(a.x+(b.x-a.x)*(t%1))+'px';marker.style.top=(a.y+(b.y-a.y)*(t%1))+'px';marker.style.transform='translate(-50%,-50%)';}
function stpConcealRoles(){['sw1','sw2','sw3'].forEach(id=>{$(id).classList.remove('root');$(id+'Ports').textContent='역할 비교 대기';});Object.values(stpLinks).forEach(([id])=>$(id).setAttribute('class','stp-link'));['l12','l23','l31'].forEach(k=>$(stpLinks[k][3]).textContent=k.toUpperCase());}
const stpReset=adapter.reset;adapter.reset=function(i){stpReset(i);stpConcealRoles();$('packetMarker').style.transform='';stpLayout();};
adapter.buildPlan=function(i,mode='normal'){if(mode!=='normal')return null;const plan=[];scenarios[i].steps.forEach((s,n)=>{
 if(['ROOT ELECTION','COST CHANGE','PRIORITY CHANGE','LINK DOWN'].includes(s.kind))plan.push({title:s.kind==='ROOT ELECTION'?'Bridge ID를 비교합니다':s.title,detail:s.kind==='ROOT ELECTION'?'Priority가 같으므로 MAC을 비교합니다. 아직 포트 역할과 전달 경로는 정하지 않습니다.':s.detail,kind:'판단',duration:1050,action(){if(n)adapter.show(n-1);else adapter.reset(i);$('packetMarker').className='packet-marker';if(s.kind==='ROOT ELECTION')stpConcealRoles();else $(s.active?.[0]||'sw3').classList.add('active');}});
 let route=null;if(s.marker?.type==='data')route=s.active?.includes('sw2')?['pc1','sw1','sw2','sw3','pc3']:s.kind==='ENDPOINT'||s.kind==='MEASUREMENT'?['sw3','pc3']:['pc1','sw1','sw3','pc3'];
 else if(s.marker?.text==='BPDU')route=s.kind==='PREDICTION'?['sw1','sw2','sw3']:['sw2','sw3'];
 const duration=route?1050+(route.length-1)*420+180:1050+(s.kind==='RECOVERY'?420:0)+180;
 plan.push({modelStepIndex:n,title:s.title,detail:s.detail,kind:s.kind,duration,action(){adapter.show(n);if(s.kind==='PREDICTION')stpConcealRoles();if(s.kind==='ROOT ELECTION'){Object.values(stpLinks).forEach(([id])=>$(id).setAttribute('class','stp-link'));['sw1','sw2','sw3'].forEach(id=>$(id+'Ports').textContent='포트 역할 계산 대기');['l12','l23','l31'].forEach(k=>$(stpLinks[k][3]).textContent=k.toUpperCase());}stpLayout();},animate:route?p=>stpMotion(route,Math.max(0,Math.min(1,(p*duration-1050)/((route.length-1)*420)))):undefined});
 if(s.kind==='ROOT ELECTION')plan.push({title:'Root까지의 경로로 포트 역할을 정합니다',detail:'Switch B와 Switch C가 Root Port를 선택합니다. Switch C의 L23은 Alternate/Discarding으로 사용자 데이터 전달을 대기합니다.',kind:'포트 역할',duration:1650,action(){adapter.show(n);$('packetMarker').className='packet-marker';stpLayout();}});
 });return plan;};
new ResizeObserver(stpLayout).observe($('topologyStage'));

NetworkSimulator.mount(adapter);
})();
