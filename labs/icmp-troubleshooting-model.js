// Existing lesson data and topic renderer retained from icmp-troubleshooting-simulator; playback is shared.
(()=>{
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


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
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
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;clearTopology();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};

// Presentation follows the current Concept Guide; raw evidence above is unchanged.
adapter.presentation = {
  "names": {
    "R1": "Router A",
    "R2": "Router B",
    "R3": "Router C"
  },
  "lessons": [
    {
      "title": "Ping 성공은 어떤 응답으로 확인할까요?",
      "brief": "학습 페이지의 왕복 확인을 따라갑니다. Echo Request가 목적지에 도달한 뒤 어떤 메시지가 돌아오는지 살펴보세요.",
      "hints": [
        "요청이 목적지에 도착한 것과 송신자가 응답을 받은 것을 구분하세요.",
        "Echo Request와 대응하는 응답의 이름과 Type을 비교하세요."
      ]
    },
    {
      "title": "Router를 지나면 TTL은 어떻게 바뀔까요?",
      "brief": "같은 Echo Request를 Router B에 들어가기 전과 나온 뒤에 비교합니다.",
      "hints": [
        "서로 다른 패킷의 TTL을 비교하지 않습니다.",
        "중간 Router가 전달하는 횟수를 세어보세요."
      ]
    },
    {
      "title": "TTL이 1인 Probe는 어디에서 멈출까요?",
      "brief": "학습 페이지의 TTL 만료 그림과 같은 조건입니다. Router B 이후의 전달과 되돌아오는 알림을 구분하세요.",
      "hints": [
        "TTL이 0이 된 원래 패킷은 다음 Hop으로 갈 수 있을까요?",
        "원래 Probe와 이를 알리는 ICMP 메시지는 서로 다른 패킷입니다."
      ]
    },
    {
      "title": "Traceroute는 첫 번째 Hop을 어떻게 알까요?",
      "brief": "TTL 1과 TTL 2의 UDP Probe를 차례로 관찰합니다. 이번 Cisco 구현의 목적지 응답도 확인하세요.",
      "hints": [
        "응답을 보낸 장비의 주소가 경로 단서입니다.",
        "중간 Hop의 응답과 최종 목적지의 응답을 구분하세요."
      ]
    },
    {
      "title": "Route가 없을 때 어떤 오류가 돌아올까요?",
      "brief": "학습 페이지의 선택 자료에 있는 Cisco 관찰 사례입니다. ICMP Code와 Router B의 Route 유무를 함께 봅니다.",
      "hints": [
        "링크가 연결돼 있어도 목적지 Route가 없을 수 있습니다.",
        "이번 장비의 관찰 결과를 모든 제조사의 고정 규칙으로 확대하지 않습니다."
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
  "desktop": ".topo-flow",
  "height": 430,
  "nodes": [
    {
      "id": "nodeR1",
      "name": "Router A",
      "type": "router",
      "x": 160,
      "y": 65,
      "detail": "10.10.12.1"
    },
    {
      "id": "nodeR2",
      "name": "Router B",
      "type": "router",
      "x": 160,
      "y": 205,
      "detail": "중간 Router"
    },
    {
      "id": "nodeR3",
      "name": "Router C",
      "type": "router",
      "x": 160,
      "y": 345,
      "detail": "198.51.100.3"
    }
  ],
  "edges": [
    [
      "nodeR1",
      "nodeR2",
      "link12"
    ],
    [
      "nodeR2",
      "nodeR3",
      "link23"
    ]
  ],
  "steps": {
    "echo": [
      {
        "path": [
          "nodeR1",
          "nodeR2"
        ],
        "caption": "Echo Request · Type 8"
      },
      {
        "path": [
          "nodeR2",
          "nodeR3"
        ],
        "caption": "목적지 Route로 Echo Request 전달"
      },
      {
        "path": [
          "nodeR3",
          "nodeR2"
        ],
        "caption": "Echo Reply · Type 0",
        "reply": true
      },
      {
        "path": [
          "nodeR2",
          "nodeR1"
        ],
        "caption": "대응 Echo Reply 도착",
        "reply": true
      }
    ],
    "ttl": [
      {
        "path": [
          "nodeR1",
          "nodeR2"
        ],
        "caption": "CP1 · TTL 255"
      },
      {
        "path": [],
        "caption": "Router B · Route 조회와 TTL 감소"
      },
      {
        "path": [
          "nodeR2",
          "nodeR3"
        ],
        "caption": "CP2 · TTL 254"
      }
    ],
    "expiry": [
      {
        "path": [
          "nodeR1",
          "nodeR2"
        ],
        "caption": "UDP Probe · TTL 1"
      },
      {
        "path": [],
        "caption": "Router B에서 TTL 만료 · 원래 Probe 폐기",
        "stop": true
      },
      {
        "path": [
          "nodeR2",
          "nodeR1"
        ],
        "caption": "Time Exceeded · Type 11 Code 0",
        "reply": true
      }
    ],
    "trace": [
      {
        "path": [
          "nodeR1",
          "nodeR2"
        ],
        "caption": "첫 Probe · TTL 1 · UDP 33434"
      },
      {
        "path": [
          "nodeR2",
          "nodeR1"
        ],
        "caption": "첫 Hop 응답 · 10.10.12.2",
        "reply": true
      },
      {
        "path": [
          "nodeR1",
          "nodeR2",
          "nodeR3"
        ],
        "caption": "다음 Probe · TTL 2 · UDP 33435"
      },
      {
        "path": [
          "nodeR3",
          "nodeR2",
          "nodeR1"
        ],
        "caption": "Port Unreachable · Type 3 Code 3",
        "reply": true
      }
    ],
    "unreachable": [
      {
        "path": [
          "nodeR1",
          "nodeR2"
        ],
        "caption": "Echo Request 도착"
      },
      {
        "path": [],
        "caption": "목적지 /32 Route와 Default Route 없음",
        "stop": true
      },
      {
        "path": [
          "nodeR2",
          "nodeR1"
        ],
        "caption": "이번 Cisco 관찰 · Type 3 Code 1",
        "reply": true
      },
      {
        "path": [],
        "caption": "RFC 예상과 Cisco 관찰을 구분해 해석"
      }
    ]
  }
});
NetworkSimulator.mount(adapter);
})();
