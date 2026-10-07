// Existing lesson data and topic renderer retained from roaming-wlan-troubleshooting-simulator; playback is shared.
(()=>{
const lessons=[
{claim:"ROAM-01",title:"무엇이 실제 Roam 증거일까?",text:"RSSI가 약해지고 11v 제안을 받았다고 가정합니다.",states:["low RSSI","11v suggestion","BSSID transition ?"],question:"실제 Roam을 가장 직접적으로 증명하는 것은?",options:["같은 STA의 source BSSID → target BSSID 전환","RSSI가 -70 dBm 아래로 내려감","11v Request를 한 번 수신함"],correct:0,mode:"roam",actual:"Distinct BSSID transition",reason:"Infrastructure 제안이나 약한 RSSI는 보조 정보입니다. 실제 Roam은 같은 STA가 다른 BSS로 이동한 사실로 확인합니다.",evidence:["공식 Cisco RA trace: old BSSID와 target BSSID 구분","FT 재연결 기록","사용자 단말 실측 아님"]},
{claim:"ROAM-02",title:"11k / 11v / 11r 역할 구분",text:"세 기능은 서로 보완적이지만 동일한 기능이 아닙니다.",states:["11k","11v","11r"],question:"가장 정확한 매핑은?",options:["11k=후보정보, 11v=전환제안, 11r=Fast Transition","11k=암호화, 11v=VLAN, 11r=DHCP","셋 모두 Client를 강제로 다른 AP로 이동"],correct:0,mode:"kvr",actual:"k=정보 · v=제안 · r=FT",reason:"11k는 이웃 정보를 돕고, 11v는 전환을 제안할 수 있으며, 11r은 보안 전환 부담을 줄입니다.",evidence:["Cisco k/v/r 공식 설명","FT trace / k 예시","11v는 문서 동작 설명 범위"]},
{claim:"ROAM-03",title:"FT 성공이면 Data Resume도 증명됐을까?",text:"공식 Trace에서 FT 성공은 확인됐지만 제공된 RUN 시각은 해당 재연결보다 앞섭니다.",states:["FT success","reassociation observed","post-roam data timestamp mismatch"],question:"이 근거로 어디까지 말할 수 있을까요?",options:["FT 성공은 말할 수 있지만 해당 전환 후 Data Resume는 미확인","무손실 Roam과 정확한 중단시간까지 증명","Ping이 반드시 성공했다고 증명"],correct:0,mode:"ft",actual:"FT observed · Data Resume NOT CONFIRMED",reason:"FT 성공과 전환 후 서비스 복구는 서로 다른 증거가 필요합니다. 이번 공개 Trace로 중단시간이나 Ping 성공을 계산하지 않습니다.",evidence:["Cisco FT success reference","RUN timestamp precedes the reconnect used for review","No live dual-AP data-resume test"]},
{claim:"ROAM-04",title:"Sticky Client 판정",text:"Client의 현재 AP RSSI가 약하다고 가정합니다.",states:["current AP weak","candidate quality unknown","client remains associated"],question:"Sticky라고 확정하려면 추가로 무엇이 필요할까요?",options:["더 좋은 후보 AP의 RF와 현재 AP에 계속 머문다는 증거","약한 RSSI 숫자 하나","주변 BSSID 개수만 많으면 충분"],correct:0,mode:"sticky",actual:"Better candidate + persistent current association required",reason:"Sticky는 단순 약신호가 아니라 더 좋은 후보가 있는데도 현재 AP에 계속 남는 상태입니다.",evidence:["Aruba ClientMatch documented scenario","Local dual-AP time-series not measured","No throughput-loss claim"]},
{claim:"ROAM-05",title:"WLAN Troubleshooting Gate",text:"사용자가 'Wi-Fi는 붙었는데 인터넷이 안 된다'고 말합니다.",states:["RF visible","Association success","next evidence unknown"],question:"Association이 성공했다면 다음으로 우선 확인할 Gate는?",options:["Authentication","Routing부터 확인","RSSI만 다시 확인"],correct:0,mode:"ladder",actual:"RF → Association → Authentication → Addressing → Policy → Routing",reason:"앞 Gate가 통과됐다는 근거가 있으면 다음 계층으로 좁힙니다. 다만 이 순서는 진단 체크리스트이며 원인에 따라 앞 단계로 되돌아갈 수 있습니다.",evidence:["Wi-Fi/RF evidence","WLAN Association reference evidence","DOT1X actual lab","DHCP/ACL/Routing actual labs"]},
{claim:"ROAM-06",title:"Roam 후 서비스 실패 분류",text:"Association과 Authentication은 이미 성공했다고 가정합니다.",states:["Assoc PASS","Auth PASS","service FAIL"],question:"DHCP Discover만 반복되고 usable lease가 없다면 분류는?",options:["Addressing","Roaming","Routing"],correct:0,mode:"cases",actual:"Addressing failure",reason:"Roam/Association/Auth Gate가 통과했다면 DHCP 실패는 downstream Addressing 문제로 분류합니다.",evidence:["DHCP-04: Discover only, no usable lease","CASE-B=Policy/Authorization","CASE-C=Routing","세 사례는 하나의 연속 실제 Roam이 아님"]}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function row(t,c=""){return `<div class="state-row ${c}">${t}</div>`;}
function roamVisual(label){return `<div class="roam-stage"><div class="cell a"><div><div class="ap">AP-A</div><small>Source</small></div></div><div class="cell b"><div><div class="ap">AP-B</div><small>Target</small></div></div><div class="arrow"></div><div class="sta">STA-A</div><div class="event-label">${label}</div></div>`;}
function ladderVisual(stop){const names=["RF","Association","Authentication","Addressing","Policy","Routing"];return '<div class="ladder">'+names.map((n,i)=>`<div class="gate ${stop===i?"stop":stop>i?"pass":""}"><b>${i+1}</b><span>${n}</span><em>${stop===i?"STOP":stop>i?"PASS":"CHECK"}</em></div>`).join("")+'</div>';}
function resetView(){$("visual").innerHTML=roamVisual("예상을 선택하면 현재 Evidence 범위를 표시합니다.");$("meta").innerHTML="<span>Claim</span><strong>대기</strong><span>Scope</span><strong>대기</strong>";$("states").innerHTML="";$("resultBox").innerHTML="<strong>대기</strong>예상 후 실행하세요.";$("scopeNote").innerHTML="<b>Scope:</b> Reference와 실제 Lab Evidence를 구분합니다.";}
function apply(mode){
 const l=lessons[index];
 if(mode==="roam"){$("visual").innerHTML=roamVisual("Reference: same STA old BSSID → target BSSID + FT reconnect");$("meta").innerHTML="<span>Evidence</span><strong>Published trace</strong><span>Live Actual</span><strong>null</strong>";$("states").innerHTML=row("BSSID transition = roam evidence","active")+row("11v suggestion ≠ roam completion","warn")+row("Low RSSI ≠ exact roam threshold","warn");}
 if(mode==="kvr"){$("visual").innerHTML='<div class="ladder">'+["11k · Candidate info","11v · Transition suggestion","11r · Fast Transition"].map((x,i)=>`<div class="gate pass"><b>${["k","v","r"][i]}</b><span>${x}</span><em>ROLE</em></div>`).join("")+'</div>';$("meta").innerHTML="<span>Scope</span><strong>Role mapping</strong><span>Same live client?</span><strong>NO</strong>";$("states").innerHTML=row("k = neighbor/resource","active")+row("v = steering assistance","active")+row("r = FT security transition","active");}
 if(mode==="ft"){$("visual").innerHTML=roamVisual("FT success reviewed · post-roam Data Resume not proven by this timestamp set");$("meta").innerHTML="<span>FT</span><strong>Observed in reference</strong><span>Data Resume</span><strong>NOT CONFIRMED</strong>";$("states").innerHTML=row("FT success","active")+row("Interruption duration unknown","warn")+row("Post-roam ping not measured","warn");$("scopeNote").innerHTML="<b>중요:</b> FT 성공과 Data Resume는 별도 증거가 필요합니다.";}
 if(mode==="sticky"){$("visual").innerHTML=roamVisual("Sticky requires: AP-A persists while AP-B is materially better");$("meta").innerHTML="<span>Local Sticky</span><strong>NOT MEASURED</strong><span>Concept</span><strong>Documented</strong>";$("states").innerHTML=row("Weak current AP alone insufficient","warn")+row("Better candidate required","active")+row("Persistent source association required","active");}
 if(mode==="ladder"){$("visual").innerHTML=ladderVisual(2);$("meta").innerHTML="<span>RF</span><strong>PASS</strong><span>Association</span><strong>PASS</strong><span>Next</span><strong>Authentication</strong>";$("states").innerHTML=row("Do not skip current gate","active")+row("Can loop back if VLAN/policy caused addressing issue","warn");}
 if(mode==="cases"){$("visual").innerHTML=ladderVisual(3);$("meta").innerHTML="<span>Assoc</span><strong>PASS</strong><span>Auth</span><strong>PASS</strong><span>Stop</span><strong>Addressing</strong>";$("states").innerHTML=row("CASE-A = Addressing","active")+row("CASE-B = Policy/Authorization","active")+row("CASE-C = Routing","active");$("scopeNote").innerHTML="<b>Scope:</b> 세 Case는 서로 다른 기존 Lab Evidence를 연결한 교육용 분류입니다.";}
 $("resultBox").innerHTML="<strong>"+l.actual+"</strong>"+l.reason;
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetView();},show(){apply(lessons[index].mode);},recover:null,compare:null};
adapter.presentation={
 names:{'STA-A':'PC A','AP-A':'AP A','AP-B':'AP B'},
 labels:{'Evidence':'근거','Reference':'참고 사례','Trace':'Trace','source BSSID':'기존 BSSID','target BSSID':'전환 대상 BSSID','Distinct BSSID transition':'서로 다른 BSSID로 전환','low RSSI':'약한 RSSI','11v suggestion':'11v 전환 제안','BSSID transition ?':'BSSID 전환 여부 확인 전','FT success':'FT 성공','reassociation observed':'Reassociation 관측','post-roam data timestamp mismatch':'전환 이후 데이터의 시각 불일치','Data Resume NOT CONFIRMED':'데이터 재개 미확인','current AP weak':'현재 AP의 신호가 약함','candidate quality unknown':'후보 AP 품질 미확인','client remains associated':'기존 AP 접속 유지','Better candidate + persistent current association required':'더 좋은 후보와 기존 접속을 계속 유지한 근거 필요','RF visible':'RF 관측 가능','Association success':'Association 성공','next evidence unknown':'다음 단계 근거 미확인','Assoc PASS':'Association 성공','Auth PASS':'Authentication 성공','service FAIL':'서비스 실패','usable lease':'사용 가능한 DHCP Lease','Addressing failure':'주소 확보 실패','Client':'단말','Infrastructure':'네트워크 장비','Gate':'확인 단계','live':'직접 실측','downstream':'이후 단계'},
 lessons:[
  {title:'PC A가 AP B로 전환했는지 무엇으로 확인할까요?',brief:'학습 페이지의 PC A·AP A·AP B를 사용합니다. 약한 RSSI와 전환 제안만으로 접속 대상이 바뀌었다고 판단하지 않습니다.',hints:['같은 PC A의 전후 BSSID를 비교해야 합니다.','제안받은 사실과 실제 전환한 사실을 구분하세요.']},
  {title:'802.11k·v·r은 각각 무엇을 도울까요?',brief:'후보 정보, 전환 제안, 보안 전환을 서로 다른 역할로 나눠 봅니다.',hints:['후보를 아는 것과 전환하라는 제안을 받는 것은 다릅니다.','보안 전환 부담을 줄이는 기능을 따로 구분하세요.']},
  {title:'FT 성공 뒤 데이터도 재개됐다고 말할 수 있을까요?',brief:'공식 사례의 FT 성공 기록과 데이터 상태의 시각을 비교합니다. PC A의 직접 실측 기록은 아닙니다.',hints:['확인하려는 재연결보다 데이터 기록이 앞선다면 어떤 한계가 있을까요?','접속 전환과 서비스 성공에는 각각 근거가 필요합니다.']},
  {title:'현재 RSSI만으로 Sticky Client를 확정할까요?',brief:'PC A가 AP A에 머문 조건입니다. 후보 AP B의 품질과 관찰 시간 정보를 확인합니다.',hints:['AP B가 실제로 더 좋은 후보인지 알아야 합니다.','일정 시간 동안 기존 접속을 유지했는지도 확인하세요.']},
  {title:'Association 성공 다음에는 어떤 근거를 볼까요?',brief:'학습 페이지의 진단 순서로 확인 범위를 좁힙니다. 이 순서는 엄격한 프로토콜 실행 순서가 아닙니다.',hints:['앞 단계가 통과됐다는 근거가 있는지 먼저 봅니다.','VLAN·정책 문제로 주소를 받지 못했다면 앞 단계로 돌아갈 수 있습니다.']},
  {title:'접속 뒤 DHCP 주소를 못 받으면 어디를 볼까요?',brief:'Association과 Authentication은 성공한 조건입니다. Discover 반복과 Lease 확보 여부를 연결합니다.',hints:['무선 접속 결과와 IP 주소 확보는 다른 확인 항목입니다.','주소·정책·경로 사례는 서로 다른 기존 실습의 근거입니다.']}
 ]
};
const roamActors=[{name:'AP A',role:'기존 접속 AP',kind:'ap'},{name:'PC A',role:'무선 단말 · STA',kind:'pc'},{name:'AP B',role:'전환 후보 AP',kind:'ap'}];
function roamScene(title,detail,selected=null){WirelessLab.flow('roamFlow',roamActors,'AP 전환의 확인 관계 · 이동 거리·시간을 표현한 그림이 아닙니다.');const actors=document.querySelectorAll('#roamFlow .wireless-actor');if(selected!==null){actors[1].classList.add('current');actors[selected].classList.add('current');}$('visual').innerHTML='<div class="wireless-cards">'+WirelessLab.fact(title,detail,true)+'</div>';}
const roamReset=adapter.reset;
adapter.reset=i=>{roamReset(i);$('visual').innerHTML=WirelessLab.fact('PC A의 접속 대상과 서비스 상태','예상한 뒤 실행하면 확인한 근거가 단계별로 표시됩니다.');WirelessLab.flow('roamFlow',roamActors,'접속 전환과 이후 통신을 따로 확인합니다.');$('resultBox').hidden=true;};
function roamRoles(n){$('visual').innerHTML='<div class="wireless-cards">'+[['802.11k','어느 후보를 살펴볼지 알려 주는 정보'],['802.11v','후보 AP로 전환하라는 제안 · 완료 보장 아님'],['802.11r / FT','보안 전환의 부담을 줄여 빠른 전환 지원']].slice(0,n).map(([title,detail],i)=>WirelessLab.fact(title,detail,i===n-1)).join('')+'</div>';}
const roamFrames=[
 [
  ['출발 조건','약한 RSSI와 11v 제안이 있습니다. 이 두 사실만으로 AP 전환 완료를 표시하지 않습니다.',()=>roamScene('PC A → AP A','약한 RSSI · 11v 전환 제안 · 아직 전환 완료 판정 전',0)],
  ['같은 단말의 전후 BSSID 대조','공식 Cisco 사례에서 같은 단말의 old BSSID와 target BSSID가 구분되고 FT 재연결이 기록됐습니다.',()=>roamScene('기존 BSSID → 전환 대상 BSSID','공식 사례의 접속 대상 변경 · 사용자 PC A의 실측 아님',2)],
  ['확인 범위 정리','BSSID 전환이 실제 Roam의 직접 근거입니다. 이 기록만으로 전환 뒤 무손실 통신을 확정하지 않습니다.',()=>roamScene('AP 전환 사실 확인','서비스 재개·중단시간은 별도 근거가 필요합니다.',2)]
 ],
 [
  ['802.11k · 후보 정보','Neighbor·Radio Resource 정보로 후보 AP를 찾는 데 도움을 줍니다.',()=>roamRoles(1)],
  ['802.11v · 전환 제안','BSS Transition 제안은 이동을 돕지만 제안 자체가 실제 전환 완료를 보장하지 않습니다.',()=>roamRoles(2)],
  ['802.11r · 보안 전환','Fast Transition은 보안 전환의 부담을 줄이는 역할입니다.',()=>roamRoles(3)]
 ],
 [
  ['FT 기록 확인','공식 사례에는 FT 성공과 재연결 기록이 있습니다.',()=>roamScene('FT 성공','공식 참고 사례에서 확인 · 사용자 단말 실측 아님',2)],
  ['데이터 기록의 시각 대조','검토한 RUN 시각이 해당 재연결보다 앞서 있어 전환 이후 데이터를 증명하지 못합니다.',()=>roamScene('기록 순서: RUN → 검토한 재연결','전환 후 데이터 재개 근거로 사용할 수 없음')],
  ['성공 범위 분리','FT 성공은 확인했지만 해당 전환 뒤 Ping 성공·중단시간·무손실 여부는 확인하지 않았습니다.',()=>roamScene('데이터 재개 미확인','FT 성공과 이후 서비스 성공을 따로 기록합니다.',2)]
 ],
 [
  ['현재 접속 관찰','PC A가 AP A에 접속한 상태이며 현재 RSSI가 약하다고 가정합니다.',()=>roamScene('PC A → AP A','약한 신호라는 조건만 주어졌습니다.',0)],
  ['후보 품질 확인 필요','AP B가 실제로 더 좋은 RF 조건인지 대조해야 합니다.',()=>roamScene('AP B의 RF 품질은?','후보 정보가 없으면 Sticky를 확정하지 않습니다.')],
  ['체류 구간도 확인 필요','더 좋은 후보가 있어도 PC A가 AP A에 계속 남았는지 일정 구간의 근거가 필요합니다.',()=>roamScene('더 좋은 후보 + 기존 접속 유지','이번에 두 AP의 RF 시계열·체류 구간은 직접 측정하지 않았습니다.',0)]
 ],
 [
  ['통과한 근거 확인','이 문제는 RF가 보이고 Association이 성공한 조건입니다.',()=>roamScene('RF · Association','확인된 앞 단계의 근거에서 시작합니다.')],
  ['Authentication 확인','다음으로 보안·AAA 결과와 Authenticator 상태가 일치하는지 봅니다.',()=>roamScene('다음 확인: Authentication','Association 성공이 인증과 데이터 성공까지 뜻하지 않습니다.')],
  ['진단 범위 확장','Authentication 이후 주소·정책·경로를 확인합니다. 원인에 따라 앞 단계로 되돌아갑니다.',()=>{$('visual').innerHTML='<div class="roam-review">'+['RF','Association','Authentication','Addressing','Policy / Authorization','Routing'].map((n,j)=>WirelessLab.fact(n,j<2?'이번 문제에서 확인한 조건':j===2?'현재 우선 확인할 단계':'이후 확인할 범위',j===2)).join('')+'</div>'; }]
 ],
 [
  ['무선 접속 조건 확인','Association과 Authentication이 이미 성공했다는 조건에서 서비스 장애를 분류합니다.',()=>roamScene('Association · Authentication 성공','이 두 조건과 데이터 서비스 성공은 다릅니다.')],
  ['DHCP 근거 확인','기존 DHCP-04 근거에는 Discover만 반복되고 사용 가능한 Lease가 없습니다.',()=>roamScene('DHCP Discover 반복','사용 가능한 Lease 없음 · 기존 별도 실습 근거')],
  ['실패 계층 분류','이 조건은 Addressing 단계의 실패입니다. 원인 조사 중 VLAN·정책 등 앞 조건도 다시 확인할 수 있습니다.',()=>{$('visual').innerHTML='<div class="roam-review">'+WirelessLab.fact('이번 사례 · Addressing','Discover 반복 · Lease 없음',true)+WirelessLab.fact('다른 사례 · Policy / Authorization','정책에서 Packet 중단')+WirelessLab.fact('다른 사례 · Routing','Route / Next-hop에서 전달 중단')+'</div>'; }]
 ]
];
adapter.buildPlan=(i,mode='normal')=>mode!=='normal'?null:roamFrames[i].map(([title,detail,draw],k)=>({title,detail,kind:k===2?'판단 범위':'근거 확인',duration:k===2?1800:1650,action(){index=i;adapter.reset(i);draw();$('meta').innerHTML='<span>현재 확인</span><strong>'+title+'</strong>';$('states').innerHTML=row(detail,'active');$('scopeNote').textContent=i<4?'공식 사례·설명 범위입니다. 사용자 단말의 로밍 시간·데이터 재개·RF 시계열을 직접 측정한 결과가 아닙니다.':'서로 다른 기존 실습 근거를 연결한 교육용 진단입니다. 하나의 실제 로밍 장애 시계열이 아닙니다.';$('simVisual').dataset.reveal='all';}}));

NetworkSimulator.mount(adapter);
})();
