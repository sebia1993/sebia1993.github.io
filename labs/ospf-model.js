// Existing lesson data and topic renderer retained from ospf-simulator; playback is shared.
(()=>{
const lessons=[
  {
    claim:"OSPF-01",title:"Neighbor는 언제 FULL이 될까?",
    text:"세 Transit Link가 Area 0, point-to-point, 동일 Hello/Dead 조건인 Baseline입니다.",
    states:["R1-R2 · Area 0","R2-R3 · Area 0","R1-R3 · Area 0","Hello 10s · Dead 40s"],
    question:"정상 Baseline에서 R1-R2 Neighbor 상태는?",
    options:["FULL","EXSTART","Neighbor 없음"],correct:0,
    actual:"FULL · 양쪽 모두",reason:"같은 Area 0과 호환 조건에서 세 직접 Neighbor가 모두 FULL로 검증됐습니다.",
    mode:"neighbor",completeOnRecover:false,
    evidence:["R1-R2 / R2-R3 / R1-R3 모두 FULL","CP12 양쪽 Hello Area ID 0.0.0.0","Hello 10초 / Dead 40초","Network Type POINT_TO_POINT"]
  },
  {
    claim:"OSPF-02",title:"FULL 뒤에 무엇을 공유할까?",
    text:"세 Router가 Area 0에서 FULL인 상태에서 Router-LSA identity를 비교합니다.",
    states:["R1 RID 1.1.1.1","R2 RID 2.2.2.2","R3 RID 3.3.3.3"],
    question:"R1의 Area 0 Router-LSA 목록에는 무엇이 보여야 할까요?",
    options:["R1·R2·R3 세 Router ID","R1 자기 Router ID만","현재 선택 경로의 R1·R2만"],correct:0,
    actual:"1.1.1.1 · 2.2.2.2 · 3.3.3.3",reason:"세 Router의 Router-LSA identity/sequence/checksum/link count가 Area 0에서 일치했습니다.",
    mode:"lsdb",completeOnRecover:false,
    evidence:["R1/R2/R3 Router-LSA set 일치","R1이 3.3.3.3/32를 OSPF로 학습","Process 1 · Area 0"]
  },
  {
    claim:"OSPF-03",title:"Cost 21과 51 중 어떤 길을 고를까?",
    text:"R1에서 R3 Loopback까지 R2 경유와 직접 경로가 모두 존재합니다.",
    states:["R1-R2 Cost 10","R2-R3 Cost 10","R1-R3 Cost 50","R3 Lo0 Cost 1"],
    question:"R1이 3.3.3.3/32로 선택할 경로는?",
    options:["R1→R2→R3 · Cost 21","R1→R3 · Cost 51","두 경로를 ECMP로 사용"],correct:0,
    actual:"R1→R2→R3 · Next Hop 10.0.12.2 · Metric 21",reason:"OSPF는 누적 Cost가 낮은 경로를 선택했고 실제 Ping 3회도 CP12/CP23에만 대응했습니다.",
    mode:"cost",completeOnRecover:false,
    evidence:["R1 route metric 21 · next-hop 10.0.12.2","CP12/CP23 request+reply 각 3쌍","CP13 해당 흐름 0","21 = 10 + 10 + Loopback 1"]
  },
  {
    claim:"OSPF-04",title:"Area가 다르면 Neighbor는?",
    text:"R1-R2 링크에서 R1만 Area 1, R2는 Area 0인 상태입니다. 다른 두 Link는 Area 0 그대로입니다.",
    states:["R1 E0/0 · Area 1","R2 E0/0 · Area 0","CP13 / CP23 정상"],
    question:"안정화 후 R1-R2 Adjacency는 어떻게 될까요?",
    options:["FULL 유지","양쪽 Neighbor Table에서 사라짐","EXSTART로 고정"],correct:1,
    actual:"R1-R2 Neighbor 없음 · CP13/CP23 FULL 유지",reason:"CP12 Hello에서 Area 1과 Area 0이 실제로 관측됐고 안정화 후 양쪽 Neighbor Table에서 상대가 사라졌습니다.",
    mode:"area",completeOnRecover:true,
    evidence:["CP12 Hello Area ID 0.0.0.1 / 0.0.0.0","R1-R2 Neighbor absent at both ends","R1-R3 / R2-R3 FULL 유지","장애 중 Ping 3/3은 CP13 사용"]
  },
  {
    claim:"OSPF-05",title:"MTU가 다르면 DBD 교환은?",
    text:"R1-R2에서 R1 IP MTU 1400, R2 IP MTU 1500으로 만들고 해당 Link만 재협상했습니다.",
    states:["R1 IP MTU 1400","R2 IP MTU 1500","MTU-ignore 미사용"],
    question:"이번 Cisco IOL에서 R1-R2 Neighbor는 어디에 머물렀을까요?",
    options:["FULL","EXSTART","Neighbor 없음"],correct:1,
    actual:"양쪽 EXSTART · FULL 미도달",reason:"CP12 DBD에 1400/1500이 광고됐고 반복 Sequence와 양쪽 EXSTART 상태를 함께 확인했습니다.",
    mode:"mtu",completeOnRecover:true,
    evidence:["R1/R2 Neighbor 모두 EXSTART","CP12 DBD Interface MTU 1400 / 1500","DBD Sequence 반복 관측","1500/1500 복구 후 FULL"]
  },
  {
    claim:"OSPF-06",title:"선호 Link가 끊기면 어느 경로로 수렴할까?",
    text:"정상 Cost 21 경로의 R1-R2 Link를 내린 상태입니다.",
    states:["Baseline: via R2 · Cost 21","R1-R2 Link Down","R1-R3 Direct 살아 있음"],
    question:"R1의 3.3.3.3/32 Route는 어떻게 바뀔까요?",
    options:["Route가 완전히 사라진다","Direct R3 · Next Hop 10.0.13.2 · Cost 51","기존 R2 경로를 계속 사용"],correct:1,
    actual:"R1→R3 · Next Hop 10.0.13.2 · Metric 51",reason:"R1 Router-LSA가 바뀐 뒤 남은 Direct R3 경로가 선택됐고 CP13에서 Ping 3/3이 확인됐습니다.",
    mode:"link",completeOnRecover:true,
    evidence:["R1-R2 Neighbor 제거","R1 Router-LSA에서 해당 연결 제거 관측","R1 route metric 51 · next-hop 10.0.13.2","CP13 Ping 3/3","복구 후 FULL / metric 21 / CP12→CP23"]
  }
];


const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function basePanels(){
  $("neighborPanel").innerHTML=[
    ["CP12","FULL"],["CP23","FULL"],["CP13","FULL"],["Hello / Dead","10 / 40s"]
  ].map(([a,b])=>`<span>${a}</span><strong>${b}</strong>`).join("");
  $("lsdbPanel").innerHTML=["1.1.1.1","2.2.2.2","3.3.3.3"].map(x=>`<div class="lsa">${x}</div>`).join("");
  $("routePanel").innerHTML="<strong>Metric 21 · via 10.0.12.2</strong>R1 → R2 → R3";
}
function resetTopology(){
  $("link12").setAttribute("class","net-link full");$("link23").setAttribute("class","net-link full");$("link13").setAttribute("class","net-link backup");
  ["r1","r2","r3"].forEach(id=>$(id).className="node "+id);
  ["adj12","adj23","adj13"].forEach(id=>{$(id).className="adj-badge "+({adj12:"a12",adj23:"a23",adj13:"a13"}[id]);$(id).textContent="FULL";});
  $("stop12").style.display="none";$("areaBadge").textContent="AREA 0 · POINT-TO-POINT";$("badge12").textContent="CP12 · Cost 10";
  $("eventKind").textContent="IDLE";$("eventText").textContent="예상을 선택한 뒤 실행하면 현재 OSPF Event와 경로를 보여줍니다.";
  basePanels();
  $("scopeNote").innerHTML="<b>학습 모델:</b> Animation 속도는 실제 수렴 시간을 뜻하지 않습니다.";
}
function applyMode(l){
  if(l.mode==="neighbor"){
    $("link12").setAttribute("class","net-link control");$("link23").setAttribute("class","net-link control");$("link13").setAttribute("class","net-link control");
    ["r1","r2","r3"].forEach(id=>$(id).classList.add("control-active"));$("eventKind").textContent="HELLO / FULL";$("eventText").textContent="세 Point-to-Point Link에서 Hello 조건이 맞고 직접 Neighbor가 모두 FULL입니다.";
  }else if(l.mode==="lsdb"){
    $("link12").setAttribute("class","net-link control");$("link23").setAttribute("class","net-link control");$("link13").setAttribute("class","net-link control");
    ["r1","r2","r3"].forEach(id=>$(id).classList.add("control-active"));$("lsdbPanel").querySelectorAll(".lsa").forEach(x=>x.classList.add("active"));
    $("eventKind").textContent="LSA / LSDB";$("eventText").textContent="Area 0의 세 Router-LSA가 R1·R2·R3에서 같은 identity set로 확인됩니다.";
  }else if(l.mode==="cost"){
    $("link12").setAttribute("class","net-link selected");$("link23").setAttribute("class","net-link selected");$("link13").setAttribute("class","net-link backup");
    ["r1","r2","r3"].forEach(id=>$(id).classList.add("active"));$("routePanel").innerHTML="<strong>Metric 21 · via 10.0.12.2</strong>R1 → R2 → R3 · CP12 → CP23";
    $("eventKind").textContent="SPF / COST";$("eventText").textContent="Cost 21 경로가 Cost 51 Direct 경로보다 낮아서 R2를 Next Hop으로 선택합니다.";
  }else if(l.mode==="area"){
    if(recovered){showRecovery("AREA RECOVERY","Area 0으로 원복 후 CP12 Neighbor FULL과 Cost 21 경로가 복구됩니다.");return;}
    $("areaBadge").textContent="CP12: AREA 1 ↔ AREA 0";$("link12").setAttribute("class","net-link failure");$("adj12").classList.add("bad");$("adj12").textContent="NO NEIGHBOR";$("stop12").style.display="block";
    $("link13").setAttribute("class","net-link selected");$("r1").classList.add("warning");$("r2").classList.add("failure");$("r3").classList.add("active");
    $("neighborPanel").innerHTML=[["CP12","Absent"],["CP23","FULL"],["CP13","FULL"],["Hello Area","1 ↔ 0"]].map(([a,b])=>`<span>${a}</span><strong>${b}</strong>`).join("");
    $("routePanel").innerHTML="<strong>Backup path active</strong>R1 → R3 · CP13 · Ping 3/3";
    $("eventKind").textContent="AREA MISMATCH";$("eventText").textContent="CP12에서 Area-ID 검사가 맞지 않아 Adjacency가 형성되지 않고 데이터는 CP13으로 우회합니다.";
  }else if(l.mode==="mtu"){
    if(recovered){showRecovery("MTU RECOVERY","1500/1500으로 복원 후 CP12 Neighbor FULL과 Cost 21 경로가 복구됩니다.");return;}
    $("badge12").textContent="CP12 · IP MTU 1400 ↔ 1500";$("link12").setAttribute("class","net-link warning");$("adj12").classList.add("warn");$("adj12").textContent="EXSTART";$("stop12").style.display="block";
    $("link13").setAttribute("class","net-link selected");$("r1").classList.add("warning");$("r2").classList.add("warning");$("r3").classList.add("active");
    $("neighborPanel").innerHTML=[["R1→R2","EXSTART"],["R2→R1","EXSTART"],["DBD MTU","1400 / 1500"],["CP13","FULL"]].map(([a,b])=>`<span>${a}</span><strong>${b}</strong>`).join("");
    $("routePanel").innerHTML="<strong>Backup path active</strong>R1 → R3 · CP13 · Ping 3/3";
    $("eventKind").textContent="DBD / MTU";$("eventText").textContent="DBD Interface MTU가 달라 CP12 Adjacency가 FULL로 진행하지 못하고 양쪽 EXSTART가 반복됩니다.";
    $("scopeNote").innerHTML="<b>원인 한정:</b> EXSTART는 여러 원인이 가능하지만, 이번 Run은 MTU 설정과 DBD 1400/1500을 함께 확인했습니다.";
  }else if(l.mode==="link"){
    if(recovered){showRecovery("LINK RECOVERY","R1-R2가 돌아오고 FULL 복구 후 더 낮은 Cost 21 경로로 다시 수렴합니다.");return;}
    $("link12").setAttribute("class","net-link failure");$("adj12").classList.add("bad");$("adj12").textContent="DOWN";$("link13").setAttribute("class","net-link selected");
    $("r1").classList.add("warning");$("r3").classList.add("active");$("neighborPanel").innerHTML=[["CP12","Neighbor 없음"],["CP23","FULL"],["CP13","FULL"],["Route Metric","51"]].map(([a,b])=>`<span>${a}</span><strong>${b}</strong>`).join("");
    $("routePanel").innerHTML="<strong>Metric 51 · via 10.0.13.2</strong>R1 → R3 · CP13";
    $("eventKind").textContent="CONVERGENCE";$("eventText").textContent="선호 Link가 사라져 R1 Router-LSA와 SPF 결과가 바뀌고 Direct R3 경로로 수렴합니다.";
  }
}
function showRecovery(kind,text){
  resetTopology();$("link12").setAttribute("class","net-link recovery");$("link23").setAttribute("class","net-link recovery");$("link13").setAttribute("class","net-link backup");["r1","r2","r3"].forEach(id=>$(id).classList.add("active"));
  $("eventKind").textContent=kind;$("eventText").textContent=text;$("routePanel").innerHTML="<strong>Metric 21 · via 10.0.12.2</strong>R1 → R2 → R3 · Baseline restored";
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetTopology();},show(){resetTopology();applyMode(lessons[index]);},recover:()=>{recovered=true;resetTopology();applyMode(lessons[index])},compare:null};
adapter.presentation={names:{R1:'Router A',R2:'Router B',R3:'Router C'},labels:{'Source':'출발지','Preferred Transit':'선호 경유 장비','Destination':'목적지','ADJACENCY STOP':'Adjacency 중단','Baseline':'기준 상태','Backup path active':'대체 경로 사용','Baseline restored':'기준 경로 복구','Animation':'재생','CONVERGENCE':'재수렴','AREA MISMATCH':'Area 불일치','AREA RECOVERY':'Area 복구','MTU RECOVERY':'MTU 복구','LINK RECOVERY':'링크 복구','NO NEIGHBOR':'Neighbor 없음','Absent':'없음','Direct':'직접','identity set':'식별자 집합','Run':'실행','Scope':'학습 범위'},lessons:[
 {title:'Hello 조건이 맞으면 Neighbor는 어디까지 진행할까요?',brief:'학습 페이지의 이웃 → 정보 공유 흐름입니다. Area·Hello/Dead 조건과 실제 FULL 상태를 구분해 확인합니다.',hints:['같은 링크 양쪽의 OSPF 조건을 비교하세요.','FULL은 연결 정보 동기화가 완료된 관계입니다.','FULL인 모든 링크가 데이터 경로로 선택되는 것은 아닙니다.']},
 {title:'Router A의 LSDB에는 어떤 Router-LSA가 있을까요?',brief:'같은 Area 0의 Router A·B·C가 공유하는 연결 지도를 관찰합니다. Router-LSA 식별자를 하나씩 확인하세요.',hints:['LSDB는 현재 선택한 데이터 경로만 기록하는 표가 아닙니다.','같은 Area의 Router-LSA 정보를 공유합니다.','Router ID와 각 장비의 연결 정보가 대응합니다.']},
 {title:'직접 연결 Cost 51과 경유 Cost 21 중 무엇을 고를까요?',brief:'학습 페이지의 21과 51을 같은 조건으로 비교합니다. 목적지 Loopback의 Cost 1도 포함하세요.',hints:['물리적으로 가까운 경로가 항상 낮은 Cost는 아닙니다.','경유 경로는 10 + 10 + 1입니다.','직접 경로는 50 + 1입니다.']},
 {title:'한 링크의 Area가 다르면 어떤 관계가 끊길까요?',brief:'Router A–B 링크만 Area 1과 Area 0으로 다릅니다. 나머지 Area 0 연결과 대체 데이터 경로를 함께 관찰합니다.',hints:['모든 링크가 아니라 CP12만 변경했습니다.','양쪽 Hello의 Area ID를 비교하세요.','Neighbor 관계와 목적지까지 남은 경로를 나눠 확인하세요.']},
 {title:'MTU가 다르면 DBD 교환은 어디서 멈출까요?',brief:'CP12의 IP MTU 1400과 1500을 비교합니다. 이번 Cisco IOL 검증에서 확인한 상태와 원인을 연결합니다.',hints:['이번 문제는 MTU-ignore를 사용하지 않습니다.','Hello 수신과 DBD 교환 성공은 다른 단계입니다.','EXSTART만으로 원인을 단정하지 않고 DBD의 MTU도 확인합니다.']},
 {title:'선호 링크가 끊기면 어떤 지도로 다시 계산할까요?',brief:'Router A–B 장애 후 Neighbor, Router-LSA, SPF 결과가 바뀌는 순서를 따라갑니다.',hints:['직접 Router A–C 연결은 살아 있습니다.','LSA에 남은 연결을 기준으로 다시 계산합니다.','선호 경로가 사라진 뒤 사용 가능한 경로의 Cost를 확인하세요.']}
]};
const ospfStage=document.querySelector('#simVisual .topology-stage');
const ospfMarker=document.createElement('span');ospfMarker.className='ospf-packet';ospfMarker.hidden=true;ospfStage.append(ospfMarker);
function ospfCenter(id){const s=ospfStage.getBoundingClientRect(),r=$(id).getBoundingClientRect();return{x:r.left-s.left+r.width/2,y:r.top-s.top+r.height/2,w:r.width,h:r.height};}
function ospfLayout(){if(!ospfStage.clientWidth)return;ospfStage.querySelector('svg').setAttribute('viewBox',`0 0 ${ospfStage.clientWidth} ${ospfStage.clientHeight}`);[['link12','r1','r2'],['link23','r2','r3'],['link13','r1','r3']].forEach(([id,a,b])=>{const p=ospfCenter(a),q=ospfCenter(b),dx=q.x-p.x,dy=q.y-p.y;const edge=(r,z)=>{const t=Math.min(r.w/2/(Math.abs(dx)||1),r.h/2/(Math.abs(dy)||1));return{x:r.x+z*dx*t,y:r.y+z*dy*t};};const f=edge(p,1),t=edge(q,-1);Object.entries({x1:f.x,y1:f.y,x2:t.x,y2:t.y}).forEach(([k,v])=>$(id).setAttribute(k,v));});}
function ospfMove(route,p){ospfLayout();const pts=route.map(ospfCenter),t=Math.min(pts.length-1-.00001,Math.max(0,p)*(pts.length-1)),a=pts[Math.floor(t)],b=pts[Math.floor(t)+1];ospfMarker.hidden=false;ospfMarker.style.left=(a.x+(b.x-a.x)*(t%1))+'px';ospfMarker.style.top=(a.y+(b.y-a.y)*(t%1))+'px';}
function ospfNeutral(){resetTopology();ospfMarker.hidden=true;['12','23','13'].forEach(n=>{$('link'+n).setAttribute('class','net-link');$('adj'+n).textContent='관찰 대기';});all('#neighborPanel strong').forEach(n=>n.textContent='대기');all('#lsdbPanel .lsa').forEach(n=>n.classList.add('ospf-pending'));$('routePanel').textContent='경로 계산 대기';ospfLayout();}
const ospfReset=adapter.reset;adapter.reset=function(i){ospfReset(i);ospfNeutral();};
function ospfDeferRoute(){ospfMarker.hidden=true;$('routePanel').textContent='경로 계산 대기';['link23','link13'].forEach(id=>$(id).setAttribute('class','net-link'));$('r3').classList.remove('active');all('#lsdbPanel .lsa').forEach(n=>n.classList.add('ospf-pending'));}
adapter.buildPlan=function(i,mode='normal'){
 const l=lessons[i],ev=(title,detail,duration,action,route,packet='IPv4')=>({title,detail,kind:route?'경로 관찰':'OSPF 판단',duration,action(){action();ospfMarker.textContent=packet;ospfLayout();},animate:route?p=>ospfMove(route,Math.min(1,Math.max(0,(p*duration-1050)/((route.length-1)*420)))):undefined});
 if(mode==='recover')return[
 ev('문제의 조건을 원래대로 복구합니다',l.mode==='area'?'CP12 양쪽을 Area 0으로 맞춥니다.':l.mode==='mtu'?'CP12 양쪽 IP MTU를 1500으로 맞춥니다.':'Router A–B 링크를 복구합니다.',1050,()=>{ospfMarker.hidden=true;$('link12').setAttribute('class','net-link control');$('adj12').textContent='재협상';$('routePanel').textContent='복구 후 경로 계산 대기';}),
 ev('CP12 Neighbor가 FULL로 복구됩니다','Hello 조건과 정보 교환이 다시 맞아 FULL 관계가 복구됩니다. 기존 검증의 안정화 후 상태를 재현합니다.',1650,()=>{adapter.recover();ospfDeferRoute();$('link12').setAttribute('class','net-link control');},['r1','r2'],'OSPF'),
 ev('누적 Cost 21 경로를 다시 선택합니다','Router A → Router B → Router C 경로와 Next Hop 10.0.12.2가 복구됩니다.',2070,()=>adapter.recover(),['r1','r2','r3'])];
 if(mode!=='normal')return null;
 if(l.mode==='neighbor')return[
 ev('Hello 조건을 비교합니다','세 링크는 Area 0, point-to-point, Hello 10초·Dead 40초입니다. 조건 확인과 최종 Neighbor 상태를 나눠 관찰합니다.',1650,()=>{ospfNeutral();$('areaBadge').textContent='Area 0 · point-to-point';$('link12').setAttribute('class','net-link control');},['r1','r2'],'Hello'),
 ev('정보 교환과 동기화 후 CP12는 FULL입니다','기존 검증에서 Router A–B 양쪽의 FULL 상태를 확인했습니다. Hello 한 번만으로 즉시 FULL이 된다는 표현은 아닙니다.',1470,()=>{$('adj12').textContent='FULL';$('neighborPanel').innerHTML='<span>CP12</span><strong>FULL</strong><span>Hello / Dead</span><strong>10 / 40s</strong>';}),
 ev('다른 두 Neighbor도 각각 확인합니다',l.reason,1650,()=>adapter.show())];
 if(l.mode==='lsdb')return[
 ev('같은 Area의 FULL 관계를 확인합니다','LSDB의 Router-LSA 식별자를 장비별로 대조합니다. 현재 선택된 데이터 경로와 LSDB 전체를 구분하세요.',1050,()=>{ospfNeutral();['12','23','13'].forEach(n=>{$('adj'+n).textContent='FULL';$('link'+n).setAttribute('class','net-link control');});}),
 ...['1.1.1.1','2.2.2.2','3.3.3.3'].map((id,n)=>ev('Router-LSA '+id+' 확인','Area 0의 Router-LSA 식별자를 순서대로 확인합니다. 기존 검증은 sequence·checksum·link count도 대조했습니다.',1230,()=>{const row=all('#lsdbPanel .lsa')[n];row.classList.remove('ospf-pending');row.classList.add('active');})),
 ev('세 Router의 LSDB를 대조합니다',l.reason,1230,()=>adapter.show())];
 if(l.mode==='cost')return[
 ev('직접 경로 Cost를 계산합니다','Router A → Router C의 50에 목적지 Loopback Cost 1을 더하면 51입니다.',1470,()=>{ospfNeutral();$('link13').setAttribute('class','net-link control');$('routePanel').innerHTML='<strong>직접 후보: 50 + 1 = 51</strong>Router A → Router C';}),
 ev('경유 경로 Cost를 계산합니다','Router A → Router B → Router C는 10 + 10 + 1 = 21입니다.',1470,()=>{$('link12').setAttribute('class','net-link control');$('link23').setAttribute('class','net-link control');$('routePanel').innerHTML='<strong>경유 후보: 10 + 10 + 1 = 21</strong>직접 후보 51과 비교';}),
 ev('SPF 결과를 경로표에 반영합니다','낮은 누적 Cost 21을 선택합니다. 물리적인 직접 연결 여부가 선택 기준은 아닙니다.',1050,()=>{adapter.show();ospfMarker.hidden=true;}),
 ev('선택한 경유 경로로 전달합니다','기존 검증에서 Echo Request/Reply는 CP12·CP23에 대응했고 CP13에는 해당 흐름이 없었습니다.',2070,()=>adapter.show(),['r1','r2','r3'])];
 const condition=l.mode==='area'?'CP12의 Area 1과 Area 0을 비교합니다':l.mode==='mtu'?'DBD의 MTU 1400과 1500을 비교합니다':'Router A–B 링크가 내려갑니다';
 const plan=[ev(condition,l.text,1470,()=>{ospfNeutral();if(l.mode==='area')$('areaBadge').textContent='CP12: Area 1 ↔ Area 0';if(l.mode==='mtu')$('badge12').textContent='CP12 · IP MTU 1400 ↔ 1500';$('link12').setAttribute('class','net-link warning');}),
 ev(l.mode==='mtu'?'CP12는 EXSTART에 머뭅니다':'CP12 Neighbor 관계를 확인합니다',l.reason,1470,()=>{adapter.show();ospfDeferRoute();})];
 if(l.mode==='link')plan.push(ev('Router-LSA의 연결 정보를 갱신합니다','기존 검증에서 Router A의 Router-LSA에 CP12 연결이 제거됐습니다. 남은 연결로 SPF를 다시 수행합니다.',1470,()=>{$('lsdbPanel').innerHTML='<div class="lsa active">1.1.1.1 · CP12 연결 제거 확인</div><div class="lsa">CP13·CP23 연결 유지</div>';}));
 plan.push(ev('남은 CP13 경로를 선택합니다',l.mode==='link'?'Router A → Router C, Next Hop 10.0.13.2, Metric 51로 재수렴합니다.':'CP12의 문제와 별개로 CP13은 FULL을 유지하며 남은 직접 경로로 전달합니다.',1650,()=>adapter.show(),['r1','r3']));return plan;
};
new ResizeObserver(ospfLayout).observe(ospfStage);

NetworkSimulator.mount(adapter);
})();
