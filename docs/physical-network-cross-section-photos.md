# 실제 케이블 절단면 사진 추가

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
