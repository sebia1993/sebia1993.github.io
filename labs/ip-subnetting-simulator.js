import {lessons,eventsFor,addressLesson,addressWindow,subnetInfo,parseIPv4} from './ip-subnetting-model.js';
const $=id=>document.getElementById(id);
// Values copied from the ARP reference: move() 420 + 180 ms;
// showRouteLookup() 1050 ms; CSS primaryActionReveal / event transition 180 ms.
const TEMPO=Object.freeze({segment:420,arrival:180,judgment:1050});
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let idx=0,custom=null,state='IDLE',step=-1,elapsed=0,frame=0,lastTime=0,generation=0,events=[];
let answers=lessons.map(()=>({choice:null,observed:false})),customAnswer={choice:null,observed:false};
const current=()=>custom||lessons[idx],answer=()=>custom?customAnswer:answers[idx];
const activePlayback=()=>state==='RUNNING'||state==='PAUSED';
const format=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
function cancel(){generation++;cancelAnimationFrame(frame);frame=0;lastTime=0;document.querySelectorAll('#ipLab .active,#ipLab .reply').forEach(e=>{if(e.closest('#modelObservation'))e.classList.remove('active','reply');});$('packetMarker').toggleAttribute('hidden',true);}
function setState(value){state=value;$('ipLab').dataset.state=value;$('modelObservation').dataset.flowState=value==='COMPLETED'?'complete':value.toLowerCase();renderControls();}
// Logical links keep the reference's waypoint count (PC↔SW1: 3, others: 2).
function hopDuration(a,b){return ((a==='pc1'||b==='pc1'||a==='pc3'||b==='pc3')?3:2)*TEMPO.segment+TEMPO.arrival;}
function motionDuration(motion){return motion.slice(1).reduce((sum,n,i)=>sum+hopDuration(motion[i],n),0);}
function duration(){const motion=events[step]?.motion||[];return motion.length>1?motionDuration(motion):current().type==='address'?TEMPO.judgment+3*TEMPO.segment+TEMPO.arrival:TEMPO.judgment;}
function renderControls(){
 const a=answer(),complete=state==='COMPLETED';
 $('runBtn').disabled=state!=='PREDICTED';$('runBtn').textContent='② 실행해서 확인하기';
 document.body.classList.toggle('prediction-selected',!!a.choice);
 $('primaryControls').hidden=activePlayback()||complete;
 $('playbackBtn').hidden=!activePlayback()&&!complete;
 $('playbackBtn').textContent=state==='RUNNING'?'⏸ 일시정지':state==='PAUSED'?'▶ 이어서 보기':'↻ 흐름 다시 보기';
 $('nextBtn').disabled=!complete;$('nextBtn').textContent=custom?'기본 문제로 돌아가기':idx===lessons.length-1?'전체 학습 결과 보기':'다음 실습 →';
 $('resultArea').hidden=!complete;$('reviewPanel').hidden=!complete;
 $('maskPanel').hidden=!complete||current().type!=='network'||current().dst!=='10.77.10.140';
 $('playbackStatus').textContent=activePlayback()?`${state==='PAUSED'?'일시정지':'관찰 중'} · ${step+1} / ${events.length}`:complete?'관찰 완료 · 다시 보기는 점수를 바꾸지 않습니다.':'';
 const show=!!a.choice&&!activePlayback();$('quickNextBar').hidden=!show;document.body.classList.toggle('quick-next-visible',show);
 $('quickNextLabel').textContent=complete?'현재 실습 완료':'예상 선택 완료';
 $('quickNextCopy').textContent=complete?'예상과 관찰을 비교했습니다. 다음 문제로 이동하세요.':'스크롤하지 않고 여기서 바로 관찰을 시작할 수 있습니다.';
 $('quickNextBtn').textContent=complete?$('nextBtn').textContent:'② 실행해서 확인하기';
 $('prevEvent').disabled=step<=0;$('nextEvent').disabled=step>=events.length-1;$('reviewPosition').textContent=`${step+1} / ${events.length}`;
}
function renderProgress(){
 const done=answers.filter(a=>a.observed).length,correct=answers.filter((a,i)=>a.observed&&a.choice===lessons[i].answer).length;
 $('courseCount').textContent=`${done} / ${lessons.length} 완료`;$('courseBar').style.width=100*done/lessons.length+'%';
 $('scoreText').textContent=`정답 ${correct} · 다시 볼 문제 ${done-correct} · 남은 문제 ${lessons.length-done}`;
 document.querySelectorAll('[data-lesson]').forEach((b,i)=>{b.classList.toggle('active',!custom&&i===idx);b.classList.toggle('completed',answers[i].observed);b.setAttribute('aria-current',!custom&&i===idx?'step':'false');});
}
function renderChoices(){
 const a=answer(),l=current();$('predictionOptions').replaceChildren();
 l.choices.forEach(([id,label])=>{
  const b=document.createElement('button');b.type='button';b.dataset.prediction=id;b.textContent=label;b.setAttribute('aria-pressed',String(a.choice===id));b.classList.toggle('selected',a.choice===id);
  b.disabled=activePlayback()||a.observed;
  if(state==='COMPLETED'){if(id===l.answer)b.classList.add('correct');else if(id===a.choice)b.classList.add('incorrect');}
  b.addEventListener('click',()=>{if(activePlayback()||answer().observed)return;answer().choice=id;setState('PREDICTED');renderChoices();});$('predictionOptions').append(b);
 });
}
function result(){
 const l=current(),a=answer(),correct=a.choice===l.answer;
 $('predictionFeedback').className='prediction-feedback '+(correct?'correct':'incorrect');
 $('verdictTitle').textContent=correct?'✓ 정답입니다':'✕ 예상과 결과가 달랐습니다';
 $('chosenAnswer').textContent='내 예상: '+(l.choices.find(c=>c[0]===a.choice)?.[1]||'—');
 $('correctAnswer').textContent='실제 정답: '+l.choices.find(c=>c[0]===l.answer)[1];$('reasonText').textContent=l.explain;
}
function resetView(){
 cancel();step=-1;elapsed=0;events=eventsFor(current());
 $('hintBox').classList.remove('show');$('hintBox').textContent='';$('reviewPanel').open=false;$('maskPanel').open=false;$('courseComplete').hidden=true;
 $('networkSurface').hidden=current().type!=='network';$('addressSurface').hidden=current().type!=='address';
 const l=current();$('coachIcon').textContent=custom?'＋':idx+1;$('coachTitle').textContent=custom?'내 주소로 관찰하기':l.type==='address'?l.label:l.title;
 $('coachText').textContent=l.type==='address'?'주소 하나가 속한 범위를 찾습니다. 시작과 끝이 무엇인지 관찰해 보세요.':`PC1 ${l.src}/${l.prefix} → ${l.dstNode} ${l.dst}. 주소와 실제 연결 위치를 함께 봅니다.`;
 $('predictionTitle').textContent=l.title;$('evidenceText').textContent=l.evidence||'주소 범위 계산은 실제 패킷 통신과 별개입니다. 주소를 사용할 수 있는지는 실제 환경의 예약·정책도 확인해야 합니다.';
 $('liveEventStrip').className='live-event-strip';$('liveEventIcon').textContent='●';$('liveEventTitle').textContent='관찰 대기';$('liveEventDetail').textContent='예상 답을 고른 뒤 실행하면 경계부터 순서대로 표시됩니다.';$('liveEventKind').textContent='대기';
 setState(answer().observed?'COMPLETED':answer().choice?'PREDICTED':'IDLE');
 if(l.type==='address')renderAddress();else{$('pc1Address').textContent=l.src+'/'+l.prefix;$('networkComparison').textContent='각 PC의 IP 주소는 그대로 두고, PC1의 경계 규칙으로 비교합니다.';drawNetwork();}
 if(answer().observed){step=events.length-1;renderEvent();result();}
 renderChoices();renderProgress();renderControls();
}
function goTo(i){cancel();custom=null;idx=i;resetView();}
function resetCurrent(){cancel();if(custom)customAnswer={choice:null,observed:false};else answers[idx]={choice:null,observed:false};resetView();}
function renderAddress(){
 const l=current(),w=addressWindow(l.ip,l.prefix),info=w.info;
 $('targetIp').textContent=l.ip;$('prefixBadge').textContent='/'+l.prefix+' · Prefix Length';
 $('spaceScope').textContent=w.parent+'/'+w.parentPrefix+(w.total>4?` · ${w.first+1}–${w.first+w.blocks.length}번째 범위 확대`:'');
 $('boundaryVisual').classList.toggle('revealed',step>=1);
 $('networkBits').textContent=step>=1?`Network · ${l.prefix}비트`:'Network 부분';$('hostBits').textContent=step>=1?`Host · ${32-l.prefix}비트`:'Host 부분';
 $('boundaryVisual').replaceChildren(...Array.from({length:32},(_,j)=>{const bit=document.createElement('span');bit.className=step<1?'bit-idle':j<l.prefix?'bit-network':'bit-host';bit.setAttribute('aria-hidden','true');return bit;}));
 $('blockSize').textContent=step>=2?`한 Subnet = ${w.size.toLocaleString('ko-KR')}개 주소`:'';
 $('spaceTitle').textContent=step>=2?'주소 범위 · 왼쪽에서 오른쪽으로 증가':'주소 범위 · 실행하면 경계가 나타납니다.';
 $('addressTrack').replaceChildren();
 const blocks=step>=2?w.blocks:[{network:w.blocks[0].network,last:w.blocks.at(-1).last}];
 blocks.forEach(b=>{const el=document.createElement('div');el.className='address-block';el.dataset.network=b.network;el.classList.toggle('active',step>=3&&b.active);const title=document.createElement('b'),range=document.createElement('small');const compact=w.parentPrefix>=24;
  title.textContent=compact?'.'+b.network.split('.').at(-1):b.network;range.textContent='~ '+(compact?'.'+b.last.split('.').at(-1):b.last);el.append(title,range);if(step>=3&&b.active){el.setAttribute('aria-label',`현재 Subnet ${b.network}/${l.prefix}`);} $('addressTrack').append(el);});
 $('targetLocator').textContent=step>=3?`▲ ${l.ip} · 강조된 범위에 포함`:step>=2?'이제 IP가 속한 범위를 찾습니다.':'경계가 나뉘기 전의 주소 공간';
 $('networkOut').textContent=step>=4?info.network+'/'+l.prefix:'—';$('broadcastOut').textContent=step>=5?info.broadcast||'없음 · /'+l.prefix:'—';$('hostsOut').textContent=step>=6?`${info.firstHost} ~ ${info.lastHost} · ${info.hostCount.toLocaleString('ko-KR')}개`:'—';
 document.querySelectorAll('#rangeReadout .kv').forEach((e,i)=>e.classList.toggle('current',step===i+4));
}
const links=[['pc1','sw1'],['pc3','sw1'],['sw1','r1'],['r1','sw2'],['sw2','pc2']];
function point(id){const canvas=$('networkCanvas').getBoundingClientRect(),r=document.querySelector(`[data-node="${id}"] svg`).getBoundingClientRect();return {x:r.left-canvas.left+r.width/2,y:r.top-canvas.top+r.height/2};}
const svgEl=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
function path(a,b){const A=point(a),B=point(b);return `M${A.x} ${A.y} L${B.x} ${B.y}`;}
function drawNetwork(){
 if($('networkSurface').hidden)return;
 $('idleLinks').replaceChildren(...links.map(([a,b])=>svgEl('path',{d:path(a,b),class:'idle-link'})));
 renderNetworkMotion();
}
function renderNetworkMotion(){
 $('activeLinks').replaceChildren();$('packetMarker').toggleAttribute('hidden',true);
 document.querySelectorAll('[data-node]').forEach(e=>e.classList.remove('active','reply'));
 const e=events[step];if(!e)return;
 const motion=e.motion||[],hops=motion.length-1,reply=e.tone==='reply';
 let traveled=state==='COMPLETED'?hops:0,remaining=elapsed;
 if(state!=='COMPLETED'){for(let j=0;j<hops;j++){const ms=hopDuration(motion[j],motion[j+1]);if(remaining>=ms){traveled=j+1;remaining-=ms;}else{traveled=j+Math.min(1,remaining/Math.max(1,ms-TEMPO.arrival));break;}}}
 if(hops>0){
  for(let i=0;i<hops;i++)if(traveled>=i){
   const a=point(motion[i]),b=point(motion[i+1]),fraction=Math.min(1,traveled-i);
   $('activeLinks').append(svgEl('path',{d:`M${a.x} ${a.y} L${a.x+(b.x-a.x)*fraction} ${a.y+(b.y-a.y)*fraction}`,class:'event-link'+(reply?' reply':'')}));
  }
  if(!reduced.matches&&state!=='COMPLETED'){
   const j=Math.min(hops-1,Math.floor(traveled)),t=Math.min(1,traveled-j),a=point(motion[j]),b=point(motion[j+1]);
   $('packetMarker').setAttribute('cx',a.x+(b.x-a.x)*t);$('packetMarker').setAttribute('cy',a.y+(b.y-a.y)*t);$('packetMarker').setAttribute('fill',reply?'#2f7fd0':'#0ea77d');$('packetMarker').toggleAttribute('hidden',false);
  }
  const id=motion[Math.min(hops,Math.floor(traveled))];document.querySelector(`[data-node="${id}"]`).classList.add(reply?'reply':'active');
 }else (e.focus||[]).forEach(id=>document.querySelector(`[data-node="${id}"]`)?.classList.add('active'));
}
function renderEvent(){
 const e=events[step];if(!e)return;
 $('liveEventStrip').className='live-event-strip '+e.tone;$('liveEventIcon').textContent=String(step+1).padStart(2,'0');
 $('liveEventTitle').textContent=`단계 ${String(step+1).padStart(2,'0')} · ${e.title}`;$('liveEventDetail').textContent=e.text;$('liveEventKind').textContent=e.kind;
 if(current().type==='address')renderAddress();else{
  const o=e.observation;$('networkComparison').textContent=`PC1 기준 /${current().prefix}: ${o.sourceNetwork} ${o.onLink?'＝':'≠'} ${o.destinationNetwork}`;
  renderNetworkMotion();
 }
 renderControls();
}
function complete(){
 cancelAnimationFrame(frame);frame=0;answer().observed=true;setState('COMPLETED');renderEvent();result();renderChoices();renderProgress();
 $('resultArea').scrollIntoView({block:'center',behavior:'instant'});
}
function tick(now,token){
 if(token!==generation||state!=='RUNNING')return;
 if(lastTime)elapsed+=now-lastTime;lastTime=now;
 if(current().type==='network')renderNetworkMotion();
 if(elapsed>=duration()){
  if(step===events.length-1){complete();return;}
  step++;elapsed=0;renderEvent();
 }
 frame=requestAnimationFrame(t=>tick(t,token));
}
function run(){
 if(state!=='PREDICTED')return;
 cancel();events=eventsFor(current());step=0;elapsed=0;setState('RUNNING');renderChoices();renderEvent();const token=generation;frame=requestAnimationFrame(t=>tick(t,token));
 // A single deliberate reveal at Run; no event-by-event scrolling.
 $('modelObservation').scrollIntoView({block:'start',behavior:'instant'});
}
function playback(){
 if(state==='RUNNING'){cancelAnimationFrame(frame);frame=0;lastTime=0;setState('PAUSED');}
 else if(state==='PAUSED'){setState('RUNNING');lastTime=0;const token=generation;frame=requestAnimationFrame(t=>tick(t,token));}
 else if(state==='COMPLETED'){cancel();step=0;elapsed=0;setState('RUNNING');renderChoices();renderEvent();const token=generation;frame=requestAnimationFrame(t=>tick(t,token));}
}
function summary(){
 cancel();$('courseComplete').hidden=false;$('completionScore').textContent=$('scoreText').textContent;$('summaryList').replaceChildren();
 lessons.forEach((l,i)=>{const a=answers[i],correct=a.choice===l.answer,el=document.createElement('div');el.className='summary-item '+(correct?'correct':'incorrect');const b=document.createElement('b');b.textContent=`${i+1} · ${l.label.replace(/^\d · /,'')}`;const s=document.createElement('span');s.textContent=a.observed?(correct?'✓ 정답':'✕ 오답 · 다시 보기'):'미응답';const btn=document.createElement('button');btn.className='soft-btn';btn.textContent='답과 이유 다시 보기';btn.onclick=()=>{goTo(i);$('predictionTitle').focus();};el.append(b,s,btn);$('summaryList').append(el);});
 $('courseComplete').scrollIntoView({block:'start',behavior:'instant'});
}
function next(){if(state!=='COMPLETED')return;if(custom)goTo(idx);else if(idx<lessons.length-1){goTo(idx+1);$('predictionTitle').focus();}else summary();}
function readInput(){const ip=$('ipInput').value.trim(),text=$('prefixInput').value.trim();parseIPv4(ip);if(!/^(0|[1-9]\d?)$/.test(text))throw new Error('Prefix Length는 0~32의 정수로 입력하세요.');return {ip,prefix:Number(text),info:subnetInfo(ip,Number(text))};}
function calculate(){
 $('calculatorResult').replaceChildren();$('calculatorMessage').classList.remove('error');
 try{const {info}=readInput();['network','mask','broadcast','firstHost','lastHost','hostCount'].forEach((key,i)=>{const box=document.createElement('div');box.className='kv';const label=document.createElement('label');label.textContent=['Network','Subnet Mask','Broadcast','First Host','Last Host','Host Count'][i];const val=document.createElement('div');val.dataset.field=key;val.textContent=info[key]??'없음';box.append(label,val);$('calculatorResult').append(box);});$('calculatorMessage').textContent=info.description;return true;}
 catch(e){$('calculatorMessage').textContent=e.message;$('calculatorMessage').classList.add('error');return false;}
}
function customPractice(){if(!calculate())return;const {ip,prefix}=readInput();cancel();custom=addressLesson(ip,prefix);customAnswer={choice:null,observed:false};resetView();$('calculatorResult').replaceChildren();$('calculatorMessage').textContent='아래 계산 결과는 관찰과 별도로 다시 계산할 수 있습니다.';$('calculatorPanel').open=false;$('predictionTitle').focus();}
lessons.forEach((l,i)=>{const b=document.createElement('button');b.className='lesson-tab';b.dataset.lesson=i;b.textContent=`${i+1} · ${l.label.replace(/^\d · /,'')}`;b.onclick=()=>goTo(i);$('lessonTabs').append(b);});
$('runBtn').onclick=run;$('playbackBtn').onclick=playback;$('resetBtn').onclick=resetCurrent;$('nextBtn').onclick=next;$('quickNextBtn').onclick=()=>state==='COMPLETED'?next():run();
$('prevEvent').onclick=()=>{if(state==='COMPLETED'&&step>0){step--;renderEvent();}};$('nextEvent').onclick=()=>{if(state==='COMPLETED'&&step<events.length-1){step++;renderEvent();}};
$('hintBtn').onclick=()=>{$('hintBox').classList.toggle('show');$('hintBox').textContent=current().type==='address'?'주소 범위는 같은 크기로 나뉩니다. 내 IP가 시작과 끝 사이에 들어가는 범위를 찾아보세요.':'PC1이 자신의 경계 규칙으로 계산한 두 Network가 같은지 먼저 비교하세요.';};
$('reviewWrongBtn').onclick=()=>{const i=answers.findIndex((a,i)=>a.observed&&a.choice!==lessons[i].answer);goTo(i<0?0:i);$('predictionTitle').focus();};
function restart(){cancel();answers=lessons.map(()=>({choice:null,observed:false}));custom=null;idx=0;resetView();}
$('restartBtn').onclick=restart;
$('calculatorForm').onsubmit=e=>{e.preventDefault();calculate();};$('practiceInputBtn').onclick=customPractice;
$('randomBtn').onclick=()=>{const prefixes=[8,16,24,25,26,27,28,29,30];$('ipInput').value=`10.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)}`;$('prefixInput').value=prefixes[Math.floor(Math.random()*prefixes.length)];customPractice();};
['ipInput','prefixInput'].forEach(id=>$(id).addEventListener('input',()=>{$('calculatorResult').replaceChildren();$('calculatorMessage').textContent='값이 바뀌었습니다. 계산 또는 예상·관찰을 다시 실행하세요.';if(custom){cancel();custom=null;resetView();}}));
for(const b of document.querySelectorAll('[data-mask]'))b.onclick=()=>{const prefix=Number(b.dataset.mask),l=current(),a=subnetInfo(l.src,prefix),d=subnetInfo(l.dst,prefix);$('maskResult').textContent=`/${prefix}: ${a.network} ${a.network===d.network?'＝':'≠'} ${d.network} → ${a.network===d.network?'같은 네트워크로 판단 · 목적지를 직접 찾음':'다른 네트워크 · Gateway(.1) 이용'}`;};
for(const b of document.querySelectorAll('[data-view-mode]'))b.onclick=()=>{const mode=b.dataset.viewMode;document.body.dataset.simMode=mode;document.querySelectorAll('[data-view-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});$('viewModeSummary').textContent=mode==='basic'?'기본 모드 · 주소가 속한 범위를 찾는 핵심 흐름에 집중합니다.':'고급 모드 · 아래 보조 도구에서 IP와 CIDR을 자유롭게 계산하고 관찰할 수 있습니다.';};
new ResizeObserver(drawNetwork).observe($('networkCanvas'));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='RUNNING')playback();});
window.addEventListener('pagehide',cancel);window.addEventListener('pageshow',e=>{if(e.persisted)restart();});
try{localStorage.removeItem('network-learning:ip-subnetting:answers:v1');}catch{}
resetView();
