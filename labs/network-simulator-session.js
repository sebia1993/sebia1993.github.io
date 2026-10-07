/* ARP-derived lesson lifecycle. Protocol models and original evidence remain in topic adapters. */
window.NetworkSimulator = {mount(adapter) {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('simLab'), visual = $('simVisual'), presentation = adapter.presentation || {};
  const list = adapter.raw.map((s, index) => ({...s, index,
    choices:s.options.map((o,j) => Array.isArray(o) ? o : [j,o]), correctKey:s.correct,
    conditions:s.start || s.states || [], description:s.text || s.description || '',
    answer:s.actual || s.answer || s.conclusion || '', steps:s.steps || null}));
  const commonLabels = {
    'STABLE TOPOLOGY':'실습 토폴로지','Stable Topology':'실습 토폴로지',
    'Learning Topology':'학습 토폴로지','Observed State':'관찰한 상태','Evidence State':'관찰 근거',
    'Browser Animation':'화면 애니메이션','Current Event':'현재 동작','Scenario':'실습 조건',
    'SUCCESS':'성공','READY':'준비','FAILED':'실패','FAIL':'실패','PASS':'통과',
    'MISMATCH':'기준 불일치','NOT_EVALUATED':'비교 미실행','ERROR':'오류',
    'BEFORE':'변경 전','AFTER':'변경 후','RECOVERY':'복구','OBSERVE':'관찰',
    'DECISION':'판단','INTERPRET':'해석','DESTINATION':'목적지','EXPIRE':'만료',
    'Scope':'실습 범위','Baseline':'기본 조건','Snapshot':'관찰 기록'
  };
  const replacements = {...commonLabels, ...(presentation.names || {}), ...(presentation.labels || {})};
  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(replacements).filter(Boolean).sort((a,b) => b.length-a.length);
  const expression = keys.length ? new RegExp('(?<![A-Za-z0-9_])(?:'+keys.map(escape).join('|')+')(?![A-Za-z0-9_])','g') : null;
  const present = value => expression ? String(value ?? '').replace(expression, key => replacements[key]) : String(value ?? '');
  const protectedText = 'script,style,pre,code,[data-preserve-original],.sim-evidence';
  function presentDOM(scope = root) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest(protectedText)) continue;
      const changed = present(node.nodeValue);
      if (changed !== node.nodeValue) node.nodeValue = changed;
    }
    scope.querySelectorAll('[aria-label],[title]').forEach(el => {
      if (el.closest(protectedText)) return;
      for (const attr of ['aria-label','title']) if (el.hasAttribute(attr)) el.setAttribute(attr,present(el.getAttribute(attr)));
    });
  }
  const lessonUI = i => presentation.lessons?.[i] || {};
  const lessonTitle = i => present(lessonUI(i).title || list[i].tab?.replace(/^\d+\s*[·.]\s*/, '') || list[i].question);
  let firstRecords = list.map(() => null), records = list.map(() => null);
  let current=0, selected=null, phase='IDLE', frame=0, generation=0, step=-1, elapsed=0, started=0;
  let mode='normal', compared=false, recovered=false, plan=[], hintIndex=0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const visualMain = visual.querySelector('.observation > :first-child, .topology-card > svg, .topology-card > .route-map, .topology-card > .route-boundary-map, .dot-lab-grid > :last-child');
  if (visualMain) visualMain.after($('simEvent')); else visual.append($('simEvent'));
  // Reference feedback stays beside the prediction, so learners compare their original choice directly.
  $('simOptions').closest('.prediction-card').append($('simResult'));
  const coach = $('simTitle').closest('.coach');
  const hintButton = document.createElement('button');
  hintButton.id='simHint'; hintButton.type='button'; hintButton.className='hint-trigger';
  hintButton.setAttribute('aria-controls','simHintText'); hintButton.setAttribute('aria-expanded','false');
  coach.append(hintButton);
  const hintBox = document.createElement('div');
  hintBox.id='simHintText'; hintBox.className='sim-hint'; hintBox.hidden=true; hintBox.setAttribute('role','status');
  coach.after(hintBox);
  if (presentation.guideDifferences?.length) {
    const note=document.createElement('p'); note.className='sim-guide-differences'; note.dataset.preserveOriginal='';
    note.textContent=presentation.guideDifferences.map(x=>`${x.name}: ${x.reason}`).join(' ');
    $('simConditions').after(note);
  }
  function hints() { return lessonUI(current).hints || [
    '시작 조건에서 이번 질문과 관련된 장비와 값을 찾아보세요.',
    '어떤 조건을 확인해야 보기들을 구분할 수 있을지 생각해 보세요.',
    '학습 페이지의 같은 예시를 확인한 뒤, 예상과 실제 관찰을 비교해 보세요.'
  ]; }
  function resetHint() {
    hintIndex=0; hintBox.hidden=true; hintBox.replaceChildren();
    hintButton.textContent=`막혔나요? 힌트 1/${hints().length}`;
    hintButton.setAttribute('aria-expanded','false'); hintButton.disabled=false;
  }
  hintButton.onclick=() => {
    const items=hints(); hintBox.hidden=false;
    const p=document.createElement('p'); p.textContent=`${hintIndex+1}. ${present(items[hintIndex])}`; hintBox.append(p);
    hintIndex++; hintButton.setAttribute('aria-expanded','true');
    hintButton.textContent=hintIndex<items.length?`다음 힌트 ${hintIndex+1}/${items.length}`:'힌트를 모두 확인했습니다';
    hintButton.disabled=hintIndex>=items.length;
  };
  // Preserve original IDs/values for validation; translations are applied only to rendered text.
  const label=(s,key) => present(s.choices.find(o => o[0]===key)?.[1] || '—');
  function stop() { generation++; cancelAnimationFrame(frame); frame=0; }
  function setPhase(value) {
    phase=value; root.dataset.state=value;
    document.body.classList.toggle('prediction-selected',value!=='IDLE');
    visual.getAnimations({subtree:true}).forEach(a => value==='PAUSED'?a.pause():a.play());
  }
  const scoreRecords=() => adapter.kind==='sequence'?firstRecords:records;
  function progress() {
    const scores=scoreRecords(), count=scores.filter(Boolean).length, correct=scores.filter(r=>r?.correct).length;
    $('simBar').style.width=`${count/list.length*100}%`;
    $('simCount').textContent=`${count} / ${list.length} 완료`;
    $('simScore').textContent=`정답 ${correct} · 오답 ${count-correct} · 미응답 ${list.length-count}`;
    $('simTabs').replaceChildren(...list.map((s,i) => {
      const b=document.createElement('button'); b.type='button';
      b.className=`lesson-tab ${i===current?'active':''} ${records[i]?'done':''}`;
      b.dataset.lesson=i; b.setAttribute('aria-current',i===current?'step':'false');
      b.textContent=`${i+1} · ${lessonTitle(i)}`; return b;
    }));
  }
  function options() {
    const s=list[current], done=phase==='COMPLETED';
    $('simOptions').replaceChildren(...s.choices.map(([key,text]) => {
      const b=document.createElement('button'); b.type='button';
      b.className='prediction-option'+(selected===key?' selected':'')+(done&&key===s.correctKey?' correct-answer':'')+(done&&selected===key&&key!==s.correctKey?' wrong-answer':'');
      b.textContent=present(text); b.setAttribute('aria-pressed',String(selected===key));
      b.disabled=!['IDLE','PREDICTED'].includes(phase);
      b.onclick=() => { if(!['IDLE','PREDICTED'].includes(phase))return;
        selected=key; setPhase('PREDICTED'); options(); controls();
        $('simOptions').querySelector('[aria-pressed=true]').focus({preventScroll:true});
      }; return b;
    }));
  }
  function controls() {
    const running=phase==='RUNNING', paused=phase==='PAUSED', complete=phase==='COMPLETED', s=list[current];
    $('simRun').disabled=phase!=='PREDICTED';
    $('simRun').parentElement.hidden=running||paused||complete;
    $('simPlayback').hidden=!(running||paused||complete);
    $('simPlayback').textContent=running?'⏸ 일시정지':paused?'▶ 이어서 보기':'↻ 흐름 다시 보기';
    $('simNext').disabled=!complete;
    $('simNext').textContent=current===list.length-1?'학습 결과 보기 →':'다음 문제 →';
    $('simResult').hidden=!complete; $('simReview').hidden=!complete; $('simExtras').hidden=!complete;
    $('simCompare').hidden=!(adapter.compare&&s.compare&&!compared);
    $('simCompare').textContent=present(s.compare||'조건 바꿔 비교하기');
    $('simRecover').hidden=!(adapter.recover&&(s.recover||s.completeOnRecover||(s.mode==='oneway'&&compared))&&!recovered);
    $('simExtraStatus').textContent=recovered?'복구 장면 관찰 완료':compared?'비교 장면 관찰 완료':(s.recover||s.completeOnRecover)?'장애 관찰 완료 · 복구 장면 미관찰':'';
    $('prevStepBtn').disabled=!complete||step<=0;
    $('nextStepBtn').disabled=!complete||step>=plan.length-1;
    $('simQuick').hidden=!['PREDICTED','RUNNING','PAUSED','COMPLETED'].includes(phase)||!$('simSummary').hidden;
    $('simQuickLabel').textContent=running?'관찰 진행 중':paused?'일시정지':complete?'결과 확인 완료':'예상 선택 완료';
    $('simQuickText').textContent=running||paused?'흐름과 현재 설명을 함께 확인하세요.':complete?'내 예상과 이유를 비교해 보세요.':'한 번 실행하면 전체 흐름이 재생됩니다.';
    $('simQuickBtn').textContent=running?'⏸ 일시정지':paused?'▶ 이어서 보기':complete?$('simNext').textContent:'② 실행해서 확인하기';
  }
  function event(title, detail, kind) {
    $('eventTitle').textContent=present(title); $('eventDetail').textContent=present(detail);
    $('eventKind').textContent=present(kind||'관찰');
  }
  function neutral() {
    visual.dataset.reveal='idle';
    visual.querySelectorAll('.chosen,.selected,.best,.policy,.active,.reply,.pass,.data-on,.mgmt-on,.control-active').forEach(e => {
      e.classList.remove('chosen','selected','best','policy','active','reply','pass','data-on','mgmt-on','control-active');
    });
    visual.querySelectorAll('.token-text,.candidate-label').forEach(e=>e.textContent='');
  }
  function datasets() {
    const item=plan[step];
    Object.assign(root.dataset, {eventIndex:String(step),eventCount:String(plan.length),
      eventElapsedMs:String(Math.round(elapsed)),eventDurationMs:String(item?.duration||0),
      playbackMode:mode,modelStepIndex:String(item?.modelStepIndex??-1)});
  }
  function load(i,{reuse=true}={}) {
    stop(); current=i; selected=reuse&&records[i]?records[i].selected:null;
    step=-1; plan=[]; elapsed=0; mode='normal'; compared=false; recovered=false;
    adapter.reset(i); neutral(); const s=list[i];
    $('simMain').hidden=false; $('simSummary').hidden=true;
    $('simNumber').textContent=i+1; $('simTitle').textContent=lessonTitle(i);
    $('simText').textContent=present(lessonUI(i).brief || '학습 페이지의 조건과 그림을 떠올리며 이번 질문의 답을 예상해 보세요.');
    $('simConditions').replaceChildren(...s.conditions.map(t => {const e=document.createElement('span');e.textContent=present(t);return e;}));
    $('simQuestion').textContent=present(s.question); $('simPosition').textContent=''; $('simReview').open=false;
    event('관찰 대기','예상 답을 고른 뒤 실행하면 첫 장면부터 전체 흐름을 확인할 수 있습니다.','대기');
    setPhase(selected===null?'IDLE':'PREDICTED');
    $('simEvidence').replaceChildren();
    const provenance=document.createElement('p'); provenance.textContent='아래 기록은 기존 검증 당시의 원문입니다. 장비 표기는 위 학습 화면과 다를 수 있습니다.';
    $('simEvidence').append(provenance);
    for (const value of [s.description,...(s.evidence||[]),s.standard,s.scope].filter(Boolean)) {
      const p=document.createElement('p'); p.textContent=value; $('simEvidence').append(p);
    }
    const pairs=Object.entries(presentation.names||{});
    const note=$('simModelNotes');
    if(note)note.textContent=pairs.length?'학습 화면 명칭 대응: '+pairs.map(([a,b])=>`${a} → ${b}`).join(' · '):'';
    options(); progress(); resetHint(); controls(); presentDOM(); datasets();
  }
  function defaultDuration(item) {
    if(item.duration) return item.duration;
    if(/REQUEST|REPLY|FORWARD|PROBE|TTL|HOP|DATA|ARP|DHCP|DNS|TCP/i.test(item.kind||'')) return 420*3+180;
    return 1050+180;
  }
  function buildPlan() {
    const custom=adapter.buildPlan?.(current,mode);
    if(custom?.length) return custom.map(x=>({...x,duration:Math.max(180,Number(x.duration)||1050)}));
    const s=list[current];
    if(mode!=='normal') return [
      {title:mode==='compare'?'변경할 조건 확인':'복구할 조건 확인',detail:present(mode==='compare'?s.compare:s.recover||'기존 조건에서 복구 후의 변화를 비교합니다.'),kind:'조건',duration:1050,action:()=>{}},
      {title:mode==='compare'?'변경 조건 비교':'복구 조건 적용',detail:'같은 모델에서 변경된 상태를 관찰합니다.',kind:mode==='compare'?'비교':'복구',duration:1440,action:()=>{mode==='compare'?adapter.compare():adapter.recover();visual.dataset.reveal='all';}}
    ];
    if(s.steps) return s.steps.map((x,i)=>({title:x.title,detail:x.detail,kind:x.kind||x.label||'관찰',modelStepIndex:i,
      action:()=>{adapter.show(i);visual.dataset.reveal='events';},duration:defaultDuration(x)}));
    return [
      {title:'시작 조건 확인',detail:s.conditions.join(' · ')||s.description,kind:'조건',duration:1050,action:()=>{}},
      {title:'상태와 경로 관찰',detail:s.event||s.eventText||s.answer,kind:s.eventKind||'모델 관찰',duration:1440,action:()=>{adapter.show();visual.dataset.reveal='model';}},
      {title:'관찰 값 비교',detail:s.observed||s.answer,kind:'상태 확인',duration:1230,action:()=>{visual.dataset.reveal='all';}}
    ];
  }
  function animate(value) {
    const item=plan[step]; if(!item?.animate)return;
    // Reduced motion preserves event order and uses stationary endpoints.
    item.animate(reducedMotion.matches ? (value>=1?1:0) : Math.min(1,Math.max(0,value)));
  }
  function renderStep({review=false}={}) {
    const item=plan[step];
    item.action?.();
    if(mode==='normal'&&visual.dataset.reveal==='idle') visual.dataset.reveal='events';
    event(item.title,item.detail,item.kind);
    presentDOM(); animate(review?1:0);
    $('simPosition').textContent=`${step+1} / ${plan.length} 단계`;
    $('stepCount').textContent=`${step+1} / ${plan.length}`;
    controls(); datasets();
  }
  function complete() {
    stop(); elapsed=plan[step]?.duration||0; setPhase('COMPLETED');
    const s=list[current];
    if(mode==='compare') compared=true;
    else if(mode==='recover') recovered=true;
    else {
      if(!records[current]) records[current]={selected,correct:selected===s.correctKey};
      if(!firstRecords[current]) firstRecords[current]={...records[current]};
      adapter.finish?.();
    }
    const r=records[current]; visual.dataset.reveal='all';
    $('simVerdict').textContent=r.correct?'✓ 정답입니다':'✕ 예상과 달랐습니다';
    $('simVerdict').className=r.correct?'correct':'incorrect';
    $('simChosen').textContent='내 예상 · '+label(s,r.selected);
    $('simCorrect').textContent='실제 결과 · '+label(s,s.correctKey);
    $('simReason').textContent=present(s.reason);
    options(); progress(); controls(); presentDOM(); datasets();
  }
  function tick(token) {
    if(token!==generation||phase!=='RUNNING')return;
    const now=performance.now(), duration=plan[step].duration, total=elapsed+now-started;
    animate(total/duration);
    root.dataset.eventElapsedMs=String(Math.round(Math.min(duration,total)));
    if(total>=duration) {
      animate(1); step++;
      if(step>=plan.length){step=plan.length-1;complete();return;}
      elapsed=0; started=now; renderStep();
    }
    frame=requestAnimationFrame(()=>tick(token));
  }
  function start(which='normal') {
    if(which==='normal'&&!['PREDICTED','COMPLETED'].includes(phase))return;
    if(which!=='normal'&&phase!=='COMPLETED')return;
    stop(); mode=which;
    if(which==='normal'){adapter.reset(current);neutral();compared=false;recovered=false;}
    setPhase('RUNNING'); options(); plan=buildPlan(); step=0; elapsed=0; started=performance.now();
    renderStep(); const token=generation; frame=requestAnimationFrame(()=>tick(token)); controls();
  }
  function playback() {
    if(phase==='RUNNING') {
      elapsed=Math.min(plan[step].duration,elapsed+performance.now()-started);
      animate(elapsed/plan[step].duration); stop(); setPhase('PAUSED'); controls(); datasets();
    } else if(phase==='PAUSED') {
      setPhase('RUNNING'); started=performance.now(); const token=generation;
      frame=requestAnimationFrame(()=>tick(token)); controls();
    } else if(phase==='COMPLETED')start();
  }
  function review(target) {
    if(phase!=='COMPLETED'||target<0||target>=plan.length)return;
    adapter.reset(current); neutral();
    if(mode!=='normal') {
      const savedMode=mode; mode='normal'; const baseline=buildPlan(); mode=savedMode;
      for(const item of baseline){item.action?.();item.animate?.(1);}
      adapter.finish?.();
    }
    for(let i=0;i<target;i++){plan[i].action?.();plan[i].animate?.(1);}
    step=target; elapsed=plan[step].duration; renderStep({review:true});
  }
  function next() {if(phase!=='COMPLETED')return;current<list.length-1?load(current+1):summary();}
  function summary() {
    stop(); $('simMain').hidden=true; $('simSummary').hidden=false;
    const scores=scoreRecords(),count=scores.filter(Boolean).length,correct=scores.filter(r=>r?.correct).length;
    $('simSummaryScore').textContent=`${list.length}문제 중 관찰 ${count} · 정답 ${correct} · 오답 ${count-correct} · 미응답 ${list.length-count}`;
    $('simSummaryList').replaceChildren(...list.map((s,i)=>{
      const r=scores[i],a=document.createElement('article');a.className='sim-summary-card '+(!r?'pending':r.correct?'correct':'incorrect');
      const b=document.createElement('b');b.textContent=`${i+1}. ${present(s.question)}`;
      const p=document.createElement('p');p.textContent=!r?'미응답':r.correct?'✓ 정답':'✕ 오답';
      const bt=document.createElement('button');bt.className='soft-btn';bt.textContent=r?'이 문제 다시 보기':'문제 풀기';bt.onclick=()=>load(i);
      a.append(b,p,bt);return a;
    }));
    $('simWrong').disabled=!scores.some(r=>r&&!r.correct);controls();
  }
  $('simRun').onclick=()=>start(); $('simPlayback').onclick=playback;
  $('simReset').onclick=()=>{records[current]=null;load(current,{reuse:false});};
  $('simNext').onclick=next;
  $('simQuickBtn').onclick=()=>phase==='PREDICTED'?start():phase==='COMPLETED'?next():playback();
  $('simTabs').onclick=e=>{const b=e.target.closest('[data-lesson]');if(b)load(+b.dataset.lesson);};
  $('prevStepBtn').onclick=()=>review(step-1);
  $('nextStepBtn').onclick=()=>review(step+1);
  $('simCompare').onclick=()=>start('compare'); $('simRecover').onclick=()=>start('recover');
  $('simRestart').onclick=()=>{firstRecords=list.map(()=>null);records=list.map(()=>null);load(0);};
  $('simWrong').onclick=()=>{const i=scoreRecords().findIndex(r=>r&&!r.correct);if(i>=0)load(i);};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='RUNNING')playback();});
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',e=>{if(e.persisted){firstRecords=list.map(()=>null);records=list.map(()=>null);load(0);}});
  window.addEventListener('resize',()=>{if(step>=0)animate(phase==='RUNNING'?(elapsed+performance.now()-started)/plan[step].duration:elapsed/plan[step].duration);});
  window.networkLessonSource=Object.freeze(adapter.raw);
  window.networkLessonModel=Object.freeze(list);
  window.networkLessonPresentation=presentation;
  window.networkLessonPresent=present;
  load(0);
}};
