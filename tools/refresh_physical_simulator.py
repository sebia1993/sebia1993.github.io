"""Guarded refinement of the already synced simulator. No guide/model/reference edits."""
from pathlib import Path
import hashlib

ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
'labs/physical-network-lessons.js':'0951c488e24648a6ad9268b14d18f3194461ccd4',
'labs/physical-network-simulator.js':'5e2da3104425c8300fe72376977cede546ddeaba',
'labs/physical-network-simulator.css':'0a9276966799e24b6362493aca92280e0bcf87c9',
'labs/physical-network-simulator.html':'a0fdbc59d9bf6216f053db599f134b640fa1cc57',
}
for name,sha in EXPECTED.items():
    b=(ROOT/name).read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    assert actual==sha,(name,actual)

def replace(text, old, new):
    assert text.count(old)==1,('missing/ambiguous anchor',old[:100],text.count(old))
    return text.replace(old,new)

p=ROOT/'labs/physical-network-lessons.js'; s=p.read_text()
s=replace(s,"const extra=[",'''const source=(url,label)=>`<p class="inspection-source"><a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗<span class="inspection-sr-only"> (새 탭)</span></a></p>`;
const distanceBar=(step,percent,label,conditional=false)=>`<div class="inspection-distance" data-reveal-step="${step}" hidden><p>${label}</p><div class="inspection-ruler" aria-hidden="true"><span>0 m</span><span>50 m</span><span>100 m</span></div><div class="inspection-track" aria-hidden="true"><span class="inspection-range${conditional?' conditional':''}" style="width:${percent}%"></span></div></div>`;
const coreAnchors={normal:'cg-picture',utp:'utp',sfp:'sfp',fiber:'fiber'};
const extra=[''')
s=replace(s,"</a><figcaption>TubeTimeUS",'''</a>${reveal(category==='cat5e'?0:1,category==='cat5e'?'이 샘플: 절연된 심선 8가닥 · 4쌍. 가운데 분리대는 보이지 않습니다.':'이 샘플: 회색 X형 분리대가 네 쌍 사이를 나눕니다.')}<figcaption>TubeTimeUS''')
s=replace(s,"공식 제품 반례: Leviton 310-UTP6P-MLB는 중앙 분리대가 없는 Cat6입니다. 구조 관찰과 등급 확인은 별개입니다.",'''공식 제품 반례: <a href="https://leviton.com/products/310-utp6p-mlb" target="_blank" rel="noopener noreferrer">Leviton 310-UTP6P-MLB (새 탭)</a>는 중앙 분리대가 없는 Cat6입니다. 구조 관찰과 등급 확인은 별개입니다.''')
s=replace(s,"reveal(1,'케이블 등급만 변경 · 장비와 설정 유지')",'''reveal(1,'규격 대역폭: <b>Cat5e 100 MHz → Cat6 250 MHz</b><br>MHz는 신호를 전달하는 주파수 성능입니다. 장비와 설정은 유지합니다.')''')
s=replace(s,"모델의 링크 속도: 1G → 1G. 케이블만으로 포트의 지원 속도가 바뀌지 않습니다.","모델의 링크 속도: <b>1 Gbps → 1 Gbps</b>. Gbps는 초당 데이터 전송량입니다. MHz가 2.5배가 되어도 링크가 자동으로 2.5배 빨라지지 않습니다.")
s=replace(s,"정상 Cat5e를 조건에 맞는 Cat6로 바꿉니다. 전체 거리 20m와 양쪽 장비·설정·PoE 조건은 유지합니다.","Cat5e 100 MHz에서 Cat6 250 MHz로 바꿉니다. 이는 케이블의 주파수 성능이며, 전체 20m와 양쪽 장비·설정·PoE 조건은 유지합니다.")
s=replace(s,"장비 A — 패치 케이블 — 고정 배선 — 패치 케이블 — 장비 B", "전체 경로 = 양끝 패치 케이블 + 고정 배선")
s=replace(s,"reveal(1,'55m 이내 조건부 검토. 특히 37~55m는 인접 케이블 간섭에 좌우됩니다.')", "distanceBar(1,55,'55m 이내 조건부 검토. 특히 37~55m는 인접 케이블 간섭에 좌우됩니다.',true)")
s=replace(s,"reveal(2,'최대 100m 기준. 전체 연결 경로의 사양·설치 조건을 함께 확인합니다.')", "distanceBar(2,100,'최대 100m 기준. 전체 연결 경로의 사양·설치 조건을 함께 확인합니다.')")
s=replace(s,'<div class="inspection-request"><b>필요한 연결: 10G · 전체 100m</b><p>전체 경로 = 양끝 패치 케이블 + 고정 배선</p></div>', '<div class="inspection-request"><b>필요한 연결: 10G · 전체 100m</b><p>전체 경로 = 양끝 패치 케이블 + 고정 배선</p><p>막대는 속도가 아니라 <b>거리</b>입니다. 두 행은 같은 0~100m 눈금이며, 사선은 조건부 검토를 뜻합니다. 짧은 거리도 자동 보장되지 않습니다.</p></div>')
s=replace(s,"reveal(0,'Cat5e 기반 학교 네트워크 개선 사례'))", "reveal(0,'Cat5e 기반 학교 네트워크 개선 사례')+source('https://icc.com/success-stories/2011-success-stories/','ICC · 학교 사례 원문'))")
s=replace(s,"reveal(1,'전화·데이터 통신 증설에 Cat5e + Cat6 함께 사용'))", "reveal(1,'전화·데이터 통신 증설에 Cat5e + Cat6 함께 사용')+source('https://icc.com/success-stories/health-care-facility-headquarters-installs-cat5e-and-cat6-structured-cabling-system/','ICC · 의료기관 사례 원문'))")
s=replace(s,"reveal(2,'Cat6 구축 사례. 다른 관공서의 배선 등급까지 뜻하지는 않음')))", "reveal(2,'Cat6 구축 사례. 다른 관공서의 배선 등급까지 뜻하지는 않음')+source('https://icc.com/success-stories/city-of-missoula-awards-project-to-elite-installer/','ICC · 관공서 사례 원문')),card('logistics','기업 사무실·물류시설','<p>영국 히스로공항 · Expeditors 사무실·창고</p><p>공사 완료: 2011년 3월<br>소개 글 게시: 2022년 9월</p>'+reveal(3,'사무실·창고의 연결 지점: <b>Cat6</b><br>주요 통신실 사이: <b>광케이블</b><br>같은 사업장에서도 연결 구간에 따라 매체가 다릅니다.')+source('https://www.ics-panduit.com/expeditors-structured-cabling-system/','ICS · 사무실·창고 사례 원문')))")
s=replace(s,"이 기록을 모든 관공서의 설치 기준으로 일반화하지 않습니다.',['office'])]}","이 기록을 모든 관공서의 설치 기준으로 일반화하지 않습니다.',['office']),event('같은 사업장의 서로 다른 연결 구간','Expeditors 사례는 사무실·창고에 Cat6, 주요 통신실 사이에 광케이블을 사용했습니다. 2011년 공사 완료와 2022년 소개 글 게시를 구분합니다.',['logistics'])]}")
s=replace(s,"anchor:'cg-picture',title:wording(s.title)","anchor:coreAnchors[s.id],title:wording(s.title)")
p.write_text(s)

p=ROOT/'labs/physical-network-simulator.js'; s=p.read_text()
s=replace(s,"physical-network-lessons.js?v=20261008-concept-sync","physical-network-lessons.js?v=20261008-material-review")
s=replace(s,"const playing=phase==='RUNNING'||phase==='PAUSED';", "const playing=phase==='RUNNING'||phase==='PAUSED',inspection=scenarios[index].kind==='inspection';")
s=replace(s,"'예상 선택 완료 · 실행해서 연결 상태를 확인하세요.'", "(inspection?'예상 선택 완료 · 실행해서 사진·자료의 근거를 확인하세요.':'예상 선택 완료 · 실행해서 연결 상태를 확인하세요.')")
s=replace(s,"option.textContent=name+' · 4문제';", "option.textContent=name+' · '+scenarios.filter(s=>s.group===i).length+'문제';")
p.write_text(s)

p=ROOT/'labs/physical-network-simulator.html'; s=p.read_text()
s=replace(s,"physical-network-simulator.css?v=20261008-concept-sync", "physical-network-simulator.css?v=20261008-material-review")
s=replace(s,"physical-network-simulator.js?v=20261008-concept-sync", "physical-network-simulator.js?v=20261008-material-review")
s=s.replace('내 예상과 모델 결과 비교','내 예상과 관찰 결과 비교')
p.write_text(s)

p=ROOT/'labs/physical-network-simulator.css'
p.write_text(p.read_text()+'''
/* Same distance scale in both cards; numbers remain the accessible source of meaning. */
#physicalLab .inspection-source{font-size:11px;margin-top:12px}
#physicalLab .inspection-source a{display:inline-block;padding:8px 0}
#physicalLab .inspection-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
#physicalLab .inspection-distance{margin:12px 0 4px}
#physicalLab .inspection-ruler{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin:10px 0 6px}
#physicalLab .inspection-track{height:14px;background:var(--line);border:1px solid var(--line);border-radius:4px;overflow:hidden}
#physicalLab .inspection-range{display:block;height:100%;background:var(--green2)}
#physicalLab .inspection-range.conditional{background:repeating-linear-gradient(135deg,var(--blue),var(--blue) 4px,var(--blue-soft) 4px,var(--blue-soft) 8px)}
@media(forced-colors:active){#physicalLab .inspection-track{border-color:CanvasText;background:Canvas}#physicalLab .inspection-range{background:Highlight}#physicalLab .inspection-range.conditional{background:Canvas;border:2px dashed CanvasText}}
''')
print('Updated simulator-only material review; guide/model/images/reference files preserved.')
