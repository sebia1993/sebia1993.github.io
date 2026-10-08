# 물리 네트워크 실습 — 학습자료 반영 보완

작업일: 2026-10-08. 기준: `753071f59490dd7add58b39d8ff15ee1a591b230`.
대상은 `labs/physical-network-simulator.html`이며 학습 HTML·사진·공유 CSS·물리 모델·토폴로지·ARP/IP 기준·로드맵은 변경하지 않는다.

## 이번 변경과 기존 작업의 구분

기존 12문제/3묶음과 정답·모델을 유지한다. 이미 반영된 단면 사진과 광규격 문제를 새로 추가했다고 보고하지 않는다.

| 기존 실습 | 이번 보완 | 학습 근거 |
|---|---|---|
| 실제 단면 관찰 | 사진별 표본 특징을 해당 관찰 단계에서 공개. 분리대 없는 Cat6 제품의 공식 사양 링크 제공 | utp-cross-section-photos / utp-cat5e-cat6 |
| Cat6로 바꾸면? | 100 MHz→250 MHz와 1 Gbps→1 Gbps를 별도 단위·단계로 비교. 양쪽 최대 1G·정상 전체 20m·PoE 조건 그대로 | utp-category-guide |
| 10G · 100m 선택 | 같은 0~100m 거리 눈금에 Cat6 조건부 55m와 Cat6A 100m를 표시. 사선·거리·전체 경로·자동 보장 아님을 텍스트 병기 | utp-category-guide |
| 장소와 등급 | 학교·의료기관·관공서에 기존 학습의 Expeditors 사무실/창고 사례를 함께 관찰. 각 사례 원문 링크와 시점 표시 | utp-application-cases |
| 기존 연결 문제 | UTP/지빅/광케이블 문제의 학습 복귀 앵커를 각각 utp/sfp/fiber로 수정 | 해당 학습 절 |

묶음 문제 수는 시나리오 목록에서 계산한다. 자료 관찰형 문제에는 사진·자료를 확인한다는 조작 안내를 사용한다. 재생 간격 2490ms·정오답·기록·기존 상태 모델은 변경하지 않는다.

## 출처와 의미의 경계

학습 페이지와 [기존 대응표](physical-network-concept-sync.md), [장소 출처](physical-network-application-cases.md), [사진 출처](physical-network-photo-sources.json)의 검토 범위를 유지한다.

- [Fluke 대역폭/전송속도](https://www.flukenetworks.com/blog/cabling-chronicles/bandwidth-and-data-rates): 100/250 MHz와 Gbps를 구분하는 근거를 재확인. 이 글의 단순화된 거리표는 도입하지 않는다.
- [ICS Expeditors 사례](https://www.ics-panduit.com/expeditors-structured-cabling-system/): 사무실·창고 Cat6와 주요 통신실 사이 광 연결. 2011년 3월 공사 완료, 2022년 9월 소개 게시를 구분. 현재 상태나 국내 시설 기준으로 확대하지 않는다.
- [Leviton 310-UTP6P-MLB](https://leviton.com/products/310-utp6p-mlb): 중앙 분리대 없는 Cat6 제품. 표본의 외형만으로 등급을 확정하지 않는다.
- 거리 기준은 기존 학습의 [Fluke 10GBASE-T 현장 시험 조건](https://www.flukenetworks.com/knowledge-base/applicationstandards-articles-copper/10gbase-t-field-testing-requirements)을 유지. 막대는 설치 성공 실측·속도·절대 물리 한계가 아니다.

## 스킬과 검증

Pipeline v1.10, Two-Stage v2.15, Topology v1.7, Beginner Audit v1.10을 읽고 적용했다. 이번 변경은 기존 학습 주장과 문헌 관찰의 표시를 보강한 REVIEW다. 신규 실물·PNETLab·CLI·PCAP 측정: NOT_RUN.

재현 검사: `node --test tests/physical-network-material-review.test.mjs`, `node tests/physical-network-material-review-browser.mjs`. 기존 전체 정적 검사, 물리 모델/접근성/동기화 및 ARP/IP 기준 회귀를 유지한다. 새 검사에서는 사진별 단계 공개, 단위 분리, 거리 막대 비율, 4번째 사례 공개 전 채점 금지, 복습/오답/타이머 취소/키보드·터치/200% 글자/학습 앵커 왕복을 확인한다.

작업 컨테이너는 외부 네트워크와 localhost 브라우징이 차단되어 로컬 문법/정적 검사와 필요시 인라인 화면 검사만 보조로 수행한다. 실제 HTTP 모듈/링크/브라우저 검사는 GitHub Actions에서 수행하고, 배포 후 `BASE_URL=https://sebia1993.github.io`로 파일 해시와 조작을 다시 검사한다. 결과 JSON과 스크린샷은 `test-results/material-review/`에 기록하며 실행하지 않은 검사를 PASS로 작성하지 않는다.
