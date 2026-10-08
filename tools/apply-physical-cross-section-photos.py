"""Apply an isolated, provenance-preserving physical concept photo enhancement."""
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image
import hashlib
import io
import json

root = Path(__file__).resolve().parent.parent
html_path = root / 'labs/physical-network.html'
original_html = html_path.read_bytes()
blob = hashlib.sha1(b'blob ' + str(len(original_html)).encode() + b'\0' + original_html).hexdigest()
assert blob == 'cde5ee2e8b428364f78601460b99c1fc333d2ae2', f'Unexpected baseline: {blob}'
photos = [
    ('cat5e', '4/45', 'Cross_section_of_a_Cat5e_patch_cable.jpg', '9cf7f2c45afc35aa8e832f8659c1f6ed229cf466'),
    ('cat6', '4/41', 'Cross_section_of_a_Cat6_patch_cable.jpg', '05fd9cc30d0579635ea05848b70e1c2217e08587'),
]
manifest = {'checkedAt': '2026-10-08', 'author': 'TubeTimeUS', 'license': 'CC BY-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/', 'networkLabExecuted': False, 'photos': []}
images = root / 'labs/images'
images.mkdir(exist_ok=True)
for slug, directory, filename, expected in photos:
    url = 'https://upload.wikimedia.org/wikipedia/commons/' + directory + '/' + filename
    with urlopen(Request(url, headers={'User-Agent': 'Network-Learning-PhotoReview/1.0 (https://sebia1993.github.io/)'}), timeout=40) as response:
        data = response.read()
        assert response.status == 200 and response.headers.get_content_type() == 'image/jpeg'
    assert hashlib.sha1(data).hexdigest() == expected, f'Source bytes changed: {slug}'
    image = Image.open(io.BytesIO(data))
    assert image.size == (4032, 3024) and image.format == 'JPEG'
    source_path = images / f'{slug}-cross-section-original.jpg'
    preview_path = images / f'{slug}-cross-section.jpg'
    source_path.write_bytes(data)
    image = image.convert('RGB')
    image.thumbnail((1200, 900), Image.Resampling.LANCZOS)
    image.save(preview_path, 'JPEG', quality=86, optimize=True, progressive=True)
    manifest['photos'].append({'category': slug, 'title': filename.replace('_', ' '), 'sourcePage': 'https://commons.wikimedia.org/wiki/File:' + filename, 'sourceImage': url, 'originalPath': str(source_path.relative_to(root)), 'previewPath': str(preview_path.relative_to(root)), 'originalSha1': expected, 'originalSha256': hashlib.sha256(data).hexdigest(), 'previewSha256': hashlib.sha256(preview_path.read_bytes()).hexdigest(), 'originalDimensions': [4032, 3024], 'previewDimensions': [1200, 900], 'changes': 'Preview resized and JPEG recompressed only. No cropping, retouching, color editing, annotation or generated content. Original bytes retained.'})
(root / 'docs/physical-network-photo-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

insert = '''<section id="utp-cross-section-photos" class="utp-real-photos" aria-labelledby="utp-real-photo-title"><h4 id="utp-real-photo-title">실제 케이블을 잘라 보면 이렇게 보입니다.</h4><p>위 그림과 아래의 <b>실제 절단면 사진</b>을 비교해 보세요. 케이블을 가로로 잘라 끝에서 본 모습입니다. 먼저 <b>바깥 겉피복 → 안쪽 8가닥 → 가운데 분리대</b> 순서로 살펴보세요.</p><div class="utp-real-photo-grid"><figure class="utp-real-photo"><h5>Cat5e · 실제 단면</h5><a class="utp-real-photo-link" href="images/cat5e-cross-section-original.jpg" target="_blank" rel="noopener" aria-label="Cat5e 실제 단면 고해상도 원본 크게 보기, 새 탭"><img src="images/cat5e-cross-section.jpg" width="1200" height="900" loading="lazy" decoding="async" alt="검은 겉피복 안에 절연된 심선 8가닥이 모여 있고 중앙 분리대는 보이지 않는 Cat5e 패치 케이블의 실제 절단면"><span class="utp-photo-open">원본 크게 보기 ↗</span></a><figcaption><p><b>이 샘플에는 중앙 분리대가 없습니다.</b><br>검은 겉피복 안에 절연된 심선 8가닥이 모여 있습니다. 각 심선의 끝에는 구리가 보입니다.</p><p class="utp-photo-credit">사진: TubeTimeUS · <a href="https://commons.wikimedia.org/wiki/File:Cross_section_of_a_Cat5e_patch_cable.jpg">Wikimedia Commons 원본 설명</a><br><a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license">CC BY-SA 4.0</a> · 표시용 사진은 크기 축소·JPEG 재압축</p></figcaption></figure><figure class="utp-real-photo"><h5>Cat6 · 실제 단면</h5><a class="utp-real-photo-link" href="images/cat6-cross-section-original.jpg" target="_blank" rel="noopener" aria-label="Cat6 실제 단면 고해상도 원본 크게 보기, 새 탭"><img src="images/cat6-cross-section.jpg" width="1200" height="900" loading="lazy" decoding="async" alt="노란 겉피복 안에서 회색 X자형 분리대가 절연된 심선 4쌍을 나누는 Cat6 패치 케이블의 실제 절단면"><span class="utp-photo-open">원본 크게 보기 ↗</span></a><figcaption><p><b>가운데 회색 X자 부분이 분리대입니다.</b><br>네 쌍 사이를 나누는 모습을 볼 수 있습니다. 위의 십자형 그림과 비교해 보세요.</p><p class="utp-photo-credit">사진: TubeTimeUS · <a href="https://commons.wikimedia.org/wiki/File:Cross_section_of_a_Cat6_patch_cable.jpg">Wikimedia Commons 원본 설명</a><br><a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="license">CC BY-SA 4.0</a> · 표시용 사진은 크기 축소·JPEG 재압축</p></figcaption></figure></div><p class="utp-photo-reading"><b>작은 구리점이 여러 개 보이는 이유</b> · 이 사진의 케이블은 한 심선 안에 가는 구리선 여러 개를 묶은 구조입니다. 구리점 하나하나를 별도의 심선으로 세지 않습니다. <b>꼬여 이어지는 모습</b>은 아래의 <a href="#utp-inside">겉피복을 벗긴 4쌍 사진</a>에서 확인하세요.</p><p class="utp-photo-scope">사진은 학습용 패치 케이블 샘플이며 우리 사업장 케이블이 아닙니다. 두 사진은 <b>같은 배율의 굵기 비교가 아닙니다.</b> 검정·노랑은 이 샘플의 겉피복 색이며 등급을 정하는 기준이 아닙니다. <b>분리대가 없는 Cat6도 있으므로</b> 단면만으로 등급을 확정하지 마세요.</p><details class="sfp-extra utp-photo-provenance"><summary>사진 출처와 참고한 비교 글</summary><div><p>두 사진은 TubeTimeUS가 2019년 4월 30일 촬영하고 Wikimedia Commons에 공개한 실제 사진입니다. 표시용 사본은 크기와 JPEG 압축만 조정했고, 잘라내기·색상 보정·합성은 하지 않았습니다. 사진을 누르면 보존한 고해상도 원본이 열립니다. 사진의 이용 조건은 <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>입니다.</p><p>참고한 비교 글: <a href="https://m.blog.naver.com/bi-zdoc/222231800588">IT KEVIN · 랜 케이블 CAT5e·CAT6 차이점</a>. 블로그 사진을 재게시하지 않았으며, 위 실제 사진의 출처는 각 사진 아래에 별도로 표시했습니다. 성능·구조 판단은 본문의 공식 자료와 제품별 조건을 따릅니다.</p><p><a href="../docs/physical-network-cross-section-photos.md">사진별 확인 범위와 출처 기록</a></p></div></details></section>'''
text = original_html.decode('utf-8')
replacements = {
    '<link rel="stylesheet" href="physical-network-applications.css?v=20261008-places">': '<link rel="stylesheet" href="physical-network-applications.css?v=20261008-places"><link rel="stylesheet" href="physical-network-photos.css?v=20261008-cross-section">',
    '아래 실제 사진처럼, 바깥 피복 안에 꼬인 선 쌍이 보입니다.': '분리대가 없는 케이블의 내부를 단순화한 모습입니다.',
    '단면을 단순화한 학습용 그림입니다. 회색 바깥 고리는 겉피복, 작은 원은 절연된 심선이며 실제 치수·배열을 나타내지 않습니다. 꼬인 모습은 아래 사진에서 확인하세요.</figcaption></figure><div class="utp-category-caution">': '단면을 단순화한 학습용 그림입니다. 회색 바깥 고리는 겉피복, 작은 원은 절연된 심선이며 실제 치수·배열을 나타내지 않습니다. 바로 아래 실제 절단면과 비교해 보세요.</figcaption></figure>' + insert + '<div class="utp-category-caution">'
}
for old, new in replacements.items():
    assert text.count(old) == 1, f'Ambiguous or missing patch anchor: {old[:100]}'
    text = text.replace(old, new)
html_path.write_bytes(text.encode('utf-8'))

(root / 'labs/physical-network-photos.css').write_text('''/* Real specimen photographs only. Preserve the concept theme and full image bounds. */
.physical-concept .utp-real-photos{margin-top:28px;scroll-margin-top:24px}
.physical-concept .utp-real-photos>h4{font-size:1.16rem;line-height:1.6;margin:0 0 10px;color:var(--cg-text)}
.physical-concept .utp-real-photo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:18px 0}
.physical-concept .utp-real-photo{min-width:0;margin:0;padding:18px;border:1px solid var(--cg-line);border-radius:16px;background:var(--cg-surface);overflow-wrap:anywhere}
.physical-concept .utp-real-photo h5{font-size:1.1rem;line-height:1.6;margin:0 0 14px;color:var(--cg-text)}
.physical-concept .utp-real-photo-link{display:block;min-width:0;border-radius:10px;text-decoration:none;background:var(--cg-raised);border:1px solid var(--cg-line)}
.physical-concept .utp-real-photo-link img{display:block;width:100%;max-width:100%;height:auto;aspect-ratio:4/3;object-fit:contain;border-radius:9px 9px 0 0}
.physical-concept .utp-photo-open{display:block;min-height:44px;padding:10px 14px;text-align:center;font-size:.85rem;line-height:1.6;color:var(--cg-text)}
.physical-concept .utp-real-photo figcaption{margin-top:14px;font-size:.92rem;line-height:1.85;color:var(--cg-text)}
.physical-concept .utp-real-photo figcaption p{margin:0 0 12px}
.physical-concept .utp-real-photo .utp-photo-credit{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--cg-line);font-size:.78rem;color:var(--cg-muted);line-height:1.8}
.physical-concept .utp-photo-reading{font-size:.94rem}
.physical-concept .utp-photo-scope{font-size:.86rem;color:var(--cg-muted)!important}
@media(max-width:700px){.physical-concept .utp-real-photo-grid{grid-template-columns:minmax(0,1fr);gap:16px}.physical-concept .utp-real-photo{padding:14px}}
@media(forced-colors:active){.physical-concept .utp-real-photo,.physical-concept .utp-real-photo-link{border:1px solid CanvasText}.physical-concept .utp-photo-open{color:LinkText}}
''', encoding='utf-8')

(root / 'docs/physical-network-cross-section-photos.md').write_text('''# 실제 케이블 절단면 사진 추가

확인일: 2026-10-08. 대상: `labs/physical-network.html#utp-cross-section-photos`.

## 요청과 범위

기존 Cat5e/Cat6 단면 도식 아래에 실제 절단면 사진을 추가한다. 도식, 규격 비교표, 장소 사례, 실습과 로드맵은 보존한다. 변경 영향은 REVIEW: 사진의 표본별 특징을 기존 구조 설명과 대조했으며, 새로운 프로토콜 동작이나 배선 성능 검증은 추가하지 않았다.

## 출처

- Cat5e: [TubeTimeUS, Cross section of a Cat5e patch cable.jpg](https://commons.wikimedia.org/wiki/File:Cross_section_of_a_Cat5e_patch_cable.jpg)
- Cat6: [TubeTimeUS, Cross section of a Cat6 patch cable.jpg](https://commons.wikimedia.org/wiki/File:Cross_section_of_a_Cat6_patch_cable.jpg)
- 두 사진 모두 촬영일 2019-04-30, 직접 촬영 자료, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). 작가가 표시한 등급을 사용했다. 직접 성능 인증한 케이블로 표현하지 않는다.
- [사용자 지정 IT KEVIN 비교 글](https://m.blog.naver.com/bi-zdoc/222231800588): 2021-02-04 게시. 2026-10-08 원문을 일반 공개 GET으로 확인. 내부 구조를 실물과 비교하는 학습 요구의 참고 자료다. 사진 재사용 허락은 확인되지 않아 블로그 이미지나 스크린샷을 재게시하지 않는다. 블로그의 속도·굵기·분리대 일반화 문구는 기술 근거로 도입하지 않았다.
- 분리대 없는 Cat6 예외의 기존 근거: [Leviton 310-UTP6P-MLB](https://leviton.com/products/310-utp6p-mlb). 기존 주장과 사양 출처를 그대로 보존.

## 사진에서 확인한 범위

Cat5e 사진: 검은 겉피복, 절연된 심선 8개, 중앙 분리대가 보이지 않는 표본. Cat6 사진: 노란 겉피복, 회색 X형 분리대가 네 쌍 사이를 나누는 표본. 두 사진 모두 심선 끝의 여러 작은 금속 단면이 보인다. 작은 구리점 하나를 독립 심선으로 세지 않도록 짧게 설명했다.

색상, 가공된 절단면의 배열, 사진상 크기만으로 등급·도체 굵기·절대 지름·PoE·지원 속도를 판정하지 않는다. 단면은 절단 방향이고 꼬임을 길이 방향으로 보여주지는 않으므로 기존 겉피복을 벗긴 실제 사진으로 연결한다. 분리대 없는 Cat6도 있다는 기존 예외를 유지한다.

## 이미지 처리와 라이선스

원본은 4032×3024 JPEG이며 바이트 그대로 보존한다. 본문용 1200×900 JPEG만 종횡비를 유지해 축소·재압축했다. 잘라내기, 색상 보정, 피사체 변형, 텍스트 합성, 생성형 이미지는 사용하지 않았다. 원본과 표시용 파생 사진 모두 CC BY-SA 4.0로 제공하며 각 사진에 작가·출처·라이선스·변경 여부를 명시한다. 이 라이선스 표기는 사진에 관한 것이며 사이트의 다른 파일에 대한 라이선스를 변경하지 않는다.

[이미지 URL·경로·해시·변경 내역](physical-network-photo-sources.json)을 별도 보존한다. 사진은 서버에 함께 배포하고 외부 이미지 hotlink에 의존하지 않는다. 표시용 사진을 누르면 로컬 고해상도 원본이 새 탭으로 열린다.

## 학습자/회귀검사

0단계 첫 주제인 물리 네트워크의 일반인 기준을 유지한다. 새 과목·새 실습·명령어·추가 테스트 장비를 학습자에게 요구하지 않는다. 도식과 실사진을 명확히 분리하고 표본 특징을 일반 규격으로 확대하지 않는다.

재현 검사: `tests/physical-network-photos.test.mjs`, `tests/physical-network-photos-browser.mjs`. 사진 2개, 실제 JPEG 디코딩, 원본/축소본 해시, 저작자와 라이선스, 기본 노출, 원본 열기, 모바일 1열/데스크톱 2열, 200% 텍스트 확대, 키보드·JavaScript 비활성·강제 색상 환경, 기존 학습↔실습 이동을 확인한다. 공개 배포본에서는 HTML/CSS/사진 4개 해시 및 브라우저 조작을 재검증한다.

실제 케이블 측정·PNETLab: NOT_RUN. 문헌·사진·브라우저 검토를 실물 장비 측정으로 표현하지 않는다. 로컬·공개 검사의 실제 결과는 실행 산출물과 Actions 로그에 기록한다.
''', encoding='utf-8')
print('Applied 3 guarded substitutions and added 4 attributed JPEG assets with provenance.')
