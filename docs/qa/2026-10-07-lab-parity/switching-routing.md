# STP · LACP · Routing Table · OSPF · FHRP 개선 근거

## 범위와 대조

- 기준 브랜치의 최신 각 Concept Guide 본문, 핵심 그림, 동작 순서, 용어, 장비 이름 대응과 기존 상세 근거를 코드 변경 전에 읽었다.
- 수정 범위: 각 `*-simulator.html`, `*-model.js`, 새 `*-parity.css` 5종. ARP/IP/Ethernet 및 Concept Guide는 수정하지 않았다.
- 도메인 시나리오/정답/기존 evidence 원문은 유지하며 `adapter.presentation`과 `adapter.buildPlan()`으로 표시와 관찰 과정을 별도 구성했다.
- 애니메이션은 ARP의 판단 1050ms, 기하학적 이동 구간 420ms, 도착 유지 180ms를 조합했다. 실제 장비 수렴 시간으로 제시하지 않는다.

| 주제 | Concept Guide와 일치시키는 요소 | 관찰 단계 | 모바일/차이 이유 |
|---|---|---|---|
| STP | SW1/2/3→Switch A/B/C, PC1/3→PC A/C, Root→역할→순환 없는 경로→변경 후 재계산 | 동일 Priority 조건에서 Root 배지/역할 선행 공개 제거; Bridge ID 비교→Root 선출→포트 역할을 별도 단계로 공개; BPDU·데이터 마커는 실제 연결 노드 사이 이동 | 삼각형 연결을 세로 삼각형으로 재배치; Switch A–C 직접 링크 및 B 경유 링크 유지. 768px에서도 고정 680px 캔버스 패닝 대신 compact 배치 |
| LACP | PC1A/1B/2A→PC A/B/C, SW1/2→Switch A/B; src-mac 검증의 Flow별 Member 선택 | 협상 중 Po1 Up 선행 표시 제거; 협상→조건 확인→묶음, 두 Flow의 M1/M2 선택, 장애/복구 경로를 마커로 구분 | PC A/B→Switch A→서로 다른 평행 M1/M2→Switch B→PC C/D 구조로 재배치. PC D는 원래 검증의 추가 단말 PC2B임을 초기 안내·명칭 대응으로 명시 |
| Routing Table | R1/2/3→Router A/B/C, PC1→PC A, 목적지203.0.113.10, /24와 /0 LPM | Connected 행을 Interface별로 순차 표시; 입력 패킷→목적지 일치 후보→가장 긴 Prefix 선택→해당 Next Hop 전달; 장애 경로 제거와 복구 재설치 분리 | PC A→Router A→B/C 가지 연결 유지. 표는 실제 원문 route code를 보존하고 화면 장비 별칭과 대응 |
| OSPF | R1/2/3→Router A/B/C, 이웃→지도→계산→전달, 10+10+1=21 vs50+1=51 | Hello 조건→동기화 후 FULL; Router-LSA별 공개; 두 Cost 계산→SPF→선택 경로; 장애 원인→Neighbor→(링크 장애 시)LSA 변경→남은 경로 | 3대의 삼각형 링크 유지한 세로 배치. FULL은 데이터 경로 선택과 별개; 애니메이션 시간은 수렴 시간 아님 |
| FHRP | PC1→PC A, R1/2→Router A/B, 동일 VIP/프로토콜 내 VMAC과 역할 변화 구분 | Gateway→ARP→Owner→Request 경로; Priority/Hello, LAN 장애, Preemption, Track 110→90, VRRPv2 각각 별도 단계 | 기존 모바일 두 Router 분기에서 입·출력 링크를 각각 표현. Switch A와 Router C는 원래 실습의 L2 연결·원격 관찰 장비로 초기 차이 설명. VRRPv2 실측을 VRRPv3 검증으로 바꾸지 않음 |

## 보존한 해석 한계

- STP의 약 0.202초 전달 간격은 기존 200ms probe 기반 관측이며 보편적 RSTP 수렴 시간이 아니다.
- LACP의 원래 한쪽 shutdown FAIL과 양단 Member unavailable 재검증은 다른 조건으로 보존한다. Flow 분산을 균등 분배나 패킷 단위 교대 전송으로 바꾸지 않는다.
- Routing Table의 Cisco IOL ICMP Type 3 Code 1 관측과 RFC Code 0 기대 차이를 보존한다.
- OSPF의 EXSTART가 항상 MTU 때문이라는 일반화를 하지 않는다. 기존 DBD 1400/1500 조건에 한정한다.
- FHRP는 Request uplink로 Owner를 판정한다. 기존 R3 return route는 R2 고정이며 전환 중 손실과 VRRPv2 실측을 보존한다.

## 검수 상태

- PASS: 5개 model JS 구문 검사.
- PASS: `node --test tests/roadmap-models.test.mjs` 4개 검사. 전체 22개/120개 원본 scenario hash, 보호 페이지 hash, Concept Guide 연결, 각 문항의 제목·힌트·장비명 대응 검사가 통과했다.
- NOT_RUN (이 하위 작업): 브라우저/4 viewport/공개 URL 검수. 통합 담당의 변경 후 실제 브라우저·CI 결과에서 별도로 판정한다. 본 기록은 새 PNETLab 검증이 아니다.

## CI 캡처 육안 검수 후 수정

2026-10-07 통합 CI가 생성한 `/workspace/scratch/3ea555ad7246/qa/ci-final/guide-aligned-v2`의 담당 5개 주제에 대해 360·768·1366·1920px `*-visual.jpg`와 `*-idle.jpg`, `*-completed.jpg`를 실제로 열어 비교했다. 원본을 보존하고 `../switching-review/`에 분석용 연락 시트를 생성했다. 제목·예상 선택지·장비 이름·연결·초기 역할 미공개·완료 결과·하단 버튼을 확인했다.

- 확인: 5개 주제의 4개 폭에서 기본 명칭/연결과 한국어 안내가 유지된다. STP/LACP는 360·768px에서 compact 세로 구성, Routing/OSPF는 360px에서 세로 분기·삼각형, FHRP는 기존 세로 이중화 분기다.
- 수정: `lacp-360-visual.jpg`에서 Po1 배지와 M1/M2 라벨이 겹쳤다. Member 라벨을 위로 32px, Po1 배지를 아래로 옮겨 별도 행으로 분리했다.
- 수정: `ospf-*-completed.jpg`의 Neighbor 문제 마지막 비이동 단계에 직전 Hello 마커가 남아 `IPv4`로 표시됐다. 단계 진입 때 마커를 숨기고 해당 단계가 실제 이동할 때만 표시하도록 수정했다. FHRP에도 같은 마커 수명 규칙을 적용했다.
- 수정: OSPF Cost 라벨이 ARP의 동일 클래스 `.link-badge{display:none}` 때문에 모든 폭에서 숨겨졌다. OSPF의 라벨은 관찰 조건이므로 주제 전용 CSS에서 명시적으로 표시한다.
- 수정: FHRP의 실제 캡처 지점 `CP-R1-UP`, `CP-R2-UP`이 자동 명칭 변환으로 바뀌었다. 지점 식별자는 표시 문자열 치환의 보호 대상으로 지정하고 원문을 유지한다. 장비 이름 자체는 Router A/B/C를 유지한다.
- 통합 담당에게 전달: 360px 캡처의 sticky 문제 탭이 관찰 중간에 겹치는 공통 현상은 공유 CSS 계층에서 확인/수정하도록 보고했다.
- PASS: 수정 후 `node --test tests/roadmap-models.test.mjs` 5개 검사(원본 해시·보호 파일·명칭 대응·관찰 계획 순서/시간 포함).
- NOT_RUN: 위 4개 화면 수정 이후 새 캡처 및 Public QA는 통합 담당의 다음 CI/공개 검수에서 판정한다. 기존 캡처를 수정 후 PASS 근거로 재사용하지 않는다.
- 추가 한글화: 실제 화면에 남은 일반 설명 단어 Lab·State·Layer·Logical·Physical·Data를 presentation.labels에서 실습·상태·계층·논리·물리·데이터로 표시한다. 실제 CLI·evidence와 시나리오 원문은 보존한다.
