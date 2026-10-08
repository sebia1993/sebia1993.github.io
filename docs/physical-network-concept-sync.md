# 물리 네트워크: 학습 페이지 → 실습 동기화

기준일: 2026-10-08. 기준 커밋: `9e1abb38e058116e4e856ef99cbd28524c2fe17b`.
학습 페이지: `labs/physical-network.html`. 수정 대상: `labs/physical-network-simulator.html`.

## 범위와 학습 목표

물리 연결의 영향 범위와 케이블·광모듈의 연결 조건을 학습 페이지에서 배운 근거로 설명한다. 학습→실습 두 단계와 ARP 공통 CSS/버튼/예상/관찰/결과 구조를 유지한다. 12문제를 세 묶음으로 나누되 묶음은 별도 학습 단계가 아니며, 원하는 묶음부터 선택할 수 있다.

기존 물리 모델·4개 시나리오의 ID, 답 번호, 각 단계의 활성 요소·변경 상태는 그대로다. SFP A/B를 지빅 A/B로 표시하고 스위치 역할/아이콘은 현재 학습 페이지와 맞췄다. 실제 프로토콜 라우팅이나 신규 장비 측정을 추가하지 않았다.

## 학습–실습 대응

| 실습 ID | 학습 페이지 절 | 관찰할 근거와 범위 |
|---|---|---|
| normal / utp / sfp / fiber | cg-picture, utp, sfp | 기존 정상·분리 모델 유지. 단일 상위 경로·PoE 외 전원 없음의 가정 유지 |
| photo | utp-cross-section-photos, utp-cat5e-cat6 | 동일한 CC BY-SA 사진 사용. 실제 표본의 구조와 등급 확인 구분 |
| port-speed | utp-category-guide | 양끝 1G 포트·정상 20m 고정 조건. Cat5e→Cat6 하나만 변경 |
| distance | utp-category-guide | 10G 구리·전체 100m 신규 구성. Cat6A 검토와 전체 경로 조건, Cat6 조건부 거리 유지 |
| places | utp-application-cases | 동일한 학교·의료기관·관공서 사례. 과거 해외 사례와 현재/국내 기준 구분 |
| fiber-color | fiber-colors | 아쿠아→OM3/OM4 가능성. 색 단서·규격 표기·LC 형태 구분 |
| sr-cable | fiber-cable-choice | 동일 J9150D·OM3·300m 사양. 전체 200m 예시를 사양상 후보로만 판단 |
| optic-mismatch | fiber-case-mode | SR↔LR 비호환 비교. 임의 복구나 실측 광 상태를 표시하지 않음 |
| polarity | fiber-port-orientation | 동일한 180° 장착 가정, R/B 표식과 Tx→Rx. 실제 장비 포트 번호 규칙으로 일반화하지 않음 |

T568B 제작, BiDi 짝, 실제 CLI·수신광 확인 절차는 이 기본 실습에 새 필수 단계로 만들지 않는다. 필요한 경우 학습 페이지 해당 절로 돌아간다. 모든 문단을 퀴즈로 복제하지 않는다.

## 자료 출처

기존 [물리 네트워크 근거](physical-network-research.md), [장소 사례](physical-network-application-cases.md), [사진 출처와 처리 내역](physical-network-photo-sources.json)을 재사용한다.

추가 대조한 공식 자료:
- [Leviton 310-UTP6P-MLB](https://leviton.com/products/310-utp6p-mlb): 중앙 분리대 없는 Cat6 반례.
- [Fluke 10GBASE-T 시험 조건](https://www.flukenetworks.com/knowledge-base/applicationstandards-articles-copper/10gbase-t-field-testing-requirements): Cat6 거리와 인접 간섭 조건. 55m를 물리적 절대 한계로 확대하지 않음.
- [HPE Aruba 광모듈 사양](https://arubanetworking.hpe.com/techdocs/Switches/xcvrs/xcvr_guide/Content/GUID-C1449A69-FEA4-4DA4-AD25-C73A7FB9CF0A.html): 지빅 규격·매체·거리·플랫폼 지원 조건.
- [Fluke 광 극성](https://www.flukenetworks.com/blog/cabling-chronicles/b-c-s-fiber-polarity): 끝에서 끝까지 Tx→Rx.

## 스킬 적용과 검증 구분

Network Learning Pipeline v1.10, Two-Stage Technical Learning Design v2.14, Network Topology Visualization v1.7, Beginner Network Learning Page Audit v1.10을 읽고 적용했다. 전문 템플릿의 규칙은 Two-Stage §7.4/7.9에 포함되어 있으며 별도 network-simulator-template 원문은 Drive 검색에서 발견되지 않았다.

검증 영향: REVIEW. 기존 학습 페이지의 주장·가정·사진·출처를 재사용한다. 새 문헌 관찰을 실제 Lab PASS로 승격하지 않는다. 추가 묶음은 사전 정의된 조건의 자료 관찰이며, 네트워크 에뮬레이터가 아니다. 이벤트는 2490ms의 기존 읽기 시간(ARP 1050 + 420×3 + 180)을 그대로 사용한다.

실물 케이블 측정 / PNETLab: NOT_RUN. 새 측정값·CLI·PCAP·광 손실·복구 시간은 생성하지 않았다. 공개 QA는 실제 배포 파일 해시와 브라우저 조작으로 별도 확인한다. 로컬 네트워크 브라우징이 차단된 작업 환경에서는 자원을 인라인한 오프라인 화면 검사를 보조로만 사용하며, 실제 모듈·HTTP·링크 검사는 GitHub Actions 브라우저로 수행한다.

## 회귀검사

- 기존 물리 모델 SHA-256와 4개 기존 이벤트·답안 보존.
- 현재 학습 페이지 앵커 대응, 사진 출처·라이선스·배율 주의와 이미지 재사용.
- 12개 시나리오의 예상 전/실행 중 결과 미노출, 단계별 자료 공개, 올바른 답과 이유.
- 세 묶음 간 이동, 비순차 완료→미완료 이동, 오답·재시도·최종 요약, 현재 실행 내 기록 보존.
- 재생·일시정지·이어보기·수동 복습·Reset·중복 실행·묶음 전환 후 이전 타이머 취소.
- 모바일·태블릿·PC, 사진 확대, 글자 200%, 강제 색상·동작 줄이기, 스크롤 후 버튼 hit-test.
- 보호 대상: 학습 HTML/CSS/사진, ARP/IP 기준 페이지, 로드맵, 기존 물리 모델과 토폴로지 모듈. 공유 파일의 바이트는 변경하지 않는다.
- 실행 결과는 `test-results/physical-sync/` 및 기존 physical-network 검사 산출물에 저장한다. 실패/미실행을 기대값만 낮춰 통과시키지 않는다.
