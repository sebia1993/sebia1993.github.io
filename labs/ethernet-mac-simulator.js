(() => {
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const DEV = {
    pc1:{name:'PC1',ip:'192.168.10.10',mac:'00:50:79:66:68:00',port:1},
    pc2:{name:'PC2',ip:'192.168.10.20',mac:'00:50:79:66:68:01',port:2},
    pc3:{name:'PC3',ip:'192.168.10.30',mac:'00:50:79:66:68:02',port:3}
  };
  const BROADCAST='ff:ff:ff:ff:ff:ff';
  const FDB_AGE_LIMIT=300;

  const lessons=[
    {
      title:'첫 Ping에서 Source MAC Learning을 확인하세요.',
      text:'FDB와 PC1/PC2 ARP 캐시가 비어 있습니다. ARP Request와 Reply가 오갈 때 각 장비가 무엇을 독립적으로 배우는지 보세요.',
      run:'▶ 첫 PING 실행',
      hints:[
        '스위치는 Destination MAC을 보고 학습하지 않습니다. 먼저 <b>Source MAC</b>을 봅니다.',
        'PC1의 ARP Request가 port 1로 들어오면 <b>PC1 MAC → port 1</b>이 먼저 생깁니다.',
        'PC2는 자신을 향한 ARP Request의 Sender IP/MAC을 확인할 수 있고, PC2가 ARP Reply를 보내면 SW1은 그 Reply의 Source MAC으로 <b>PC2 MAC → port 2</b>를 학습합니다.'
      ],
      checks:[
        ['pc1Learn','PC1 Source 학습','ARP Request 수신으로 PC1 → port 1'],
        ['pc2Neighbor','PC2 Neighbor 학습','ARP Request의 Sender IP/MAC을 PC2가 확인'],
        ['pc2Learn','PC2 Source 학습','ARP Reply 수신으로 PC2 → port 2'],
        ['knownAfter','다음 요청 Known','PC2를 배운 뒤 port 2로만 전달']
      ]
    },
    {
      title:'Known Unicast는 어느 포트로 나갈까요?',
      text:'SW1은 이미 PC2 MAC → port 2를 알고 있습니다. PC1의 Unicast를 실행해 PC3 링크가 조용한지 확인하세요.',
      run:'▶ PC1 → PC2 Unicast',
      hints:[
        'Destination MAC은 <b>PC2의 실제 MAC</b>입니다.',
        'SW1 FDB에 <b>PC2 MAC → port 2</b>가 있으므로 출력 포트를 하나로 결정할 수 있습니다.',
        'Known Unicast에서는 이 실습 조건에서 PC3의 port 3로 복사하지 않습니다.'
      ],
      checks:[
        ['known','FDB Hit','PC2 MAC → port 2 조회 성공'],
        ['onlyP2','port 2로만 전달','PC3 링크에는 요청을 내보내지 않음']
      ]
    },
    {
      title:'Unknown Unicast Flooding을 직접 확인하세요.',
      text:'PC1은 ARP 캐시에서 PC2 MAC을 알고 있지만 SW1 FDB에는 PC2가 없습니다. ARP와 FDB가 독립이라는 점이 핵심입니다.',
      run:'▶ PC1 → PC2 Unicast',
      hints:[
        'PC1은 PC2 MAC을 이미 알고 있으므로 <b>새 ARP Request로 바꾸지 않습니다.</b>',
        'Destination MAC은 계속 <b>PC2 실제 MAC</b>입니다. Broadcast 주소로 바뀌지 않습니다.',
        'SW1만 출력 포트를 모르므로 수신 port 1을 제외한 port 2·3으로 Flooding합니다.'
      ],
      checks:[
        ['dstPreserved','목적지 MAC 유지','PC2 실제 MAC 그대로'],
        ['flood','Unknown Flooding','수신 port 1 제외 → port 2·3'],
        ['pc3Seen','PC3 링크에서도 관찰','하지만 PC3 목적지 프레임은 아님']
      ]
    },
    {
      title:'Broadcast와 Unknown Unicast의 차이를 확인하세요.',
      text:'PC1이 PC3를 찾는 ARP Request를 보냅니다. Ethernet Destination MAC은 ff:ff:ff:ff:ff:ff이지만 ARP Target Hardware는 아직 알아내려는 값입니다.',
      run:'▶ ARP Broadcast 실행',
      hints:[
        'Broadcast는 FDB에서 특정 Destination MAC의 포트를 찾는 상황이 아닙니다.',
        'Ethernet Destination MAC <b>ff:ff:ff:ff:ff:ff</b>와 ARP Target Hardware는 서로 다른 필드입니다.',
        'port 2와 port 3 모두로 전달되지만 Unknown Unicast와 달리 Ethernet Destination MAC 자체가 Broadcast입니다.'
      ],
      checks:[
        ['broadcastMac','Broadcast MAC','Ethernet Destination = ff:ff:ff:ff:ff:ff'],
        ['broadcastFlood','Broadcast 전달','수신 port 1 제외 → port 2·3'],
        ['sourceLearn','Source는 여전히 학습','PC1 MAC → port 1 갱신']
      ]
    },
    {
      title:'Aging으로 사라진 엔트리가 어떻게 다시 학습되는지 확인하세요.',
      text:'이 실습의 Aging 기준은 300초입니다. PC2 엔트리는 299초, PC1은 10초 상태에서 시작하며 실제 시간이 아니라 +5초 버튼으로만 경과 시간을 진행합니다.',
      run:'▶ Aging 후 PC1 → PC2',
      hints:[
        '이 실습에서 PC1 ARP 캐시의 PC2 항목은 유지됩니다. <b>FDB Aging과 ARP 캐시는 별개</b>입니다.',
        'PC2 FDB가 사라진 첫 Unicast는 Unknown Unicast로 Flooding됩니다.',
        'PC2가 Reply를 보내면 Source MAC으로 다시 학습되고, 그 다음 요청은 Known Unicast가 됩니다.'
      ],
      checks:[
        ['aged','PC2 FDB Aging','PC2 엔트리만 소멸 · ARP는 유지'],
        ['flood','첫 요청 Flooding','PC2 위치를 몰라 port 2·3으로 전달'],
        ['relearn','PC2 Re-learning','Reply의 Source MAC으로 port 2 재학습'],
        ['known','다음 요청 Known','재학습 뒤 port 2로만 전달']
      ]
    }
  ];

  const startStates=[
    ['PC1/PC2 ARP 캐시 · 비어 있음','SW1 FDB · 동적 PC 엔트리 없음'],
    ['PC1 ARP · PC2 MAC 보유','SW1 FDB · PC2 MAC → port 2'],
    ['PC1 ARP · PC2 MAC 보유','SW1 FDB · PC2 MAC 없음'],
    ['PC1이 PC3 MAC을 아직 모름','SW1 FDB · PC1 MAC → port 1'],
    ['PC1 ARP · PC2 MAC 보유 · PC2 ARP · PC1 MAC 보유','SW1 FDB · PC2 경과 시간 299초 / PC1 경과 시간 10초']
  ];

  const evidenceByLesson=[
    ['../ethernet-viewer.html?mode=console&scenario=01-arp-first-contact','실제 GNS3 Source MAC 학습 근거 보기 →'],
    ['../ethernet-viewer.html?mode=packets&scenario=02-known-unicast&point=pc3-sw1','실제 Known Unicast PC3 미전달 PCAP 보기 →'],
    ['../ethernet-viewer.html?mode=packets&scenario=04-unknown-unicast&point=pc3-sw1','실제 PC3 링크의 Unknown Unicast PCAP 보기 →'],
    ['../ethernet-viewer.html?mode=packets&scenario=03-broadcast&point=pc3-sw1','실제 Broadcast PC3 링크 PCAP 보기 →'],
    ['../learning/foundations/ethernet-mac-table/report.html','실제 Aging · Re-learning 검증 보고서 보기 →']
  ];

  let lesson=0;
  let fdb=new Map();
  let arpPc1=new Map();
  let arpPc2=new Map();
  let flags={};
  let completed=new Set();
  let busy=false;
  let hintIndex=0;
  let logLines=[];
  let timelineCount=0;
  let manualDirty=false;

  function macName(mac){
    if(mac===BROADCAST) return BROADCAST;
    for(const dev of Object.values(DEV)) if(dev.mac===mac) return dev.name+' MAC';
    return mac;
  }

  function portList(ports){
    return ports.map(p=>'port '+p).join(' · ');
  }

  function devByPort(port){
    return Object.values(DEV).find(dev=>dev.port===port);
  }

  function setFdb(mac,port,age=0){
    fdb.set(mac,{port,age});
  }

  function learn(dev){
    setFdb(dev.mac,dev.port,0);
  }

  const portPathIds={1:'pathP1Sw',2:'pathSwP2',3:'pathSwP3'};
  const ingressTraceIds={1:'traceP1Sw',2:'traceP2Sw',3:'traceP3Sw'};
  const egressTraceIds={1:'traceSwP1',2:'traceSwP2',3:'traceSwP3'};
  const reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clearPacketSprites(){
    ['packetIngress','packetOut2','packetOut3'].forEach(id=>{
      const el=$(id);
      if(el){
        el.classList.remove('show','flood');
        el.setAttribute('transform','translate(-100 -100)');
      }
    });
  }

  function clearTraceState(){
    document.querySelectorAll('.mac-trace').forEach(path=>path.classList.remove('show','flood'));
  }

  function clearReceiveBadges(){
    ['pc2ReceiveBadge','pc3ReceiveBadge'].forEach(id=>{
      const el=$(id);
      if(!el) return;
      el.classList.remove('active','flood');
    });
    const p2=document.querySelector('#pc2ReceiveBadge text');
    const p3=document.querySelector('#pc3ReceiveBadge text');
    if(p2) p2.textContent='목적지';
    if(p3) p3.textContent='관찰 단말';
  }

  function renderReceiveBadges(egress,kind,dstMac){
    clearReceiveBadges();
    const apply=(port,id)=>{
      if(!egress.includes(port)) return;
      const badge=$(id);
      const text=document.querySelector('#'+id+' text');
      if(!badge||!text) return;
      if(kind==='flood'){
        badge.classList.add('flood');
        text.textContent=dstMac===DEV.pc2.mac&&port===3?'Flooding 복제본':'Flooding';
      }else if(kind==='broadcast'){
        badge.classList.add('flood');
        text.textContent='Broadcast';
      }else{
        badge.classList.add('active');
        text.textContent='수신';
      }
    };
    apply(2,'pc2ReceiveBadge');
    apply(3,'pc3ReceiveBadge');
  }

  function renderSvgFdb(){
    const rows=Array.from(fdb.entries()).sort((a,b)=>a[1].port-b[1].port);
    const labels=rows.slice(0,3).map(([mac,v])=>{
      const dev=Object.values(DEV).find(x=>x.mac===mac);
      const name=dev?dev.name+' MAC':mac;
      return name+'  →  port '+v.port+'   age '+v.age+'s';
    });
    for(let i=0;i<3;i++){
      const el=$('svgFdbRow'+(i+1));
      if(el) el.textContent=labels[i]||'—';
    }
  }

  function setSvgDecision(learn,lookup,action){
    const l=$('svgLearnDecision');
    const q=$('svgLookupDecision');
    const a=$('svgActionDecision');
    if(l) l.textContent='학습   · '+(learn||'—');
    if(q) q.textContent='조회   · '+(lookup||'—');
    if(a) a.textContent='동작   · '+(action||'준비');
  }

  function focusTopologyPort(port){
    const shell=$('topologyShell');
    if(!shell||shell.scrollWidth<=shell.clientWidth) return;
    const ratio=port===1?0:port===2||port===3?1:.45;
    const max=Math.max(0,shell.scrollWidth-shell.clientWidth);
    shell.scrollTo({left:max*ratio,behavior:reduceMotion?'auto':'smooth'});
  }

  function animateSprite(spriteId,pathId,label,duration=520){
    const sprite=$(spriteId);
    const path=$(pathId);
    if(!sprite||!path) return Promise.resolve();
    const text=sprite.querySelector('text');
    if(text) text.textContent=label;
    sprite.classList.add('show');
    const length=path.getTotalLength();
    const run=()=>{
      const pt=path.getPointAtLength(length);
      sprite.setAttribute('transform','translate('+pt.x+' '+pt.y+')');
      return Promise.resolve();
    };
    if(reduceMotion) return run();
    return new Promise(resolve=>{
      const started=performance.now();
      function tick(now){
        const t=Math.min(1,(now-started)/duration);
        const eased=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
        const pt=path.getPointAtLength(length*eased);
        sprite.setAttribute('transform','translate('+pt.x+' '+pt.y+')');
        if(t<1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function shortFrameLabel(frameType){
    if(frameType.includes('ARP REQUEST')) return 'ARP 요청';
    if(frameType.includes('ARP REPLY')) return 'ARP 응답';
    if(frameType.includes('ICMP')) return 'ICMP';
    if(frameType.includes('BROADCAST')) return 'Broadcast';
    return 'Frame';
  }

  async function animateIngress(port,frameType){
    clearPacketSprites();
    clearTraceState();
    const trace=$(ingressTraceIds[port]);
    if(trace) trace.classList.add('show');
    focusTopologyPort(port);
    await animateSprite('packetIngress',ingressTraceIds[port],shortFrameLabel(frameType),reduceMotion?0:560);
    focusTopologyPort(0);
  }

  async function animateEgress(egress,kind,frameType,dstMac){
    clearTraceState();
    const tasks=[];
    egress.forEach((port,index)=>{
      const trace=$(egressTraceIds[port]);
      if(trace){
        trace.classList.add('show');
        if(kind==='flood'||kind==='broadcast') trace.classList.add('flood');
      }
      const spriteId=index===0?'packetOut2':'packetOut3';
      const sprite=$(spriteId);
      if(sprite){
        sprite.classList.add('show');
        sprite.classList.toggle('flood',kind==='flood'||kind==='broadcast');
      }
      tasks.push(animateSprite(spriteId,egressTraceIds[port],shortFrameLabel(frameType),reduceMotion?0:620));
    });
    renderReceiveBadges(egress,kind,dstMac);
    if(egress.length) focusTopologyPort(egress[0]);
    await Promise.all(tasks);
  }

  function clearLinkState(){
    Object.values(portPathIds).forEach(id=>{
      const el=$(id);
      if(el) el.classList.remove('ingress','egress','flood');
    });
    clearTraceState();
    clearReceiveBadges();
  }

  function setLinks(ingress,egress,kind){
    clearLinkState();
    const inEl=$(portPathIds[ingress]);
    if(inEl) inEl.classList.add('ingress');
    egress.forEach(p=>{
      const el=$(portPathIds[p]);
      if(el){
        el.classList.add('egress');
        if(kind==='flood'||kind==='broadcast') el.classList.add('flood');
      }
    });
    renderReceiveBadges(egress,kind,null);
  }

  function renderMobileFlow(srcDev,actionTitle,egress,kind,dstMac){
    $('mobileSource').textContent=srcDev?srcDev.name:'대기';
    $('mobileSwitch').textContent=actionTitle||'프레임 대기';
    [1,2,3].forEach(port=>{
      const el=$('mobilePc'+port);
      if(!el) return;
      if(srcDev&&srcDev.port===port){
        el.textContent='수신';
      }else if(egress.includes(port)){
        if(kind==='flood'&&port===3&&dstMac===DEV.pc2.mac) el.textContent='Flooding 관찰 · 목적지는 PC2';
        else if(kind==='broadcast') el.textContent='Broadcast 전달';
        else el.textContent='전달';
      }else{
        el.textContent='전달 안 함';
      }
    });
  }

  function resetFlow(){
    for(let i=1;i<=4;i++) $('s'+i).classList.remove('active','done');
  }

  function setFlow(step){
    for(let i=1;i<=4;i++){
      const el=$('s'+i);
      el.classList.toggle('active',i===step);
      el.classList.toggle('done',i<step);
    }
    if(step===4) $('s4').classList.add('done');
  }

  function setLive(kind,title,detail,label){
    const strip=$('liveEventStrip');
    strip.className='live-event-strip'+(kind?' '+kind:'');
    $('liveEventTitle').textContent=title;
    $('liveEventDetail').textContent=detail;
    $('liveEventKind').textContent=label||'이벤트';
    $('liveEventIcon').textContent=kind==='aging'?'⏱':kind==='broadcast'?'B':kind==='flood'?'F':kind==='known'?'K':kind==='filter'?'S':'L';
    const topoLabel=$('traceModeLabel');
    if(topoLabel) topoLabel.textContent=(label||'이벤트')+' · '+title;
  }

  function setBasic(frame,lookup,action){
    $('frameSrc').textContent=frame?macName(frame.src):'—';
    $('frameDst').textContent=frame?macName(frame.dst):'—';
    $('switchLookup').textContent=lookup.title;
    $('switchLookupDetail').textContent=lookup.detail;
    $('switchAction').textContent=action.title;
    $('switchActionDetail').textContent=action.detail;
    const svgLookup=$('svgLookupText');
    if(svgLookup) svgLookup.textContent='조회   · '+lookup.title+' / '+action.title;
  }

  function renderArpFields(srcDev,meta){
    const strip=$('arpFieldStrip');
    if(!meta||!meta.arpRequest){
      strip.hidden=true;
      return;
    }
    strip.hidden=false;
    $('arpEthDst').textContent=BROADCAST;
    $('arpSenderHw').textContent=srcDev.mac+' · '+srcDev.name;
    $('arpTargetIp').textContent=meta.arpTargetIp||'—';
    $('arpTargetHw').textContent='미확정 · 시뮬레이터 표시 00:00:00:00:00:00';
  }

  function addTimeline(kind,title,detail){
    if(timelineCount===0) $('eventTimeline').innerHTML='';
    timelineCount++;
    const item=document.createElement('div');
    item.className='timeline-item '+kind;
    const small=document.createElement('small');
    small.textContent='단계 '+String(timelineCount).padStart(2,'0');
    const b=document.createElement('b');
    b.textContent=title;
    const span=document.createElement('span');
    span.textContent=detail;
    item.append(small,b,span);
    $('eventTimeline').appendChild(item);
    item.scrollIntoView({behavior:'smooth',block:'nearest',inline:'end'});
  }

  function addLog(message){
    const now=new Date();
    const stamp=now.toLocaleTimeString('ko-KR',{hour12:false});
    logLines.push('['+stamp+'] '+message);
    if(logLines.length>60) logLines=logLines.slice(-60);
    $('eventLog').textContent=logLines.join('\n');
    $('eventLog').scrollTop=$('eventLog').scrollHeight;
  }

  function renderNeighborRows(map,emptyText){
    const rows=Array.from(map.entries());
    return rows.length?rows.map(([ip,mac])=>
      '<tr><td>'+ip+'</td><td><code>'+mac+'</code></td></tr>'
    ).join(''):'<tr><td colspan="2" class="empty-row">'+emptyText+'</td></tr>';
  }

  function renderTables(){
    const rows=Array.from(fdb.entries()).sort((a,b)=>a[1].port-b[1].port);
    $('fdbBody').innerHTML=rows.length?rows.map(([mac,v])=>
      '<tr><td><code>'+mac+'</code></td><td>port '+v.port+'</td><td>'+v.age+'s</td></tr>'
    ).join(''):'<tr><td colspan="3" class="empty-row">동적 FDB 엔트리가 없습니다.</td></tr>';

    $('arpBody').innerHTML=renderNeighborRows(arpPc1,'PC1 ARP 캐시가 비어 있습니다.');
    $('pc2ArpBody').innerHTML=renderNeighborRows(arpPc2,'PC2 ARP 캐시가 비어 있습니다.');
    renderSvgFdb();
  }

  function renderProgress(){
    const count=completed.size;
    $('courseCount').textContent=count+' / '+lessons.length+' 완료';
    $('courseBar').style.width=(count/lessons.length*100)+'%';
    document.querySelectorAll('[data-lesson]').forEach(btn=>{
      const idx=Number(btn.dataset.lesson);
      btn.classList.toggle('active',idx===lesson);
      btn.classList.toggle('completed',completed.has(idx));
    });
    $('courseComplete').classList.toggle('show',count===lessons.length);
  }

  function renderChecks(){
    const cfg=lessons[lesson];
    $('checkList').innerHTML=cfg.checks.map(([key,label,desc])=>{
      const done=Boolean(flags[key]);
      return '<div class="check-item'+(done?' done':'')+'"><div class="check-dot">'+(done?'✓':'·')+'</div><div><b>'+label+'</b><span>'+desc+'</span></div></div>';
    }).join('');

    const all=!manualDirty&&cfg.checks.every(c=>Boolean(flags[c[0]]));
    const already=completed.has(lesson);
    const badge=$('lessonBadge');
    badge.classList.toggle('success',all||already);
    badge.textContent=manualDirty?'자유 조작 중':all?'완료':already?'완료 기록':'진행 중';
    $('nextBtn').disabled=!(all||already);
    $('verdictBox').className='verdict'+(all?' success':'');
    if(manualDirty){
      $('verdictBox').innerHTML='<b>고급 자유 조작 상태:</b> 현재 상태는 표준 실습 시작 조건과 다를 수 있습니다. 완료 판정을 다시 받으려면 실습 기본 상태로 복원하세요.';
    }else if(all){
      $('verdictBox').innerHTML='<b>완료:</b> '+completionText(lesson);
    }else if(already){
      $('verdictBox').innerHTML='이 실습은 이전에 완료했습니다. 다시 실행해 상태 변화를 재확인할 수 있습니다.';
    }else{
      $('verdictBox').textContent='위 조건을 실제 프레임 흐름에서 확인하세요.';
    }
  }

  function completionText(idx){
    return [
      'PC1/PC2의 Neighbor 상태와 SW1 FDB가 서로 독립적으로 형성되고, Source MAC은 학습에 Destination MAC은 출력 포트 결정에 사용됨을 확인했습니다.',
      'FDB에 목적지 정보가 있으면 해당 출력 포트로만 Known Unicast가 전달되는 것을 확인했습니다.',
      'Unknown Unicast는 목적지 MAC을 바꾸지 않은 채 다른 전달 가능 포트로 Flooding됨을 확인했습니다.',
      'Broadcast는 Ethernet 목적지 MAC으로 ff:ff:ff:ff:ff:ff를 사용하고, ARP Target Hardware는 별도 필드임을 확인했습니다.',
      '이 실습의 300초 Aging 기준에서 엔트리 소멸 뒤 첫 요청은 Flooding되고 Reply의 Source MAC으로 재학습한 뒤 Known Unicast로 회복됨을 확인했습니다.'
    ][idx];
  }

  function completeIfReady(){
    const cfg=lessons[lesson];
    if(!manualDirty&&cfg.checks.every(c=>Boolean(flags[c[0]]))){
      completed.add(lesson);
      renderProgress();
    }
    renderChecks();
  }

  function setExplain(html,kind){
    $('explainBox').className='explain'+(kind?' '+kind:'');
    $('explainBox').innerHTML=html;
  }

  function renderLessonMeta(){
    $('startArpState').textContent=startStates[lesson][0];
    $('startFdbState').textContent=startStates[lesson][1];
    $('evidenceLink').href=evidenceByLesson[lesson][0];
    $('evidenceLink').textContent=evidenceByLesson[lesson][1];
  }

  function updateControls(){
    $('runBtn').disabled=busy||manualDirty||(lesson===4&&!flags.aged);
    $('ageBtn').disabled=busy||manualDirty||Boolean(flags.aged);
    $('ageBtn').hidden=lesson!==4;
  }

  function resetScenario(){
    fdb=new Map();
    arpPc1=new Map();
    arpPc2=new Map();
    flags={};
    logLines=[];
    timelineCount=0;
    manualDirty=false;
    $('eventTimeline').innerHTML='<div class="timeline-empty">실행하면 프레임 순서가 여기에 쌓입니다.</div>';
    $('eventLog').textContent='아직 이벤트가 없습니다.';
    $('manualStateWarning').innerHTML='이 조작은 현재 FDB/ARP 상태에 직접 반영됩니다. 표준 실습 흐름으로 돌아가려면 <b>실습 기본 상태로 복원</b>을 누르세요.';
    clearLinkState();
    clearPacketSprites();
    resetFlow();
    renderArpFields(null,null);

    if(lesson===1){
      setFdb(DEV.pc1.mac,1,8);
      setFdb(DEV.pc2.mac,2,12);
      arpPc1.set(DEV.pc2.ip,DEV.pc2.mac);
    }else if(lesson===2){
      setFdb(DEV.pc1.mac,1,4);
      arpPc1.set(DEV.pc2.ip,DEV.pc2.mac);
    }else if(lesson===3){
      setFdb(DEV.pc1.mac,1,7);
    }else if(lesson===4){
      setFdb(DEV.pc1.mac,1,10);
      setFdb(DEV.pc2.mac,2,299);
      arpPc1.set(DEV.pc2.ip,DEV.pc2.mac);
      arpPc2.set(DEV.pc1.ip,DEV.pc1.mac);
    }

    setBasic(null,{title:'대기',detail:'Destination MAC을 받으면 FDB에서 조회합니다.'},{title:'대기',detail:'아직 전달할 프레임이 없습니다.'});
    setSvgDecision('—','—','준비');
    setLive('', 'Frame 이벤트 대기','실습을 실행하면 현재 Frame과 SW1의 판단이 여기에 표시됩니다.','준비');
    renderMobileFlow(null,'프레임 대기',[],'',null);
    renderReceiveBadges([],'',null);
    renderTables();
    renderChecks();
    renderLessonMeta();
    updateControls();
  }

  function loadLesson(idx){
    lesson=idx;
    hintIndex=0;
    $('hintBox').classList.remove('show');
    $('hintBtn').textContent='막혔나요? 힌트 1/3';
    const cfg=lessons[idx];
    $('coachIcon').textContent=String(idx+1);
    $('coachTitle').textContent=cfg.title;
    $('coachText').textContent=cfg.text;
    $('runBtn').textContent=cfg.run;
    $('resultHint').textContent=idx===2?'ARP 캐시와 FDB를 분리해서 보세요.':'Source MAC 학습과 Destination MAC 조회을 분리해서 보세요.';
    setExplain(idx===4?'먼저 <b>+5초 경과</b>를 눌러 PC2 FDB Aging을 발생시키세요.':'<b>'+cfg.run.replace('▶ ','')+'</b>을 눌러 현재 상태를 확인하세요.');
    resetScenario();
    renderProgress();
    const lab=document.querySelector('.lab-card');
    if(lab) window.scrollTo({top:lab.offsetTop-14,behavior:'smooth'});
  }

  async function processFrame(srcDev,dstMac,frameType,meta={}){
    const ingress=srcDev.port;
    const otherPorts=[1,2,3].filter(p=>p!==ingress);
    const frame={src:srcDev.mac,dst:dstMac};

    renderArpFields(srcDev,meta);
    resetFlow();
    setFlow(1);
    setLinks(ingress,[],'');
    renderMobileFlow(srcDev,'프레임 수신',[],'',dstMac);
    setBasic(frame,{title:'아직 조회 전',detail:'먼저 Source MAC 학습을 수행합니다.'},{title:'수신 중',detail:'port '+ingress+'로 프레임이 들어왔습니다.'});
    setSvgDecision('대기','대기','Frame 수신 · port '+ingress);
    setLive('learning',frameType+' · Frame 수신',srcDev.name+'의 Frame이 port '+ingress+'로 SW1에 들어왔습니다.','Frame 수신');
    await animateIngress(ingress,frameType);

    learn(srcDev);
    renderTables();
    setFlow(2);
    setSvgDecision(srcDev.name+' → port '+ingress,'대기','Source MAC 학습 완료');
    setLive('learning','Source MAC Learning',srcDev.name+' MAC → port '+ingress+'을 Dynamic FDB에 학습/갱신했습니다.','MAC 학습');
    addLog('학습 '+srcDev.name+' '+srcDev.mac+' -> port '+ingress);
    await sleep(420);

    let kind='known';
    let egress=[];
    let lookupTitle='';
    let lookupDetail='';
    let actionTitle='';
    let actionDetail='';

    setFlow(3);
    if(dstMac===BROADCAST){
      kind='broadcast';
      egress=otherPorts;
      lookupTitle='Broadcast MAC';
      lookupDetail='특정 한 포트의 Unicast FDB 항목을 조회하는 상황이 아닙니다.';
      actionTitle='Broadcast 전달';
      actionDetail='수신 port '+ingress+' 제외 → '+portList(egress);
      setLive('broadcast','Destination MAC = Broadcast',BROADCAST+'이므로 동일 Broadcast Domain의 다른 전달 가능 포트로 보냅니다.','Broadcast');
    }else{
      const entry=fdb.get(dstMac);
      if(entry&&entry.port!==ingress){
        kind='known';
        egress=[entry.port];
        lookupTitle='FDB 일치 · port '+entry.port;
        lookupDetail=macName(dstMac)+' → port '+entry.port+' 엔트리를 찾았습니다.';
        actionTitle='Known Unicast';
        actionDetail='port '+entry.port+'로만 전달';
        setLive('known','FDB 일치 · Known Unicast',macName(dstMac)+'의 출력 포트를 알고 있습니다.','Known Unicast');
      }else if(entry&&entry.port===ingress){
        kind='filter';
        egress=[];
        lookupTitle='FDB 일치 · 수신 포트와 동일';
        lookupDetail='목적지 MAC이 같은 수신 포트 방향으로 학습되어 있습니다.';
        actionTitle='같은 포트 필터링';
        actionDetail='다른 포트로 전달하지 않음';
        setLive('filter','같은 포트 필터링','목적지가 수신 포트와 같은 방향에 있으므로 다른 포트로 다시 내보내지 않습니다.','Filtering');
      }else{
        kind='flood';
        egress=otherPorts;
        lookupTitle='FDB 정보 없음';
        lookupDetail=macName(dstMac)+'의 출력 포트 정보가 없습니다.';
        actionTitle='Unknown Unicast Flooding';
        actionDetail='목적지 MAC 유지 · 수신 port '+ingress+' 제외 → '+portList(egress);
        setLive('flood','FDB 정보 없음 · Unknown Unicast',macName(dstMac)+' 자체는 그대로 두고 다른 전달 가능 포트로 Flooding합니다.','Unknown Unicast');
      }
    }

    setBasic(frame,{title:lookupTitle,detail:lookupDetail},{title:actionTitle,detail:actionDetail});
    const lookupShort=kind==='known'
      ? macName(dstMac)+' → FDB Hit '+(egress[0]?'port '+egress[0]:'동일 port')
      : kind==='filter'
        ? macName(dstMac)+' → 동일 port'
        : kind==='broadcast'
          ? 'Destination = Broadcast'
          : macName(dstMac)+' → FDB Miss';
    const actionShort=kind==='known'
      ? (egress.length?'Known Unicast → '+portList(egress):'Filtering · 출력 없음')
      : kind==='filter'
        ? 'Same-port Filtering'
        : kind==='broadcast'
          ? 'Broadcast → '+portList(egress)
          : 'Flooding → '+portList(egress);
    setSvgDecision(srcDev.name+' → port '+ingress,lookupShort,actionShort);
    await sleep(430);

    setFlow(4);
    setLinks(ingress,egress,kind);
    renderMobileFlow(srcDev,actionTitle,egress,kind,dstMac);
    await animateEgress(egress,kind,frameType,dstMac);
    const eventTitle=frameType+' · '+actionTitle;
    addTimeline(kind,eventTitle,srcDev.name+' port '+ingress+' → '+(egress.length?portList(egress):'전달 없음'));
    addLog(frameType+' src='+srcDev.mac+' dst='+dstMac+' ingress=port'+ingress+' action='+actionTitle+' egress='+egress.join(','));
    await sleep(reduceMotion?10:260);

    return {kind,egress,lookupTitle,actionTitle,srcMac:srcDev.mac,dstMac,frameType};
  }

  async function runLesson(){
    if(busy||manualDirty) return;
    if(lesson===4&&!flags.aged) return;
    busy=true;
    updateControls();
    try{
      if(lesson===0){
        const a=await processFrame(DEV.pc1,BROADCAST,'ARP REQUEST',{arpRequest:true,arpTargetIp:DEV.pc2.ip});
        flags.pc1Learn=fdb.has(DEV.pc1.mac)&&a.kind==='broadcast';

        if(a.egress.includes(DEV.pc2.port)){
          arpPc2.set(DEV.pc1.ip,DEV.pc1.mac);
          flags.pc2Neighbor=arpPc2.get(DEV.pc1.ip)===DEV.pc1.mac;
          addLog('PC2 ARP 학습 '+DEV.pc1.ip+' -> '+DEV.pc1.mac+' from ARP Request sender fields');
          renderTables();
        }

        const b=await processFrame(DEV.pc2,DEV.pc1.mac,'ARP REPLY');
        arpPc1.set(DEV.pc2.ip,DEV.pc2.mac);
        renderTables();
        flags.pc2Learn=fdb.has(DEV.pc2.mac)&&b.kind==='known';

        const c=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.knownAfter=c.kind==='known'&&c.egress.length===1&&c.egress[0]===2;

        await processFrame(DEV.pc2,DEV.pc1.mac,'ICMP ECHO REPLY');
        setExplain('<b>핵심:</b> PC1과 PC2의 ARP 캐시, SW1의 FDB는 각각 독립 상태입니다. PC2는 ARP Request의 Sender IP/MAC을 확인하고, SW1은 PC2가 실제 Reply를 보낸 뒤 Source MAC으로 PC2 → port 2를 학습합니다.');
      }else if(lesson===1){
        const r=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.known=r.kind==='known'&&r.egress[0]===2;
        flags.onlyP2=flags.known&&!r.egress.includes(3);
        setExplain('<b>Known Unicast:</b> SW1이 PC2 MAC → port 2를 이미 알고 있으므로 port 2로만 전달합니다. PC3 링크에는 이 요청을 복사하지 않습니다.');
      }else if(lesson===2){
        const r=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.dstPreserved=r.dstMac===DEV.pc2.mac;
        flags.flood=r.kind==='flood'&&r.egress.includes(2)&&r.egress.includes(3);
        flags.pc3Seen=r.egress.includes(3);
        setExplain('<b>Unknown Unicast ≠ Broadcast:</b> PC1은 PC2 MAC을 이미 알고 있으므로 Destination MAC은 PC2 그대로입니다. SW1만 출력 포트를 몰라 port 2·3으로 Flooding합니다. PC3 링크에서는 프레임이 관찰되지만 Ethernet 목적지는 PC2이므로 PC3를 위한 프레임으로 바뀐 것이 아닙니다.','flood');
      }else if(lesson===3){
        const r=await processFrame(DEV.pc1,BROADCAST,'ARP REQUEST',{arpRequest:true,arpTargetIp:DEV.pc3.ip});
        flags.broadcastMac=r.dstMac===BROADCAST;
        flags.broadcastFlood=r.kind==='broadcast'&&r.egress.includes(2)&&r.egress.includes(3);
        flags.sourceLearn=fdb.has(DEV.pc1.mac);
        setExplain('<b>Broadcast:</b> Ethernet Destination은 '+BROADCAST+'입니다. ARP Target IPv4는 PC3이지만 ARP Target Hardware는 아직 알아내려는 값으로, Ethernet Broadcast Destination과 같은 필드가 아닙니다.','broadcast');
      }else if(lesson===4){
        const first=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.flood=first.kind==='flood'&&first.egress.includes(2)&&first.egress.includes(3);

        const reply=await processFrame(DEV.pc2,DEV.pc1.mac,'ICMP ECHO REPLY');
        flags.relearn=fdb.has(DEV.pc2.mac)&&fdb.get(DEV.pc2.mac).port===2&&reply.kind==='known';

        const again=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST · AGAIN');
        flags.known=again.kind==='known'&&again.egress[0]===2;
        setExplain('<b>Aging → Flooding → Re-learning → Known:</b> 이 실습에서는 FDB Aging 기준을 300초로 둡니다. PC1 ARP가 남아 있으므로 첫 요청은 PC2 MAC을 그대로 사용하고, PC2 Reply의 Source MAC으로 SW1이 다시 학습한 뒤 다음 요청은 Known Unicast가 됩니다.');
      }
      completeIfReady();
    }finally{
      busy=false;
      updateControls();
    }
  }

  function ageLesson(){
    if(lesson!==4||busy||manualDirty||flags.aged) return;
    for(const [mac,entry] of Array.from(fdb.entries())){
      entry.age+=5;
      if(entry.age>=FDB_AGE_LIMIT){
        fdb.delete(mac);
        addLog('Aging 삭제 '+mac+' after '+entry.age+'s (Lab threshold '+FDB_AGE_LIMIT+'s)');
      }
    }
    flags.aged=!fdb.has(DEV.pc2.mac)&&arpPc1.get(DEV.pc2.ip)===DEV.pc2.mac;
    renderTables();
    setLive('aging','PC2 Dynamic FDB Aging 완료','이 실습의 300초 기준을 넘은 PC2 엔트리는 사라졌지만 PC1 ARP 캐시의 PC2 IP → MAC은 그대로 남아 있습니다.','Aging');
    setBasic({src:DEV.pc1.mac,dst:DEV.pc2.mac},{title:'PC2 FDB 없음',detail:'ARP는 남아 있지만 SW1은 PC2의 출력 포트를 모릅니다.'},{title:'다음 프레임 대기',detail:'이제 PC1 → PC2를 실행하세요.'});
    setSvgDecision('—','PC2 → FDB Miss','다음 Frame · Flooding 예상');
    renderMobileFlow(DEV.pc1,'다음 프레임 대기',[],'',DEV.pc2.mac);
    addTimeline('aging','FDB Aging','PC2 동적 엔트리 삭제 · PC1 ARP 유지 · 자동 시간 경과는 모델링하지 않음');
    setExplain('PC2 FDB 엔트리만 사라졌습니다. <b>PC1의 ARP 캐시는 유지</b>되어 있으므로 다음 전송은 새 ARP가 아니라 PC2 목적지 Unicast로 시작합니다. 이 시뮬레이터의 Age는 실제 시계가 아니라 실습 버튼으로만 증가합니다.','flood');
    renderChecks();
    updateControls();
  }

  function markManualStateChanged(message){
    manualDirty=true;
    flags={};
    $('manualStateWarning').innerHTML='<b>자유 조작 상태:</b> '+message+' 표준 실습 완료 판정을 받으려면 <b>실습 기본 상태로 복원</b>하세요.';
    renderChecks();
    updateControls();
  }

  async function runManual(src,dst,type){
    if(busy) return;
    markManualStateChanged('수동 프레임 전송으로 FDB 상태가 변경될 수 있습니다.');
    busy=true;
    updateControls();
    try{
      await processFrame(src,dst,type);
      renderTables();
    }finally{
      busy=false;
      updateControls();
    }
  }

  function manualAge(){
    if(busy) return;
    markManualStateChanged('Aging 시간을 수동으로 진행했습니다.');
    for(const [mac,entry] of Array.from(fdb.entries())){
      entry.age+=301;
      if(entry.age>=FDB_AGE_LIMIT) fdb.delete(mac);
    }
    renderTables();
    addLog('수동 Aging +301초 → '+FDB_AGE_LIMIT+'초 이상 엔트리 삭제');
    setLive('aging','수동 Aging +301초','고급 조작으로 현재 Dynamic FDB의 300초 이상 엔트리를 제거했습니다.','Aging');
  }

  function setMode(mode){
    document.body.dataset.simMode=mode;
    document.querySelectorAll('[data-view-mode]').forEach(btn=>{
      const on=btn.dataset.viewMode===mode;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',String(on));
    });
    $('viewModeSummary').textContent=mode==='basic'
      ? '기본 모드 · 처음에는 Frame과 FDB의 핵심 변화만 확인하세요.'
      : '고급 모드 · SW1 FDB, PC1/PC2 ARP 캐시와 현재 실습 상태를 직접 바꾸는 자유 조작을 표시합니다.';
  }

  document.querySelectorAll('[data-lesson]').forEach(btn=>btn.addEventListener('click',()=>{
    if(busy) return;
    loadLesson(Number(btn.dataset.lesson));
  }));

  document.querySelectorAll('[data-view-mode]').forEach(btn=>btn.addEventListener('click',()=>setMode(btn.dataset.viewMode)));

  $('hintBtn').addEventListener('click',()=>{
    const hints=lessons[lesson].hints;
    $('hintBox').innerHTML='<b>힌트 '+(hintIndex+1)+'</b> · '+hints[hintIndex];
    $('hintBox').classList.add('show');
    hintIndex=(hintIndex+1)%hints.length;
    $('hintBtn').textContent='막혔나요? 힌트 '+(hintIndex+1)+'/3';
  });

  $('runBtn').addEventListener('click',runLesson);
  $('ageBtn').addEventListener('click',ageLesson);
  $('resetBtn').addEventListener('click',()=>{ if(!busy) loadLesson(lesson); });
  $('resetLabStateBtn').addEventListener('click',()=>{ if(!busy) loadLesson(lesson); });
  $('nextBtn').addEventListener('click',()=>{
    if(busy) return;
    if(lesson<lessons.length-1) loadLesson(lesson+1);
    else $('courseComplete').scrollIntoView({behavior:'smooth',block:'center'});
  });

  $('clearFdbBtn').addEventListener('click',()=>{
    if(busy) return;
    markManualStateChanged('SW1 Dynamic FDB 전체를 비웠습니다.');
    fdb.clear();
    renderTables();
    addLog('수동 조작 · FDB 전체 비움');
    setLive('aging','FDB 전체 비움','고급 조작으로 SW1 Dynamic FDB를 모두 비웠습니다.','삭제');
  });

  $('clearPc2Btn').addEventListener('click',()=>{
    if(busy) return;
    markManualStateChanged('PC2의 Dynamic FDB 엔트리만 삭제했습니다. PC1/PC2 ARP 캐시는 유지됩니다.');
    fdb.delete(DEV.pc2.mac);
    renderTables();
    addLog('수동 조작 · PC2 FDB만 삭제');
    setLive('aging','PC2 FDB만 삭제','PC1/PC2 ARP 캐시는 변경하지 않았습니다.','삭제');
  });

  $('manualAgeBtn').addEventListener('click',manualAge);
  $('manualUnicastBtn').addEventListener('click',()=>runManual(DEV.pc1,DEV.pc2.mac,'수동 PC1 → PC2'));
  $('manualReplyBtn').addEventListener('click',()=>runManual(DEV.pc2,DEV.pc1.mac,'수동 PC2 → PC1'));
  $('manualBroadcastBtn').addEventListener('click',()=>runManual(DEV.pc1,BROADCAST,'수동 Broadcast'));

  setMode('basic');
  loadLesson(0);
})();