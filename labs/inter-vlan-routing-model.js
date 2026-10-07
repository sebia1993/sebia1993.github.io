// Existing lesson data and topic renderer retained from inter-vlan-routing-simulator; playback is shared.
(()=>{
const $ = id => document.getElementById(id);

  const scenarios = [
    {
      id:'same-vlan',
      claim:'IVR-01',
      tab:'1 · 같은 VLAN이면 누구의 MAC?',
      title:'같은 VLAN은 Default Gateway 없이 Peer에게 직접 보냅니다.',
      text:'PC10A와 PC10B는 모두 VLAN 10 / 10.10.10.0/24에 있습니다.',
      start:['PC10A 10.10.10.10/24','PC10B 10.10.10.20/24','Gateway 10.10.10.1'],
      question:'PC10A가 PC10B로 Ping할 때 Ethernet Destination은 누구의 MAC일까요?',
      options:[
        ['peer','PC10B MAC · 같은 VLAN Peer'],
        ['gateway','Vlan10 Gateway MAC'],
        ['broadcast','항상 ff:ff:ff:ff:ff:ff']
      ],
      correct:'peer',
      reason:'PC10A는 10.10.10.20을 on-link로 판단해 PC10B를 직접 ARP합니다. 실제 Echo Request의 Ethernet Destination은 PC10B MAC이었고, CP1/CP3에서 TTL도 64로 동일했습니다.',
      metric1:['ARP 대상','10.10.10.20 · PC10B'],
      metric2:['TTL','64 → 64 · Routing 없음'],
      conclusion:'Same-VLAN 통신은 최종 Host를 Next-Hop으로 사용합니다.',
      steps:[
        {kind:'ON-LINK',title:'PC10A · 같은 Subnet 판단',detail:'10.10.10.20은 /24 기준 on-link입니다.',zone10:'active',hosts:['pc10a'],packet:{ip:'10.10.10.10 → 10.10.10.20',mac:'ARP 대상 = PC10B',ttl:'—',decision:'Peer를 직접 Next-Hop으로 선택'}},
        {kind:'ARP PEER',title:'PC10A → VLAN10 · PC10B ARP',detail:'Gateway가 아니라 10.10.10.20의 MAC을 확인합니다.',zone10:'active',hosts:['pc10a','pc10b'],link10:'active',arrow10:'ARP',packet:{ip:'ARP target 10.10.10.20',mac:'Broadcast Request → PC10B Reply',ttl:'—',decision:'Peer MAC 확인'}},
        {kind:'L2 FORWARD',title:'PC10A → PC10B · 직접 L2 전달',detail:'Echo Request Ethernet Destination은 PC10B MAC입니다. SVI Routing은 개입하지 않습니다.',zone10:'active',hosts:['pc10a','pc10b'],switch:'active',link10:'active',arrow10:'L2',packet:{ip:'10.10.10.10 → 10.10.10.20',mac:'PC10A → PC10B',ttl:'64 → 64',decision:'VLAN10 내부 Switching'}}
      ]
    },
    {
      id:'remote-forward',
      claim:'IVR-02 / IVR-03',
      tab:'2 · 다른 VLAN이면 무엇이 바뀔까?',
      title:'Remote IP는 그대로, 현재 L2 목적지만 Gateway로 바뀝니다.',
      text:'PC10A는 VLAN10, PC20A는 VLAN20입니다. SW1의 Vlan10/Vlan20 SVI가 두 VLAN의 Gateway입니다.',
      start:['PC10A GW 10.10.10.1','PC20A 10.10.20.10/24','Vlan10/20 Up · ip routing'],
      question:'PC10A가 PC20A로 보낼 첫 IPv4 Echo Frame의 올바른 조합은 무엇일까요?',
      options:[
        ['gw','Ethernet dst = Gateway MAC · IP dst = PC20A'],
        ['remote','Ethernet dst = PC20A MAC · IP dst = PC20A'],
        ['gatewayip','Ethernet dst = Gateway MAC · IP dst = Gateway IP']
      ],
      correct:'gw',
      reason:'다른 Subnet이므로 PC10A는 Gateway 10.10.10.1을 ARP합니다. IP Destination은 최종 PC20A 10.10.20.10 그대로이고, SW1이 Routing하면서 TTL 64→63 및 VLAN20용 새 Ethernet Header를 만듭니다.',
      metric1:['Ingress Frame','MAC PC10A → SVI · IP dst PC20A'],
      metric2:['Egress Frame','MAC SVI → PC20A · TTL 64 → 63'],
      conclusion:'Inter-VLAN Routing은 IP 목적지를 유지하면서 Hop마다 L2 Header를 다시 구성합니다.',
      steps:[
        {kind:'OFF-LINK',title:'PC10A · 다른 Subnet 판단',detail:'10.10.20.10은 /24 기준 off-link이므로 Default Gateway를 Next-Hop으로 선택합니다.',zone10:'active',hosts:['pc10a'],svis:['svi10'],packet:{ip:'Destination = 10.10.20.10',mac:'Next-Hop = 10.10.10.1',ttl:'—',decision:'Default Gateway 선택'}},
        {kind:'ARP GATEWAY',title:'PC10A · 10.10.10.1 ARP',detail:'Remote PC20A를 직접 ARP하지 않고 Vlan10 Gateway MAC을 확인합니다.',zone10:'active',hosts:['pc10a'],switch:'active',svis:['svi10'],link10:'active',arrow10:'ARP GW',packet:{ip:'ARP target 10.10.10.1',mac:'Gateway MAC aa:bb:cc:80:01:00',ttl:'—',decision:'Gateway Neighbor Resolution'}},
        {kind:'INGRESS',title:'VLAN10 → SW1 SVI',detail:'Ingress Ethernet Destination은 Gateway MAC, IPv4 Destination은 PC20A입니다.',zone10:'active',hosts:['pc10a'],switch:'active',svis:['svi10'],link10:'active',arrow10:'→ GW',packet:{ip:'10.10.10.10 → 10.10.20.10',mac:'PC10A → Gateway',ttl:'64',decision:'Vlan10 L3 Ingress'}},
        {kind:'ROUTE',title:'SW1 · Route Lookup + TTL 감소',detail:'Connected 10.10.20.0/24를 선택하고 TTL을 64에서 63으로 줄입니다.',switch:'active',svis:['svi10','svi20'],packet:{ip:'10.10.10.10 → 10.10.20.10',mac:'Ingress L2 Header 종료',ttl:'64 → 63',decision:'Vlan20으로 Routing'}},
        {kind:'EGRESS',title:'SW1 → PC20A · 새 Ethernet Frame',detail:'Egress Destination MAC은 PC20A, Source MAC은 실제 Vlan20 L3 Interface MAC입니다.',zone20:'active',hosts:['pc20a'],switch:'active',svis:['svi20'],link20:'active',arrow20:'→ PC20A',packet:{ip:'10.10.10.10 → 10.10.20.10',mac:'Vlan20 L3 MAC → PC20A',ttl:'63',decision:'새 L2 Encapsulation'}}
      ]
    },
    {
      id:'reply',
      claim:'IVR-04',
      tab:'3 · Reply도 Gateway를 쓸까?',
      title:'반대편 Host도 Return Path를 독립적으로 판단합니다.',
      text:'PC20A가 PC10A로 Echo Reply를 보낼 차례입니다. PC10A는 VLAN20 기준 off-link입니다.',
      start:['PC20A 10.10.20.10/24','PC20A GW 10.10.20.1','PC10A 10.10.10.10/24'],
      question:'PC20A가 PC10A로 Reply할 때 첫 Ethernet Destination은 무엇일까요?',
      options:[
        ['gateway','Vlan20 Gateway MAC'],
        ['pc10a','PC10A MAC을 직접 사용'],
        ['pc20b','같은 VLAN의 PC20B MAC']
      ],
      correct:'gateway',
      reason:'Return Path도 별도 판단입니다. PC20A는 PC10A를 off-link로 보고 Vlan20 Gateway MAC으로 Reply를 보냅니다. SW1은 VLAN10으로 Routing하면서 TTL 64→63, Egress Destination을 PC10A MAC으로 구성했습니다.',
      metric1:['VLAN20 Reply ingress','PC20A → Vlan20 Gateway MAC'],
      metric2:['VLAN10 Reply egress','SW1 → PC10A MAC · TTL 63'],
      conclusion:'왕복 경로에서 각 Host는 자신의 Subnet/Gateway 기준으로 독립적으로 Next-Hop을 정합니다.',
      steps:[
        {kind:'RETURN DECISION',title:'PC20A · PC10A는 off-link',detail:'PC20A는 10.10.10.10으로 직접 L2 전달하지 않습니다.',zone20:'active',hosts:['pc20a'],svis:['svi20'],packet:{ip:'10.10.20.10 → 10.10.10.10',mac:'Next-Hop = 10.10.20.1',ttl:'—',decision:'Vlan20 Gateway 선택'}},
        {kind:'REPLY INGRESS',title:'PC20A → Vlan20 Gateway',detail:'Reply Ethernet Destination은 Vlan20 SVI MAC입니다.',zone20:'active',hosts:['pc20a'],switch:'active',svis:['svi20'],link20:'reply',arrow20:'← GW',packet:{ip:'10.10.20.10 → 10.10.10.10',mac:'PC20A → Gateway',ttl:'64',decision:'Vlan20 L3 Ingress'}},
        {kind:'ROUTE BACK',title:'SW1 · VLAN10으로 Routing',detail:'TTL은 64→63으로 줄고 VLAN10 connected route를 사용합니다.',switch:'active',svis:['svi10','svi20'],packet:{ip:'10.10.20.10 → 10.10.10.10',mac:'L2 Header 재구성 중',ttl:'64 → 63',decision:'Vlan10 Egress 선택'}},
        {kind:'REPLY EGRESS',title:'SW1 → PC10A',detail:'VLAN10 Egress Ethernet Destination은 PC10A MAC입니다.',zone10:'active',hosts:['pc10a'],switch:'active',svis:['svi10'],link10:'reply',arrow10:'← PC10A',packet:{ip:'10.10.20.10 → 10.10.10.10',mac:'Vlan10 L3 MAC → PC10A',ttl:'63',decision:'Reply 도착'}}
      ]
    },
    {
      id:'svi-down',
      claim:'IVR-05',
      tab:'4 · Vlan20 SVI가 Down이면?',
      title:'VLAN20 L2는 살아 있어도 Inter-VLAN Routing은 끊길 수 있습니다.',
      text:'VLAN20 Access Port와 VLAN 자체는 그대로 두고 interface Vlan20만 shutdown한 실제 장애입니다.',
      start:['Vlan10 Up/Up','Vlan20 shutdown','VLAN20 Access Ports Up'],
      question:'이 상태에서 어떤 결과가 맞을까요?',
      options:[
        ['l2only','PC20A↔PC20B는 정상 · PC10A↔PC20A는 실패'],
        ['allfail','VLAN20의 Same-VLAN과 Inter-VLAN 모두 실패'],
        ['allworks','SVI가 Down이어도 모두 정상']
      ],
      correct:'l2only',
      reason:'Vlan20 SVI shutdown으로 10.10.20.0/24 connected route가 사라져 Inter-VLAN은 실패했지만 VLAN20 내부 L2 Switching은 계속 3/3 성공했습니다. 실제 장비는 PC10A에 Type 3 Code 1을 반환했습니다.',
      metric1:['L3 상태','Vlan20 Down · 10.10.20.0/24 route 없음'],
      metric2:['L2 Positive Control','PC20A ↔ PC20B · 3/3 성공'],
      conclusion:'SVI는 VLAN의 L3 Gateway 경계이며, SVI Down이 VLAN 자체의 L2 Switching Down과 같은 뜻은 아닙니다.',
      steps:[
        {kind:'FAILURE',title:'Vlan20 SVI shutdown',detail:'Vlan20이 administratively down/down이 되고 connected route가 제거됩니다.',switch:'stop',sviDown:['svi20'],svis:['svi10'],packet:{ip:'Route 10.10.20.0/24 없음',mac:'VLAN20 L2 Port는 유지',ttl:'—',decision:'L3 경로 상실'}},
        {kind:'REMOTE TRY',title:'PC10A → PC20A · Inter-VLAN 실패',detail:'PC10A의 요청은 VLAN10 Gateway까지 도달하지만 VLAN20으로 Routed Echo는 나오지 않습니다.',zone10:'active',hosts:['pc10a'],switch:'stop',svis:['svi10'],sviDown:['svi20'],link10:'active',arrow10:'→ GW',link20:'blocked',arrow20:'×',packet:{ip:'10.10.10.10 → 10.10.20.10',mac:'Gateway까지 도달',ttl:'64',decision:'No connected route to VLAN20'}},
        {kind:'ACTUAL ERROR',title:'SW1 → PC10A · Destination Unreachable',detail:'이번 IOL Run에서는 실제로 ICMP Type 3 Code 1이 반환됐습니다. 이 Code를 모든 플랫폼의 고정 규칙으로 일반화하지 않습니다.',zone10:'active',hosts:['pc10a'],switch:'stop',svis:['svi10'],sviDown:['svi20'],link10:'reply',arrow10:'← ICMP',packet:{ip:'10.10.10.1 → 10.10.10.10',mac:'SW1 → PC10A',ttl:'장비 생성 ICMP',decision:'실제 오류 응답'}},
        {kind:'L2 CONTROL',title:'PC20A ↔ PC20B · Same-VLAN 정상',detail:'VLAN20의 L2 Switching은 계속 동작해 Local Ping은 3/3 성공했습니다.',zone20:'active',hosts:['pc20a','pc20b'],switch:'active',sviDown:['svi20'],link20:'active',arrow20:'L2',packet:{ip:'10.10.20.10 ↔ 10.10.20.20',mac:'Peer MAC 직접 사용',ttl:'64 → 64',decision:'VLAN20 내부 Switching'}},
        {kind:'RECOVERY',title:'Vlan20 no shutdown → 안정화 후 복구',detail:'Connected route가 돌아왔고 첫 확인은 2/3, 이후 별도 안정화 Run에서 3/3 성공했습니다.',switch:'active',svis:['svi10','svi20'],zone10:'active',zone20:'active',link10:'active',link20:'active',arrow10:'→',arrow20:'→',packet:{ip:'Inter-VLAN 정상 복귀',mac:'Gateway → PC20A 재캡슐화',ttl:'64 → 63',decision:'Baseline 복구 확인'}}
      ]
    },
    {
      id:'wrong-gateway',
      claim:'IVR-06',
      tab:'5 · Gateway가 틀리면 어디서 멈출까?',
      title:'Same-VLAN은 되지만 Remote는 잘못된 Gateway ARP에서 멈춥니다.',
      text:'PC10A의 Gateway만 10.10.10.254로 바꿨고 그 주소에는 실제 Host/Router가 없습니다.',
      start:['PC10A GW = 10.10.10.254','10.10.10.254 ARP responder 없음','SW1 SVI / Routing 정상'],
      question:'PC10A의 통신 결과로 맞는 것은 무엇일까요?',
      options:[
        ['arpstop','PC10B는 정상 · PC20A는 .254 ARP 실패에서 중단'],
        ['allfail','잘못된 Gateway 때문에 PC10B도 실패'],
        ['remoteecho','PC20A Echo Request는 전송되지만 Reply만 실패']
      ],
      correct:'arpstop',
      reason:'Same-VLAN은 Gateway를 쓰지 않으므로 PC10B 통신은 3/3 유지됐습니다. Remote 통신은 10.10.10.254의 MAC을 구하려는 ARP에 Reply가 없어 실제 PC20A 대상 Echo Frame 자체가 생성되지 않았습니다.',
      metric1:['Same-VLAN','PC10A → PC10B · 3/3 성공'],
      metric2:['Remote-VLAN','ARP 10.10.10.254 무응답 · Echo 0개'],
      conclusion:'잘못된 Default Gateway는 Local L2 통신이 아니라 off-link Next-Hop Resolution에서 문제를 만듭니다.',
      steps:[
        {kind:'LOCAL CONTROL',title:'PC10A → PC10B · Same-VLAN 정상',detail:'PC10B는 on-link이므로 잘못된 Gateway 설정과 무관하게 Peer MAC으로 직접 통신합니다.',zone10:'active',hosts:['pc10a','pc10b'],switch:'active',link10:'active',arrow10:'L2',packet:{ip:'10.10.10.10 → 10.10.10.20',mac:'PC10A → PC10B',ttl:'64 → 64',decision:'Gateway 미사용'}},
        {kind:'REMOTE DECISION',title:'PC10A → PC20A · off-link',detail:'Remote Destination이라 설정된 Default Gateway 10.10.10.254를 Next-Hop으로 선택합니다.',zone10:'active',hosts:['pc10a'],packet:{ip:'Destination 10.10.20.10',mac:'Next-Hop 10.10.10.254',ttl:'—',decision:'잘못된 Gateway 선택'}},
        {kind:'ARP FAIL',title:'10.10.10.254 ARP · Reply 없음',detail:'PC10A는 존재하지 않는 Gateway MAC을 얻지 못합니다.',zone10:'stop',hosts:['pc10a'],link10:'blocked',arrow10:'ARP ×',packet:{ip:'ARP target 10.10.10.254',mac:'Reply 없음',ttl:'—',decision:'Neighbor Resolution 실패'}},
        {kind:'NO ECHO',title:'Remote Echo Frame은 생성되지 않음',detail:'L2 Next-Hop을 해결하지 못했기 때문에 PC20A를 Destination IP로 한 Echo Request Frame은 실제 Link에 나오지 않았습니다.',zone10:'stop',hosts:['pc10a'],link10:'blocked',link20:'blocked',arrow10:'×',arrow20:'×',packet:{ip:'10.10.20.10 대상 Echo 0개',mac:'Ethernet Frame 미생성',ttl:'—',decision:'ARP 단계에서 중단'}},
        {kind:'RECOVERY',title:'Gateway 10.10.10.1 복구',detail:'정상 Gateway ARP 후 PC20A Remote Ping이 다시 3/3 성공했습니다.',zone10:'active',zone20:'active',hosts:['pc10a','pc20a'],switch:'active',svis:['svi10','svi20'],link10:'active',link20:'active',arrow10:'→ GW',arrow20:'→ PC20A',packet:{ip:'10.10.10.10 → 10.10.20.10',mac:'Gateway → PC20A',ttl:'64 → 63',decision:'Inter-VLAN 정상 복귀'}}
      ]
    }
  ];


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function clearTopology(){
    ['zone10','zone20'].forEach(id=>$(id).className='zone');
    ['pc10a','pc10b','pc20a','pc20b'].forEach(id=>$(id).className='host');
    $('sw1').className='switch-box';
    ['svi10','svi20'].forEach(id=>$(id).className='svi');
    ['link10','link20'].forEach(id=>$(id).className='path-link');
    $('link10Arrow').textContent='·';$('link20Arrow').textContent='·';
  }
function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex];
    clearTopology();
    if(step.zone10)$('zone10').classList.add(step.zone10);
    if(step.zone20)$('zone20').classList.add(step.zone20);
    (step.hosts||[]).forEach(id=>$(id).classList.add(step.kind.includes('REPLY')?'reply':step.kind.includes('FAIL')?'stop':'active'));
    if(step.switch)$('sw1').classList.add(step.switch);
    (step.svis||[]).forEach(id=>$(id).classList.add('active'));
    (step.sviDown||[]).forEach(id=>$(id).classList.add('down'));
    if(step.link10)$('link10').classList.add(step.link10);
    if(step.link20)$('link20').classList.add(step.link20);
    if(step.arrow10)$('link10Arrow').textContent=step.arrow10;
    if(step.arrow20)$('link20Arrow').textContent=step.arrow20;
    $('packetIp').textContent=step.packet?.ip||'—';
    $('packetMac').textContent=step.packet?.mac||'—';
    $('packetTtl').textContent=step.packet?.ttl||'—';
    $('packetDecision').textContent=step.packet?.decision||'—';
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
    "PC10A": "PC A",
    "PC10B": "PC B",
    "PC20A": "PC C",
    "PC20B": "PC D",
    "SW1": "Switch A"
  },
  "lessons": [
    {
      "title": "같은 VLAN의 PC B에는 누구의 MAC으로 보낼까요?",
      "brief": "학습 페이지의 같은 VLAN 10 경로입니다. 목적지 10.10.10.20이 같은 /24에 속하는지 판단합니다.",
      "hints": [
        "단말은 먼저 목적지가 같은 Subnet인지 판단합니다.",
        "IP 목적지와 첫 Ethernet Destination을 구분하세요."
      ]
    },
    {
      "title": "다른 VLAN의 PC C에는 어떤 프레임으로 보낼까요?",
      "brief": "학습 페이지의 VLAN 10 → VLAN 20 경로입니다. 첫 MAC 목적지와 최종 IP 목적지, Routing 전후 TTL을 비교합니다.",
      "hints": [
        "Gateway가 다음 전달 대상이라고 최종 IP 목적지가 바뀌는 것은 아닙니다.",
        "Routing 뒤 다음 구간에 맞게 Ethernet Header가 다시 만들어집니다."
      ]
    },
    {
      "title": "PC C의 응답은 어느 Gateway로 갈까요?",
      "brief": "응답 단말도 자신의 /24와 Gateway를 기준으로 독립적으로 판단합니다.",
      "hints": [
        "요청 단말의 Gateway 설정을 응답 단말에 그대로 적용하지 않습니다.",
        "PC C의 현재 VLAN과 Gateway 주소를 확인하세요."
      ]
    },
    {
      "title": "SVI가 내려가면 같은 VLAN 통신도 끊길까요?",
      "brief": "Vlan20 SVI만 shutdown한 조건입니다. VLAN 20 내부 L2 전달과 VLAN 사이 L3 전달을 구분합니다.",
      "hints": [
        "단말의 L2 포트가 내려간 상황은 아닙니다.",
        "SVI 상태와 Connected Route의 관계를 보세요."
      ]
    },
    {
      "title": "Gateway가 틀리면 어떤 통신이 실패할까요?",
      "brief": "PC A의 Gateway만 존재하지 않는 10.10.10.254로 변경했습니다. 같은 VLAN과 다른 VLAN을 비교합니다.",
      "hints": [
        "같은 Subnet의 단말에는 Gateway를 사용하지 않습니다.",
        "다른 Subnet의 Echo를 만들기 전 어느 MAC을 알아야 할까요?"
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
PacketLabPresentation.attach(adapter, {
  "desktop": ".ivr-topology",
  "height": 510,
  "note": "VLAN 10 단말은 위쪽, VLAN 20 단말은 아래쪽입니다. Switch A의 SVI는 Vlan10 10.10.10.1, Vlan20 10.10.20.1입니다. L2 전달과 SVI Routing을 구분합니다.",
  "nodes": [
    {
      "id": "pc10a",
      "name": "PC A",
      "type": "pc",
      "x": 80,
      "y": 65,
      "detail": "10.10.10.10"
    },
    {
      "id": "pc10b",
      "name": "PC B",
      "type": "pc",
      "x": 240,
      "y": 65,
      "detail": "10.10.10.20"
    },
    {
      "id": "sw1",
      "name": "Switch A",
      "type": "switch",
      "x": 160,
      "y": 255,
      "detail": "SVI · L2 / L3"
    },
    {
      "id": "pc20a",
      "name": "PC C",
      "type": "pc",
      "x": 80,
      "y": 435,
      "detail": "10.10.20.10"
    },
    {
      "id": "pc20b",
      "name": "PC D",
      "type": "pc",
      "x": 240,
      "y": 435,
      "detail": "10.10.20.20"
    }
  ],
  "edges": [
    [
      "pc10a",
      "sw1",
      "link10"
    ],
    [
      "pc10b",
      "sw1",
      "link10"
    ],
    [
      "sw1",
      "pc20a",
      "link20"
    ],
    [
      "sw1",
      "pc20b",
      "link20"
    ]
  ],
  "steps": {
    "same-vlan": [
      {
        "path": [],
        "caption": "같은 /24 · PC B를 Next-Hop으로 선택"
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "pc10b"
        ],
        "caption": "VLAN 10에서 PC B의 MAC 확인"
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "pc10b"
        ],
        "caption": "L2 전달 · TTL 64 유지"
      }
    ],
    "remote-forward": [
      {
        "path": [],
        "caption": "다른 /24 · Gateway 10.10.10.1 선택"
      },
      {
        "path": [
          "pc10a",
          "sw1"
        ],
        "caption": "Gateway MAC 확인"
      },
      {
        "path": [
          "pc10a",
          "sw1"
        ],
        "caption": "IP 목적지 PC C · MAC 목적지 Gateway · TTL 64"
      },
      {
        "path": [],
        "caption": "Connected Route 선택 · TTL 64 → 63"
      },
      {
        "path": [
          "sw1",
          "pc20a"
        ],
        "caption": "새 Ethernet Header · MAC 목적지 PC C · TTL 63"
      }
    ],
    "reply": [
      {
        "path": [],
        "caption": "PC C가 자신의 Gateway 10.10.20.1 선택"
      },
      {
        "path": [
          "pc20a",
          "sw1"
        ],
        "caption": "Reply 유입 · TTL 64",
        "reply": true
      },
      {
        "path": [],
        "caption": "VLAN 10 경로 조회 · TTL 64 → 63"
      },
      {
        "path": [
          "sw1",
          "pc10a"
        ],
        "caption": "Reply 송출 · MAC 목적지 PC A",
        "reply": true
      }
    ],
    "svi-down": [
      {
        "path": [],
        "caption": "Vlan20 SVI Down · Connected Route 제거",
        "stop": true
      },
      {
        "path": [
          "pc10a",
          "sw1"
        ],
        "caption": "Gateway까지 도달 · VLAN 20 전달 중단",
        "stop": true
      },
      {
        "path": [
          "sw1",
          "pc10a"
        ],
        "caption": "이번 IOL 관찰 · ICMP Type 3 Code 1",
        "reply": true
      },
      {
        "path": [
          "pc20a",
          "sw1",
          "pc20b"
        ],
        "caption": "VLAN 20 L2 통신은 유지 · TTL 64"
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "pc20a"
        ],
        "caption": "SVI 복구 후 안정화 확인 · Inter-VLAN 정상"
      }
    ],
    "wrong-gateway": [
      {
        "path": [
          "pc10a",
          "sw1",
          "pc10b"
        ],
        "caption": "같은 VLAN 통신 · Gateway 미사용"
      },
      {
        "path": [],
        "caption": "다른 Subnet · 잘못된 Gateway .254 선택"
      },
      {
        "path": [],
        "caption": "ARP .254 무응답 · MAC 확인 실패",
        "stop": true
      },
      {
        "path": [],
        "caption": "Remote Echo 프레임 미생성",
        "stop": true
      },
      {
        "path": [
          "pc10a",
          "sw1",
          "pc20a"
        ],
        "caption": "Gateway .1 복구 후 Inter-VLAN 정상"
      }
    ]
  }
});
NetworkSimulator.mount(adapter);
})();
