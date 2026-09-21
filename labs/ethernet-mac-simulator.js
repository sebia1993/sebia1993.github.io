(() => {
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const DEV = {
    pc1:{name:'PC1',ip:'192.168.10.10',mac:'00:50:79:66:68:00',port:1},
    pc2:{name:'PC2',ip:'192.168.10.20',mac:'00:50:79:66:68:01',port:2},
    pc3:{name:'PC3',ip:'192.168.10.30',mac:'00:50:79:66:68:02',port:3}
  };
  const BROADCAST='ff:ff:ff:ff:ff:ff';

  const lessons=[
    {
      title:'첫 Ping에서 Source MAC Learning을 확인하세요.',
      text:'FDB와 PC1 ARP Cache가 비어 있습니다. ARP Request와 Reply가 오갈 때 누가 언제 학습되는지 보세요.',
      run:'▶ 첫 PING 실행',
      hints:[
        '스위치는 Destination MAC을 보고 학습하지 않습니다. 먼저 <b>Source MAC</b>을 봅니다.',
        'PC1의 ARP Request가 port 1로 들어오면 <b>PC1 MAC → port 1</b>이 먼저 생깁니다.',
        'PC2가 ARP Reply를 보내고 그 프레임이 port 2로 들어와야 <b>PC2 MAC → port 2</b>가 생깁니다.'
      ],
      checks:[
        ['pc1Learn','PC1 Source 학습','ARP Request 수신으로 PC1 → port 1'],
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
        'Known Unicast에서는 이 Lab 조건에서 PC3의 port 3로 복사하지 않습니다.'
      ],
      checks:[
        ['known','FDB Hit','PC2 MAC → port 2 조회 성공'],
        ['onlyP2','port 2로만 전달','PC3 링크에는 요청을 내보내지 않음']
      ]
    },
    {
      title:'Unknown Unicast Flooding을 직접 확인하세요.',
      text:'PC1은 ARP Cache에서 PC2 MAC을 알고 있지만 SW1 FDB에는 PC2가 없습니다. ARP와 FDB가 독립이라는 점이 핵심입니다.',
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
      text:'PC1이 PC3를 찾는 ARP Request를 보냅니다. 이번 Destination MAC은 처음부터 ff:ff:ff:ff:ff:ff 입니다.',
      run:'▶ ARP Broadcast 실행',
      hints:[
        'Broadcast는 FDB에서 특정 Destination MAC의 포트를 찾는 상황이 아닙니다.',
        'Ethernet Destination MAC이 <b>ff:ff:ff:ff:ff:ff</b>인지 확인하세요.',
        'port 2와 port 3 모두로 전달되지만 Unknown Unicast와 달리 목적지 MAC 자체가 Broadcast입니다.'
      ],
      checks:[
        ['broadcastMac','Broadcast MAC','Destination = ff:ff:ff:ff:ff:ff'],
        ['broadcastFlood','Broadcast 전달','수신 port 1 제외 → port 2·3'],
        ['sourceLearn','Source는 여전히 학습','PC1 MAC → port 1 갱신']
      ]
    },
    {
      title:'Aging으로 사라진 엔트리가 어떻게 다시 학습되는지 확인하세요.',
      text:'PC2 엔트리는 299초 동안 갱신되지 않았고 PC1은 최근 갱신된 상태입니다. 먼저 +5초를 눌러 PC2만 Aging시켜 보세요.',
      run:'▶ Aging 후 PC1 → PC2',
      hints:[
        '이 실습에서 PC1 ARP Cache의 PC2 항목은 유지됩니다. <b>FDB Aging과 ARP Cache는 별개</b>입니다.',
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

  let lesson=0;
  let fdb=new Map();
  let arpPc1=new Map();
  let flags={};
  let completed=new Set();
  let busy=false;
  let hintIndex=0;
  let logLines=[];
  let timelineCount=0;

  function macName(mac){
    if(mac===BROADCAST) return 'ff:ff:ff:ff:ff:ff';
    for(const dev of Object.values(DEV)) if(dev.mac===mac) return dev.name+' MAC';
    return mac;
  }

  function portList(ports){
    return ports.map(p=>'port '+p).join(' · ');
  }

  function setFdb(mac,port,age=0){
    fdb.set(mac,{port,age});
  }

  function learn(dev){
    setFdb(dev.mac,dev.port,0);
  }

  function clearLinkState(){
    [1,2,3].forEach(p=>{
      const el=$('link-p'+p);
      if(el) el.classList.remove('ingress','egress','flood');
    });
  }

  function setLinks(ingress,egress,kind){
    clearLinkState();
    const inEl=$('link-p'+ingress);
    if(inEl) inEl.classList.add('ingress');
    egress.forEach(p=>{
      const el=$('link-p'+p);
      if(el){
        el.classList.add('egress');
        if(kind==='flood'||kind==='broadcast') el.classList.add('flood');
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
    $('liveEventKind').textContent=label||'EVENT';
    $('liveEventIcon').textContent=kind==='aging'?'⏱':kind==='broadcast'?'B':kind==='flood'?'F':kind==='known'?'K':'L';
    $('switchBadge').textContent=(label||'READY').toUpperCase();
  }

  function setBasic(frame,lookup,action){
    $('frameSrc').textContent=frame?macName(frame.src):'—';
    $('frameDst').textContent=frame?macName(frame.dst):'—';
    $('switchLookup').textContent=lookup.title;
    $('switchLookupDetail').textContent=lookup.detail;
    $('switchAction').textContent=action.title;
    $('switchActionDetail').textContent=action.detail;
  }

  function addTimeline(kind,title,detail){
    if(timelineCount===0) $('eventTimeline').innerHTML='';
    timelineCount++;
    const item=document.createElement('div');
    item.className='timeline-item '+kind;
    item.innerHTML='<small>STEP '+String(timelineCount).padStart(2,'0')+'</small><b>'+title+'</b><span>'+detail+'</span>';
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

  function renderTables(){
    const rows=Array.from(fdb.entries()).sort((a,b)=>a[1].port-b[1].port);
    $('fdbBody').innerHTML=rows.length?rows.map(([mac,v])=>
      '<tr><td><code>'+mac+'</code></td><td>port '+v.port+'</td><td>'+v.age+'s</td></tr>'
    ).join(''):'<tr><td colspan="3" class="empty-row">동적 FDB 엔트리가 없습니다.</td></tr>';

    const arpRows=Array.from(arpPc1.entries());
    $('arpBody').innerHTML=arpRows.length?arpRows.map(([ip,mac])=>
      '<tr><td>'+ip+'</td><td><code>'+mac+'</code></td></tr>'
    ).join(''):'<tr><td colspan="2" class="empty-row">PC1 ARP Cache가 비어 있습니다.</td></tr>';
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

    const all=cfg.checks.every(c=>Boolean(flags[c[0]]));
    const already=completed.has(lesson);
    const badge=$('lessonBadge');
    badge.classList.toggle('success',all||already);
    badge.textContent=all?'완료':already?'완료 기록':'진행 중';
    $('nextBtn').disabled=!(all||already);
    $('verdictBox').className='verdict'+(all?' success':'');
    if(all){
      $('verdictBox').innerHTML='<b>완료:</b> '+completionText(lesson);
    }else if(already){
      $('verdictBox').innerHTML='이 실습은 이전에 완료했습니다. 다시 실행해 상태 변화를 재확인할 수 있습니다.';
    }else{
      $('verdictBox').textContent='위 조건을 실제 프레임 흐름에서 확인하세요.';
    }
  }

  function completionText(idx){
    return [
      'Source MAC은 학습에, Destination MAC은 출력 포트 결정에 사용된다는 흐름을 확인했습니다.',
      'FDB Hit이면 해당 출력 포트로만 Known Unicast가 전달되는 것을 확인했습니다.',
      'Unknown Unicast는 목적지 MAC을 바꾸지 않은 채 다른 전달 가능 포트로 Flooding됨을 확인했습니다.',
      'Broadcast는 처음부터 ff:ff:ff:ff:ff:ff를 목적지로 사용하며 Source Learning은 그대로 수행됨을 확인했습니다.',
      'FDB Aging 뒤 첫 요청은 Flooding되고, Reply의 Source MAC으로 재학습한 뒤 Known Unicast로 회복됨을 확인했습니다.'
    ][idx];
  }

  function completeIfReady(){
    const cfg=lessons[lesson];
    if(cfg.checks.every(c=>Boolean(flags[c[0]]))){
      completed.add(lesson);
      renderProgress();
    }
    renderChecks();
  }

  function setExplain(html,kind){
    $('explainBox').className='explain'+(kind?' '+kind:'');
    $('explainBox').innerHTML=html;
  }

  function updateControls(){
    $('runBtn').disabled=busy||(lesson===4&&!flags.aged);
    $('ageBtn').disabled=busy||Boolean(flags.aged);
    $('ageBtn').hidden=lesson!==4;
  }

  function resetScenario(){
    fdb=new Map();
    arpPc1=new Map();
    flags={};
    logLines=[];
    timelineCount=0;
    $('eventTimeline').innerHTML='<div class="timeline-empty">실행하면 프레임 순서가 여기에 쌓입니다.</div>';
    $('eventLog').textContent='아직 이벤트가 없습니다.';
    clearLinkState();
    resetFlow();

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
    }

    setBasic(null,{title:'대기',detail:'Destination MAC을 받으면 FDB에서 조회합니다.'},{title:'대기',detail:'아직 전달할 프레임이 없습니다.'});
    setLive('', '프레임 이벤트 대기','실습을 실행하면 현재 프레임과 SW1의 판단이 여기에 표시됩니다.','READY');
    renderTables();
    renderChecks();
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
    $('resultHint').textContent=idx===2?'ARP Cache와 FDB를 분리해서 보세요.':'Source Learning과 Destination Lookup을 분리해서 보세요.';
    setExplain(idx===4?'먼저 <b>+5초 경과</b>를 눌러 PC2 FDB Aging을 발생시키세요.':'<b>'+cfg.run.replace('▶ ','')+'</b>을 눌러 현재 상태를 확인하세요.');
    resetScenario();
    renderProgress();
    window.scrollTo({top:document.querySelector('.lab-card').offsetTop-14,behavior:'smooth'});
  }

  async function processFrame(srcDev,dstMac,frameType){
    const ingress=srcDev.port;
    const otherPorts=[1,2,3].filter(p=>p!==ingress);
    const frame={src:srcDev.mac,dst:dstMac};

    resetFlow();
    setFlow(1);
    setLinks(ingress,[],'');
    setBasic(frame,{title:'아직 조회 전',detail:'먼저 Source Learning을 수행합니다.'},{title:'수신 중',detail:'port '+ingress+'로 프레임이 들어왔습니다.'});
    setLive('learning',frameType+' · FRAME IN',srcDev.name+'의 프레임이 port '+ingress+'로 SW1에 들어왔습니다.','FRAME IN');
    await sleep(360);

    learn(srcDev);
    renderTables();
    setFlow(2);
    setLive('learning','Source MAC Learning',srcDev.name+' MAC → port '+ingress+'을 Dynamic FDB에 학습/갱신했습니다.','LEARNING');
    addLog('LEARN '+srcDev.name+' '+srcDev.mac+' -> port '+ingress);
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
      lookupDetail='특정 한 포트의 Unicast FDB Hit을 찾는 상황이 아닙니다.';
      actionTitle='Broadcast 전달';
      actionDetail='수신 port '+ingress+' 제외 → '+portList(egress);
      setLive('broadcast','Destination = Broadcast','ff:ff:ff:ff:ff:ff이므로 동일 Broadcast Domain의 다른 전달 가능 포트로 보냅니다.','BROADCAST');
    }else{
      const entry=fdb.get(dstMac);
      if(entry&&entry.port!==ingress){
        kind='known';
        egress=[entry.port];
        lookupTitle='FDB Hit · port '+entry.port;
        lookupDetail=macName(dstMac)+' → port '+entry.port+' 엔트리를 찾았습니다.';
        actionTitle='Known Unicast';
        actionDetail='port '+entry.port+'로만 전달';
        setLive('known','FDB Hit · Known Unicast',macName(dstMac)+'의 출력 포트를 알고 있습니다.','KNOWN');
      }else if(entry&&entry.port===ingress){
        kind='known';
        egress=[];
        lookupTitle='FDB Hit · ingress와 동일';
        lookupDetail='목적지 MAC이 같은 수신 포트 방향으로 학습되어 있습니다.';
        actionTitle='이 Lab에서는 전달 없음';
        actionDetail='동일 수신 포트 특수 케이스는 고급 장비별 동작을 단순화합니다.';
        setLive('known','FDB Hit · Same-port','이 Simulator는 같은 수신 포트로 되돌리는 특수 동작을 단순화합니다.','FILTER');
      }else{
        kind='flood';
        egress=otherPorts;
        lookupTitle='FDB Miss';
        lookupDetail=macName(dstMac)+'의 출력 포트 정보가 없습니다.';
        actionTitle='Unknown Unicast Flooding';
        actionDetail='목적지 MAC 유지 · 수신 port '+ingress+' 제외 → '+portList(egress);
        setLive('flood','FDB Miss · Unknown Unicast',macName(dstMac)+' 자체는 그대로 두고 다른 전달 가능 포트로 Flooding합니다.','UNKNOWN');
      }
    }

    setBasic(frame,{title:lookupTitle,detail:lookupDetail},{title:actionTitle,detail:actionDetail});
    await sleep(430);

    setFlow(4);
    setLinks(ingress,egress,kind);
    const eventTitle=frameType+' · '+actionTitle;
    addTimeline(kind,eventTitle,srcDev.name+' port '+ingress+' → '+(egress.length?portList(egress):'전달 없음'));
    addLog(frameType+' src='+srcDev.mac+' dst='+dstMac+' ingress=port'+ingress+' action='+actionTitle+' egress='+egress.join(','));
    await sleep(650);

    return {kind,egress,lookupTitle,actionTitle};
  }

  async function runLesson(){
    if(busy) return;
    if(lesson===4&&!flags.aged) return;
    busy=true;
    updateControls();
    try{
      if(lesson===0){
        const a=await processFrame(DEV.pc1,BROADCAST,'ARP REQUEST');
        flags.pc1Learn=fdb.has(DEV.pc1.mac)&&a.kind==='broadcast';

        const b=await processFrame(DEV.pc2,DEV.pc1.mac,'ARP REPLY');
        arpPc1.set(DEV.pc2.ip,DEV.pc2.mac);
        renderTables();
        flags.pc2Learn=fdb.has(DEV.pc2.mac)&&b.kind==='known';

        const c=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.knownAfter=c.kind==='known'&&c.egress.length===1&&c.egress[0]===2;

        await processFrame(DEV.pc2,DEV.pc1.mac,'ICMP ECHO REPLY');
        setExplain('<b>핵심:</b> PC1은 ARP Request의 Source로 먼저 학습되고, PC2는 ARP Reply를 실제로 보낸 뒤 Source MAC으로 학습됩니다. 이후 ICMP 요청은 Known Unicast가 됩니다.');
      }else if(lesson===1){
        const r=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.known=r.kind==='known'&&r.egress[0]===2;
        flags.onlyP2=flags.known&&!r.egress.includes(3);
        setExplain('<b>Known Unicast:</b> SW1이 PC2 MAC → port 2를 이미 알고 있으므로 port 2로만 전달합니다. PC3 링크에는 이 요청을 복사하지 않습니다.');
      }else if(lesson===2){
        const r=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.dstPreserved=$('frameDst').textContent==='PC2 MAC';
        flags.flood=r.kind==='flood'&&r.egress.includes(2)&&r.egress.includes(3);
        flags.pc3Seen=r.egress.includes(3);
        setExplain('<b>Unknown Unicast ≠ Broadcast:</b> PC1은 PC2 MAC을 이미 알고 있으므로 Destination MAC은 PC2 그대로입니다. SW1만 출력 포트를 몰라 port 2·3으로 Flooding합니다. PC3는 프레임을 볼 수 있지만 목적지는 PC3가 아닙니다.','flood');
      }else if(lesson===3){
        const r=await processFrame(DEV.pc1,BROADCAST,'ARP REQUEST');
        flags.broadcastMac=$('frameDst').textContent===BROADCAST;
        flags.broadcastFlood=r.kind==='broadcast'&&r.egress.includes(2)&&r.egress.includes(3);
        flags.sourceLearn=fdb.has(DEV.pc1.mac);
        setExplain('<b>Broadcast:</b> Destination MAC 자체가 ff:ff:ff:ff:ff:ff입니다. 여러 포트로 전달된다는 결과만 보면 Unknown Unicast와 비슷해 보여도 프레임의 목적지 MAC이 다릅니다.','broadcast');
      }else if(lesson===4){
        const first=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST');
        flags.flood=first.kind==='flood'&&first.egress.includes(2)&&first.egress.includes(3);

        const reply=await processFrame(DEV.pc2,DEV.pc1.mac,'ICMP ECHO REPLY');
        flags.relearn=fdb.has(DEV.pc2.mac)&&fdb.get(DEV.pc2.mac).port===2&&reply.kind==='known';

        const again=await processFrame(DEV.pc1,DEV.pc2.mac,'ICMP ECHO REQUEST · AGAIN');
        flags.known=again.kind==='known'&&again.egress[0]===2;
        setExplain('<b>Aging → Flooding → Re-learning → Known:</b> FDB 엔트리가 사라져도 PC1 ARP가 남아 있으면 첫 요청은 PC2 MAC을 그대로 사용합니다. SW1은 Flooding하고, PC2 Reply의 Source MAC으로 다시 학습한 뒤 다음 요청은 Known Unicast가 됩니다.');
      }
      completeIfReady();
    }finally{
      busy=false;
      updateControls();
    }
  }

  function ageLesson(){
    if(lesson!==4||busy||flags.aged) return;
    for(const [mac,entry] of Array.from(fdb.entries())){
      entry.age+=5;
      if(entry.age>=300){
        fdb.delete(mac);
        addLog('AGE OUT '+mac+' after '+entry.age+'s');
      }
    }
    flags.aged=!fdb.has(DEV.pc2.mac)&&arpPc1.get(DEV.pc2.ip)===DEV.pc2.mac;
    renderTables();
    setLive('aging','PC2 Dynamic FDB Aged Out','PC2 MAC → port 2 엔트리는 사라졌지만 PC1 ARP Cache의 PC2 IP → MAC은 그대로 남아 있습니다.','AGING');
    setBasic({src:DEV.pc1.mac,dst:DEV.pc2.mac},{title:'PC2 FDB 없음',detail:'ARP는 남아 있지만 SW1은 PC2의 출력 포트를 모릅니다.'},{title:'다음 프레임 대기',detail:'이제 PC1 → PC2를 실행하세요.'});
    addTimeline('aging','FDB Aging','PC2 dynamic entry 삭제 · PC1 ARP 유지');
    setExplain('PC2 FDB 엔트리만 사라졌습니다. <b>PC1의 ARP Cache는 유지</b>되어 있으므로 다음 전송은 새 ARP가 아니라 PC2 목적지 Unicast로 시작합니다.','flood');
    renderChecks();
    updateControls();
  }

  async function runManual(src,dst,type){
    if(busy) return;
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
    for(const [mac,entry] of Array.from(fdb.entries())){
      entry.age+=301;
      if(entry.age>=300) fdb.delete(mac);
    }
    renderTables();
    addLog('MANUAL AGE +301s -> expired dynamic entries removed');
    setLive('aging','수동 Aging +301초','고급 조작으로 현재 Dynamic FDB의 300초 이상 엔트리를 제거했습니다.','AGING');
  }

  function setMode(mode){
    document.body.dataset.simMode=mode;
    document.querySelectorAll('[data-view-mode]').forEach(btn=>{
      const on=btn.dataset.viewMode===mode;
      btn.classList.toggle('active',on);
      btn.setAttribute('aria-pressed',String(on));
    });
    $('viewModeSummary').textContent=mode==='basic'
      ? '기본 모드 · 처음에는 프레임과 FDB의 핵심 변화만 확인하세요.'
      : '고급 모드 · 현재 Dynamic FDB, PC1 ARP Cache와 직접 상태 조작을 추가로 표시합니다.';
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
  $('nextBtn').addEventListener('click',()=>{
    if(busy) return;
    if(lesson<lessons.length-1) loadLesson(lesson+1);
    else $('courseComplete').scrollIntoView({behavior:'smooth',block:'center'});
  });

  $('clearFdbBtn').addEventListener('click',()=>{
    if(busy) return;
    fdb.clear();renderTables();addLog('MANUAL CLEAR all FDB entries');
    setLive('aging','FDB 전체 비움','고급 조작으로 SW1 Dynamic FDB를 모두 비웠습니다.','CLEAR');
  });
  $('clearPc2Btn').addEventListener('click',()=>{
    if(busy) return;
    fdb.delete(DEV.pc2.mac);renderTables();addLog('MANUAL CLEAR PC2 FDB only');
    setLive('aging','PC2 FDB만 삭제','PC1 ARP Cache는 변경하지 않았습니다.','CLEAR');
  });
  $('manualAgeBtn').addEventListener('click',manualAge);
  $('manualUnicastBtn').addEventListener('click',()=>runManual(DEV.pc1,DEV.pc2.mac,'MANUAL PC1 → PC2'));
  $('manualReplyBtn').addEventListener('click',()=>runManual(DEV.pc2,DEV.pc1.mac,'MANUAL PC2 → PC1'));
  $('manualBroadcastBtn').addEventListener('click',()=>runManual(DEV.pc1,BROADCAST,'MANUAL BROADCAST'));

  setMode('basic');
  loadLesson(0);
})();