// Existing lesson data and topic renderer retained from wlan-association-simulator; playback is shared.
(()=>{
'use strict';

// All messages below are authored teaching models, never imported capture events.
const step = (direction, title, label, detail) => ({ direction, title, label, detail });
const openAuth = [
  step('to-ap', 'Open Authentication 요청', 'STA → AP · Authentication', 'STA가 Open System Authentication을 요청합니다. 이 메시지가 올바른 Wi-Fi 암호를 증명하지는 않습니다.'),
  step('to-sta', 'Open Authentication 성공', 'AP → STA · Authentication', '이 모델에서는 AP가 성공을 응답했습니다. 암호 기반 키 확인은 이후 4-Way에서 이뤄집니다.')
];
const association = [
  step('to-ap', 'Association 요청', 'STA → AP · Association', 'STA가 기능과 보안 조건을 담아 연결을 요청합니다.'),
  step('to-sta', 'Association 성공', 'AP → STA · Association', '이 모델에서는 AP가 연결을 수락합니다. 4-Way Handshake는 아직 끝나지 않았습니다.')
];
const fourWay = [
  step('to-sta', 'M1 · ANonce', 'AP → STA · EAPOL-Key', 'AP가 ANonce를 보냅니다. PMK 자체를 무선으로 보내는 메시지가 아닙니다.'),
  step('to-ap', 'M2 · SNonce + MIC', 'STA → AP · EAPOL-Key', 'STA는 준비한 PMK와 양측 정보로 키를 도출하고 SNonce와 MIC를 보냅니다.'),
  step('to-sta', 'M3 · 키 설치 정보', 'AP → STA · EAPOL-Key', 'AP가 키 확인 및 설치에 필요한 정보를 보냅니다. GTK는 보호된 Key Data로 전달됩니다.'),
  step('to-ap', 'M4 · 확인 응답', 'STA → AP · EAPOL-Key', 'STA가 확인 응답을 보냅니다. 실제 검증에서는 이어지는 데이터 통신 성공도 확인합니다.')
];
const protectedData = step('both', '보호된 데이터 통신', 'STA ↔ AP · Protected Data', '교육 모델에서는 양방향 시험 통신이 성공했습니다. 실측 판정에는 같은 연결의 보호된 프레임과 통신 결과가 필요합니다.');

const lessons = [
  {
    id: 'WLAN-01', short: 'Discovery', title: 'Probe가 없으면 AP를 못 찾은 걸까요?',
    description: '교육 모델: STA가 AP의 Beacon 정보를 이용해 새 접속을 시작합니다. Probe 교환은 없습니다.',
    question: '이 상황에서 가장 적절한 설명은 무엇일까요?',
    options: ['Probe가 없으므로 접속은 반드시 실패한다.', 'Beacon으로도 AP를 발견할 수 있다.', 'Beacon을 받으면 보안 Handshake도 완료된다.'], correct: 1,
    answer: 'Beacon으로 발견할 수 있으며 Probe는 필수 단계가 아닙니다.',
    reason: '수동 탐색은 Beacon 정보를 사용합니다. 다만 실제 sniffer에 Beacon이 보였다는 사실만으로 STA가 그 프레임을 수신했다고 직접 증명할 수는 없습니다.', anchor: 'order',
    steps: [
      step('to-sta', 'Beacon 광고', 'AP → 주변 STA · Discovery', 'AP가 네트워크와 기능 정보를 광고합니다. 이 교육 모델은 STA가 그 정보를 사용한 상황을 가정합니다.'),
      step('local', 'AP 선택', 'STA 내부 · 교육 모델의 가정', 'STA가 연결할 AP를 선택합니다. 이것은 캡처된 프레임이 아니라 모델의 내부 상태입니다.'),
      ...openAuth
    ]
  },
  {
    id: 'WLAN-02', short: 'Auth / Assoc', title: 'Open Authentication 성공은 암호 확인일까요?',
    description: '교육 모델: WPA2-Personal의 최초 접속입니다. Open System Authentication과 Association 응답이 모두 성공했습니다.',
    question: '이 시점에 확인된 것은 무엇일까요?',
    options: ['올바른 암호와 데이터 통신이 모두 확인됐다.', 'PMK가 AP에서 STA로 전달됐다.', '기본 인증·연결 협상은 성공했지만 4-Way 확인은 남았다.'], correct: 2,
    answer: 'Auth/Assoc 성공과 WPA2 보안 Handshake 완료는 다릅니다.',
    reason: 'Open System Authentication은 WPA2 암호 검증이 아닙니다. Association 뒤 4-Way와 데이터 통신을 확인해야 연결의 보안·통신 결과를 설명할 수 있습니다.', anchor: 'wpa2',
    steps: [...openAuth, ...association,
      step('local', '다음은 4-Way Handshake', '키 확인 전 · 내부 상태', 'Auth/Assoc 성공만으로 암호가 맞다거나 보호된 데이터가 성공했다고 결론 내리지 않습니다.')]
  },
  {
    id: 'WLAN-03', short: '4-Way', title: 'M1이 보내는 것은 PMK일까요?',
    description: '교육 모델: WPA2 Association이 성공했고, 같은 STA/AP가 Pairwise 4-Way를 수행합니다.',
    question: 'M1의 역할에 대한 올바른 설명은 무엇일까요?',
    options: ['AP가 ANonce를 보낸다. PMK 자체는 보내지 않는다.', 'AP가 평문 PMK를 보내 STA의 암호를 대신한다.', 'STA가 AP에 SNonce와 최종 확인을 보낸다.'], correct: 0,
    answer: 'M1은 AP → STA의 ANonce 전달입니다.',
    reason: 'PMK는 이미 양측이 준비한 키 자료입니다. M1→M2→M3→M4는 서로 다른 역할을 하며, 재전송 때문에 실제 패킷 수는 네 개보다 많을 수 있습니다. 메시지 번호만 세지 말고 방향·Pairwise·replay counter도 확인합니다.', anchor: 'four-way',
    steps: [step('local', 'Association 성공 상태', '교육 모델의 시작 조건', '이 문제는 같은 STA/AP의 Association이 성공한 직후부터 시작합니다.'), ...fourWay, protectedData]
  },
  {
    id: 'WLAN-04', short: '실패 / 복구', title: '잘못된 암호라면 어디서 멈출까요?',
    description: '교육 모델: WPA2 lab 암호가 불일치합니다. 이 사례에서는 Auth/Assoc가 성공하고, AP가 M2의 MIC 검증 실패를 기록합니다.',
    question: '이 사례의 중단 위치는 어디일까요?',
    options: ['Discovery 단계: 잘못된 암호면 Beacon도 보이지 않는다.', '보안 Handshake 단계: 연결 협상 뒤 키 확인이 완료되지 않는다.', 'Association은 성공했으므로 데이터 통신도 정상이다.'], correct: 1,
    answer: '이 사례는 Association 뒤 보안 Handshake에서 멈춥니다.',
    reason: '틀린 암호에서도 Auth/Assoc는 성공할 수 있지만 항상 성공하는 것은 아닙니다. 실제 캡처에 M3가 없다는 사실 하나만으로 원인을 확정하지 말고, 로그와 통신 결과를 함께 봅니다. 모델의 복구는 실제 장비 복구 증거가 아닙니다.', anchor: 'diagnosis',
    steps: [...openAuth, ...association, ...fourWay.slice(0, 2),
      step('stop', '키 확인 실패 · 중단', 'AP 내부 로그 · 교육용 가정', '이 모델의 AP 로그는 M2 MIC 검증 실패를 나타냅니다. 정상 M1~M4 완료와 보호된 데이터 성공은 성립하지 않습니다.'),
      step('local', '올바른 lab 암호로 복구', '교육 모델 · 실제 설정 변경 없음', '같은 실습 조건에서 올바른 값을 복구하고 새 연결을 시작합니다.'),
      step('both', 'Auth → Association 다시 성공', '복구 접속 · 관리 프레임 단계 요약', '복구 모델에서 Open Authentication과 Association 요청·성공 응답을 다시 거칩니다.'),
      ...fourWay, protectedData]
  },
  {
    id: 'WLAN-05', short: 'SAE', title: '새 WPA3-Personal 접속의 순서는?',
    description: '교육 모델: WPA3-Personal pure mode입니다. PMK 캐시와 Fast Transition을 사용하지 않는 새 SAE 접속을 가정합니다.',
    question: '올바른 순서를 골라 보세요.',
    options: ['Association → 4-Way → SAE', 'Open Authentication → 암호를 평문으로 전송 → Data', 'SAE Commit/Confirm → Association → 4-Way → Data'], correct: 2,
    answer: '새 SAE 접속은 SAE 성공 뒤 Association과 4-Way로 진행합니다.',
    reason: 'SAE는 Authentication 단계에서 PMK를 도출합니다. 그 뒤 4-Way로 Traffic Key를 준비합니다. PMKID 캐시 재접속에서는 SAE가 생략될 수 있으므로 이 새 접속 모델과 구분해야 합니다.', anchor: 'wpa2',
    steps: [
      step('to-ap', 'SAE Commit', 'STA → AP · Authentication', 'STA가 SAE Commit을 보냅니다. 여기부터 Open System Authentication과 방식이 다릅니다.'),
      step('to-sta', 'SAE Commit', 'AP → STA · Authentication', 'AP도 Commit을 교환합니다. 이 순서는 교육 모델의 한 예입니다.'),
      step('to-ap', 'SAE Confirm', 'STA → AP · Authentication', 'STA가 도출한 키 자료에 대한 확인 정보를 보냅니다.'),
      step('to-sta', 'SAE Confirm', 'AP → STA · Authentication', '양측 확인이 성공한 상황을 가정합니다. PMK는 각 측에서 도출되며 전송 프레임이 아닙니다.'),
      ...association, ...fourWay, protectedData]
  },
  {
    id: 'WLAN-06', short: 'PMF / RSN', title: 'PMF가 보호하는 것은 무엇일까요?',
    description: '교육 모델: Beacon 광고 확인 뒤 SAE가 이미 성공했다고 가정하고 PMF 협상 부분을 요약합니다. 공개 SAE 표본의 PMF 상태를 재현한 것이 아닙니다.',
    question: 'PMF에 대한 올바른 설명은 무엇일까요?',
    options: ['일부 관리 프레임을 보호하며, 데이터 암호화와 역할이 다르다.', 'Beacon부터 모든 802.11 프레임을 암호화한다.', 'AP 화면에 WPA3가 표시되면 현재 STA도 반드시 SAE이다.'], correct: 0,
    answer: 'PMF는 robust management frame 보호 기능입니다.',
    reason: 'PMF는 연결 후 Deauthentication·Disassociation·일부 Action 프레임을 보호합니다. 데이터 암호화와 별개이며 초기 Auth/Assoc와 모든 Beacon을 암호화하는 기능이 아닙니다. 실제 판정은 선택한 AKM과 PMF capability/requirement를 함께 봅니다.', anchor: 'pmf',
    steps: [
      step('to-sta', 'AP의 보안 방식 광고', 'Beacon · 지원 조건', '지원 광고만으로 STA가 선택한 AKM을 알 수는 없습니다.'),
      step('to-ap', 'STA의 SAE / PMF 협상', 'Association 요청 · 교육용 RSN 해석', 'SAE가 이미 성공한 뒤의 PMF 협상 부분을 요약합니다. 이 모델에서는 STA의 요청에서 SAE 선택과 PMF capability를 확인한 상황을 가정합니다.'),
      step('to-sta', 'Association 성공', 'AP → STA · 협상 결과', '성공 응답과 양측 보안 조건을 상관합니다. 실제 프레임에서 노출되지 않은 RSN 필드를 추정하면 안 됩니다.'),
      step('both', '4-Way 완료', 'M1 → M2 → M3 → M4 · 요약', '모델에서 키 준비가 완료됐습니다. RSN 비트만으로 데이터 통신 성공까지 증명하지는 않습니다.'),
      step('local', '관리 보호와 데이터 암호화', '서로 다른 역할', 'PMF는 일부 관리 프레임을 보호합니다. 데이터 암호화와 같은 기능도, 모든 관리 프레임의 암호화도 아닙니다.')]
  }
];


const $=id=>document.getElementById(id);
const el=$;const all=s=>Array.from(document.querySelectorAll(s));let index=0,lesson=0,stepIndex=0,recovered=false;

const adapter={raw:lessons,kind:'sequence',reset(i){index=i;$('sequenceList').innerHTML='';},show(i){$('sequenceList').innerHTML=lessons[index].steps.slice(0,i+1).map((s,k)=>'<li class="sequence-event '+s.direction+(k===i?' current':'')+'"><b>'+s.label+'</b><span>'+s.title+'</span></li>').join('');}};
adapter.presentation={
 names:{'STA-A':'PC A','AP-A':'AP A'},
 labels:{'STA → AP':'PC A → AP A','AP → STA':'AP A → PC A','STA ↔ AP':'PC A ↔ AP A','AP → 주변 STA':'AP A → 주변 단말','STA 내부':'PC A 내부','AP 내부 로그':'AP A 내부 로그','Discovery':'AP 발견','Protected Data':'보호된 데이터','lab 암호':'실습 암호','lab 설정':'실습 설정','Traffic Key':'Traffic Key'},
 lessons:lessons.map((l,i)=>({title:l.title,brief:[
  '학습 페이지의 PC A(STA)와 AP A를 사용합니다. AP 발견과 이후 인증을 구분해 관찰하세요.',
  'WPA2-Personal의 최초 접속입니다. 인증·연결 협상·보안 키 확인을 서로 다른 단계로 봅니다.',
  'PC A와 AP A의 Association이 성공한 직후입니다. M1~M4의 방향과 역할을 확인하세요.',
  '잘못된 실습 암호를 사용한 교육 모델입니다. 실패 위치를 보고 올바른 설정으로 복구한 새 연결을 관찰합니다.',
  'WPA3-Personal의 새 SAE 접속입니다. PMK 캐시와 FT를 사용하지 않는 조건에서 순서를 확인합니다.',
  'Beacon 광고와 실제 협상을 구분합니다. SAE 성공을 가정한 뒤 PMF와 데이터 암호화의 역할을 봅니다.'
 ][i],hints:[[
  '학습 페이지에서 AP를 발견하는 두 방법을 떠올려 보세요.','발견과 키 준비 완료는 서로 다른 상태입니다.'
 ],['Open System Authentication이 확인하는 범위를 생각해 보세요.','Association 다음에 아직 남아 있는 교환을 확인하세요.'],['PMK는 양측이 먼저 준비한 자료입니다.','M1의 방향과 M2에 등장하는 값을 비교하세요.'],['Association 결과와 키 확인 결과를 나눠 보세요.','관측한 실패 근거와 단순히 보이지 않는 프레임을 구분하세요.'],['새 SAE 접속과 캐시 재접속의 조건을 구분하세요.','기초 키 자료 준비와 실제 통신용 키 준비는 다른 단계입니다.'],['관리 프레임 보호와 데이터 암호화의 역할을 구분하세요.','AP 지원 광고만으로 PC A의 선택을 확정할 수 있는지 생각하세요.']][i]}))
};
const resetSequence=adapter.reset;
adapter.reset=i=>{resetSequence(i);const list=$('sequenceList');let host=$('wlanFlow');if(!host){host=document.createElement('div');host.id='wlanFlow';list.before(host);}WirelessLab.flow('wlanFlow',[{name:'PC A',role:'STA · Supplicant',kind:'pc'},{name:'AP A',role:'Authenticator',kind:'ap'}],'예상을 선택한 뒤 메시지 흐름을 실행하세요.');};
adapter.buildPlan=(i,mode='normal')=>mode!=='normal'?null:lessons[i].steps.map((s,k)=>{
 const moving=['to-ap','to-sta','both'].includes(s.direction),duration=moving?(s.direction==='both'?2070:1650):1470;
 return {title:s.title,detail:s.detail,kind:s.label,duration,modelStepIndex:k,action(){index=i;adapter.show(k);WirelessLab.flow('wlanFlow',[{name:'PC A',role:'STA · Supplicant',kind:'pc'},{name:'AP A',role:'Authenticator',kind:'ap'}],s.label.replace(/STA/g,'PC A').replace(/AP(?=\s|$)/g,'AP A'));$('simVisual').dataset.reveal='events';},animate(p){if(!moving)return;const movement=Math.min(1,p*duration/(s.direction==='both'?840:420));if(s.direction==='both'){const back=movement>.5;WirelessLab.motion('wlanFlow',back?1:0,back?0:1,back?(movement-.5)*2:movement*2);}else WirelessLab.motion('wlanFlow',s.direction==='to-ap'?0:1,s.direction==='to-ap'?1:0,movement);}};
});

NetworkSimulator.mount(adapter);
})();
