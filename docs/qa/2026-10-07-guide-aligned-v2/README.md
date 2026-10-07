# 실습 페이지 학습 내용 대조·한국어 UI·관찰 경험 개선 검수

대상: 0단계 ICMP부터 7단계까지 22개 실습, 원본 시나리오 120개.
수정 전 저장소 기준: `85596b2c5d4e65d9986f70827b4c172951be44c6`.
공개 파일 식별자: `20261007-guide-aligned-v2`.

이 기록은 이전 `2026-10-07-roadmap-labs` 검수를 대체하여 이번 변경의 수행 범위를 따로 기록한다. 이전 브라우저 PASS 수치나 ARP/IP 실습에 대한 사용자 승인을 이번 결과에 합산하지 않는다.

## 검사 현황

| 검사 | 상태 | 실제 수행·판정 범위 |
| --- | --- | --- |
| 원본 교육 모델 보존 | PASS | 22개 모델·120개 시나리오 JSON SHA-256이 기존 독립 Fixture와 일치 |
| 보호 대상 보존 | PASS | ARP·IP Subnetting·Ethernet MAC Table 기준 파일 및 연결된 22개 Concept Guide를 포함한 54개 파일 SHA-256 일치 |
| 학습 페이지 연결·기준 CSS | PASS | 22개 실습의 실제 Guide 경로와 ARP CSS 5개 직접 참조 확인 |
| 안내·명명 대응 구조 | PASS | 120개 문제의 제목·학습 안내·단계별 힌트 존재, 장비명은 Guide에 존재하거나 구성 차이를 명시 |
| 관찰 계획 구조 | PASS | 120개 사용자 지정 계획의 시간·동작·설명과 원본 단계 순서 보존 |
| 기존 Node 회귀 검사 | PASS | `node --test tests/*.test.mjs`: 16개 테스트 통과. 기존 독립 Python ipaddress 429 사례 비교 포함 |
| 브라우저 기능 회귀·4개 화면 크기 | PASS | [CI 37637573283](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37637573283): 22개 실습·120개 시나리오·4개 화면 크기에서 24,053개 검사 통과 |
| 캡처 육안 비교 | NOT_RUN | 성공한 CI의 캡처를 내려받아 실제로 확인한 뒤 별도 판정. 기능 통과를 디자인 승인으로 대신하지 않음 |
| ARP와 실제 시간 재생 비교 | NOT_RUN | 별도 실제 조작·관찰 필요. 가상 시간 통과와 구분 |
| 공개 URL·최신 자산 확인 | NOT_RUN | 배포 완료 후 별도 검사 필요 |
| 새 PNETLab·장비·패킷 실측 | NOT_RUN | 이번 승인 범위에 포함하지 않음. 기존 근거만 보존 |

원본 모델 검사는 상태 전이·정답·근거의 보존을 확인한다. 새 프로토콜 사실을 실측한 것으로 해석하지 않는다. 명명 대응 검사는 Guide와 표시 이름의 일치 또는 설명된 차이를 확인하며, 문장 전체의 교육적 적합성은 주제별 내용 대조 기록과 실제 화면 검수로 보완한다.

## 브라우저 검사 계약

`tests/roadmap-simulators.mjs`는 기존 기능 검사를 유지하고 다음을 추가한다.

- 2490ms 고정 간격 대신 실행 소유자가 공개한 이벤트 위치·경과시간·지속시간을 따라 관찰한다.
- 모든 원본 단계가 순서대로 나타나며, 각 단계의 관찰 시간이 지나기 전 다음 단계나 채점이 공개되지 않는지 검사한다.
- 일시정지 동안 시각화 HTML과 이벤트 경과시간을 함께 고정하고, 재개·초기화·문제 전환 이후 오래된 콜백이 재실행되지 않는지 확인한다.
- 완료 후 이전 장면을 수동으로 보고 마지막 장면으로 돌아왔을 때 관찰 값과 완료 수가 원래 완료 화면과 같은지 확인한다.
- 표시 이름은 원본 정답 키와 분리해 비교한다. 기존 WLAN Association의 최초 제출 점수 정책도 보존한다.
- 일반 영어 UI 잔존, Guide와 다른 장비 구성이 초기 화면에 설명되는지, 기존 근거 원문이 번역으로 바뀌지 않는지 검사한다.
- 360×800, 768×1024, 1366×768, 1920×1080에서 초기·선택·일시정지·완료·초기화 화면을 저장한다. 완료한 토폴로지는 별도 캡처한다.
- 360·768px에서 관찰 영역으로 실제 스크롤한 뒤 질문 탭과 관찰 영역의 화면상 사각형이 겹치지 않는지 검사한다. 캡처를 위해 탐색 UI를 숨기지 않는다.
- 1366px에서는 120개 문제의 정답·이벤트 순서·선택적 비교·복구·전체 점수를 확인한다. 나머지 크기에서도 첫 문제의 전체 조작 경로를 실행한다.

자동 검사 통과와 시각적 완성도는 별도로 판정한다. 캡처를 실제로 보지 않았다면 레이아웃·라벨 잘림·장비 관계의 이해 가능성을 PASS로 표시하지 않는다.

CI 이벤트 경계 검사는 처음부터 정지한 가상 시계를 명시적으로 진행하므로 실행 호스트의 CPU 속도나 스크린샷 소요시간에 의존하지 않는다. 이 방식의 통과는 실제 시간에서 느끼는 재생 템포 검수를 대신하지 않는다.

## 재현과 CI

데이터·소스 검사:

```sh
node --test tests/roadmap-models.test.mjs
node --test tests/*.test.mjs
```

브라우저 검사는 저장소의 `Roadmap simulator acceptance` workflow에서 수행한다. `main` 및 `codex/lab-parity-*` 브랜치의 관련 변경과 수동 실행을 지원한다. 수동 실행의 `base_url`을 비우면 해당 커밋을 로컬 서버로 제공하고, 공개 사이트 원점을 입력하면 공개 페이지를 검사한다.

로컬 제공 검사와 공개 검사는 아래 6개 그룹을 병렬 실행한다. 두 workflow 모두 모델 Fixture의 22개 주제를 중복·누락 없이 포함하는지 대조했다. 전체 판정에는 여섯 그룹의 결과가 모두 필요하다.

| 그룹 | 주제 |
| --- | --- |
| packet-switching | ICMP, VLAN/Trunk, Inter-VLAN Routing, STP |
| services-routing | LACP, DHCP, DNS, Routing Table |
| routing-security | OSPF, ACL, NAT/PAT, Firewall/VPN |
| wireless | Wi-Fi RF, WLAN Association, 802.1X/RADIUS, Roaming |
| resilience | FHRP, VRF, BGP |
| operations | Redistribution, Observability, Network Automation |

```sh
SCREENSHOTS=1 QA_RUN_TAG=guide-aligned-v2 node tests/roadmap-simulators.mjs
BASE_URL=https://sebia1993.github.io SCREENSHOTS=1 QA_RUN_TAG=guide-aligned-v2-public node tests/roadmap-simulators.mjs
```

결과는 `test-results/roadmap-simulators/<실행 태그>-<그룹>/report.json`과 JPEG 캡처로 생성되고, CI에서는 `roadmap-simulator-acceptance-<그룹>` artifact에 보관한다. 22개 주제의 정상 캡처 총 528장을 그대로 유지하면서 그룹별로 내려받을 수 있다. JPEG는 브라우저에서 품질 82로 직접 캡처하며 원래 화면 크기와 상태별 캡처 범위를 유지한다. 검사 실패 시 페이지를 닫기 전에 `*-failure.jpg`도 저장하고 보고서에 경로를 남긴다. 공개 검사는 HTML 버전 식별자가 새 버전으로 바뀔 때까지 제한적으로 기다리며, 구버전 페이지를 성공으로 인정하지 않는다.

용량이 큰 증거 묶음은 `Split roadmap acceptance evidence` workflow에서 기존 성공 실행의 artifact를 여섯 묶음으로 나눠 받을 수 있다. 브라우저 검사를 다시 실행하거나 이미지를 변환하지 않는다. 같은 주제의 캡처는 같은 묶음에 유지하며, 각 묶음에는 원래 `report.json`과 원본 실행 ID·파일별 SHA-256·용량을 기록한 `evidence-manifest.json`을 함께 보관한다.

`Roadmap public acceptance` workflow는 `main`에 반영된 뒤 공개 Pages의 공통 컨트롤러 SHA-256과 HTML 버전을 최대 5분 기다린다. 이후 동일한 22개 실습·120개 시나리오·4개 화면 크기를 공개 주소에서 검사하고 JSON 보고서를 보관한다. 새 공개 검사 실행이 시작되면 이전 공개 검사를 취소해 서로 다른 배포를 동시에 판정하지 않는다.

보호 파일 Fixture는 이번 범위를 지키기 위한 검수 기준이다. 향후 승인된 Guide/Reference 수정 시 기준 변경의 이유와 diff를 검토한 뒤 의도적으로 갱신해야 한다.
