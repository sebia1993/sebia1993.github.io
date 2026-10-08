# 물리 네트워크 실습 재검수 · 2026-10-08

대상: `labs/physical-network-simulator.html`. Pipeline v1.10, Two-Stage v2.9 → 최신 동시 수정 v2.10을 보존한 v2.11, Beginner Audit, Topology Visualization, Validation Standard, `network-simulator-template` 적용.

## 학습 기준과 범위

공개 로드맵의 0단계 첫 주제이며 네트워크 선행지식은 가정하지 않는다. 먼저 최신 `physical-network.html`의 UTP → Fiber/FDF → SFP 설명, AP A / Switch A / Switch B 구성, 이름 대응과 공식 근거 범위를 확인했다. 실습의 AP B는 단일 AP 장애와 공통 상위 연결 장애를 비교하기 위한 추가 장비이며 이제 시작 안내에 그 이유를 명시한다. 학습 목표는 같은 물리 경로의 구성 요소와 영향 범위를 설명하는 것이다.

학습페이지의 동시 다크 테마 수정 `68aa45a`를 반영하고 보존했다. 이번 수정은 실습 HTML/JS, 표시 문자열, 실습 전용 CSS와 회귀검사에 한정한다. ARP 기준 페이지, Concept Guide, 공유 CSS/연결 Renderer, 로드맵, current-learning, 공식 Claim/실물 Evidence는 수정하지 않는다.

## 발견과 수정

| 발견 | 수정 | 검증 영향 |
|---|---|---|
| 학습페이지의 SFP A/B·FDF A와 실습 표시가 다름 | 지도·이벤트·역할 설명의 명칭 일치 | NONE: 표시 이름만 변경 |
| 정상 여부를 묻는 첫 문제에서 초기 배지가 정답을 먼저 표시 | '기본 연결 확인'과 '관찰 전'으로 시작, 관련 이벤트별 상태 공개 | NONE: 모델 시작 조건/답안 불변 |
| 완료 후 이전 단계로 복습해도 최종 장애 설명이 계속 보임 | '단계 복습' 표시, 마지막 단계에서 최종 해설 복원 | NONE: 채점·완료 수 불변 |
| 비순차 완료 후 Next가 이미 완료한 문제로 이동 | 다음 미완료 문제 탐색, 모두 완료되면 전체 결과 | NONE |
| 실행·완료 전환에서 키보드 초점이 소실됨 | 재생 버튼 → 판정 → 전체 요약 초점 유지; 다른 요소 탐색 중에는 초점 보존 | NONE |
| 같은 UTP/Fiber 버튼을 보조기술로 구별하기 어려움 | 각 구간의 양 끝 장비를 접근성 이름에 포함 | NONE |
| 모바일 광케이블 반복 라벨의 높이, AP 상태 길이 변화 | 모바일 케이블 행 축약, AP 상태 공간 확보, 데스크톱 행 높이 조정 | NONE: 실습 전용 CSS |
| 예상 선택·일시정지 후 안내가 상태와 맞지 않음 | 준비/정지/복습별 안내 분리 | NONE |

데스크톱 AP 상태 공간 확보 중 생긴 AP A/B 겹침은 자동 geometry 검사로 검출하고 실습 전용 행 높이를 조정한 뒤 네 viewport 전체를 다시 통과했다.

## 검증 결과

- **학습 내용 일치 PASS:** 학습페이지의 용어·장비·광 경로와 대조. 추가 AP B의 목적 명시. IP/VLAN/CLI 등 새 선행지식 미추가.
- **기존 모델 보존 PASS:** 원본과 4개 문제의 선택지·정답·Event active/change를 독립 비교. `derive`의 64가지 조합이 원본과 동일. 광 연결 단절 시 AP 전원 유지, UTP 단절 시 해당 AP만 영향이라는 기존 학습 모델 유지.
- **기능/반응형 PASS:** 360×800, 768×1024, 1366×768, 1920×1080에서 네 시나리오, 정답/오답, Replay, Pause/Resume 남은 시간, 실행 중 Reset/전환, 역할 버튼, 수동 복습, 링크 이동, 재진입/새로고침, 문서 overflow·노드 겹침/잘림 및 자산/console 검사.
- **결함 재현/회귀 PASS:** [수정 전 결과](physical-network-20261008/regression-before.json)와 [수정 후 결과](physical-network-20261008/regression-local.json). 비순차 진행, 순차 전체 과정, 혼합 정오답 요약, 오답 재시도→요약 복귀, 접근성 이름·초점 포함. 모바일 지도 650px 기준은 이 주제의 QA 예산이며 범용 스킬 규칙이 아니다.
- **ARP 표현/템포 PASS:** 다섯 공통 CSS와 기존 Shell/장비 심볼 직접 재사용. 주요 컴포넌트 computed style 대조 통과. 실제 재생 약 9.97초(4×2490ms), 재시청 점수 불변. Physical Event의 시간은 읽기용이며 패킷 이동/장비 감지 시간이 아니다.
- **접근성 PASS:** 키보드 실행, reduced motion, 200% 글자 확대 문서 overflow 없음. 강제 색상 캡처 검토. 브라우저 viewport 에뮬레이션이며 실물 휴대폰 검증은 NOT_RUN.
- **사이트 정적 검사 PASS:** 27개 주제, 57개 페이지, 748개 로컬 링크.
- **실물/PNETLab NOT_RUN:** 이번 작업은 기존 공식 출처 기반 학습 모델의 UI/브라우저 QA다. 새 실물 검증·Claim 승격·PCAP 생성은 수행하지 않았다.

원시 결과: [local](physical-network-20261008/local.json), [accessibility](physical-network-20261008/accessibility.json).

## 스킬 환류

Google Drive `Two-Stage-Technical-Learning-Design-SKILL.md` v2.11 §7.9A에 관찰 전 표시, 수동 복습/최종 결과 분리, 비순차 진행, 초점, 구간 접근성 이름과 회귀검사 추가. 같은 ID에 저장 후 본문 재조회 확인(마지막 개행 제외 동일). 동시 변경 v2.10 개념서 테마 규칙 보존. 개인 `network-simulator-template` acceptance에도 동일 검사를 반영하고 저장 후 재조회 확인.

## 공개 확인

**Public QA: PASS / 배포 완료.** 사용자의 “배포 진행해” 승인 후 PR #12를 병합했다. 배포 커밋은 `e9b1e7e2939e3c92a5434f6d8747892b91e5a040`, [GitHub Pages 빌드·배포](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37709767412)는 성공했다.

- 공개 URL의 실습 HTML·JS·모델 JS·전용 CSS 4개가 배포 소스와 바이트 단위로 일치한다. [파일 해시](physical-network-20261008/public-assets.json).
- 공개 주소에서 360×800, 768×1024, 1366×768, 1920×1080 전체 시나리오·정답/오답·재생·일시정지·초기화·복습·링크 이동·재진입을 통과했다. 브라우저/자산 오류 0건. [공개 브라우저 결과](physical-network-20261008/public.json).
- 회귀검사 18항목 PASS, 오류 0건. [공개 회귀 결과](physical-network-20261008/regression-public.json).
- 병합 과정에서 동시 반영된 개념서 UTP 사진 및 설명을 보존했다. 병합본 정적 검사: 27개 주제 / 57개 페이지 / 751개 로컬 링크 PASS.
- 실물 휴대폰 및 실물/PNETLab 검증은 기존대로 NOT_RUN이다.

ARP/대상 초기·선택·재생·완료 화면을 네 viewport에서 각각 캡처했다. 물리 주제의 AP·케이블·모듈 구조는 주제별 도식이며 패킷 이동을 새로 추가하지 않았다. 공통 표면·선택지·Event·버튼은 ARP 스타일을 재사용한다.
