# 로드맵 실습 페이지 검증 — 2026-10-07

대상은 0단계 **ICMP / Ping / Traceroute부터 7단계 Network Automation까지의 Interactive Lab 22개, 기존 시나리오 120개**다. Concept Guide, ARP/IP 기준 실습, 로드맵 내용과 기존 장비 검증 자료는 변경하지 않았다.

- 기준 소스: `cc7f148215d1a3cfff506fabd39458bcea5f0a1a`
- 실습 수정: `81006de888fc2bc3b413fe6623b443e3f685a8ca`
- 공개 검사 캐시 갱신: `28176fe6fd536b421073db9cdf3f40525f50147e`
- 적용 기준: network-simulator-template, Network Learning Validation & Publishing Pipeline, Technical Learning Design, Topic Learning Topology, Beginner Learning Page Audit.

## 1. 재사용 구조 — PASS

ARP 기준의 다섯 CSS 파일, hero/coach/prediction/current-event/result/CTA 구조와 PC·Switch·Router SVG를 직접 재사용했다. 공통 생명주기는 `labs/network-simulator-session.js`, 주제별 시각화 확장은 `labs/network-simulator-shell.css`에 둔다. 기존 문제 데이터와 Renderer는 각 `*-model.js`에 보존했다. 보호 대상 파일과 27개 주제의 Concept Guide에는 diff가 없다.

## 2. 주제별 학습 요소 — PASS

기존 정상·실패·복구 조건, 선택지, 정답, 설명, 이벤트 순서, 검증 근거를 원본 JSON SHA-256과 비교했다. 결과는 `tests/fixtures/roadmap-simulator-models.json` 및 아래 주제별 기록에 있다. 이는 기존 교육 모델의 회귀검사이며 새로운 네트워크 장비 실측을 뜻하지 않는다.

| 단계 | 실습 | 시나리오 | 로컬 결과 |
| --- | --- | ---: | --- |
| 0단계 · 네트워크 기초 | [ICMP / Ping / Traceroute](../../../labs/icmp-troubleshooting-simulator.html) | 5 | PASS |
| 1단계 · Campus LAN | [VLAN / 802.1Q](../../../labs/vlan-trunk-simulator.html) | 5 | PASS |
| 1단계 · Campus LAN | [Inter-VLAN Routing](../../../labs/inter-vlan-routing-simulator.html) | 5 | PASS |
| 1단계 · Campus LAN | [STP / RSTP](../../../labs/stp-simulator.html) | 5 | PASS |
| 1단계 · Campus LAN | [LACP / Link Aggregation](../../../labs/lacp-simulator.html) | 5 | PASS |
| 2단계 · 네트워크 서비스 | [DHCP / DHCP Relay](../../../labs/dhcp-simulator.html) | 5 | PASS |
| 2단계 · 네트워크 서비스 | [DNS](../../../labs/dns-simulator.html) | 5 | PASS |
| 3단계 · 라우팅 기초 | [Routing Table / Static / Default Route](../../../labs/routing-table-simulator.html) | 5 | PASS |
| 3단계 · 라우팅 기초 | [OSPF](../../../labs/ospf-simulator.html) | 6 | PASS |
| 4단계 · 보안과 Edge | [Packet Filtering / ACL](../../../labs/acl-simulator.html) | 6 | PASS |
| 4단계 · 보안과 Edge | [NAT / PAT](../../../labs/nat-pat-simulator.html) | 6 | PASS |
| 4단계 · 보안과 Edge | [Stateful Firewall / IPsec VPN](../../../labs/firewall-vpn-simulator.html) | 6 | PASS |
| 5단계 · Enterprise WLAN | [Wi-Fi / RF 기초](../../../labs/wifi-rf-simulator.html) | 6 | PASS |
| 5단계 · Enterprise WLAN | [802.11 접속 / WPA2·WPA3](../../../labs/wlan-association-simulator.html) | 6 | PASS |
| 5단계 · Enterprise WLAN | [802.1X / EAP / RADIUS](../../../labs/dot1x-radius-simulator.html) | 6 | PASS |
| 5단계 · Enterprise WLAN | [Roaming / WLAN Troubleshooting](../../../labs/roaming-wlan-troubleshooting-simulator.html) | 6 | PASS |
| 6단계 · 고급 엔터프라이즈 | [First-Hop Redundancy / FHRP](../../../labs/fhrp-simulator.html) | 6 | PASS |
| 6단계 · 고급 엔터프라이즈 | [VRF](../../../labs/vrf-simulator.html) | 6 | PASS |
| 6단계 · 고급 엔터프라이즈 | [BGP / Route Policy](../../../labs/bgp-simulator.html) | 5 | PASS |
| 6단계 · 고급 엔터프라이즈 | [Redistribution / Route Control](../../../labs/redistribution-simulator.html) | 5 | PASS |
| 7단계 · 자동화와 관측 | [Packet / Log / SNMP 관측](../../../labs/observability-simulator.html) | 5 | PASS |
| 7단계 · 자동화와 관측 | [Network Automation](../../../labs/network-automation-simulator.html) | 5 | PASS |

## 3. 제거·변경한 UI — PASS

- 예상 선택 → 실행 한 번 → 전체 관찰 → 내 답과 정답·이유 비교로 통일했다. 실행 직후 채점과 반복적인 다음 단계 클릭을 제거했다.
- 일시정지·이어보기·재생·현재 문제 초기화·전체 초기화·오답 복습을 공통화했다. WLAN의 최초 제출 점수 정책은 별도로 보존했다.
- 학습 페이지 복귀 링크를 처음부터 제공하고 실제 이동과 뒤로가기를 검사했다.
- 재생 중 Reset/문제 전환으로 취소된 callback이 결과를 되살리지 않게 했다. reload/BFCache 재진입은 미응답 상태다.
- STP 포트 역할과 Route Lookup 설명을 장비 그림에서 분리했고, 흐릿한 물리 링크·라벨 대비·작은 모바일 SVG·확대 시 긴 선택지 넘침을 수정했다.
- 최초 조건의 결과 요약과 현재 복구 장면을 구분했다. 선택적 복구를 실행하기 전에는 복구 완료로 표시하지 않는다.

## 4. Playback 비교 — PASS, 주제별 차이 명시

Virtual clock으로 이벤트 순서·지연 채점·Pause/Resume·Replay 중복 점수 방지·취소 후 stale callback을 검사했다. 별도로 실제 시간 재생을 ARP 기준과 비교하고 ICMP/BGP의 재생과 Replay를 측정했다(`accessibility-timing.json`).

기존 ARP의 판단 1,050ms·이동 구간 420ms·강조 유지 180ms를 바탕으로, 개별 관찰 장면은 2,490ms를 유지한다. 실제 ICMP 이벤트 간격은 약 2.5초였다. 상태/테이블 주제는 시작 조건 1,050ms + 모델 관찰 2,490ms + 값 비교 2,490ms이며 BGP 실측은 약 6.1초였다. ARP의 메시지 수·이동 구간 수와 주제별 장면 수가 달라 전체 실행 시간이 같지는 않다. 실제 통신 지연·수렴 시간을 재현한다는 주장은 하지 않는다.

## 5. 도메인 로직 및 자동 검사 — PASS / 환경 실패 분리

- 22개 주제의 원본 모델 Hash와 120개 시나리오 실행: PASS.
- 4개 viewport의 기본 전체 회귀: 3,256개 assertion PASS (`local-a.json`~`local-d.json`). 마지막 SVG/선택지 수정 대상 5개 주제: 추가 677개 assertion PASS (`local-last-fixes.json`).
- `npm test`: 11개 PASS. 이 안의 IPv4 독립 Python oracle 429개 경우도 PASS.
- 사이트 검사: 27개 주제, 57개 HTML, 711개 내부 링크 PASS.
- 보호된 IP 실습 4개 viewport, IP Concept 9개 viewport, Ethernet 최종 검사 18개, 기존 PCAP 재검산 8개 항목 PASS. 기존 데이터 재검산이며 신규 캡처가 아니다.
- 전체 `tests/browser.mjs`의 범위 밖 Wireless Policy Mapper Python 초기화 검사는 이 실행 환경에서 FAIL. 변경 전 기준 소스에서도 `cdn.jsdelivr.net`의 Pyodide 요청이 `net::ERR_EMPTY_RESPONSE`, 이어서 `loadPyodide is not defined`로 재현됐다(`unrelated-runtime-baseline.json`). 해당 제품 코드는 변경하지 않았다. 대상 22개 실습의 실패와 혼합하지 않는다.
- 이전 즉시 채점 UI용 검사 파일은 이력으로 남기고, `test:browser`와 19개 주제별 workflow의 진입점을 새 공통 회귀검사로 갱신했다. 기존 도메인 데이터 기대값은 낮추지 않았다.

## 6. Responsive / 접근성 — PASS

360×800, 768×1024, 1366×768, 1920×1080에서 초기·선택·재생/정지·완료·초기화 상태를 검사했다. 변경 전 22개 주제×4개 viewport의 상태별 화면과 ARP 기준의 같은 상태를 확보했다(`before-capture-matrix.json`).

22개 주제에서 키보드 선택·실행·정지·초기화, 선택 후 focus 유지, 200% root 글자 확대 시 문서 가로 넘침, 가로 화면 전환을 검사했다. 긴 토폴로지는 내부 가로 스크롤을 유지하고 조작 안내·tab focus·끝 장비 접근을 제공한다. SVG 라벨을 모바일에서 지나치게 축소하지 않는다. Reduced Motion에서도 이벤트와 판정은 유지된다.

이 검사는 Chromium 기반 자동 브라우저와 화면 검토다. 실제 휴대전화, Safari/Firefox와 스크린리더 실기 검사는 **NOT_RUN**이다.

## 7. Public QA

**PASS** — 기존 공개 URL 22개, 120개 시나리오, 4개 viewport, 3,314개 assertion. Prediction → Run → Result → Replay/Reset, 학습 복귀, 실제 history navigation, 전체 문제·비교·복구·점수·새 진입을 검사했다(`public-a.json`~`public-d.json`). 공개 파일 비교 52/52 일치. [Pages 배포 완료](https://github.com/sebia1993/sebia1993.github.io/actions/runs/37606952752)를 확인했다.

주제별 Linux CI와 BGP/Redistribution/Observability/Automation 공개 CI는 통과했다(`ci-runs.json`). 전체 Learning site CI에서는 Playwright의 `Page.getNavigationHistory: Not attached to an active page`가 한 번 재현됐다. 실제 웹 뒤로가기와 Fresh Start 기대값은 유지하고, 검사 구현을 `history.back()`과 navigation 완료 대기로 바꿨다. 이동 자체로 발생하는 execution-context 폐기만 처리하고, 목적 URL과 미응답 상태 assertion은 그대로 유지했다. 같은 현상이 있었던 LACP/Wi-Fi의 네 화면 크기 재검사 결과를 `history-navigation.json`에 남긴다. 전체 Windows/Linux CI의 후속 실행 상태는 GitHub Actions에서 별도 확인하며 이 문서가 모든 workflow의 성공을 뜻하지는 않는다.

52개 필수 HTML/JS/CSS/SVG의 공개 응답과 SHA-256을 로컬 수정본과 대조했다(`public-assets.json`). 기존 공개 URL을 그대로 사용한다. 초기 공개 CI는 배포 전 HTML이 캐시되어 새 버전 표식을 찾지 못했다. 검사 요청에 build/attempt query를 추가하여 매 시도 배포 반영을 확인하도록 수정했다. 판정 조건과 모델 Hash 비교는 유지했다.

## 8. 필요한 차이·검증 범위

ARP와 달리 상태·테이블 중심인 RF, RIB, BGP 속성, 관측·자동화 주제에는 임의의 패킷 이동을 만들지 않았다. 기존 Renderer를 조건 → 모델 → 관찰 값 순서로 보여준다. 긴 삼각형·다중 AS 토폴로지는 의미 있는 관계와 라벨을 보존하기 위해 모바일 내부 스크롤을 허용한다.

새 PNETLab 실행, 실제 AP/STA 캡처, 장비 설정 변경은 **NOT_RUN**이다. 기존 PASS/FAIL/제한·reference-only 근거를 그대로 재사용하며, 브라우저 PASS를 새로운 장비 검증 PASS로 바꾸지 않았다. 사용자 디자인 최종 승인은 이번 자동 검사의 범위가 아니다.

재발 방지 규칙은 Technical Learning Design v2.8, Beginner Learning Page Audit v1.9, 개인 network-simulator-template의 회귀검사 지침에 반영하고 저장 후 재확인했다. 원본 모델 Hash, Renderer 의존성, 현재 장면과 최초 조건 구분, 공통 코드 전체 소비 페이지 검사, 내부 스크롤 접근성, CI 계약 갱신을 포함한다.

## 재현 명령

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test
python3 tests/check_site.py
node tests/roadmap-simulators.mjs
# 단일 주제 및 공개 페이지
TOPIC=icmp-troubleshooting node tests/roadmap-simulators.mjs
BASE_URL=https://sebia1993.github.io node tests/roadmap-simulators.mjs
# SCREENSHOTS=1이면 상태별 화면도 test-results/roadmap-simulators에 저장
```
