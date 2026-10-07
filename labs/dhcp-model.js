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
NetworkSimulator.mount(adapter);
})();
