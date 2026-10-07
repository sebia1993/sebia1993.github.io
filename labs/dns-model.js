// Existing lesson data and topic renderer retained from dns-simulator; playback is shared.
(()=>{
const $=id=>document.getElementById(id);

  const scenarios=[
    {
      id:'query',
      claim:'DNS-01',
      tab:'1 · A Query / Response',
      title:'이름을 A Record로 해석한 뒤 실제 IP 통신까지 이어집니다.',
      text:'PC1은 DNS Server 198.51.100.2에 app.lab.test A Query를 보냈고 203.0.113.10을 받았습니다.',
      start:['PC1 DNS = 198.51.100.2','QNAME = app.lab.test','Target = 203.0.113.10'],
      question:'정상 DNS 해석 뒤 실제로 확인된 흐름은 무엇일까요?',
      options:[
        ['answer','A 203.0.113.10 응답 → 해당 IP로 ICMP 3/3'],
        ['dns-only','DNS 응답만 있고 실제 IP 통신은 검증하지 않음'],
        ['gateway','Gateway가 이름을 IP로 바꿔서 Client에 전달']
      ],
      correct:'answer',
      reason:'Client-side Query/Response는 같은 DNS ID로 대응됐고 Answer A=203.0.113.10, TTL=10이었습니다. 이어진 Name Ping의 ICMP도 203.0.113.10까지 실제 3/3 전달됐습니다.',
      metric1:['DNS Answer','A 203.0.113.10 · TTL 10'],
      metric2:['After Resolution','ICMP Echo 3/3'],
      conclusion:'DNS 해석 성공과 해석된 IP로의 실제 통신을 별도 Evidence로 확인했습니다.',
      steps:[
        {kind:'CLIENT QUERY',title:'PC1 → R2 · app.lab.test A Query',detail:'RD=1, QTYPE=A, QCLASS=IN, Client-side DNS ID 21456으로 Query했습니다.',links:{l1:'query',l3:'query',l4:'query'},nodes:['pc1','sw1','r1','r2'],marker:{text:'A? app.lab.test',type:'query',left:475,top:156},dns:'Query sent',ip:'Direct IP 3/3 정상'},
        {kind:'DNS RESPONSE',title:'R2 → PC1 · A 203.0.113.10',detail:'RCODE=0, RA=1, Answer TTL=10. Client-side Response ID도 21456이었습니다.',links:{l4:'response',l3:'response',l1:'response'},nodes:['r2','r1','sw1','pc1'],marker:{text:'A .10 · TTL10',type:'reply',left:365,top:156},dns:'Resolved = 203.0.113.10',ip:'아직 Name Ping 전'},
        {kind:'IP TRAFFIC',title:'Name Ping은 203.0.113.10으로 진행',detail:'해석된 주소로 ICMP Echo Request/Reply가 CP1/CP3/CP4에서 대응됐습니다.',links:{l1:'icmp',l3:'icmp',l4:'icmp',l5:'icmp'},nodes:['pc1','sw1','r1','r2','r3'],marker:{text:'ICMP 3/3',type:'icmp',left:692,top:156},dns:'Resolution 완료',ip:'203.0.113.10 3/3'}
      ]
    },
    {
      id:'recursive',
      claim:'DNS-02',
      tab:'2 · Recursive / Upstream',
      title:'Cache Miss이면 R2가 R3에 별도의 Upstream Query를 보냅니다.',
      text:'Client가 R2에 보낸 Query와 R2가 R3에 보낸 Query는 QNAME은 같지만 DNS ID는 달랐습니다.',
      start:['Client Query RD=1','R2 Cache = miss','R3 = lab.test authority'],
      question:'이번 검증에서 Client→R2와 R2→R3의 DNS ID 관계는 어땠을까요?',
      options:[
        ['rewrite','R2가 Upstream Leg에서 다른 DNS ID를 사용'],
        ['same','두 Leg가 항상 같은 DNS ID를 사용'],
        ['none','DNS에는 Transaction ID가 없음']
      ],
      correct:'rewrite',
      reason:'Client-side ID는 21456, Upstream ID는 31909였습니다. Resolver가 ID를 다시 쓸 수 있으므로 두 Leg를 ID equality만으로 연결하면 안 됩니다.',
      metric1:['Client Leg','ID 21456 · RD=1'],
      metric2:['Upstream Leg','ID 31909 · R3 AA=1'],
      conclusion:'Recursive Resolver는 Client Query를 그대로 Wire 복사하지 않고 별도 Upstream Transaction을 만들 수 있습니다.',
      steps:[
        {kind:'CLIENT LEG',title:'PC1 → R2 · ID 21456',detail:'QNAME app.lab.test, RD=1 Query가 CP3에서 R2까지 도착했습니다.',links:{l1:'query',l3:'query',l4:'query'},nodes:['pc1','r2'],marker:{text:'ID 21456',type:'query',left:478,top:156},dns:'Client transaction',ip:'IP path 정상'},
        {kind:'UPSTREAM LEG',title:'R2 → R3 · ID 31909',detail:'Cache Miss 때문에 R2가 configured upstream R3에 같은 QNAME/QTYPE의 새 Query를 만들었습니다.',links:{l5:'upstream'},nodes:['r2','r3'],marker:{text:'ID 31909',type:'upstream',left:685,top:156},dns:'Upstream transaction',ip:'변화 없음'},
        {kind:'AUTHORITY ANSWER',title:'R3 → R2 · AA=1 · A .10',detail:'R3가 Authoritative Answer를 반환했고 R2가 이를 Client-facing Answer로 전달했습니다.',links:{l5:'response',l4:'response',l3:'response',l1:'response'},nodes:['r3','r2','r1','pc1'],marker:{text:'AA1 · A .10',type:'reply',left:650,top:156},dns:'Authoritative answer',ip:'Name Ping 가능'},
        {kind:'BOUNDARY',title:'Root/TLD 전체 Iteration은 검증하지 않음',detail:'이번 Lab은 R2가 configured upstream R3에 Query하는 구조만 검증했습니다.',links:{},nodes:['r2','r3'],dns:'Scope boundary',ip:'IP path 정상'}
      ]
    },
    {
      id:'cache',
      claim:'DNS-03',
      tab:'3 · Cache Miss / Hit',
      title:'TTL이 남아 있으면 두 번째 Client는 R3까지 가지 않고 R2 Cache에서 답을 받습니다.',
      text:'첫 Query는 PC1, 두 번째 Query는 PC2로 실행해 Client 자체 Cache 영향을 분리했습니다.',
      start:['R2 Cache clear','PC1 = first query','PC2 = second query'],
      question:'TTL-valid 두 번째 Query에서 실제로 확인된 것은 무엇일까요?',
      options:[
        ['hit','PC2→R2 Query는 존재 · 새 R2→R3 Query는 0'],
        ['miss','PC2 Query도 반드시 R3까지 감'],
        ['local','PC2가 PC1의 Client Cache를 직접 공유']
      ],
      correct:'hit',
      reason:'첫 응답 TTL=10 이후 약 3.6초 뒤 PC2가 Query했고 R2가 TTL=6 Answer를 반환했습니다. 같은 두 번째 Query에 대응하는 Upstream Query는 CP4에서 0이었습니다.',
      metric1:['First Query','Cache Miss · R3 Query 있음 · TTL 10'],
      metric2:['Second Query','Cache Hit · R3 Query 0 · TTL 6'],
      conclusion:'Cache는 TTL 동안 Resolver가 이전 Answer를 재사용해 Upstream Query를 줄일 수 있게 합니다.',
      steps:[
        {kind:'CACHE MISS',title:'PC1 첫 Query → R3까지',detail:'R2 Cache를 비운 뒤 첫 app.lab.test Query는 CP4의 R3까지 갔습니다.',links:{l1:'query',l3:'query',l4:'query',l5:'upstream'},nodes:['pc1','r2','r3'],marker:{text:'MISS',type:'upstream',left:683,top:156},dns:'Cache miss',ip:'Name Ping 정상'},
        {kind:'CACHE FILL',title:'R2가 TTL 10 Answer 저장',detail:'R3의 A 203.0.113.10 Response를 받고 R2 show hosts에 temp entry가 나타났습니다.',links:{l5:'response',l4:'response',l3:'response',l1:'response'},nodes:['r3','r2','pc1'],marker:{text:'TTL 10',type:'reply',left:580,top:156},dns:'Cache populated',ip:'정상'},
        {kind:'CACHE HIT',title:'약 3.6초 뒤 PC2 Query',detail:'PC2 Query는 R2까지 도착했고 R2가 TTL 6의 Cached Answer를 바로 반환했습니다.',links:{l2:'query',l3:'query',l4:'query'},nodes:['pc2','sw1','r1','r2'],marker:{text:'HIT · TTL6',type:'query',left:472,top:156},dns:'Cache hit',ip:'정상'},
        {kind:'NO UPSTREAM',title:'두 번째 Upstream Query = 0',detail:'같은 Query 구간 CP4 Capture는 건강했지만 R2→R3의 새 DNS Query는 없었습니다.',links:{l5:'idle',l4:'response',l3:'response',l2:'response'},nodes:['r2','pc2'],marker:{text:'CACHE ANSWER',type:'reply',left:350,top:255},dns:'Answered at R2',ip:'PC2 Name Ping 3/3'}
      ]
    },
    {
      id:'faults',
      claim:'DNS-04 / DNS-05',
      tab:'4 · DNS Down vs Wrong DNS',
      title:'둘 다 이름이 안 되지만 Query가 멈추는 위치가 다릅니다.',
      text:'재검증에서는 VPCS 0.8.4 Client가 장애/복구 중 종료되지 않았고 동일 Worker가 유지됐습니다.',
      start:['Direct IP Ping = 정상','R2 = real resolver .2','Wrong DNS = local unused .254'],
      question:'두 장애를 올바르게 구분한 것은 무엇일까요?',
      options:[
        ['location','Server Down: Query가 R2까지 감 · Wrong DNS: .254 ARP에서 멈춤'],
        ['same','둘 다 Query가 R2까지 도달하고 Response만 없음'],
        ['ipfail','둘 다 Direct IP Ping도 실패']
      ],
      correct:'location',
      reason:'R2 DNS Service Down에서는 CP3에 Query가 있었지만 DNS Response는 0이었습니다. Wrong DNS에서는 PC1이 192.0.2.254를 ARP했고 Reply 0, 실제 R2 Query도 0이었습니다. 두 경우 모두 Direct IP Ping 3/3은 유지됐습니다.',
      metric1:['DNS Service Down','Query → R2 ✓ · DNS Response 0 · IP 3/3'],
      metric2:['Wrong DNS .254','ARP ✓ · ARP Reply 0 · Resolver Query 0 · IP 3/3'],
      conclusion:'“IP는 되는데 이름만 안 됨”에서 Query가 어디까지 갔는지가 Resolver 장애와 Client 설정 오류를 가릅니다.',
      steps:[
        {kind:'SERVICE DOWN',title:'R2 DNS Service Down',detail:'PC1 Query는 CP3의 R2까지 도착했지만 DNS Response는 없었고 이번 IOS는 ICMP Type3 Code3도 반환했습니다.',links:{l1:'query',l3:'query',l4:'query',l5:'stop'},nodes:['pc1','r2'],marker:{text:'NO DNS ANSWER',type:'error',left:575,top:156},dns:'Cannot resolve',ip:'203.0.113.10 3/3'},
        {kind:'SERVICE RECOVERY',title:'R2 ip dns server 복구',detail:'Client 재시작 없이 같은 PC1 Worker가 유지됐고 down.lab.test 이름 Ping이 3/3으로 복구됐습니다.',links:{l1:'response',l3:'response',l4:'response',l5:'response'},nodes:['pc1','r2','r3'],marker:{text:'RECOVERED',type:'reply',left:520,top:156},dns:'Name Ping 3/3',ip:'3/3'},
        {kind:'WRONG DNS',title:'PC1 DNS = 192.0.2.254',detail:'PC1은 Local LAN에서 .254 MAC을 찾는 ARP만 보냈습니다. ARP Reply는 없고 실제 R2 Resolver Query도 없었습니다.',links:{l1:'arp',l3:'arp',l4:'stop'},nodes:['pc1','sw1','r1'],marker:{text:'ARP .254 ?',type:'arp',left:220,top:156},dns:'Query never reaches R2',ip:'203.0.113.10 3/3'},
        {kind:'CLIENT RECOVERY',title:'DNS 주소만 198.51.100.2로 복구',detail:'PC1 재시작 없이 wrong.lab.test Answer와 이름 Ping이 정상으로 돌아왔습니다.',links:{l1:'response',l3:'response',l4:'response',l5:'response'},nodes:['pc1','r2','r3'],marker:{text:'DNS .2 RESTORED',type:'reply',left:485,top:156},dns:'Name Ping 3/3',ip:'3/3'}
      ]
    },
    {
      id:'nxdomain',
      claim:'DNS-06',
      tab:'5 · NXDOMAIN은 Timeout일까?',
      title:'NXDOMAIN은 “응답이 없음”이 아니라 RCODE=3 DNS Response입니다.',
      text:'R3에서 recover.lab.test A Record만 제거하고 R2 Cache를 비운 뒤 Query했습니다.',
      start:['R2/R3 DNS Service = up','recover.lab.test record = removed','IP routing = 정상'],
      question:'Record가 없는 이번 Scenario에서 실제로 돌아온 것은 무엇일까요?',
      options:[
        ['nxdomain','DNS Response 존재 · RCODE=3 · A Answer 없음'],
        ['timeout','아무 DNS Response도 없이 Timeout만 발생'],
        ['servfail','RCODE=2 SERVFAIL']
      ],
      correct:'nxdomain',
      reason:'R3는 AA=1, RCODE=3의 NXDOMAIN Response를 반환했고 R2도 Client에 RCODE=3을 전달했습니다. Record 복구 후 PC2는 RCODE=0, A 203.0.113.10을 받아 Name Ping 3/3에 성공했습니다.',
      metric1:['Failure','R3 AA=1 · RCODE=3 · A Answer 없음'],
      metric2:['Recovery','PC2 RCODE=0 · A .10 · Ping 3/3'],
      conclusion:'NXDOMAIN은 DNS Error Response이며 Server Down의 “DNS Response 없음”과 구분해야 합니다.',
      steps:[
        {kind:'QUERY TO AUTHORITY',title:'recover.lab.test Query가 R3까지 도달',detail:'R2 Cache를 비운 뒤 CP4에서 R3 Authoritative DNS까지 Query가 전달됐습니다.',links:{l1:'query',l3:'query',l4:'query',l5:'upstream'},nodes:['pc1','r2','r3'],marker:{text:'recover A?',type:'upstream',left:690,top:156},dns:'Query reaches authority',ip:'IP path 정상'},
        {kind:'NXDOMAIN RESPONSE',title:'R3 → R2 · AA=1 · RCODE=3',detail:'Record가 없기 때문에 A Answer 없이 NXDOMAIN Response가 실제로 돌아왔습니다.',links:{l5:'response',l4:'response',l3:'response',l1:'response'},nodes:['r3','r2','pc1'],marker:{text:'NXDOMAIN · RCODE3',type:'error',left:560,top:156},dns:'Error response received',ip:'IP path 정상'},
        {kind:'NOT TIMEOUT',title:'Client도 RCODE=3 Response를 받음',detail:'따라서 이 상태는 Server Down처럼 Response가 없는 상태가 아닙니다. VPCS의 후속 AAAA Query는 별도 Actual로 보존했습니다.',links:{l1:'response'},nodes:['pc1'],marker:{text:'RCODE 3',type:'error',left:115,top:92},dns:'NXDOMAIN',ip:'IP path 정상'},
        {kind:'RECORD RECOVERY',title:'Record 복구 + Cache clear → PC2 성공',detail:'recover.lab.test A Record를 복구하고 PC2로 다시 조회해 RCODE=0, A .10, Name Ping 3/3을 확인했습니다.',links:{l2:'query',l3:'query',l4:'query',l5:'upstream'},nodes:['pc2','r2','r3'],marker:{text:'A .10 RESTORED',type:'reply',left:690,top:156},dns:'Resolved 정상',ip:'PC2 Ping 3/3'}
      ]
    }
  ];


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function resetVisual(){
    ['pc1','pc2','sw1','r1','r2','r3'].forEach(id=>$(id).className='device');
    ['l1','l2','l3','l4','l5'].forEach((k,i)=>{$(k+'Svg').setAttribute('class','net-link idle');$('label'+(i+1)).className='link-label';});
    $('label1').textContent='CP1 · PC1 Edge';
    $('label2').textContent='CP2 · PC2 Edge';
    $('label3').textContent='Client LAN';
    $('label4').textContent='CP3 · R1↔R2';
    $('label5').textContent='CP4 · R2↔R3';
    $('packetMarker').className='packet-marker';
    $('cacheBadge').textContent='Cache / Recursive';
    $('authBadge').textContent='lab.test Authority';
  }
function setLink(key,state){
    const n={l1:1,l2:2,l3:3,l4:4,l5:5}[key]; if(!n)return;
    $(key+'Svg').setAttribute('class','net-link '+state);
    const lab=$('label'+n); lab.className='link-label';
    if(['query','upstream','response','icmp','arp','stop'].includes(state))lab.classList.add(state);
  }
function showMarker(m){
    const el=$('packetMarker'); if(!m){el.className='packet-marker';return;}
    el.className='packet-marker show';
    if(m.type==='upstream')el.classList.add('upstream');
    if(m.type==='reply')el.classList.add('reply');
    if(m.type==='icmp')el.classList.add('icmp');
    if(m.type==='arp')el.classList.add('arp');
    if(m.type==='error')el.classList.add('error');
    el.textContent=m.text; el.style.left=m.left+'px'; el.style.top=m.top+'px';
  }
function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex]; resetVisual();
    Object.entries(step.links||{}).forEach(([k,v])=>setLink(k,v));
    (step.nodes||[]).forEach(id=>{
      const cls=step.kind.includes('CACHE')&&id==='r2'?'cache':step.kind.includes('AUTH')&&id==='r3'?'upstream':step.kind.includes('NXDOMAIN')?'stop':step.kind.includes('RESPONSE')||step.kind.includes('RECOVERY')?'reply':'active';
      $(id).classList.add(cls);
    });
    showMarker(step.marker);
    $('dnsState').textContent=step.dns||'—'; $('ipState').textContent=step.ip||'—';
    $('eventKind').textContent=step.kind; $('eventTitle').textContent=step.title; $('eventDetail').textContent=step.detail;
    $('stepCount').textContent=(stepIndex+1)+' / '+s.steps.length;
    $('prevStepBtn').disabled=stepIndex===0; $('nextStepBtn').disabled=stepIndex===s.steps.length-1;
  }
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;resetVisual();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};

// Presentation follows the current Concept Guide; raw evidence above is unchanged.
adapter.presentation = {
  "names": {
    "PC1": "PC A",
    "PC2": "PC B",
    "SW1": "Switch A",
    "R1": "Router A",
    "R2": "Router B",
    "R3": "Router C"
  },
  "lessons": [
    {
      "title": "이름을 찾은 뒤 실제 통신은 어디로 갈까요?",
      "brief": "학습 페이지처럼 DNS Query / Response와 반환된 IP로 하는 통신을 나누어 관찰합니다.",
      "hints": [
        "DNS 서버의 주소와 응답에 담긴 서비스 주소는 서로 다릅니다.",
        "이름 조회 성공과 실제 IP 통신 성공을 각각 확인하세요."
      ]
    },
    {
      "title": "Resolver가 다시 물으면 DNS ID도 같을까요?",
      "brief": "PC A → Router B와 Router B → Router C는 서로 다른 조회 구간입니다. 같은 이름의 두 Transaction을 비교합니다.",
      "hints": [
        "이름과 QTYPE, 시점을 함께 확인하세요.",
        "단말 쪽 Query / Response는 같은 구간의 ID로 대응합니다."
      ]
    },
    {
      "title": "유효한 Cache가 있으면 어디까지 물어볼까요?",
      "brief": "학습 페이지의 PC A 첫 조회와 PC B 두 번째 조회입니다. Cache TTL이 남은 조건에서 Upstream 사용을 비교합니다.",
      "hints": [
        "두 번째 단말도 자신의 DNS 서버에는 질문합니다.",
        "생략될 수 있는 것은 Resolver 이후의 새 Query입니다."
      ]
    },
    {
      "title": "DNS 서비스 중지와 잘못된 DNS 주소는 어떻게 다를까요?",
      "brief": "IP 통신이 정상인 상태에서 이름 조회만 실패합니다. Query가 Resolver까지 도달했는지 확인합니다.",
      "hints": [
        "단말이 설정한 DNS 주소부터 보세요.",
        "ARP 단계 중단과 DNS 서버의 무응답은 위치가 다릅니다."
      ]
    },
    {
      "title": "NXDOMAIN은 응답이 없는 상태일까요?",
      "brief": "학습 페이지에서 구분한 오류 응답과 무응답을 비교합니다. 없는 Record를 묻고 RCODE를 관찰합니다.",
      "hints": [
        "응답 패킷이 실제로 돌아왔는지 먼저 봅니다.",
        "A Record가 없다는 것과 DNS Response가 없다는 것은 다릅니다."
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
    "name": "Switch A",
    "reason": "학습 페이지의 조회 관계에서 생략한 실제 접속 스위치 SW1을 Switch A로 표시합니다."
  },
  {
    "name": "Router A",
    "reason": "학습 페이지의 조회 관계에서 생략한 Gateway R1을 Router A로 표시해 단말망과 Resolver 사이 실제 전달 구간을 함께 관찰합니다."
  }
];
PacketLabPresentation.attach(adapter, {
  "desktop": ".topology-stage",
  "height": 720,
  "note": "학습 페이지의 조회 관계에 Switch A와 Gateway인 Router A를 포함했습니다. Router B는 Resolver, Router C는 설정된 Upstream입니다.",
  "nodes": [
    {
      "id": "pc1",
      "name": "PC A",
      "type": "pc",
      "x": 80,
      "y": 65,
      "detail": "192.0.2.10"
    },
    {
      "id": "pc2",
      "name": "PC B",
      "type": "pc",
      "x": 240,
      "y": 65,
      "detail": "192.0.2.11"
    },
    {
      "id": "sw1",
      "name": "Switch A",
      "type": "switch",
      "x": 160,
      "y": 215,
      "detail": "단말 LAN"
    },
    {
      "id": "r1",
      "name": "Router A",
      "type": "router",
      "x": 160,
      "y": 355,
      "detail": "Gateway · .1"
    },
    {
      "id": "r2",
      "name": "Router B",
      "type": "router",
      "x": 160,
      "y": 495,
      "detail": "Resolver · .2"
    },
    {
      "id": "r3",
      "name": "Router C",
      "type": "router",
      "x": 160,
      "y": 645,
      "detail": "lab.test DNS"
    }
  ],
  "edges": [
    [
      "pc1",
      "sw1",
      "l1Svg"
    ],
    [
      "pc2",
      "sw1",
      "l2Svg"
    ],
    [
      "sw1",
      "r1",
      "l3Svg"
    ],
    [
      "r1",
      "r2",
      "l4Svg"
    ],
    [
      "r2",
      "r3",
      "l5Svg"
    ]
  ],
  "steps": {
    "query": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "app.lab.test · A Query"
      },
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "DNS 응답 · A 203.0.113.10",
        "reply": true
      },
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2",
          "r3",
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "조회한 IP로 별도 ICMP 왕복"
      }
    ],
    "recursive": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "단말 구간 · DNS ID 21456"
      },
      {
        "path": [
          "r2",
          "r3"
        ],
        "caption": "Upstream 구간 · DNS ID 31909"
      },
      {
        "path": [
          "r3",
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "Authoritative 응답을 단말로 전달",
        "reply": true
      },
      {
        "path": [],
        "caption": "설정된 Upstream 조회 검증 · Root / TLD 전체 재현 아님"
      }
    ],
    "cache": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2",
          "r3"
        ],
        "caption": "첫 조회 · Cache Miss"
      },
      {
        "path": [
          "r3",
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "A 응답 저장 · 최초 TTL 10",
        "reply": true
      },
      {
        "path": [
          "pc2",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "두 번째 조회 · 남은 TTL 6"
      },
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc2"
        ],
        "caption": "Cache 응답 · 새 Upstream Query 없음",
        "reply": true
      }
    ],
    "faults": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "Resolver까지 Query 도달 · DNS 응답 없음",
        "stop": true
      },
      {
        "path": [],
        "caption": "DNS 서비스 복구 후 같은 단말에서 이름 Ping 정상"
      },
      {
        "path": [
          "pc1",
          "sw1",
          "r1"
        ],
        "caption": "잘못된 DNS .254 · 단말망 ARP에서 중단",
        "stop": true
      },
      {
        "path": [],
        "caption": "단말 DNS .2 복구 후 이름 Ping 정상"
      }
    ],
    "nxdomain": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2",
          "r3"
        ],
        "caption": "recover.lab.test Query"
      },
      {
        "path": [
          "r3",
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "NXDOMAIN · RCODE 3 응답 수신",
        "reply": true
      },
      {
        "path": [],
        "caption": "A Record 없음 · DNS 응답은 있음"
      },
      {
        "path": [],
        "caption": "Record 복구와 Cache 초기화 후 PC B에서 정상 확인"
      }
    ]
  }
});
NetworkSimulator.mount(adapter);
})();
