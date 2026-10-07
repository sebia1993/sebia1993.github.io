// Existing lesson data and topic renderer retained from vlan-trunk-simulator; playback is shared.
(()=>{
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


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
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
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;clearTopology();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};

// Presentation follows the current Concept Guide; raw evidence above is unchanged.
adapter.presentation = {
  "names": {
    "PC20A": "PC A",
    "PC20B": "PC B",
    "PC10A": "PC C",
    "PC10B": "PC D",
    "PC99A": "PC E",
    "PC99B": "PC F",
    "SW1": "Switch A",
    "SW2": "Switch B"
  },
  "lessons": [
    {
      "title": "VLAN 20 프레임은 링크마다 어떻게 보일까요?",
      "brief": "학습 페이지의 PC A → Switch A → Switch B → PC B 경로를 따라갑니다. Access와 Trunk의 Tag를 비교하세요.",
      "hints": [
        "Access 포트에서 단말이 보내는 일반 프레임을 떠올려 보세요.",
        "이 조건의 VLAN 20은 Native VLAN이 아닙니다."
      ]
    },
    {
      "title": "VLAN 20 Broadcast는 어느 단말까지 갈까요?",
      "brief": "같은 스위치에 연결됐어도 VLAN이 다르면 전달 영역이 다릅니다. PC B와 VLAN 10 대조 단말을 비교합니다.",
      "hints": [
        "Broadcast도 VLAN 경계를 가집니다.",
        "대조 통신으로 물리 링크 자체의 정상 여부를 확인하세요."
      ]
    },
    {
      "title": "Native VLAN 99는 Trunk에서 어떻게 보일까요?",
      "brief": "학습 페이지의 선택 자료와 같은 Cisco 기본 조건입니다. native tagging은 비활성입니다.",
      "hints": [
        "Non-native VLAN과 Native VLAN의 조건을 구분하세요.",
        "이번 구성에서 실제 Tag 유무를 관찰합니다."
      ]
    },
    {
      "title": "링크는 정상인데 VLAN 20만 빠지면 어떻게 될까요?",
      "brief": "Trunk의 Allowed 목록에서 VLAN 20만 제외했습니다. Access 유입과 Trunk 송출을 나누어 관찰합니다.",
      "hints": [
        "Link Up과 VLAN 통과 허용은 서로 다른 조건입니다.",
        "통신이 계속되는 다른 VLAN과 비교하세요."
      ]
    },
    {
      "title": "도착 포트의 VLAN이 다르면 어디에서 멈출까요?",
      "brief": "PC B의 Access 포트를 VLAN 10으로 바꾼 조건입니다. VLAN 20이 Trunk를 지나는지 먼저 확인합니다.",
      "hints": [
        "Trunk 통과와 단말 포트 송출을 구분하세요.",
        "PC B의 포트가 현재 어느 VLAN에 속하는지 확인하세요."
      ]
    }
  ],
  "labels": {
    "SUCCESS": "성공",
    "BEFORE": "통과 전",
    "AFTER": "통과 후",
    "EXPIRE": "TTL 만료",
    "REQUEST": "요청",
    "FORWARD": "전달",
    "REPLY": "응답",
    "ROUTER": "Router 판단",
    "PROBE": "Probe 전송",
    "NO ROUTE": "Route 없음",
    "DESTINATION": "목적지 응답",
    "INTERPRET": "결과 해석",
    "ACCESS IN": "Access 유입",
    "ACCESS OUT": "Access 송출",
    "BROADCAST": "Broadcast",
    "SEPARATION": "VLAN 분리",
    "POSITIVE CONTROL": "정상 대조 확인",
    "COMPARE": "비교",
    "FAILURE": "장애 조건",
    "STOP": "전달 중단",
    "CONTROL": "정상 대조",
    "RECOVERY": "복구 확인",
    "MISMATCH": "설정 불일치",
    "RETURN DECISION": "응답 경로 판단",
    "REPLY INGRESS": "응답 유입",
    "ROUTE BACK": "응답 경로 조회",
    "REPLY EGRESS": "응답 송출",
    "REMOTE TRY": "다른 VLAN 통신 시도",
    "ACTUAL ERROR": "관찰된 오류 응답",
    "L2 CONTROL": "L2 정상 대조",
    "LOCAL CONTROL": "동일 VLAN 정상 대조",
    "REMOTE DECISION": "다른 Subnet 판단",
    "ARP FAIL": "ARP 실패",
    "NO ECHO": "Echo 미생성",
    "CLIENT APPLY": "단말 설정 적용",
    "BOUNDARY": "검증 범위",
    "POOL SELECT": "Pool 선택",
    "FINAL DELIVERY": "단말로 전달",
    "SERVER DOWN": "서버 서비스 중지",
    "NO OFFER": "Offer 없음",
    "RELAY MISSING": "Relay 설정 없음",
    "DORA SUCCESS": "DORA 완료",
    "ARP STOP": "ARP 단계 중단",
    "CLIENT QUERY": "단말 Query",
    "IP TRAFFIC": "IP 통신",
    "CLIENT LEG": "단말 조회 구간",
    "UPSTREAM LEG": "Upstream 조회 구간",
    "AUTHORITY ANSWER": "Authoritative 응답",
    "CACHE FILL": "Cache 저장",
    "NO UPSTREAM": "새 Upstream Query 없음",
    "SERVICE DOWN": "서비스 중지",
    "SERVICE RECOVERY": "서비스 복구",
    "WRONG DNS": "잘못된 DNS 주소",
    "CLIENT RECOVERY": "단말 설정 복구",
    "NOT TIMEOUT": "응답 수신 확인",
    "RECORD RECOVERY": "Record 복구",
    "First Query": "첫 번째 Query",
    "Second Query": "두 번째 Query",
    "Failure": "장애 조건",
    "Recovery": "복구 확인",
    "Query sent": "Query 전송",
    "Resolved": "이름 해석 완료",
    "Resolution 완료": "이름 해석 완료",
    "Client transaction": "단말 조회",
    "Upstream transaction": "Upstream 조회",
    "Scope boundary": "검증 범위",
    "Cache populated": "Cache 저장 완료",
    "Answered at R2": "R2에서 응답",
    "Cannot resolve": "이름 해석 실패",
    "Query never reaches R2": "R2까지 Query 도달 안 됨",
    "Query reaches authority": "Authoritative DNS까지 Query 도달",
    "Error response received": "오류 응답 수신",
    "Address assigned": "주소 확정",
    "Lease + Options": "Lease와 Option",
    "Client configured": "단말 설정 적용",
    "Local Discover": "단말망 Discover",
    "Relayed Discover": "Relay가 전달한 Discover",
    "Offer selected": "Offer 선택",
    "Lease complete": "Lease 완료",
    "Discover reaches server segment": "서버 구간까지 Discover 도달",
    "Local Discover only": "단말망에만 Discover 존재",
    "Server reply 없음": "서버 응답 없음",
    "Reply to Relay": "Relay로 응답",
    "Client Edge": "단말 접속 구간",
    "Client VLAN": "단말 VLAN",
    "Routed Transit": "Router 연결 구간",
    "Learning Topology": "학습 토폴로지",
    "Connectivity State": "통신 상태",
    "DHCP State": "DHCP 상태",
    "Name Resolution": "이름 해석",
    "IP Reachability": "IP 도달 여부",
    "Host A": "단말",
    "Host B": "단말",
    "SIDE": "측",
    "ACCESS": "Access",
    "UNTAGGED": "Untagged",
    "TAG": "Tag",
    "NATIVE": "Native",
    "NOT ALLOWED": "허용 안 됨",
    "PORT": "Port",
    "Logical Stop": "논리적 전달 중단",
    "Access / Idle": "Access / 대기",
    "Packet Stop": "전달 중단",
    "No Response / Stop": "응답 없음 / 중단",
    "Resolved IP Traffic": "조회한 IP로 통신",
    "QUERY TO AUTHORITY": "Authoritative DNS로 Query",
    "NXDOMAIN RESPONSE": "NXDOMAIN 응답",
    "DNS RESPONSE": "DNS 응답",
    "ACK ADDRESS": "ACK 주소",
    "ACK OPTIONS": "ACK Option",
    "CLIENT BROADCAST": "단말 Broadcast",
    "NO DNS ANSWER": "DNS 응답 없음",
    "RECOVERED": "복구 완료",
    "OPTIONS": "Option 확인",
    "DNS .2 RESTORED": "DNS .2 복구",
    "A .10 RESTORED": "A .10 복구",
    "CURRENT": "현재",
    "Baseline": "기준 상태",
    "Actual": "실제 관찰",
    "Expected": "예상 결과",
    "Scenario": "문제 조건",
    "Run": "검증 실행",
    "Forwarding 판단": "Forwarding 판단"
  }
};
adapter.presentation.guideDifferences = [
  {
    "name": "PC C",
    "reason": "학습 페이지의 VLAN 20 PC A/B에 더해 VLAN 10 정상 대조를 위해 기존 PC10A를 PC C로 표시합니다."
  },
  {
    "name": "PC D",
    "reason": "기존 PC10B를 PC D로 표시해 VLAN 20 Broadcast가 VLAN 10으로 전달되지 않는지 비교합니다."
  },
  {
    "name": "PC E",
    "reason": "기존 PC99A를 PC E로 표시해 Native VLAN 99의 Untagged 전달을 비교합니다."
  },
  {
    "name": "PC F",
    "reason": "기존 PC99B를 PC F로 표시해 Native VLAN 99의 반대편 단말을 구분합니다."
  }
];
PacketLabPresentation.attach(adapter, {
  "desktop": "#networkTopology",
  "height": 570,
  "note": "PC A/B는 학습 페이지의 VLAN 20 단말입니다. PC C/D는 VLAN 10, PC E/F는 Native VLAN 99 대조 단말입니다.",
  "nodes": [
    {
      "id": "pc20a",
      "name": "PC A",
      "type": "pc",
      "x": 55,
      "y": 65,
      "detail": "VLAN 20",
      "width": 88
    },
    {
      "id": "pc10a",
      "name": "PC C",
      "type": "pc",
      "x": 160,
      "y": 65,
      "detail": "VLAN 10",
      "width": 88
    },
    {
      "id": "pc99a",
      "name": "PC E",
      "type": "pc",
      "x": 265,
      "y": 65,
      "detail": "VLAN 99",
      "width": 88
    },
    {
      "id": "sw1",
      "name": "Switch A",
      "type": "switch",
      "x": 160,
      "y": 225,
      "detail": "Access → Trunk"
    },
    {
      "id": "sw2",
      "name": "Switch B",
      "type": "switch",
      "x": 160,
      "y": 355,
      "detail": "Trunk → Access"
    },
    {
      "id": "pc20b",
      "detailSource": "pc20bVlan",
      "name": "PC B",
      "type": "pc",
      "x": 55,
      "y": 510,
      "detail": "VLAN 20",
      "width": 88
    },
    {
      "id": "pc10b",
      "name": "PC D",
      "type": "pc",
      "x": 160,
      "y": 510,
      "detail": "VLAN 10",
      "width": 88
    },
    {
      "id": "pc99b",
      "name": "PC F",
      "type": "pc",
      "x": 265,
      "y": 510,
      "detail": "VLAN 99",
      "width": 88
    }
  ],
  "edges": [
    [
      "pc20a",
      "sw1",
      "link20L"
    ],
    [
      "pc10a",
      "sw1",
      "link10L"
    ],
    [
      "pc99a",
      "sw1",
      "link99L"
    ],
    [
      "sw1",
      "sw2",
      "trunkLink"
    ],
    [
      "sw2",
      "pc20b",
      "link20R"
    ],
    [
      "sw2",
      "pc10b",
      "link10R"
    ],
    [
      "sw2",
      "pc99b",
      "link99R"
    ]
  ],
  "steps": {
    "path20": [
      {
        "path": [
          "pc20a",
          "sw1"
        ],
        "caption": "Access · Untagged"
      },
      {
        "path": [
          "sw1",
          "sw2"
        ],
        "caption": "Trunk · 802.1Q VLAN 20"
      },
      {
        "path": [
          "sw2",
          "pc20b"
        ],
        "caption": "Access · Untagged"
      }
    ],
    "separation": [
      {
        "path": [
          "pc20a",
          "sw1"
        ],
        "caption": "VLAN 20 ARP Broadcast"
      },
      {
        "path": [
          "sw1",
          "sw2"
        ],
        "caption": "Trunk · VLAN 20 Tag"
      },
      {
        "path": [
          "sw2",
          "pc20b"
        ],
        "caption": "VLAN 20으로 전달 · VLAN 10으로 송출 안 됨"
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "sw2",
          "pc10b"
        ],
        "caption": "별도 VLAN 10 대조 통신 정상"
      }
    ],
    "native": [
      {
        "path": [
          "pc99a",
          "sw1"
        ],
        "caption": "Access VLAN 99 · Untagged"
      },
      {
        "path": [
          "sw1",
          "sw2"
        ],
        "caption": "Native VLAN 99 · Untagged"
      },
      {
        "path": [
          "sw1",
          "sw2"
        ],
        "caption": "비교 · VLAN 20은 Tagged"
      }
    ],
    "allowed": [
      {
        "path": [
          "pc20a",
          "sw1"
        ],
        "caption": "VLAN 20 ARP 유입"
      },
      {
        "path": [],
        "caption": "Switch A에서 중단 · VLAN 20 허용 안 됨",
        "stop": true
      },
      {
        "path": [
          "sw1",
          "sw2"
        ],
        "caption": "대조 VLAN 10 / 99 통과"
      },
      {
        "path": [
          "pc20a",
          "sw1",
          "sw2",
          "pc20b"
        ],
        "caption": "Allowed 복구와 STP Forwarding 확인 후 전달"
      }
    ],
    "mismatch": [
      {
        "path": [
          "pc20a",
          "sw1",
          "sw2"
        ],
        "caption": "VLAN 20은 Trunk 정상 통과"
      },
      {
        "path": [],
        "caption": "PC B 포트는 VLAN 10 · VLAN 20 송출 안 됨",
        "stop": true
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "sw2",
          "pc20b"
        ],
        "caption": "VLAN 10 대조 통신 · PC B 링크 정상"
      },
      {
        "path": [
          "pc20a",
          "sw1",
          "sw2",
          "pc20b"
        ],
        "caption": "PC B를 Access VLAN 20으로 복구"
      }
    ]
  }
});
NetworkSimulator.mount(adapter);
})();
