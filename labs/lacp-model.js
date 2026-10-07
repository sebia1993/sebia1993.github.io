// Existing lesson data and topic renderer retained from lacp-simulator; playback is shared.
(()=>{
const $ = id => document.getElementById(id);

  const scenarios = [
    {
      id:'bundle',
      claim:'LACP-01 / LACP-03',
      tab:'1 · Bundle은 어떻게 만들어질까?',
      title:'active/passive가 협상해 M1/M2를 Po1 하나로 묶습니다.',
      text:'이번 Baseline은 SW1 active, SW2 passive입니다. 두 Member는 모두 Bundled됐고 STP에는 Po1 하나로 보였습니다.',
      start:['SW1 M1/M2 = active','SW2 M1/M2 = passive','M1/M2 = compatible'],
      question:'정상 협상 후 상위 Layer에서 두 Member는 어떻게 보일까요?',
      options:[
        ['po1','M1/M2가 Po1 하나의 Logical Link로 보임'],
        ['two','M1과 M2가 독립 STP Link 두 개로 보임'],
        ['oneonly','M1만 사용되고 M2는 자동 Standby']
      ],
      correct:'po1',
      reason:'LACP가 호환 Member 두 개를 하나의 LAG로 묶는 것이 공통 원리입니다. 이번 Cisco CLI에서는 그 LAG가 Po1(SU)로, Member는 M1(P), M2(P)로 확인됐고 STP도 Po1 하나의 Forwarding Link로 표시했습니다.',
      metric1:['LACP State','Po1(SU) · M1(P) · M2(P)'],
      metric2:['Upper Layer','STP = Po1 하나'],
      conclusion:'Physical Member는 두 개지만 상위 Layer에는 하나의 Logical LAG로 보입니다.',
      steps:[
        {kind:'LACP CONTROL',title:'SW1 active → LACPDU 전송',detail:'SW1이 협상을 시작하고 SW2 passive가 응답합니다.',po:'up',m1:'control',m2:'control',nodes:['sw1','sw2'],marker:{text:'LACPDU',type:'control',left:355,top:142}},
        {kind:'PARTNER MATCH',title:'Actor / Partner와 Key 확인',detail:'M1/M2의 Actor/Partner System ID와 Operational Key가 양쪽에서 일치했습니다.',po:'up',m1:'control',m2:'control',nodes:['sw1','sw2'],marker:{text:'KEY 1',type:'control',left:355,top:198}},
        {kind:'BUNDLED',title:'M1 + M2 → LAG 형성 (Cisco Po1)',detail:'두 Member 모두 Bundled / In-use 상태가 되고 Po1이 Up이 됩니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']},
        {kind:'LOGICAL LINK',title:'STP에는 Po1 하나',detail:'상위 Layer에는 하나의 LAG로 보이며, 이번 Cisco 구현에서는 Po1 하나의 Forwarding Link로 나타났습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']}
      ]
    },
    {
      id:'passive',
      claim:'LACP-02',
      tab:'2 · passive/passive면?',
      title:'둘 다 passive면 협상을 먼저 시작하지 않습니다.',
      text:'기존 상태를 제거한 Clean Rebuild에서 양쪽 M1/M2를 모두 passive로 구성해 확인했습니다.',
      start:['기존 Channel Group 제거','SW1 passive','SW2 passive'],
      question:'Clean passive/passive 상태의 결과로 맞는 것은 무엇일까요?',
      options:[
        ['none','정상 LACP Bundle이 형성되지 않음'],
        ['wait','시간이 지나면 자동으로 Po1(SU) 형성'],
        ['half','M1만 Bundle되고 M2는 제외']
      ],
      correct:'none',
      reason:'둘 다 passive이면 어느 쪽도 정상 협상을 먼저 시작하지 않습니다. 이번 IOL에서는 안정화 후 Po1(SD), Member(s) 상태였고 정상 Remote LAG Data Path가 형성되지 않았습니다.',
      metric1:['Passive/Passive','Po1(SD) · members(s)'],
      metric2:['Recovery','SW1 active → M1/M2(P) · Po1(SU)'],
      conclusion:'LACP passive는 “기다리면 시작”이 아니라 수신 LACP에 응답하는 Mode입니다.',
      steps:[
        {kind:'CLEAN STATE',title:'기존 LAG(EtherChannel) State 제거',detail:'기존 active/passive Session을 지우고 Channel Group이 없는 상태를 먼저 확인했습니다.',po:'wait',m1:'idle',m2:'idle',nodes:['sw1','sw2']},
        {kind:'PASSIVE / PASSIVE',title:'양쪽 모두 passive',detail:'안정 관찰 구간에서 정상 LACPDU 협상이 시작되지 않았습니다.',po:'wait',m1:'idle',m2:'idle',nodes:['sw1','sw2']},
        {kind:'NO BUNDLE',title:'정상 Bundle 미형성',detail:'Po1은 정상 Forwarding Bundle이 아니었고 Remote Port-Channel 통신도 형성되지 않았습니다. Physical Cable Down과는 다른 상태입니다.',po:'wait',m1:'wait',m2:'wait',nodes:['sw1','sw2']},
        {kind:'RECOVERY',title:'SW1만 active로 변경',detail:'LACPDU 협상이 다시 시작되고 M1/M2가 Bundled, Po1 Up, Remote Ping 3/3으로 복구됐습니다.',po:'up',m1:'control',m2:'control',nodes:['sw1','sw2'],marker:{text:'LACPDU',type:'control',left:355,top:170}}
      ]
    },
    {
      id:'hash',
      claim:'LACP-04',
      tab:'3 · Flow는 어느 Member를 쓸까?',
      title:'Hash는 Flow마다 Member 하나를 선택합니다.',
      text:'원래 src-dst-ip 8개 Flow는 모두 M1이어서 INCONCLUSIVE였습니다. 재검증에서 src-mac을 적용해 실제 Member Diversity를 확인했습니다.',
      start:['Hash = src-mac','M1/M2 둘 다 Bundled','PC1A/PC1B Source MAC 다름'],
      question:'재검증에서 실제로 확인된 Flow→Member Mapping은 무엇일까요?',
      options:[
        ['map','PC1A→PC2A = M2 · PC1B→PC2A = M1'],
        ['stripe','각 Flow가 M1/M2를 Packet마다 번갈아 사용'],
        ['m1all','두 Flow 모두 M1만 사용']
      ],
      correct:'map',
      reason:'src-mac 재검증에서 PC1A→PC2A의 5개 Request는 M2에서만, PC1B→PC2A의 5개 Request는 M1에서만 관찰됐습니다. 동일 Request가 양 Member에 중복되지 않았습니다.',
      metric1:['PC1A → PC2A','M2 · 5/5 Request'],
      metric2:['PC1B → PC2A','M1 · 5/5 Request'],
      conclusion:'한 Flow는 한 Member에 일관되게 매핑되고, 다른 Flow는 다른 Hash 결과로 다른 Member를 사용할 수 있습니다.',
      steps:[
        {kind:'HASH METHOD',title:'src-mac 적용 확인',detail:'양쪽 Switch의 실제 Load-Balance Method를 src-mac으로 변경하고 CLI로 확인했습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']},
        {kind:'FLOW A',title:'PC1A → PC2A · M2 선택',detail:'Source MAC 00:50:79:66:68:41 Flow의 5/5 Echo Request가 M2에서만 관찰됐습니다.',po:'up',m1:'bundled',m2:'active-data',nodes:['pc1a','sw1','sw2','pc2a'],marker:{text:'FLOW A',type:'data',left:355,top:219}},
        {kind:'FLOW B',title:'PC1B → PC2A · M1 선택',detail:'Source MAC 00:50:79:66:68:42 Flow의 5/5 Echo Request가 M1에서만 관찰됐습니다.',po:'up',m1:'active-data',m2:'bundled',nodes:['pc1b','sw1','sw2','pc2a'],marker:{text:'FLOW B',type:'data',left:355,top:145}},
        {kind:'NO STRIPING',title:'같은 Request의 Member 중복 = 0',detail:'한 Flow를 Packet-by-Packet으로 M1/M2에 번갈아 보내는 동작은 관찰되지 않았습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']}
      ]
    },
    {
      id:'one-down',
      claim:'LACP-05',
      tab:'4 · M1 하나가 사라지면?',
      title:'M1 전체가 unavailable이어도 M2가 Bundled면 Po1은 유지될 수 있습니다.',
      text:'원래 one-sided SW1 M1 shutdown은 FAIL이었습니다. 재검증은 M1 양단을 한 장애 사건으로 Down해 Member 전체 unavailable 조건을 만들었습니다.',
      start:['Core Flow = PC1B→PC2A','Failure 전 Core Flow = M1','M2는 변경하지 않음'],
      question:'M1 양단 Down 이후 재검증에서 실제 결과는 무엇이었을까요?',
      options:[
        ['m2','Po1 Up 유지 · Flow가 M2로 이동 · 100/100 Reply'],
        ['podown','M1 하나 Down 때문에 Po1 전체 Down'],
        ['half','Request는 M2, Reply는 계속 M1이라 통신 실패']
      ],
      correct:'m2',
      reason:'양단 M1 unavailable을 확인한 뒤 M2는 Bundled, Po1은 Up을 유지했습니다. Core src-mac Flow도, 원래 src-dst-ip 비교 Flow도 각각 100/100 Reply를 유지했습니다.',
      metric1:['Core Run','100 sent / 100 delivered / 100 replies'],
      metric2:['Observed Path','M1 → M2 · Po1은 Up'],
      conclusion:'Member 하나가 실제로 사용할 수 없어도 Remaining Member가 Bundled라면 Logical Bundle은 유지될 수 있습니다.',
      steps:[
        {kind:'BASELINE',title:'Core Flow는 M1 사용',detail:'PC1B→PC2A Flow가 장애 전 M1을 사용하는 것을 실제 Capture로 확인했습니다.',po:'up',m1:'active-data',m2:'bundled',nodes:['pc1b','sw1','sw2','pc2a'],marker:{text:'IPv4',type:'data',left:355,top:145}},
        {kind:'M1 UNAVAILABLE',title:'SW1 M1 + SW2 M1 양단 Down',detail:'PNET의 신뢰 가능한 live carrier-down 제어가 없어 요청서 fallback대로 양단 M1 admin-down을 한 장애 사건으로 적용했습니다.',po:'up',m1:'down',m2:'bundled',nodes:['sw1','sw2'],marker:{text:'M1 DOWN',type:'stop',left:350,top:145}},
        {kind:'REMAINING MEMBER',title:'M2가 Request/Reply 모두 전달',detail:'Failure 후 Core Run과 Controlled Comparison 모두 M2를 통해 양방향으로 정상 전달됐습니다.',po:'up',m1:'down',m2:'active-data',nodes:['pc1b','sw1','sw2','pc2a'],marker:{text:'100/100',type:'data',left:350,top:219}},
        {kind:'RECOVERY',title:'M1 복구 → M1/M2 모두 Bundled',detail:'양단 M1을 복구하고 LACP 안정화 후 Po1 Up, 두 Member Bundled, 최종 Ping 3/3을 확인했습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']}
      ]
    },
    {
      id:'all-down',
      claim:'LACP-06',
      tab:'5 · 모든 Member가 사라지면?',
      title:'M1과 M2가 모두 unavailable이면 Logical Po1도 Down됩니다.',
      text:'원래 Run에서 Single-Member 복구 후 별도 Scenario로 SW1의 M1/M2를 모두 shutdown해 확인했습니다.',
      start:['M1/M2 Bundled Baseline','Po1 Up','PC1A↔PC2A 정상'],
      question:'M1과 M2를 모두 사용할 수 없게 만들면 어떤 상태가 맞을까요?',
      options:[
        ['down','Po1 Down · Remote 통신 실패'],
        ['up','Po1은 논리 Interface이므로 Member 없이도 Up'],
        ['local','M1만 없어지고 M2가 자동 복구']
      ],
      correct:'down',
      reason:'두 Member 모두 Down되자 Cisco CLI에서 Po1도 Down됐고 PC1A→PC2A Remote 통신은 실패했습니다. 두 Member를 복구하자 Po1과 End-to-End 통신도 정상화됐습니다.',
      metric1:['Failure','M1(D) + M2(D) · Po1(SD)'],
      metric2:['Recovery','M1(P) + M2(P) · Po1(SU) · 3/3'],
      conclusion:'Port-Channel의 생존은 사용할 수 있는 Member가 남아 있는지와 연결됩니다.',
      steps:[
        {kind:'BASELINE',title:'M1/M2 Bundled · Po1 Up',detail:'전체 장애 전 Baseline을 다시 확인했습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['sw1','sw2']},
        {kind:'ALL MEMBERS DOWN',title:'M1 + M2 모두 unavailable',detail:'두 Physical Member를 모두 사용할 수 없게 하자 Po1도 Down 상태가 됐습니다.',po:'down',m1:'down',m2:'down',nodes:['sw1','sw2'],marker:{text:'Po1 DOWN',type:'stop',left:345,top:180}},
        {kind:'PACKET STOP',title:'Remote End-to-End 실패',detail:'Source Stimulus는 있었지만 반대 Endpoint에 대응 Remote Echo가 전달되지 않았습니다. Local Positive Control로 Capture Health를 확인했습니다.',po:'down',m1:'down',m2:'down',nodes:['pc1a','sw1'],marker:{text:'STOP',type:'stop',left:290,top:180}},
        {kind:'FULL RECOVERY',title:'M1/M2 복구 → Po1 Up',detail:'두 Member가 다시 Bundled되고 Po1 Up, Remote Ping 3/3, 최종 Config도 Baseline과 일치했습니다.',po:'up',m1:'bundled',m2:'bundled',nodes:['pc1a','sw1','sw2','pc2a']}
      ]
    }
  ];


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function resetVisual(){
    ['pc1a','pc1b','sw1','sw2','pc2a','pc2b'].forEach(id=>$(id).className='device');
    ['edge1a','edge1b','edge2a','edge2b'].forEach(id=>$(id).setAttribute('class','agg-link bundled'));
    $('m1Svg').setAttribute('class','agg-link bundled');
    $('m2Svg').setAttribute('class','agg-link bundled');
    $('labelM1').className='link-label';$('labelM1').textContent='M1 · Bundled';
    $('labelM2').className='link-label';$('labelM2').textContent='M2 · Bundled';
    $('poBadge').className='po-badge';$('poBadge').textContent='Po1 · UP · M1+M2';
    $('packetMarker').className='packet-marker';
  }
function setMember(which,state){
    const line=$(which+'Svg'),lab=$('label'+which.toUpperCase());
    line.setAttribute('class','agg-link '+state);
    lab.className='link-label';
    if(state==='control')lab.classList.add('control');
    if(state==='wait')lab.classList.add('wait');
    if(state==='down')lab.classList.add('down');
    if(state==='active-data'||state==='reply')lab.classList.add('active');
    const name=which.toUpperCase();
    const suffix=state==='control'?'LACPDU':state==='wait'?'Not Bundled':state==='down'?'DOWN':state==='active-data'?'DATA':state==='reply'?'REPLY':state==='idle'?'Idle':'Bundled';
    lab.textContent=name+' · '+suffix;
  }
function setPo(state){
    const b=$('poBadge');
    b.className='po-badge';
    if(state==='down'){b.classList.add('down');b.textContent='Po1 · DOWN';}
    else if(state==='wait'){b.classList.add('wait');b.textContent='Po1 · NOT BUNDLED';}
    else b.textContent='Po1 · UP';
  }
function showMarker(m){
    const el=$('packetMarker');
    if(!m){el.className='packet-marker';return;}
    el.className='packet-marker show';
    if(m.type==='control')el.classList.add('control');
    if(m.type==='reply')el.classList.add('reply');
    if(m.type==='stop')el.classList.add('stop');
    el.textContent=m.text;el.style.left=m.left+'px';el.style.top=m.top+'px';
  }
function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex];
    resetVisual();setPo(step.po||'up');
    setMember('m1',step.m1||'bundled');setMember('m2',step.m2||'bundled');
    (step.nodes||[]).forEach(id=>$(id).classList.add(step.kind.includes('CONTROL')?'control':step.kind.includes('DOWN')?'stop':'active'));
    showMarker(step.marker);
    $('eventKind').textContent=step.kind;
    $('eventTitle').textContent=step.title;
    $('eventDetail').textContent=step.detail;
    $('stepCount').textContent=(stepIndex+1)+' / '+s.steps.length;
    $('prevStepBtn').disabled=stepIndex===0;
    $('nextStepBtn').disabled=stepIndex===s.steps.length-1;
  }
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;resetVisual();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};
// View adaptation only; original observations and failed/revalidated evidence stay intact.
adapter.presentation={guideDifferences:[{name:'PC D',reason:'기존 실습의 추가 단말 PC2B입니다. 학습 페이지의 PC A·PC B → PC C 핵심 흐름을 유지하며, 원래 검증 토폴로지의 연결을 보존합니다.'}],names:{PC1A:'PC A',PC1B:'PC B',PC2A:'PC C',PC2B:'PC D',SW1:'Switch A',SW2:'Switch B'},labels:{'Learning Topology':'학습 토폴로지','Physical Topology':'물리 연결','Logical State':'논리 상태','Logical Link':'논리 링크','Physical Member':'물리 Member','Physical Cable':'물리 케이블','Control Plane':'제어 정보','User Data':'사용자 데이터','Baseline':'기준 상태','Clean Rebuild':'초기화 후 재구성','Core Flow':'기준 Flow','Core Run':'기준 실행','Observed Path':'관찰한 경로','Upper Layer':'상위 계층','Recovery':'복구','Failure':'장애','Not Bundled':'묶이지 않음','NOT BUNDLED':'묶이지 않음','LACP CONTROL':'LACP 교환','PARTNER MATCH':'협상 조건 확인','BUNDLED':'묶음 형성','LOGICAL LINK':'논리 링크','CLEAN STATE':'기존 상태 제거','NO BUNDLE':'묶음 미형성','RECOVERY':'복구','HASH METHOD':'Hash 방식','FLOW A':'Flow A','FLOW B':'Flow B','NO STRIPING':'Flow 유지 확인','BASELINE':'기준 상태','M1 UNAVAILABLE':'M1 사용 불가','REMAINING MEMBER':'남은 Member','ALL MEMBERS DOWN':'모든 Member 장애','PACKET STOP':'전달 중단','FULL RECOVERY':'전체 복구','STOP':'전달 중단','Idle':'대기','unavailable':'사용 불가','Source MAC':'출발지 MAC','Request':'Request','Remote':'원격','End-to-End':'종단 간'},lessons:[
 {title:'케이블 두 개는 언제 하나의 LAG가 될까요?',brief:'Switch A의 active와 Switch B의 passive가 정보를 교환한 뒤 M1·M2가 Po1으로 묶이는 순서를 관찰합니다.',hints:['LACP는 양쪽의 정보를 교환합니다.','Member의 조건이 맞아야 묶음에 참여합니다.','물리 케이블 수와 상위 계층에 보이는 논리 링크 수를 구분하세요.']},
 {title:'양쪽이 passive면 누가 협상을 시작할까요?',brief:'기존 묶음 상태를 지우고 양쪽을 passive로 설정합니다. 이후 한쪽을 active로 바꿨을 때도 비교합니다.',hints:['passive는 상대의 LACP에 응답하는 모드입니다.','먼저 LACP를 보내는 쪽이 있는지 확인하세요.','케이블 연결과 LACP 묶음 형성은 같은 상태가 아닙니다.']},
 {title:'서로 다른 Flow는 어느 Member를 쓸까요?',brief:'학습 페이지의 PC A·PC B에서 PC C로 향하는 두 Flow입니다. 기존 src-mac 검증에서 각 Flow가 선택한 M1·M2를 따라가 보세요.',hints:['한 Flow와 여러 Flow를 구분하세요.','Hash의 입력은 이번 실습에서 출발지 MAC입니다.','패킷마다 교대로 보내는지, Flow별로 같은 Member를 쓰는지 확인하세요.']},
 {title:'M1을 쓸 수 없어도 Po1은 유지될까요?',brief:'M1 양단을 함께 내려 Member 전체를 사용할 수 없게 합니다. 남은 M2와 Po1 상태를 각각 확인합니다.',hints:['M1 장애가 M2 장애까지 뜻하지는 않습니다.','남은 Member가 묶음에 참여하는지 확인하세요.','원래 한쪽 shutdown 실패와 이번 양단 장애 재검증을 구분하세요.']},
 {title:'모든 Member가 사라지면 어떻게 될까요?',brief:'M1·M2를 모두 사용할 수 없게 한 뒤 Po1과 PC A–PC C 통신을 관찰합니다.',hints:['Po1이 전달할 때 실제로 사용하는 물리 Member를 생각하세요.','사용 가능한 Member가 하나라도 남아 있는지 확인하세요.','복구에서는 Member 상태와 Po1 상태를 함께 확인하세요.']}
]};
const lacpStage=document.querySelector('#simVisual .topology-stage');
function lacpCenter(id){const st=lacpStage.getBoundingClientRect(),r=$(id).getBoundingClientRect();return{x:r.left-st.left+r.width/2,y:r.top-st.top+r.height/2,w:r.width,h:r.height};}
function lacpLayout(){if(!lacpStage.clientWidth)return;lacpStage.querySelector('.topology-svg').setAttribute('viewBox',`0 0 ${lacpStage.clientWidth} ${lacpStage.clientHeight}`);const mobile=matchMedia('(max-width:900px)').matches;
 const defs=[['edge1a','pc1a','sw1'],['edge1b','pc1b','sw1'],['edge2a','sw2','pc2a'],['edge2b','sw2','pc2b'],['m1Svg','sw1','sw2'],['m2Svg','sw1','sw2']];
 defs.forEach(([id,a,b])=>{let p=lacpCenter(a),q=lacpCenter(b),dx=q.x-p.x,dy=q.y-p.y;
 const edge=(r,sign)=>{const t=Math.min(r.w/2/(Math.abs(dx)||1),r.h/2/(Math.abs(dy)||1));return{x:r.x+sign*dx*t,y:r.y+sign*dy*t};};let from=edge(p,1),to=edge(q,-1);
 if(id.startsWith('m')){const off=id==='m1Svg'?-32:32;if(mobile){from.x+=off;to.x+=off;}else{from.y+=off;to.y+=off;}}
 Object.entries({x1:from.x,y1:from.y,x2:to.x,y2:to.y}).forEach(([k,v])=>$(id).setAttribute(k,v));
 if(id.startsWith('m')){const label=$(id==='m1Svg'?'labelM1':'labelM2');label.style.left=((from.x+to.x)/2+(mobile?(id==='m1Svg'?-24:24):0))+'px';label.style.top=((from.y+to.y)/2+(mobile?0:-20))+'px';label.style.transform='translate(-50%,-50%)';}
 });
}
function lacpPoints(source,member,control){const l=$(member+'Svg'),a={x:+l.getAttribute('x1'),y:+l.getAttribute('y1')},b={x:+l.getAttribute('x2'),y:+l.getAttribute('y2')};return control?[a,b]:[lacpCenter(source),lacpCenter('sw1'),a,b,lacpCenter('sw2'),lacpCenter('pc2a')];}
function lacpMotion(source,member,control,p){lacpLayout();const pts=lacpPoints(source,member,control),t=Math.min(pts.length-1-.00001,Math.max(0,p)*(pts.length-1)),a=pts[Math.floor(t)],b=pts[Math.floor(t)+1],m=$('packetMarker');m.style.left=(a.x+(b.x-a.x)*(t%1))+'px';m.style.top=(a.y+(b.y-a.y)*(t%1))+'px';m.style.transform='translate(-50%,-50%)';}
const lacpReset=adapter.reset;adapter.reset=function(i){lacpReset(i);setPo('wait');setMember('m1','idle');setMember('m2','idle');lacpLayout();};
adapter.buildPlan=function(i,mode='normal'){if(mode!=='normal')return null;const plan=[];scenarios[i].steps.forEach((s,n)=>{const moving=s.marker&&s.marker.type!=='stop',control=s.marker?.type==='control',member=s.m2==='active-data'?'m2':s.kind==='PARTNER MATCH'?'m2':'m1',source=s.nodes?.includes('pc1b')?'pc1b':'pc1a';const travel=control?420:2100,duration=moving?1050+travel+180:1230;
 plan.push({modelStepIndex:n,title:s.title,detail:s.detail,kind:s.kind,duration,action(){adapter.show(n);if(i===0&&n<2)setPo('wait');if(i===1&&s.kind==='RECOVERY')setPo('wait');lacpLayout();},animate:moving?p=>lacpMotion(source,member,control,Math.max(0,Math.min(1,(p*duration-1050)/travel))):undefined});
 if(i===1&&s.kind==='RECOVERY')plan.push({title:'M1·M2가 다시 묶이고 Po1이 Up됩니다',detail:'LACP 조건을 확인한 뒤 두 Member가 Bundled 상태가 됩니다. 기존 복구 검증에서 PC A–PC C Ping은 3/3이었습니다.',kind:'묶음 복구',duration:1650,action(){setMember('m1','bundled');setMember('m2','bundled');setPo('up');showMarker(null);}});
 });return plan;};
new ResizeObserver(lacpLayout).observe(lacpStage);

NetworkSimulator.mount(adapter);
})();
