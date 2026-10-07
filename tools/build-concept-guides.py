"""Render concise Concept Guides, preserving original markup and evidence in details.
Run from the repository root. Inputs are authored text and the current original pages.
A version marker makes reruns replace only the concise guide, never nest the archive.
"""
import json,re,html
from pathlib import Path
E=lambda value:html.escape(str(value),quote=True)
topics=json.loads(Path('learning-data.json').read_text())['topics']
content=json.loads(Path('tools/concept-guide-content.json').read_text())
for item in content:
 slug=item['id'];idx=next(i for i,t in enumerate(topics) if t['id']==slug);t=topics[idx];p=Path(t['detailUrl']);s=p.read_text()
 if 'data-concept-audit="20261007"' in s:
  archive=re.search(r'<!-- ORIGINAL-CONCEPT-START -->(.*?)<!-- ORIGINAL-CONCEPT-END -->',s,re.S).group(1)
  s=re.sub(r'<link rel="stylesheet" href="concept-guide.css\?v=20261007">\s*','',s)
  s=re.sub(r'<script src="concept-guide.js\?v=20261007" defer></script>\s*','',s)
 else:
  archive=re.search(r'<main\b[^>]*>(.*?)</main>',s,re.S).group(1)
 archive=re.sub(r'<h1\b','<h2',archive);archive=archive.replace('</h1>','</h2>')
 archive=archive.replace('표시됩니다.로 보입니다.','표시됩니다.')
 main_id=re.search(r'<main[^>]*id="([^"]+)"',s)
 main_id=main_id.group(1) if main_id else 'cg-main'
 # Existing skip links can still resolve to the original main id.
 head=s.split('</head>')[0]
 head=re.sub(r'<title>.*?</title>',f'<title>{E(t["title"])} — 개념서</title>',head,flags=re.S)
 desc=f'<meta name="description" content="{E(item["goal"])}">'
 if re.search(r'<meta name="description"[^>]*>',head):head=re.sub(r'<meta name="description"[^>]*>',desc,head)
 else:head+='\n'+desc
 head+='\n<link rel="stylesheet" href="concept-guide.css?v=20261007">\n<script src="concept-guide.js?v=20261007" defer></script>\n</head>'
 lanes=[]
 for lane in item['lanes']:
  label,nodes=lane[:2]; signs=lane[2] if len(lane)>2 else ['→','→']
  route=''.join((f'<span class="cg-arrow{chr(32)+"cg-symbol" if signs[j-1]!="→" else ""}" aria-hidden="true">{E(signs[j-1])}</span>' if j else '')+f'<span class="cg-node">{E(n)}</span>' for j,n in enumerate(nodes))
  lanes.append(f'<div class="cg-lane"><strong class="cg-lane-label">{E(label)}</strong><div class="cg-route">{route}</div></div>')
 terms=''.join(f'<div><dt>{E(a)}</dt><dd>{E(b)}</dd></div>' for a,b in item['terms'])
 steps=''.join(f'<li>{E(v)}</li>' for v in item['steps'])
 rows=''.join(f'<tr><th scope="row">{E(a)}</th><td>{E(b)}</td></tr>' for a,b in item['compare'])
 memory=''.join(f'<li>{E(v)}</li>' for v in item['remember'])
 previous=topics[idx-1]
 body=f'''
<body class="concept-page" data-concept-audit="20261007">
<a class="cg-skip" href="#{main_id}">본문으로 건너뛰기</a>
<header class="cg-header"><div class="cg-shell cg-topbar"><a href="../roadmap.html">← 학습 로드맵</a><nav aria-label="학습 목차"><a href="#cg-picture">핵심 그림</a><a href="#cg-flow">동작 순서</a><a href="#cg-review">복습</a></nav></div></header>
<main id="{main_id}" tabindex="-1">
<section class="cg-hero"><div class="cg-shell"><p class="cg-kicker">{idx+1:02d} · 1단계 CONCEPT GUIDE</p><h1>{E(t['title'])}</h1><p class="cg-goal">{E(item['goal'])}</p><p class="cg-prior">앞선 학습 · <a href="{E(Path(previous['detailUrl']).name)}">{E(previous['title'])}</a>까지의 개념을 연결합니다.</p></div></section>
<section class="cg-section" id="cg-picture"><div class="cg-shell"><p class="cg-kicker">01 · 질문과 그림으로 시작</p><h2>{E(item['question'])}</h2><p class="cg-summary"><b>30초 핵심</b> · {E(item['summary'])}</p><figure class="cg-figure" aria-label="{E(t['title'])} 핵심 비교 그림">{''.join(lanes)}<figcaption>{E(item['caption'])}</figcaption></figure></div></section>
<section class="cg-section" id="cg-terms"><div class="cg-shell"><p class="cg-kicker">02 · 방금 본 그림에 이름 붙이기</p><h2>이름보다 역할을 먼저 기억하세요.</h2><dl class="cg-terms">{terms}</dl></div></section>
<section class="cg-section" id="cg-flow"><div class="cg-shell"><p class="cg-kicker">03 · 동작 순서</p><h2>핵심 흐름을 연결해 봅니다.</h2><ol class="cg-steps">{steps}</ol></div></section>
<section class="cg-section" id="cg-compare"><div class="cg-shell"><p class="cg-kicker">04 · 헷갈리는 지점</p><h2>헷갈리는 의미를 구분해서 읽으세요.</h2><table class="cg-table"><thead><tr><th scope="col">구분</th><th scope="col">뜻</th></tr></thead><tbody>{rows}</tbody></table></div></section>
<section class="cg-section" id="cg-review"><div class="cg-shell"><p class="cg-kicker">05 · 복습</p><h2>꼭 기억할 세 가지</h2><div class="cg-review"><ul>{memory}</ul><article class="cg-question"><h3>내 말로 설명하기</h3><p>{E(item['explain'])}</p></article></div></div></section>
<section class="cg-section" id="cg-next"><div class="cg-shell"><div class="cg-next"><div><p class="cg-kicker">2단계 · INTERACTIVE LAB</p><h2>예상한 뒤 직접 확인해 보세요.</h2><p>방금 배운 원리를 실습에서 관찰합니다.</p></div><a class="cg-primary" href="{slug}-simulator.html">실습 페이지로 이동 →</a></div><p class="cg-scope">학습 범위 · {E(item['scope'])}</p></div></section>
<details class="cg-shell cg-evidence" id="cg-evidence"><summary>선택 · 기존 상세 설명과 검증 근거 보기</summary><p class="cg-evidence-intro">아래는 기존 상세 자료입니다. 첫 학습의 필수 단계가 아니며, 당시의 구현·관측 조건과 한계를 함께 보존했습니다. 이번 개편은 설명과 화면 검수이며 실제 장비 검증을 새로 수행한 기록이 아닙니다.</p><div class="cg-archive"><!-- ORIGINAL-CONCEPT-START -->{archive}<!-- ORIGINAL-CONCEPT-END --></div></details>
</main>
<footer class="cg-footer"><div class="cg-shell">{E(t['title'])} · 개념 이해 → 실습 확인</div></footer>
</body>
</html>
'''
 p.write_text(head+body)
 print(slug)
