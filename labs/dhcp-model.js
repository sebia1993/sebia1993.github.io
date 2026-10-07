// Existing lesson data and topic renderer retained from dhcp-simulator; playback is shared.
(()=>{
const $=id=>document.getElementById(id);

  const scenarios=[
    {
      id:'dora',
      claim:'DHCP-01',
      tab:'1 · DORA',
      title:'IP가 없는 Client는 네 메시지로 초기 Lease를 만듭니다.',
      text:'PC1은 시작 시 usable IPv4 Lease가 없습니다. Baseline xid는 0x57370148입니다.',
      start:['PC1 = no lease','R1 relay = helper 198.51.100.2','R2 DHCP service = up'],
      question:'초기 주소 할당의 올바른 순서는 무엇일까요?',
      options:[['dora','Discover → Offer → Request → ACK'],['doar','Discover → Offer → ACK → Request'],['arp','ARP → Discover → ACK → Offer']],
      correct:'dora',
      reason:'실제 Capture에서 Discover, Offer, Request, ACK를 같은 xid와 Client MAC으로 연결했고 최종 192.0.2.100/24 Lease가 만들어졌습니다.',
      metric1:['Transaction','xid 0x57370148 · chaddr 00:50:79:66:68:48'],
      metric2:['Lease','192.0.2.100/24'],
      conclusion:'DORA는 Server 발견 → 제안 → 선택 → Lease 확정의 순서입니다.',
      steps:[
        {kind:'DISCOVER',title:'PC1 → Local Broadcast',detail:'0.0.0.0 → 255.255.255.255, UDP 68→67. 아직 주소가 없으므로 Local Broadcast로 시작합니다.',links:{l1:'broadcast',l2:'broadcast'},nodes:['pc1','sw1','r1'],marker:{text:'DISCOVER',type:'broadcast',left:245,top:128},dhcp:'Discover',conn:'아직 Lease 없음'},
        {kind:'OFFER',title:'Server가 192.0.2.100을 제안',detail:'Relay를 거쳐 R2가 yiaddr 192.0.2.100과 Option을 제시하고 R1이 Client VLAN으로 전달합니다.',links:{l3:'reply',l2:'reply',l1:'reply'},nodes:['r2','r1','pc1'],marker:{text:'OFFER',type:'reply',left:505,top:128},dhcp:'Offer 192.0.2.100',conn:'아직 Lease 확정 전'},
        {kind:'REQUEST',title:'PC1이 선택한 Address/Server를 요청',detail:'같은 Transaction에서 DHCPREQUEST가 발생했습니다.',links:{l1:'broadcast',l2:'broadcast',l3:'relay'},nodes:['pc1','r1','r2'],marker:{text:'REQUEST',type:'broadcast',left:245,top:128},dhcp:'Request',conn:'Lease 확정 전'},
        {kind:'ACK',title:'DHCPACK → Lease 확정',detail:'ACK 후 PC1이 192.0.2.100/24를 사용했고 R2 binding에도 Client가 나타났습니다.',links:{l3:'reply',l2:'reply',l1:'reply'},nodes:['r2','r1','pc1'],marker:{text:'ACK',type:'reply',left:505,top:128},dhcp:'ACK · Lease 확정',conn:'Local/Remote 정상'}
      ]
    },
    {
      id:'options',
      claim:'DHCP-02',
      tab:'2 · ACK Option',
      title:'ACK는 주소뿐 아니라 네트워크 사용 조건도 전달합니다.',
      text:'Baseline ACK에서 Option 1, 3, 6, 51을 실제 Packet으로 확인했습니다.',
      start:['Address = 192.0.2.100','Mask = /24','Gateway = 192.0.2.1'],
      question:'이번 ACK에서 실제로 검증된 Option 조합은 무엇일까요?',
      options:[['correct','Mask /24 · Gateway 192.0.2.1 · DNS 203.0.113.53 · Lease 3600s'],['iponly','IP Address만 전달 · Gateway/DNS는 ARP로 자동 학습'],['wrong','Gateway 198.51.100.2 · DNS 없음 · Lease 무제한']],
      correct:'correct',
      reason:'ACK PCAP에 Option 1=255.255.255.0, 3=192.0.2.1, 6=203.0.113.53, 51=3600초가 있었고 Client는 Address/Mask/Gateway를 적용했습니다.',
      metric1:['ACK Options','1=/24 · 3=.1 · 6=203.0.113.53 · 51=3600'],
      metric2:['Applied State','PC1 192.0.2.100/24 · GW 192.0.2.1'],
      conclusion:'DHCP는 IP 하나가 아니라 Client가 사용할 Network Parameter도 전달할 수 있습니다.',
      steps:[
        {kind:'ACK ADDRESS',title:'yiaddr = 192.0.2.100',detail:'Server가 Client에게 사용할 IPv4 Address를 확정합니다.',links:{l3:'reply',l2:'reply',l1:'reply'},nodes:['r2','pc1'],marker:{text:'192.0.2.100',type:'reply',left:490,top:126},dhcp:'Address assigned',conn:'아직 Option 확인 중'},
        {kind:'ACK OPTIONS',title:'Mask / Gateway / DNS / Lease',detail:'Option 1=/24, Option 3=192.0.2.1, Option 6=203.0.113.53, Option 51=3600s.',links:{l1:'reply'},nodes:['pc1'],marker:{text:'OPTIONS',type:'reply',left:120,top:128},dhcp:'Lease + Options',conn:'설정 적용'},
        {kind:'CLIENT APPLY',title:'PC1가 Address/Mask/Gateway 적용',detail:'VPCS CLI에서 192.0.2.100/24와 Gateway 192.0.2.1을 확인했습니다.',links:{l1:'idle',l2:'idle',l3:'idle'},nodes:['pc1'],dhcp:'Client configured',conn:'R1/R2 Ping 정상'},
        {kind:'BOUNDARY',title:'DNS Response는 이번 범위 밖',detail:'DNS Option 전달은 검증했지만 실제 DNS Server 응답이나 이름 해석은 검증하지 않았습니다.',links:{},nodes:['pc1'],dhcp:'DNS Option 전달만 검증',conn:'DNS 서비스 동작 미검증'}
      ]
    },
    {
      id:'relay',
      claim:'DHCP-03',
      tab:'3 · Relay / giaddr',
      title:'Relay는 Client Broadcast를 Remote Server에 전달하면서 Client Subnet을 알려 줍니다.',
      text:'R1 Client Interface는 192.0.2.1/24이고 helper-address는 198.51.100.2입니다.',
      start:['Client Discover giaddr = 0.0.0.0','R1 client IP = 192.0.2.1','R2 = 198.51.100.2'],
      question:'R1이 Discover를 R2로 Relay한 Packet의 giaddr는 무엇이었을까요?',
      options:[['relayip','192.0.2.1'],['server','198.51.100.2'],['zero','0.0.0.0 그대로']],
      correct:'relayip',
      reason:'Client-side Discover의 giaddr는 0.0.0.0이었고, CP3의 Relayed Discover는 giaddr=192.0.2.1, hops=1이었습니다. R2는 이 Client Subnet의 Pool을 사용했습니다.',
      metric1:['Relay Field','giaddr 192.0.2.1 · hops 1'],
      metric2:['Pool / Offer','192.0.2.0/24 → yiaddr 192.0.2.100'],
      conclusion:'giaddr는 Remote Server가 어느 Client Subnet의 Request인지 판단하는 핵심 Relay 정보입니다.',
      steps:[
        {kind:'CLIENT BROADCAST',title:'Client Discover · giaddr 0.0.0.0',detail:'PC1의 Broadcast가 SW1을 거쳐 R1 Client Interface까지 도착합니다.',links:{l1:'broadcast',l2:'broadcast'},nodes:['pc1','sw1','r1'],marker:{text:'giaddr 0',type:'broadcast',left:230,top:126},dhcp:'Local Discover',conn:'L3 경계 전'},
        {kind:'RELAY',title:'R1 → R2 · giaddr 192.0.2.1',detail:'R1이 같은 xid/chaddr를 유지해 Remote Server로 전달했고 hops=1이었습니다.',links:{l3:'relay'},nodes:['r1','r2'],marker:{text:'giaddr .1',type:'relay',left:525,top:126},dhcp:'Relayed Discover',conn:'Server Segment 도달'},
        {kind:'POOL SELECT',title:'R2가 192.0.2.0/24 Pool 선택',detail:'Server는 non-zero giaddr가 속한 Client Subnet의 Pool에서 .100을 제안했습니다.',links:{l3:'reply'},nodes:['r2','r1'],marker:{text:'OFFER .100',type:'reply',left:525,top:126},dhcp:'Offer selected',conn:'Reply to Relay'},
        {kind:'FINAL DELIVERY',title:'R1이 Client VLAN으로 Offer/ACK 전달',detail:'이번 Actual에서는 Client-side Offer/ACK가 unicast로 전달됐습니다. 이는 이번 VPCS/IOL 구현 관찰값으로만 보존합니다.',links:{l2:'reply',l1:'reply'},nodes:['r1','pc1'],marker:{text:'ACK',type:'reply',left:245,top:126},dhcp:'Lease complete',conn:'Client configured'}
      ]
    },
    {
      id:'no-lease',
      claim:'DHCP-04 / DHCP-05',
      tab:'4 · Server Down vs Relay Missing',
      title:'둘 다 “IP를 못 받음”이지만 Discover가 마지막으로 보이는 위치가 다릅니다.',
      text:'Server Down과 helper-address 제거를 같은 Capture Point CP1~CP3에서 비교했습니다.',
      start:['CP1 = Client Edge','CP2 = VLAN10 Relay Ingress','CP3 = R1—R2 Transit'],
      question:'두 장애를 올바르게 구분한 것은 무엇일까요?',
      options:[['location','Server Down: Discover가 CP3까지 감 · Relay Missing: CP3 DHCP 없음'],['same','둘 다 Discover가 CP3까지 도달'],['reverse','Server Down은 CP3 없음 · Relay Missing은 CP3까지 감']],
      correct:'location',
      reason:'Server Down에서는 Relay가 정상이라 Relayed Discover가 CP3에 있었지만 Offer가 없었습니다. Helper 제거에서는 Discover가 CP1/CP2에만 있고 CP3의 해당 DHCP Transaction은 없었습니다.',
      metric1:['Server Down','CP1 ✓ · CP2 ✓ · CP3 Discover ✓ · Offer ✕'],
      metric2:['Relay Missing','CP1 ✓ · CP2 ✓ · CP3 DHCP ✕'],
      conclusion:'주소 미할당 장애는 “Discover가 어디까지 갔는가”로 Server 문제와 Relay 문제를 분리할 수 있습니다.',
      steps:[
        {kind:'SERVER DOWN',title:'R2 DHCP Service Down',detail:'R1 helper와 Route는 정상입니다. Client Discover가 Relay되어 CP3까지 도달했습니다.',links:{l1:'broadcast',l2:'broadcast',l3:'relay'},nodes:['pc1','r1','r2'],marker:{text:'DISCOVER',type:'relay',left:525,top:126},dhcp:'Discover reaches server segment',conn:'신규 Lease 없음'},
        {kind:'NO OFFER',title:'Server에서 Offer/ACK가 나오지 않음',detail:'service dhcp가 중지되어 같은 xid에 대한 Offer/ACK가 없었습니다. R1↔R2 ICMP는 정상입니다.',links:{l3:'down'},nodes:['r2'],marker:{text:'NO OFFER',type:'stop',left:590,top:126},dhcp:'Server reply 없음',conn:'L3 path는 정상'},
        {kind:'RELAY MISSING',title:'R1 helper-address 제거',detail:'이번에는 Server Service가 정상이고 Client Broadcast는 CP1/CP2에 존재하지만 Relay가 없어 CP3에 DHCP가 없습니다.',links:{l1:'broadcast',l2:'broadcast',l3:'down'},nodes:['pc1','r1'],marker:{text:'STOP @ R1',type:'stop',left:410,top:126},dhcp:'Local Discover only',conn:'신규 Lease 없음'},
        {kind:'RECOVERY',title:'Service / helper 각각 복구 후 신규 DORA 성공',detail:'두 장애 모두 설정 복구 후 신규 DORA와 Remote Ping 3/3을 재확인했습니다.',links:{l1:'reply',l2:'reply',l3:'reply'},nodes:['pc1','r1','r2'],marker:{text:'RECOVERED',type:'reply',left:490,top:126},dhcp:'Lease 정상',conn:'Remote Ping 3/3'}
      ]
    },
    {
      id:'wrong-router',
      claim:'DHCP-06',
      tab:'5 · Lease 성공인데 통신 실패?',
      title:'잘못된 Router Option은 DORA를 깨지 않고 이후 Remote Traffic을 깨뜨릴 수 있습니다.',
      text:'Pool의 default-router만 192.0.2.254로 바꿨고 이 주소에는 실제 Router/Host가 없습니다.',
      start:['Address Pool 정상','Relay / Server 정상','Option 3만 192.0.2.254'],
      question:'잘못된 Gateway Option 상태의 실제 결과로 맞는 것은 무엇일까요?',
      options:[['leasefail','DORA 성공 · Lease 성공 · Remote Ping 실패'],['noack','ACK 자체가 실패해 IP를 못 받음'],['normal','Gateway가 틀려도 Remote Ping 정상']],
      correct:'leasefail',
      reason:'Discover/Offer/Request/ACK는 모두 성공했고 PC1은 192.0.2.100/24를 받았습니다. 하지만 Gateway .254를 ARP하다 Reply를 받지 못해 Remote R2 Ping은 실패했습니다.',
      metric1:['DHCP','Lease 192.0.2.100/24 · Option 3 = 192.0.2.254'],
      metric2:['Remote Path','ARP 192.0.2.254 무응답 · Remote ICMP 전달 안 됨'],
      conclusion:'DHCP Lease 성공과 실제 Remote Connectivity 성공은 별도로 확인해야 합니다.',
      steps:[
        {kind:'DORA SUCCESS',title:'잘못된 Gateway여도 DORA는 완료',detail:'Address/Mask/DNS/Lease는 정상이고 Option 3만 192.0.2.254입니다.',links:{l1:'reply',l2:'reply',l3:'reply'},nodes:['pc1','r1','r2'],marker:{text:'ACK GW .254',type:'reply',left:230,top:126},dhcp:'Lease 성공',conn:'아직 Remote 미검증'},
        {kind:'CLIENT APPLY',title:'PC1 Gateway = 192.0.2.254',detail:'Client가 잘못된 Router Option을 적용했습니다. 같은 Subnet의 R1 .1 Reachability는 Positive Control로 확인했습니다.',links:{l1:'idle',l2:'idle',l3:'idle'},nodes:['pc1'],dhcp:'Address 정상',conn:'Same-subnet 정상'},
        {kind:'ARP STOP',title:'Remote Ping 시 192.0.2.254 ARP',detail:'PC1은 off-link Destination을 보내기 위해 .254의 MAC을 찾지만 Reply가 없습니다.',links:{l1:'broadcast',l2:'broadcast',l3:'down'},nodes:['pc1','sw1','r1'],marker:{text:'ARP .254 ?',type:'broadcast',left:230,top:126},dhcp:'Lease 유지',conn:'Gateway Resolution 실패'},
        {kind:'RECOVERY',title:'Option 3을 192.0.2.1로 복구',detail:'신규 DORA 후 정상 Gateway가 적용되고 Remote R2 Ping 3/3으로 복구됐습니다.',links:{l1:'relay',l2:'relay',l3:'relay'},nodes:['pc1','r1','r2'],marker:{text:'PING 3/3',type:'relay',left:500,top:126},dhcp:'Lease 정상',conn:'Remote 정상'}
      ]
    }
  ];


const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function resetVisual(){
    ['pc1','sw1','r1','r2'].forEach(id=>$(id).className='device');
    ['l1','l2','l3'].forEach((k,i)=>{$(k+'Svg').setAttribute('class','net-link idle');$('label'+(i+1)).className='link-label';});
    $('label1').textContent='CP1 · Client Edge';$('label2').textContent='CP2 · Client VLAN';$('label3').textContent='CP3 · Routed Transit';$('packetMarker').className='packet-marker';
  }
function setLink(key,state){
    const n={l1:1,l2:2,l3:3}[key];if(!n)return;
    $(key+'Svg').setAttribute('class','net-link '+state);
    const lab=$('label'+n);lab.className='link-label';
    if(state==='broadcast')lab.classList.add('broadcast');if(state==='relay')lab.classList.add('active');if(state==='reply')lab.classList.add('reply');if(state==='down')lab.classList.add('down');
  }
function showMarker(m){
    const el=$('packetMarker');if(!m){el.className='packet-marker';return;}
    el.className='packet-marker show';if(m.type==='broadcast')el.classList.add('broadcast');if(m.type==='reply')el.classList.add('reply');if(m.type==='stop')el.classList.add('stop');
    el.textContent=m.text;el.style.left=m.left+'px';el.style.top=m.top+'px';
  }
function applyStep(){
    const s=scenarios[lesson],step=s.steps[stepIndex];resetVisual();
    Object.entries(step.links||{}).forEach(([k,v])=>setLink(k,v));
    (step.nodes||[]).forEach(id=>$(id).classList.add(step.kind.includes('NO OFFER')||step.kind.includes('STOP')?'stop':step.kind.includes('ACK')?'reply':'active'));
    showMarker(step.marker);
    $('dhcpState').textContent=step.dhcp||'—';$('connectState').textContent=step.conn||'—';
    $('eventKind').textContent=step.kind;$('eventTitle').textContent=step.title;$('eventDetail').textContent=step.detail;
    $('stepCount').textContent=(stepIndex+1)+' / '+s.steps.length;$('prevStepBtn').disabled=stepIndex===0;$('nextStepBtn').disabled=stepIndex===s.steps.length-1;
  }
const adapter={raw:scenarios,kind:'steps',reset(i){lesson=i;stepIndex=0;resetVisual();},show(i){stepIndex=i;applyStep();},finish(){const s=scenarios[lesson];for(const n of [1,2]){$('metric'+n+'Label').textContent=s['metric'+n][0];$('metric'+n+'Value').textContent=s['metric'+n][1];}$('observationConclusion').textContent=s.conclusion;}};

// Presentation follows the current Concept Guide; raw evidence above is unchanged.
adapter.presentation = {
  "names": {
    "PC1": "PC A",
    "SW1": "Switch A",
    "R1": "Router A",
    "R2": "Router B"
  },
  "lessons": [
    {
      "title": "주소는 어떤 순서로 확정될까요?",
      "brief": "학습 페이지의 DORA 흐름입니다. PC A가 찾고, 서버가 제안하고, 요청과 확정이 이어지는 방향을 관찰합니다.",
      "hints": [
        "제안을 받은 단계와 최종 확정 단계를 구분하세요.",
        "각 메시지의 송신자가 단말인지 서버인지 보세요."
      ]
    },
    {
      "title": "ACK에는 IP 주소 외에 무엇이 들어갈까요?",
      "brief": "학습 페이지에서 받은 설정 묶음을 필드별로 확인합니다. 주소 할당과 실제 서비스 동작은 별도로 판단합니다.",
      "hints": [
        "Mask·Gateway·DNS·Lease 값을 각각 확인하세요.",
        "DNS 주소를 받았다는 것만으로 DNS 서버가 응답한다고 단정할 수는 없습니다."
      ]
    },
    {
      "title": "Relay는 서버에 단말망을 어떻게 알릴까요?",
      "brief": "학습 페이지의 선택 자료에 있는 giaddr를 비교합니다. 단말 구간과 Router A → Router B 구간을 나눠 봅니다.",
      "hints": [
        "서버는 원격 단말이 어느 Subnet에 있는지 알아야 합니다.",
        "giaddr와 단말에 알려주는 Option 3은 목적이 다릅니다."
      ]
    },
    {
      "title": "주소를 못 받으면 Discover가 어디까지 갔을까요?",
      "brief": "서버 서비스 중지와 Relay 설정 누락을 비교합니다. CP1·CP2·CP3은 기존 검증의 관찰 위치입니다.",
      "hints": [
        "Offer가 없더라도 Discover의 마지막 위치는 다를 수 있습니다.",
        "Router A가 단말 Broadcast를 서버로 전달했는지 확인하세요."
      ]
    },
    {
      "title": "주소는 받았는데 다른 네트워크에 못 가는 이유는?",
      "brief": "Option 3만 실제로 없는 192.0.2.254로 설정했습니다. DHCP 완료와 이후 Gateway 사용을 따로 관찰합니다.",
      "hints": [
        "DORA가 성공했는지 먼저 확인하세요.",
        "다른 네트워크로 보낼 때 단말이 어떤 주소를 ARP하는지 보세요."
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
    "reason": "학습 페이지의 요청 관계 그림에서 생략한 실제 단말 접속 스위치 SW1을 Switch A로 표시합니다. Relay 구간과 IP 구성은 같습니다."
  }
];
Object.assign(adapter.presentation.labels, {
  "no lease": "Lease 없음",
  "DHCP service = up": "DHCP 서비스 = 동작",
  "first query": "첫 번째 Query",
  "second query": "두 번째 Query",
  "Target": "대상",
  "Local/Remote": "같은 Subnet / 다른 Subnet",
  "Local": "같은 Subnet",
  "Remote": "다른 Subnet",
  "After Resolution": "이름 해석 후",
  "Client Broadcast": "단말 Broadcast",
  "Server Reply / ACK": "서버 응답 / ACK",
  "Client DNS Query": "단말 DNS Query",
  "Client LAN": "단말 LAN",
  "Client Side": "단말 구간",
  "Server Side": "서버 구간",
  "Edge": "접속 구간",
  "Transaction": "메시지 대응",
  "DNS Answer": "DNS 응답",
  "Name Ping": "이름으로 Ping",
  "Same-VLAN": "같은 VLAN",
  "Different VLAN": "다른 VLAN",
  "VLAN membership": "VLAN 소속",
  "Server": "서버",
  "Client": "단말",
  "Echo Request": "Echo Request",
  "Echo Reply": "Echo Reply",
  "ARP Request": "ARP Request",
  "ARP Reply": "ARP Reply",
  "DHCP Request": "DHCP Request",
  "DNS Query": "DNS Query",
  "DNS Response": "DNS Response",
  "Time Exceeded": "Time Exceeded",
  "Destination Unreachable": "Destination Unreachable",
  "Port Unreachable": "Port Unreachable",
  "Host Unreachable": "Host Unreachable",
  "Network Unreachable": "Network Unreachable",
  "Broadcast Request": "Broadcast Request",
  "Default Gateway": "Default Gateway"
});
PacketLabPresentation.attach(adapter, {
  "desktop": ".topology-stage",
  "height": 540,
  "note": "PC A는 DHCP 단말, Router A는 Relay, Router B는 DHCP 서버입니다. Switch A는 PC A와 Relay를 같은 단말망으로 연결합니다.",
  "nodes": [
    {
      "id": "pc1",
      "name": "PC A",
      "type": "pc",
      "x": 160,
      "y": 65,
      "detail": "DHCP Client"
    },
    {
      "id": "sw1",
      "name": "Switch A",
      "type": "switch",
      "x": 160,
      "y": 190,
      "detail": "단말 VLAN 10"
    },
    {
      "id": "r1",
      "name": "Router A",
      "type": "router",
      "x": 160,
      "y": 315,
      "detail": "Relay · 192.0.2.1"
    },
    {
      "id": "r2",
      "name": "Router B",
      "type": "router",
      "x": 160,
      "y": 460,
      "detail": "DHCP Server · .2"
    }
  ],
  "edges": [
    [
      "pc1",
      "sw1",
      "l1Svg"
    ],
    [
      "sw1",
      "r1",
      "l2Svg"
    ],
    [
      "r1",
      "r2",
      "l3Svg"
    ]
  ],
  "steps": {
    "dora": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1"
        ],
        "caption": "Discover · 단말 Broadcast"
      },
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "Offer · 192.0.2.100 제안",
        "reply": true
      },
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "Request · 사용할 제안 요청"
      },
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "ACK · Lease 확정",
        "reply": true
      }
    ],
    "options": [
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "ACK · yiaddr 192.0.2.100",
        "reply": true
      },
      {
        "path": [],
        "caption": "Option 1 / 3 / 6 / 51 확인"
      },
      {
        "path": [],
        "caption": "PC A가 Address / Mask / Gateway 적용"
      },
      {
        "path": [],
        "caption": "DNS Option 전달만 검증 · 실제 DNS 응답은 범위 밖"
      }
    ],
    "relay": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1"
        ],
        "caption": "단말 구간 · giaddr 0.0.0.0"
      },
      {
        "path": [
          "r1",
          "r2"
        ],
        "caption": "Relay 구간 · giaddr 192.0.2.1"
      },
      {
        "path": [
          "r2",
          "r1"
        ],
        "caption": "단말 Subnet의 Pool에서 .100 제안",
        "reply": true
      },
      {
        "path": [
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "단말로 Offer / ACK 전달",
        "reply": true
      }
    ],
    "no-lease": [
      {
        "path": [
          "pc1",
          "sw1",
          "r1",
          "r2"
        ],
        "caption": "서버 중지 · Discover는 CP3까지 도달"
      },
      {
        "path": [],
        "caption": "서버에서 Offer / ACK 없음",
        "stop": true
      },
      {
        "path": [
          "pc1",
          "sw1",
          "r1"
        ],
        "caption": "Relay 누락 · 단말망에서 중단",
        "stop": true
      },
      {
        "path": [],
        "caption": "각 설정 복구 후 신규 DORA와 Ping 확인"
      }
    ],
    "wrong-router": [
      {
        "path": [
          "r2",
          "r1",
          "sw1",
          "pc1"
        ],
        "caption": "DORA 완료 · Option 3은 잘못된 .254",
        "reply": true
      },
      {
        "path": [],
        "caption": "PC A가 Gateway .254 적용"
      },
      {
        "path": [
          "pc1",
          "sw1",
          "r1"
        ],
        "caption": "단말망 ARP .254 · Reply 없음",
        "stop": true
      },
      {
        "path": [],
        "caption": "Option 3 복구 · 신규 DORA 후 Remote Ping 정상"
      }
    ]
  }
});
NetworkSimulator.mount(adapter);
})();
