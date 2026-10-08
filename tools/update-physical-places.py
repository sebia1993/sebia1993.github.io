from pathlib import Path
import hashlib

p = Path('labs/physical-network.html')
data = p.read_bytes()
s = data.decode('utf-8')
if 'id="utp-application-cases"' in s:
    raise SystemExit('Place-based examples already applied; no mutation performed.')
expected = 'b1884ad36cfdf6e91b11f092de2c0ebb218c66be'
actual = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
assert actual == expected, f'Unexpected input blob: {actual}'
old = '<tr><th scope="row">적용 환경 예</th><td>PC·AP·IP 전화기 등. 기존 배선은 필요한 속도와 상태를 확인해 활용</td><td>같은 종류의 장비에 사용 가능. 2.5G·5G 연결이나 제한된 거리의 10G를 검토하는 환경</td></tr>'
new = '<tr id="utp-application-places"><th scope="row">실제 사용 장소 예</th><td><b>학교·의료기관의 업무 공간</b><br>학교 네트워크 개선과 의료기관의 전화·데이터 통신 증설에 사용된 공개 사례</td><td><b>관공서·기업 사무실·물류시설</b><br>경찰 부서 업무 공간과 기업 사무실·창고 배선에 사용된 공개 사례</td></tr>'
assert s.count(old) == 1
s = s.replace(old, new)
insert = '''<div class="utp-category-caution utp-place-note"><p><b>장소는 사용 예시이지, 케이블을 구분하는 기준은 아닙니다.</b> 같은 종류의 시설에서도 Cat5e와 Cat6를 사용할 수 있습니다. 필요한 통신 속도·연결 거리·장비와 전체 배선의 조건을 함께 보고 판단하세요.</p></div><details id="utp-application-cases" class="sfp-extra utp-application-cases"><summary>실제 구축 사례 보기 · 관공서·학교·의료기관·사무실</summary><div><p class="utp-case-scope">아래는 <b>제조사·시공사가 공개한 해외 구축 사례</b>입니다. 각 자료에 기록된 시점의 사례이며, 국내 시설의 공통 기준이나 해당 시설의 현재 배선 상태를 뜻하지 않습니다.</p><div class="utp-place-grid"><article class="utp-place-card"><p class="utp-place-type">관공서 · 경찰 부서 업무 공간</p><h4>미줄라시 경찰 부서 건물</h4><p class="utp-case-meta">미국 몬태나 · <b>Cat6</b><br>사례 공개: <time datetime="2019-08-16">2019년 8월 16일</time></p><p>수사 인력과 증거 보관 공간을 위한 건물을 개보수하며, 업무 공간의 연결 지점과 통신실 사이에 Cat6 배선을 구축했습니다. 약 170개 연결 지점이 소개되어 있습니다.</p><p class="utp-case-source"><a href="https://icc.com/success-stories/city-of-missoula-awards-project-to-elite-installer/" target="_blank" rel="noopener noreferrer">ICC · 경찰 부서 구축 사례 원문 ↗<span class="utp-sr-only"> (새 탭)</span></a></p></article><article class="utp-place-card"><p class="utp-place-type">학교 · 교육구 네트워크</p><h4>Clear Creek 교육구</h4><p class="utp-case-meta">미국 텍사스 · <b>Cat5e</b><br>자료에 기록된 사례 시점: <time datetime="2011-06">2011년 6월</time></p><p>학교 네트워크를 Cat5e 기반의 통합 배선으로 개선한 사례입니다. Cat5e도 학교와 같은 기관의 네트워크에 사용되었다는 점을 보여줍니다.</p><p class="utp-case-source"><a href="https://icc.com/success-stories/2011-success-stories/" target="_blank" rel="noopener noreferrer">ICC · 2011년 구축 사례 모음 ↗<span class="utp-sr-only"> (새 탭)</span></a></p></article><article class="utp-place-card"><p class="utp-place-type">의료기관 · 본부 업무 공간</p><h4>뉴저지 의료기관 본부</h4><p class="utp-case-meta">미국 뉴저지 · <b>Cat5e + Cat6</b><br>사례 공개: <time datetime="2016-02-01">2016년 2월 1일</time> · 기관명 미공개</p><p>전화·데이터 통신 증설에 Cat5e와 Cat6 케이블, 접속부, 패치패널을 함께 사용했습니다. <b>같은 시설에서도 두 등급을 함께 쓸 수 있습니다.</b></p><p class="utp-case-source"><a href="https://icc.com/success-stories/health-care-facility-headquarters-installs-cat5e-and-cat6-structured-cabling-system/" target="_blank" rel="noopener noreferrer">ICC · 의료기관 구축 사례 원문 ↗<span class="utp-sr-only"> (새 탭)</span></a></p></article><article class="utp-place-card"><p class="utp-place-type">기업 사무실 · 물류시설</p><h4>Expeditors 사무실·창고</h4><p class="utp-case-meta">영국 히스로공항 화물 구역 · <b>Cat6 + 광케이블</b><br>공사 완료: <time datetime="2011-03">2011년 3월</time> · 소개 글 게시: <time datetime="2022-09-13">2022년 9월 13일</time></p><p>사무실·창고에는 Cat6 연결 지점 4,644개를 설치하고, 주요 통신실 사이에는 광케이블을 구축했습니다. <b>같은 사업장도 연결 구간에 따라 매체를 달리 쓴 사례</b>입니다.</p><p class="utp-case-source"><a href="https://www.ics-panduit.com/expeditors-structured-cabling-system/" target="_blank" rel="noopener noreferrer">ICS · 사무실·창고 구축 사례 원문 ↗<span class="utp-sr-only"> (새 탭)</span></a></p></article></div><p class="utp-case-scope">출처 확인: <time datetime="2026-10-08">2026년 10월 8일</time>. 공개 자료의 케이블 등급과 사용 구간만 요약했습니다. 공개되지 않은 링크 속도·장비 모델·국내 설치 현황을 추정하지 않았습니다. <a href="../docs/physical-network-application-cases.md">사례별 근거와 확인 범위</a></p></div></details>'''
anchor = '<figure class="cg-figure utp-distance-figure"'
assert s.count(anchor) == 1
s = s.replace(anchor, insert + anchor)
anchor = '<link rel="stylesheet" href="physical-network-concept.css?v=20261008-cat-compare">'
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + '<link rel="stylesheet" href="physical-network-applications.css?v=20261008-places">')
p.write_text(s, encoding='utf-8', newline='')
print('Applied three guarded substitutions; all other HTML bytes preserved.')
