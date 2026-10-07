// Existing lesson data and topic renderer retained from wifi-rf-simulator; playback is shared.
(()=>{
const lessons=[
{claim:"WIFIRF-01",title:"Band부터 확인하는 이유",text:"현재 연결은 5 GHz / Channel 149 / 80 MHz이고 주변에는 2.4·5 GHz 레코드가 있습니다.",states:["Current 5 GHz","ch149","80 MHz","KR"],question:"Channel 149라는 숫자만 보고 의미를 판단해도 될까요?",options:["먼저 Band/Regulatory Context를 봐야 한다","Channel 숫자만 보면 충분하다","RSSI가 있으면 Band는 필요 없다"],correct:0,mode:"band",actual:"5 GHz · ch149 · 80 MHz · KR",reason:"같은 Channel 숫자 해석은 Band와 Regulatory Domain 맥락이 필요합니다. 이번 Snapshot에서는 6 GHz는 관측되지 않았습니다.",evidence:["Current band 5 GHz","Primary channel 149","Width 80 MHz","Country code KR","Nearby 2.4/5 GHz records"]},
{claim:"WIFIRF-02",title:"Channel Width와 Reuse",text:"20/40/80 MHz가 같은 Spectrum을 얼마나 묶어 쓰는지 비교합니다.",states:["20 MHz = 1 block","40 MHz = 2 blocks","80 MHz = 4 blocks"],question:"Width가 넓어지면 같은 Spectrum에서 독립 Reuse 선택지는?",options:["줄어든다","늘어난다","항상 동일하다"],correct:0,mode:"width",actual:"20/40/80 MHz = 1/2/4 blocks",reason:"더 넓은 Channel은 더 많은 20 MHz block을 묶기 때문에 같은 전체 Spectrum에서 독립적인 Channel Group 수가 줄어듭니다.",evidence:["Deterministic block calculation","Current observed width 80 MHz","No throughput measurement","Wider is not automatically faster"]},
{claim:"WIFIRF-03",title:"RSSI와 SNR",text:"실제 관측값은 RSSI -22 dBm, Noise -97 dBm입니다.",states:["RSSI -22 dBm","Noise -97 dBm","Tool-SNR NOT_EXPOSED"],question:"계산 SNR은?",options:["75 dB","-119 dBm","22 dB"],correct:0,mode:"snr",actual:"SNR = -22 - (-97) = 75 dB",reason:"RSSI와 Noise는 dBm 절대 레벨이고 둘의 차이인 SNR은 dB입니다. 별도 Tool-SNR 필드가 없다는 이유만으로 계산을 무효화하지 않습니다.",evidence:["RSSI/Noise actual telemetry","Two API input agreement","SNR 75 dB reproducible","Independent Tool-SNR not exposed"]},
{claim:"WIFIRF-04",title:"Co-Channel Condition 실측",text:"3차 보완 Run에서 위치 권한을 허용한 read-only 앱이 기존 CoreWLAN cache의 BSSID identity를 반환했습니다.",states:["MAC-AUTH-01","23 distinct BSSIDs","5 GHz ch149 = 4 distinct BSSIDs"],question:"이번 보완 관측으로 정확히 무엇을 확인했을까요?",options:["서로 다른 BSS 4개가 ch149에 기록된 same-channel condition을 확인했지만 동시 송신/성능 저하는 미측정","4개의 물리 AP가 동시에 송신해 처리량이 감소했다고 확인","BSSID 4개이므로 물리 AP도 정확히 4대라고 확인"],correct:0,mode:"cci",actual:"ch149 distinct BSSID group = AP-A / AP-06 / AP-12 / AP-13",reason:"한 보존 cache Snapshot에서 서로 다른 BSSID 4개가 같은 5 GHz primary channel 149에 기록돼 Co-Channel Condition은 실측 PASS로 해소됐습니다. 다만 cache entry age, 실제 동시 송신, 처리량 저하는 측정하지 않았습니다.",evidence:["MAC-AUTH-01 retained snapshot","25 cache rows / 23 distinct BSSIDs","ch149 distinct aliases = AP-A, AP-06, AP-12, AP-13","Duplicate raw BSSID rows not double-counted","No throughput/interference severity claim"]},
{claim:"WIFIRF-05",title:"Adjacent / Overlapping Channel",text:"2.4 GHz scan 레코드에서 ch1/20 MHz와 ch3/20 MHz Allocation이 관측됐습니다.",states:["ch1 center 2412","ch3 center 2422","20 MHz each"],question:"이 두 Channel Allocation은?",options:["명목상 약 10 MHz 겹침","같은 Channel이다","전혀 겹치지 않는다"],correct:0,mode:"aci",actual:"Nominal overlap ≈ 10 MHz",reason:"Center가 10 MHz 차이인데 각각 20 MHz 폭이므로 점유 구간이 겹칩니다. 이는 Channel Allocation 분류이며 실제 ACI 피해량 측정은 아닙니다.",evidence:["Observed ch1/20 row","Observed ch3/20 row","Centers 2412/2422 MHz","Nominal overlap 10 MHz","No severity/throughput claim"]},
{claim:"WIFIRF-06",title:"DFS는 어디까지 검증했을까?",text:"KR domain에서 관측된 5 GHz primary는 ch36/80과 ch149/80이었습니다.",states:["KR","ch36/80","ch149/80","Radar NOT_OBSERVED"],question:"이번 검증의 정확한 결론은?",options:["관측 채널은 non-DFS로 분류, Radar vacate는 재현하지 않음","Radar 감지 후 Channel 이동까지 실측","모든 KR 5 GHz 채널이 non-DFS"],correct:0,mode:"dfs",actual:"Observed ch36/80·ch149/80 = non-DFS classification",reason:"관측 채널의 DFS 분류는 근거와 대조했지만 Radar Event와 Channel Vacate는 재현하지 않았습니다.",evidence:["Country code KR","Observed primary 36 / 149","Source-backed DFS classification","Radar event not observed","No production channel change"]}
];

const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;
function row(t,c=""){return `<div class="state-row ${c}">${t}</div>`;}
function lane(title,sub,bands){return `<div class="lane"><div class="lane-head"><strong>${title}</strong><span>${sub}</span></div><div class="spectrum">${bands}</div></div>`;}
function band(left,width,text,cls=""){return `<div class="band ${cls}" style="left:${left}%;width:${width}%">${text}</div>`;}
function resetView(){$("lanes").innerHTML=lane("Current RF","대기",band(10,35,"AP-A"));$("metaPanel").innerHTML="<span>Band</span><strong>대기</strong><span>Channel</span><strong>대기</strong>";$("stateList").innerHTML="";$("resultBox").innerHTML="<strong>대기</strong>예상 후 실행하세요.";$("eventKind").textContent="IDLE";$("eventText").textContent="예상을 선택한 뒤 실행하면 RF 상태와 Evidence Boundary를 보여줍니다.";$("scopeNote").innerHTML="<b>Privacy:</b> SSID/BSSID 원본은 표시하지 않습니다.";}
function apply(mode){
 if(mode==="band"){$("lanes").innerHTML=lane("5 GHz","observed",band(45,30,"ch149 / 80","good"))+lane("2.4 GHz","nearby rows",band(6,8,"ch1")+band(65,8,"ch11"))+lane("6 GHz","not observed","");$("metaPanel").innerHTML="<span>Band</span><strong>5 GHz</strong><span>Channel</span><strong>149</strong><span>Width</span><strong>80 MHz</strong><span>Domain</span><strong>KR</strong>";$("stateList").innerHTML=row("2.4 GHz observed","active")+row("5 GHz observed","active")+row("6 GHz not observed","warn");}
 if(mode==="width"){$("lanes").innerHTML=lane("20 MHz","1 block",band(5,20,"1"))+lane("40 MHz","2 blocks",band(5,40,"2","warn"))+lane("80 MHz","4 blocks",band(5,80,"4","warn"));$("metaPanel").innerHTML="<span>Current Width</span><strong>80 MHz</strong><span>Reuse Trend</span><strong>fewer groups</strong>";$("stateList").innerHTML=row("20/40/80 = 1/2/4 blocks","active")+row("No throughput benchmark","warn");}
 if(mode==="snr"){$("lanes").innerHTML=lane("Signal vs Noise","actual telemetry",band(10,65,"RSSI -22 dBm","good")+band(82,12,"Noise -97 dBm","warn"));$("metaPanel").innerHTML="<span>RSSI</span><strong>-22 dBm</strong><span>Noise</span><strong>-97 dBm</strong><span>SNR</span><strong>75 dB</strong>";$("stateList").innerHTML=row("SNR = RSSI - Noise","active")+row("Tool-SNR NOT_EXPOSED","warn");}
 if(mode==="cci"){$("lanes").innerHTML=lane("5 GHz · ch149","MAC-AUTH-01 retained cache",band(4,24,"AP-A","good")+band(26,24,"AP-06","warn")+band(48,24,"AP-12","good")+band(70,24,"AP-13","warn"))+lane("Evidence Boundary","identity verified",band(8,36,"23 distinct BSSIDs","good")+band(55,36,"same-channel count 4","good"));$("metaPanel").innerHTML="<span>Snapshot</span><strong>MAC-AUTH-01</strong><span>Channel</span><strong>149</strong><span>Distinct Group</span><strong>4 BSSIDs</strong>";$("stateList").innerHTML=row("Same-channel condition observed","active")+row("BSSID count ≠ physical AP count","warn")+row("Simultaneous airtime / throughput not measured","warn");$("scopeNote").innerHTML="<b>3차 보완 PASS:</b> 기존 cache에서 distinct identity는 확인했지만 개별 entry age와 실제 동시 송신은 확인하지 않았습니다.";}
 if(mode==="aci"){$("lanes").innerHTML=lane("2.4 GHz channel allocation","observed rows",band(10,40,"ch1 / 20")+band(30,40,"ch3 / 20","warn"));$("metaPanel").innerHTML="<span>Center 1</span><strong>2412 MHz</strong><span>Center 2</span><strong>2422 MHz</strong><span>Overlap</span><strong>~10 MHz</strong>";$("stateList").innerHTML=row("Allocation overlap classified","active")+row("ACI severity not measured","warn");}
 if(mode==="dfs"){$("lanes").innerHTML=lane("5 GHz · KR","observed",band(8,30,"ch36/80","good")+band(62,30,"ch149/80","good"))+lane("Radar event","not observed",band(35,30,"NOT REPRODUCED","warn"));$("metaPanel").innerHTML="<span>Domain</span><strong>KR</strong><span>Observed</span><strong>36 / 149</strong><span>DFS</span><strong>non-DFS</strong>";$("stateList").innerHTML=row("Observed groups classified","active")+row("Radar vacate not reproduced","warn");}
 $("eventKind").textContent=lessons[index].claim;$("eventText").textContent=lessons[index].reason;$("resultBox").innerHTML="<strong>"+lessons[index].actual+"</strong>"+lessons[index].reason;
}
const adapter={raw:lessons,kind:'state',reset(i){index=i;recovered=false;resetView();},show(){apply(lessons[index].mode);},recover:null,compare:null};
adapter.presentation={
 names:{'AP-A':'AP A'},
 labels:{'Evidence Boundary':'검증 범위','Snapshot':'관측 기록','Regulatory Context':'지역 규제 조건','Regulatory Domain':'지역 규제 기준','Regulatory':'규제','Context':'조건','Domain':'지역','Current':'현재','Noise':'Noise','Tool-SNR NOT_EXPOSED':'도구의 SNR 필드 미제공','Radar NOT_OBSERVED':'Radar 미관측','same-channel condition':'같은 Channel을 공유하는 조건','distinct BSSID group':'서로 다른 BSSID 집합','distinct BSSIDs':'서로 다른 BSSID','read-only':'읽기 전용','Allocation':'할당','Nominal overlap':'명목상 겹침','Deterministic block calculation':'일정한 기준의 블록 계산','No throughput measurement':'처리량 미측정','No throughput/interference severity claim':'처리량·간섭 심각도는 확인하지 않음','not observed':'미관측','not reproduced':'미재현','blocks':'블록','block':'블록','Reuse':'재사용','Spectrum':'주파수 공간'},
 lessons:[
  {title:'Channel 숫자를 읽기 전에 무엇을 확인할까요?',brief:'학습 페이지의 Band → Channel → Width 순서로 AP A의 관측값을 확인합니다.',hints:['같은 숫자라도 Band와 지역 조건을 함께 봅니다.','6 GHz는 이번 관측에 포함됐는지 확인하세요.']},
  {title:'Channel Width가 넓어지면 공간을 얼마나 쓸까요?',brief:'같은 전체 주파수 공간에서 20·40·80 MHz 묶음을 비교합니다. 속도 측정 실습은 아닙니다.',hints:['20 MHz 한 칸을 기준으로 묶인 칸 수를 세어 보세요.','독립적으로 다시 사용할 수 있는 묶음이 얼마나 남는지 생각하세요.']},
  {title:'RSSI와 Noise로 SNR을 어떻게 구할까요?',brief:'학습 페이지와 같은 RSSI -22 dBm, Noise -97 dBm을 사용합니다. 두 값의 차이와 단위를 확인하세요.',hints:['SNR은 수신 신호와 잡음의 차이입니다.','음수를 빼는 계산과 dBm·dB 단위를 구분하세요.']},
  {title:'BSSID 네 개가 같은 Channel이면 무엇을 알 수 있을까요?',brief:'보존된 MAC-AUTH-01 관측 기록을 확인합니다. BSSID 별칭은 물리 AP 수를 뜻하지 않습니다.',hints:['같은 Channel을 사용한다는 조건과 실제 동시 송신은 다릅니다.','관측 기록만으로 처리량 감소까지 확인했는지 구분하세요.']},
  {title:'ch1과 ch3의 20 MHz 구간은 겹칠까요?',brief:'학습 페이지의 2412·2422 MHz 중심 주파수와 20 MHz 폭을 비교합니다.',hints:['두 중심 주파수 사이의 차이를 먼저 계산하세요.','할당 구간의 겹침과 실제 간섭 피해는 다른 관측입니다.']},
  {title:'관측 Channel 분류와 Radar 재현은 같을까요?',brief:'KR 조건에서 관측한 ch36/80·ch149/80의 분류와 검증 범위를 나눠 봅니다.',hints:['지역 규제 조건을 먼저 확인하세요.','Channel 분류를 확인한 것과 Radar Event를 재현한 것은 다릅니다.']}
 ]
};
const rfFrames=[
 [
  ['Band와 지역 조건','AP A에서 관측한 5 GHz와 국가 코드 KR을 먼저 확인합니다.',()=>WirelessLab.fact('AP A · 5 GHz','국가 코드 KR · 이번 관측의 시작 조건',true)],
  ['Channel과 Width','이 Band에서 primary Channel은 149, Width는 80 MHz입니다.',()=>WirelessLab.fact('5 GHz · KR','Band와 지역 조건')+WirelessLab.fact('ch149 · 80 MHz','주파수 대역 안에서 Channel과 폭을 해석합니다.',true)],
  ['관측하지 않은 범위','주변 2.4·5 GHz 기록이 있었지만 6 GHz는 관측되지 않았습니다.',()=>WirelessLab.fact('2.4 GHz · 5 GHz','주변 관측 기록 있음')+WirelessLab.fact('6 GHz','이번 관측에서 확인되지 않음',true)]
 ],
 [
  ['20 MHz 기준 한 칸','20 MHz를 한 칸으로 보고 같은 전체 공간을 비교합니다.',()=>rfWidth(1,'20 MHz','한 칸을 사용합니다.')],
  ['40 MHz 묶음','40 MHz는 20 MHz 기준 두 칸을 묶습니다.',()=>rfWidth(1,'20 MHz','한 칸')+rfWidth(2,'40 MHz','같은 공간에서 독립적인 묶음 수가 줄어듭니다.')],
  ['80 MHz 묶음','80 MHz는 네 칸을 묶습니다. 이 비교만으로 실제 속도가 더 빠르다고 판단하지 않습니다.',()=>rfWidth(1,'20 MHz','한 칸')+rfWidth(2,'40 MHz','두 칸을 함께 사용')+rfWidth(4,'80 MHz','네 칸을 함께 사용 · 실제 처리량은 별도 측정 필요')]
 ],
 [
  ['신호 세기 읽기','실제 관측 RSSI는 -22 dBm입니다. 아직 잡음과의 차이는 계산하지 않았습니다.',()=>WirelessLab.fact('RSSI -22 dBm','수신 신호의 절대 레벨',true)],
  ['잡음 레벨 함께 읽기','같은 관측의 Noise는 -97 dBm입니다. 신호와 잡음을 함께 비교합니다.',()=>WirelessLab.fact('RSSI -22 dBm','수신 신호')+WirelessLab.fact('Noise -97 dBm','관측된 잡음 레벨',true)],
  ['SNR 계산','-22 - (-97) = 75 dB입니다. 입력은 실측값, 결과는 두 입력의 계산값입니다.',()=>'<div class="rf-formula">SNR = -22 − (−97)<br>= 75 dB</div>'+WirelessLab.fact('단위 확인','RSSI·Noise는 dBm, 두 값의 차이인 SNR은 dB입니다.',true)]
 ],
 [
  ['같은 기록 안에서 비교','MAC-AUTH-01의 한 보존 기록에서 BSSID를 비교합니다.',()=>WirelessLab.fact('MAC-AUTH-01','보존된 단일 관측 기록 · 물리 AP 수를 세는 단계가 아닙니다.',true)],
  ['중복을 제외하고 묶기','AP A, AP-06, AP-12, AP-13은 서로 다른 BSSID 네 개의 익명 별칭입니다.',()=>WirelessLab.fact('5 GHz · primary ch149','AP A / AP-06 / AP-12 / AP-13',true)+WirelessLab.fact('BSSID 네 개','중복된 원시 행은 중복 집계하지 않았습니다.')],
  ['확인한 조건과 미측정 결과','같은 Channel을 공유하는 조건은 확인했습니다. 동시 송신·처리량 감소는 측정하지 않았습니다.',()=>WirelessLab.fact('확인','서로 다른 BSSID 네 개가 같은 primary ch149에 기록됨',true)+WirelessLab.fact('미측정','개별 기록의 경과 시간 · 실제 동시 송신 · 처리량 감소')]
 ],
 [
  ['중심 주파수 비교','ch1과 ch3의 중심은 각각 2412 MHz와 2422 MHz입니다.',()=>WirelessLab.fact('ch1 · 2412 MHz','20 MHz 폭')+WirelessLab.fact('ch3 · 2422 MHz','20 MHz 폭',true)],
  ['명목 점유 구간 비교','중심 간격은 10 MHz입니다. 20 MHz 할당 구간의 관계를 비교합니다.',()=>WirelessLab.fact('중심 차이 10 MHz','두 Channel의 폭은 각각 20 MHz입니다.',true)],
  ['겹침의 의미 확인','명목상 약 10 MHz가 겹칩니다. 이는 Channel 할당 분류이며 실제 간섭 피해량이 아닙니다.',()=>'<div class="rf-formula">20 MHz − 10 MHz<br>≈ 10 MHz 겹침</div>'+WirelessLab.fact('판정 범위','실제 ACI 심각도·처리량 저하는 미측정',true)]
 ],
 [
  ['지역 조건 확인','허용 Channel과 DFS 분류는 지역 규제 조건과 함께 해석합니다.',()=>WirelessLab.fact('KR','이번 관측의 국가 코드',true)],
  ['실제 관측 Channel 분류','관측된 ch36/80·ch149/80 그룹을 기존 근거와 대조해 non-DFS로 분류했습니다.',()=>WirelessLab.fact('ch36/80 · ch149/80','KR 조건의 기존 근거에서 non-DFS로 분류',true)],
  ['Radar 재현 여부 구분','Radar Event와 Channel Vacate는 이번에 관측·재현하지 않았습니다.',()=>WirelessLab.fact('Channel 분류','기존 관측과 근거 대조')+WirelessLab.fact('Radar / Channel Vacate','미관측 · 미재현',true)]
 ]
];
function rfWidth(n,title,detail){return `<div class="wireless-fact current"><strong>${title}</strong><div class="rf-blocks">${Array.from({length:4},(_,i)=>`<i class="${i<n?'used':''}"></i>`).join('')}</div><span>${detail}</span></div>`;}
adapter.buildPlan=(i,mode="normal")=>mode!=="normal"?null:rfFrames[i].map(([title,detail,draw],k)=>({title,detail,kind:k===2?'판단':'관찰',duration:k===2?1800:1470,action(){index=i;resetView();$('lanes').innerHTML='<div class="wireless-cards">'+draw()+'</div>';$('metaPanel').innerHTML='<span>현재 관찰</span><strong>'+title+'</strong>';$('stateList').innerHTML=row(detail,'active');$('resultBox').hidden=true;$('scopeNote').innerHTML=i===3?'<b>익명화:</b> AP A는 기존 AP-A와 같은 별칭입니다. AP-06·AP-12·AP-13은 BSSID 별칭이며 물리 AP 대수를 뜻하지 않습니다.':'<b>학습 기준:</b> Wi-Fi / RF 학습 페이지의 기존 관측·계산 범위를 그대로 사용합니다.';$('simVisual').dataset.reveal='all';}}));

NetworkSimulator.mount(adapter);
})();
