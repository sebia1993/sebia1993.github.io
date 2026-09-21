# Network Learning Journey — Master Plan

기준: 2026-09-21, `main`의 `aaaa4098e13fbf702617ec081b76c9759e8ecfca`. 본 문서는 구현 계획이며 실험 성공 기록이 아니다. 작업 결과는 [진행 기록](docs/IMPLEMENTATION-LOG.md), 엔진 계약은 [Framework 설계](LAB-FRAMEWORK-DESIGN.md), 첫 실습은 [IP/Subnetting Lab Plan](lab-plans/ip-subnetting.md)에서 관리한다.

## 1. 현재 프로젝트 구조와 기준선

빌드 없는 GitHub Pages 정적 사이트다. 루트에는 포트폴리오와 로드맵, `labs/`에는 학습 보고서와 브라우저 시뮬레이터, `learning/foundations/`에는 기존 실험 원본과 검증 코드가 있다. `projects/`, `trips/`, `wlan-candidate-test/`는 별도 콘텐츠이므로 이번 교육 Framework 이관 대상에서 제외한다.

| 경로 | 현재 역할 | 이번 원칙 |
|---|---|---|
| `roadmap.html`, `learning-data.json` | 9개 Stage, 기존 2개 + 신규 25개 Topic, 직접 저장된 누적 수치 | Topic ID 보존, 교육 공개와 실험 완료 분리 |
| `styles.css`, `lab-ui.css` | 색·글꼴·카드·보고서 표 공통 스타일 | 기존 선택자를 재정의하지 않는다 |
| `labs/arp-default-gateway.html` | 정상·장애·복구 보고서와 원본 링크 | 기존 근거와 링크 보존 |
| `labs/arp-default-gateway-simulator.html` | 분할된 JS/CSS, 전역 상태, 모바일 후처리 | 한 번에 새 엔진으로 옮기지 않는다 |
| `labs/ethernet-mac-table.html`, `ethernet-guide.js/css` | 기본/고급 학습, MAC 판단 안내 | 표현 기준으로 사용 |
| `labs/ethernet-mac-table-simulator.html`, `ethernet-mac-simulator.js/css` | 독립 IIFE, 예측·실행·학습 체크 | 데이터/뷰/실행 흐름을 새 엔진에서 분리 |
| `viewer.html`, `ethernet-viewer.html`, `*-packet-data.js` | 기존 PCAP 분석/CLI 표시 | 신규 결과를 기존 자료로 위장하지 않는다 |
| `learning/foundations/*` | PCAP, CLI, GNS3 백업, SHA-256, Python 검증 | 이동하거나 덮어쓰지 않는다 |

현재 로드맵 저장값은 완료 주제 1, Lab 2, 장애 5, **캡처 실험 16**, 복구 5, 설명 노트 1, 검증 도구 2다. 캡처 실험은 원본 PCAP 파일 개수가 아니다. ARP는 11개 실험 × 3지점 = 33개 PCAP, Ethernet은 5개 캡처 실험 × 3지점 = 15개 PCAP이며 Aging은 별도 CLI 실험이다. 파일이 존재한다는 사실과 현재 다시 실험했다는 사실을 구분한다. 기존 1개 완료 상태는 이전 기록으로 유지하며 새로운 11개 완료 조건을 소급 충족했다고 주장하지 않는다.

## 2. 기존 Lab에서 계승할 것

ARP 보고서는 IP 목적지 유지, 홉마다 Ethernet 재캡슐화, ARP 캐시 유무가 장애 패킷에 주는 차이를 실제 근거와 연결한다. Ethernet은 목적지 MAC → MAC Table 조회 → 출력 포트라는 세 가지 판단을 함께 보여 준다. 새 과정도 결과부터 보여 주지 않고 먼저 예측하게 한다.

현재 두 시뮬레이터는 장치/링크 SVG, 패킷 이동, 로그, 예측, 모드, Reset을 각각 구현한다. ARP 모바일 기능은 여러 후처리 스크립트가 결합되고 Ethernet은 하나의 IIFE 안에 엔진·교육 데이터·DOM 처리가 섞인다. 전역 함수를 추출해 기존 페이지를 동시에 바꾸면 회귀 위험이 높다. 새 페이지에서만 독립 모듈을 사용하고, 검증된 기능 단위로 어댑터를 추가한다.

## 3. 신규 25개 과정 — 순차 구현 계획

표의 순서는 작업 순서다. 선행 번호는 개념 의존성이며 기존 Ethernet/ARP를 E/A로 표시한다. 각 과정은 개념 → Plan → 구성 → 정상 → 장애 2개 이상 → 분석 → 복구 → 교육/UI 검토의 동일한 게이트를 통과한다. 다음 과정 HTML을 미리 대량 생성하지 않는다.

| 순서 / Stage / 기존 Topic ID | 범위·선행 | 최소 Lab와 장애 | 핵심 Evidence / 학습자가 먼저 판단할 것 |
|---|---|---|---|
| 01 / 0 / `ip-subnetting` | IPv4, Mask, Prefix, Network, Broadcast, Host Range | 같은/다른 Subnet, 잘못된 Mask, 잘못된 Gateway | IP·Route CLI + ARP/ICMP, 직접 전달인가 Gateway인가 |
| 02 / 0 / `icmp-troubleshooting` | Echo, Unreachable, TTL, Ping/Traceroute / 01,E,A | 정상, 목적지 Down, Route 없음, ICMP 차단, TTL | Wireshark 필수, 무응답만으로 원인을 확정할 수 있는가 |
| 03 / 1 / `vlan-trunk` | VLAN, Access, Trunk, 802.1Q / E,A,02 | Access mismatch, Allowed 누락, Trunk mismatch, Native 차이 | Trunk 양쪽 Tag 캡처, Tagged/Untagged 예상 |
| 04 / 1 / `inter-vlan-routing` | L2/L3, SVI, Router-on-a-Stick / 03,01,A | VLAN 10↔20, SVI Down, Gateway 오류 | Destination IP와 Ethernet Destination MAC 비교 |
| 05 / 1 / `stp` | BPDU, Root/포트 역할, Cost, RSTP / 03 | 스위치 3대 Loop, 링크 Down, Root 변화 | BPDU + 포트 상태 + 수렴 시간, 차단 포트 예측 |
| 06 / 1 / `lacp` | Bundle, Member, Hash / 05 | 2링크, 각 Member Down, 전체 Down | LACP/Port-Channel CLI, 1세션이 2배 빨라지는가 |
| 07 / 2 / `dhcp` | DORA, Lease, Gateway/DNS Option, Relay / 04 | Server Down, Relay 누락, Scope/Option 오류 | DORA PCAP 필수, 할당과 실제 통신 성공 구별 |
| 08 / 2 / `dns` | Query/Response, Recursive, Cache, A/AAAA/CNAME / 07,02 | IP 정상·이름 실패, 잘못된 서버/레코드 | DNS 패킷 + dig/nslookup, 연결 장애와 구별 |
| 09 / 3 / `routing-table` | Connected/Static/Default, Next Hop, AD, LPM / 04,02 | Route 누락, 잘못된 Next Hop, 반환 경로 누락 | 목적지별 Route 선택 문제, 입력/출력 링크 캡처 |
| 10 / 3 / `ospf` | Neighbor/Hello, Router ID, LSA/LSDB/SPF, Cost/Area, DR/BDR / 09 | Area/Timer/MTU mismatch, Passive, Network 오류, Interface Down | 상태·LSDB·Route·Hello를 정상→장애→복구 비교 |
| 11 / 4 / `acl` | Src/Dst, Protocol/Port, Permit/Deny, 방향 / 09 | IN/OUT, Src/Dst 오류, 단방향 허용 | Counter와 양방향 패킷, 주어진 패킷 허용 여부 |
| 12 / 4 / `nat-pat` | Inside Local/Global, Translation, 5-Tuple / 11 | 방향·매칭 누락, 변환 풀/규칙 오류 | NAT 앞뒤 PCAP + Table, 바뀌는 필드 선택 |
| 13 / 4 / `firewall-vpn` | Stateless/Stateful, Session, Policy, IPsec / 12 | 반환 경로, Policy/NAT/VPN 불일치 | Route→Policy→Session→NAT→VPN, 로그와 양단 비교 |
| 14 / 5 / `wifi-rf` | 2.4/5/6 GHz, Channel/Width, RSSI/SNR, CCI/ACI/DFS / 02 | 시각화 + 가능한 테스트 RF 조건 2개 | 측정 장치/방법 명시, RF 근거 없으면 판단 불가 |
| 15 / 5 / `wlan-association` | Scan→Probe→Authentication→Association→Security→Data / 14 | 연결 실패 단계 2종, WPA2/WPA3 차이 | 권한 있는 Monitor 캡처, Radiotap/802.11 유무 기록 |
| 16 / 5 / `dot1x-radius` | Supplicant/Authenticator/RADIUS/Store, EAPOL, Accept/Reject, Role/VLAN / 15,07 | 테스트 FreeRADIUS, 인증 실패/인가 오류 | EAPOL/RADIUS + 테스트 로그, 회사 ClearPass 사용 금지 |
| 17 / 5 / `roaming-wlan-troubleshooting` | Enterprise WLAN 통합 / 16,08,11 | 테스트 로밍·Sticky/인증/DHCP 장애 | RF→Scan→Association→Security→802.1X→Role/VLAN→DHCP→Policy→Routing→DNS/Application 타임라인 |
| 18 / 6 / `fhrp` | VIP, Active/Standby, Priority/Preempt / 09,A | Cisco HSRP 우선, Aruba VRRP 대체, Gateway/상향 링크 장애 | 역할·ARP·GARP·연속 Ping; Failover 때 항상 MAC 변경이라 단정 금지 |
| 19 / 6 / `vrf` | Routing Table 분리, 동일 Prefix, Leaking / 09 | VRF별 같은 Prefix, 잘못된 VRF/Leaking | VRF별 Route/Ping, 격리와 연결 근거 |
| 20 / 6 / `bgp` | eBGP/iBGP, ASN, NEXT_HOP, AS_PATH, LOCAL_PREF, MED, Filter / 10,19 | Policy 변경, Next Hop/Prefix 차단 | Neighbor Up 이후 실제 최적 경로 변경 이유 |
| 21 / 6 / `redistribution` | Static↔OSPF↔BGP, Metric, Filter, Loop / 20 | Route 누락, 중복 재분배/Loop 위험 | 출처·Tag·Metric·경로 변화, 격리된 소규모 환경 |
| 22 / 7 / `observability` | Packet/CLI/Syslog/SNMP/Event Time / 10,17 | 한 장애의 서로 다른 근거 수집 | UTC/시계 오차/누락 표시한 사건 Timeline |
| 23 / 7 / `network-automation` | Python, SSH/API, Baseline 비교 / 22 | 장비 2대 이상, 수집 실패, 기준 이탈 | run ID, expected/actual, PASS/FAIL/INCONCLUSIVE, Windows CI |
| 24 / 8 / `aws-network` | VPC/Subnet/Route/IGW/NATGW/SG/NACL/TGW / 13,19 | 우선 시뮬레이션, Route·정책 오류 | VLAN≠Subnet, ACL≠NACL, Stateful SG 차이; 유료 리소스는 별도 명시 승인 후 |
| 25 / 8 / `dc-fabric` | Clos, Leaf/Spine, Underlay/Overlay, VTEP/VNI/VXLAN/EVPN / 20,19 | Underlay 장애, VNI/EVPN Route 오류 | Host1→Host2 내·외부 Header, underlay/overlay 분리 |

RF·Cloud 시뮬레이션은 학습 산출물로 공개할 수 있지만 실제 RF/Cloud Lab 검증의 대체 근거로 세지 않는다. 장비 제약이 있으면 상태를 유지하고 제약을 기록한다.

## 4. 교육 구조와 UX

모든 과정은 왜 필요한가, 선행 개념, 핵심 개념, 토폴로지, 흐름 예상, 직접 선택, 패킷 흐름, 정상, 장애, 원인 찾기, 복구, 진단 절차, Packet 상세, 심화, 퀴즈, Evidence, 완료 기준의 17항목을 포함한다. 실제 패킷이 없으면 흐름에 **교육용 시뮬레이션**을 표시하고 실제 관측 부분은 미수행으로 남긴다.

첫 방문은 기본 모드. 첫 화면은 한 가지 질문, 한 가지 실행 흐름, 목적지 IP/다음 홉/MAC의 관계에 집중한다. 고급 Header, Vendor CLI, RFC는 펼침 영역에 둔다. 선택→피드백→실행 순서를 강제하되 오답도 실행하고 배울 수 있다. 세션 내 학습 체크는 개인 진도이고 공개 검증 상태를 바꾸지 않는다.

## 5. Framework와 디렉터리

최소 구현은 빌드 도구가 필요 없는 ES modules다. `assets/lab/core.js`는 순수 상태 전이, `assets/lab/engine.js`는 뷰·이벤트·취소 가능한 재생, `assets/lab/lab.css`는 새 루트 내부 스타일, `assets/lab/scenarios/`는 데이터, `assets/lab/ipv4.js`는 IP 계산을 담당한다. 상세 계약은 별도 설계 문서를 따른다.

```text
labs/ip-subnetting.html             # 첫 교육 파일럿
assets/lab/{core,engine,ipv4}.js
assets/lab/lab.css
assets/lab/scenarios/ip-subnetting.js
lab-plans/ip-subnetting.md          # 구현 전 작성
topologies/ip-subnetting/README.md  # 노드/링크 정의, 이미지 없음
configs/ip-subnetting/README.md     # Vendor별 작성 기준
evidence/ip-subnetting/README.md    # 아직 실험하지 않은 상태 명시
evidence/<topic>/{normal,failure,recovery}/<run-id>/
results/ip-subnetting.json          # 미수행, 실제 근거 배열 비움
docs/IMPLEMENTATION-LOG.md
docs/WINDOWS-LAB-CHECKLIST.md
tests/                             # 순수 계산/상태, 브라우저 회귀
windows-lab-runner/README.md        # 장기 설계만, 실행 코드 미구현
```

아직 사용할 24개 과정의 빈 HTML/가짜 결과를 만들지 않는다. 기존 `learning/` Evidence는 안정된 레거시 경로로 유지한다.

## 6. 호스트 역할과 Tailscale

MacBook: Git/GitHub, 교육 코드, Plan/명령 템플릿, PCAP 분석, 결과 검토, UI 검증, Pages 배포. Windows: GNS3 격리 실습, 부팅, CLI/Ping/Traceroute, GNS3 내부 링크 Capture, 장애/복구. Windows 일반 빌드·테스트는 저장소의 GitHub Actions Windows 러너를 사용하며 실제 노드나 GUI 동작 증거와 분리한다.

관리 경로는 Mac → Tailscale → 기존에 확인한 SSH alias → Windows의 로컬 GNS3 API/파일이다. GNS3 API를 인터넷에 열지 않고 SSH 포트 포워딩 또는 SSH 내부 localhost 호출을 우선한다. Tailscale 주소·실제 사용자 경로·비밀은 로컬 설정만 사용한다. SSH host key 검증을 끄지 않는다. API 버전을 확인한 뒤 읽기 전용 `/v2/version`, `/v2/projects`, `/v2/computes`부터 점검한다. GNS3 버전이 다르면 경로와 응답을 재확인한다.

교육 데이터 경로는 PC1—SW1—R1—SW2—PC2이며 Tailscale/NAT Cloud/회사 NIC와 연결하지 않는다. Capture는 GNS3 해당 링크에서 수행한다. 관리 인터페이스 전체를 캡처하지 않는다. 파일 전송 후 SHA-256을 비교하고 공개 전 검토한 복사본만 저장소에 넣는다.

## 7. 사람이 할 일 / 자동화할 일

| 단계 | 자동화 가능한 범위 | 사람이 확인할 것 |
|---|---|---|
| 사전 점검 | SSH, API GET, 버전·경로·용량·시간 조회 | 사용자 라이선스, 사용 가능한 Cisco/Aruba 이미지, 회사망 미연결 |
| 구성 | 승인된 별도 프로젝트 ID에 정의 적용, CLI 템플릿 | 기존 프로젝트 보호, 부팅/콘솔 최초 접근, 장치 기능 차이 |
| 실험 | 기준 수집, 순차 Ping, Capture 시작/종료, 장애·rollback | 비정상 시 안전 중단, 정확한 링크/캡처 범위, RF/실장비 |
| 분석 | PCAP 필터·해시, expected/actual 비교, Timeline | 무응답 해석, 누락 근거, 모델과 실제 차이 |
| 공개 | 검증된 JSON/HTML 생성, 링크/UI 테스트 | 비밀·개인정보·라이선스 검토, 최종 설명 확인 |

현재 작업은 실제 Windows Lab을 생성하거나 기존 장비 설정을 변경하지 않는다. 연결 가능 여부는 작업 기록에 당일 관측으로 남긴다. 불가 시 [Windows 체크리스트](docs/WINDOWS-LAB-CHECKLIST.md)로 이어간다.

## 8. Evidence 표준과 완료 게이트

각 실행은 `schemaVersion`, `lab`, `runId`, UTC 시작/종료, 환경·플랫폼·버전, `provenance`(real-lab/simulation), `status`, 정상/장애/복구 시나리오, expected/actual, PASS/FAIL/INCONCLUSIVE/NOT_RUN, artifact 경로·SHA-256·capture point·관측 구간·filter, 검토 상태를 가진다. 계획은 expected만 기록하고 actual과 provenance는 null, plannedProvenance는 real-lab, artifact는 빈 배열로 둔다. 실패를 정상 확인으로 바꾸지 않는다.

교육 문서 상태(`contentStatus`)와 실험 상태(`labStatus`)는 독립한다. `planned`는 Plan/준비 중, `in-progress`는 교육 또는 실험 일부 진행, `ready`는 결과 검토 준비, `completed`는 아래 11항목을 모두 충족한 경우다. 기존 ready 라벨의 의미를 일괄 변경하지 않는다.

1. 개념 설명, 2. Lab Plan, 3. 실제/적절한 테스트 구성, 4. 정상 검증, 5. 서로 다른 대표 장애 2개 이상, 6. 재검토 가능한 근거, 7. 각 장애 복구, 8. 교육 HTML, 9. 모바일/PC UI, 10. 예측/판단 요소, 11. 최종 설명 검토.

새 결과는 아직 자동으로 로드맵 숫자에 합산하지 않는다. 후속 수집기가 증거 유무·해시·review를 확인한 후 Topic별 결과를 합산하는 방식으로 이관한다. 브라우저 정답·재생 횟수·CI 통과는 Lab/PCAP/장애/복구 수치를 증가시키지 않는다. 빈 패킷 캡처는 수집 성공과 검증 구간을 확인한 경우에만 부재의 근거가 된다.

## 9. Vendor·주소·보안 기준

Cisco → Aruba → Linux/FRR/VyOS 순으로 사용 가능한 합법적 플랫폼을 선정한다. 라이선스/이미지가 없으면 계획 또는 시뮬레이션만 진행하고 검증했다고 쓰지 않는다. 기능별 명령/포트 이름은 해당 버전에서 검토한다. NOS 이미지, 디스크, 라이선스 파일은 Git에 넣지 않는다.

문서/브라우저 예시는 RFC 5737의 TEST-NET 주소, 실제 격리 Lab은 충돌을 확인한 RFC 1918 주소를 사용한다. TEST-NET은 실서비스 또는 로컬 네트워크용 주소 할당을 권장하는 규격이 아님을 구분한다. 공개 자료에는 합성 MAC과 Lab 이름만 사용하고 실제 회사 IP/MAC/Hostname/VLAN/SSID, RADIUS/ClearPass, Controller/ACL, 운영 로그, 자격증명은 포함하지 않는다. 기존 PCAP을 재활용할 때도 공개 범위를 다시 검토한다.

## 10. 자동화 단계와 우선순위

P0: 현재 구조/중복/Evidence 조사 → 본 계획 → Framework 설계. P1: IP Lab Plan → 순수 엔진/첫 교육 파일럿 → 로컬 회귀/UI → PR/Pages. P2: Windows 사전 점검과 격리 프로젝트 준비 → 정상·잘못된 Mask·잘못된 Gateway·각 복구의 실제 근거 수집 → 결과 검토. P3: IP 완료 게이트 검토 후에만 ICMP 구현 여부를 결정한다.

Runner는 Plan validate → read-only preflight → allowlisted isolated project → baseline → capture/test → fault → observed failure → guaranteed recovery → recovery verification → manifest 순서다. timeout, 중복 run ID 거부, 프로젝트 allowlist, 취소 시 rollback, 비밀 제거, 해시 검증을 먼저 설계한다. 복구 자체가 실패하면 FAIL과 실제 상태를 남기고 자동 다음 실험을 막는다. 실행 코드가 생길 때 최소 `windows-latest` CI로 검증하며 GUI·드라이버·실장비는 별도 수동 증거가 필요하다.

## 11. 위험과 해결

| 위험 | 해결/검증 |
|---|---|
| 기존 페이지 전역 상태·모바일 패치 결합 | 기존 파일 무수정, 새 ES modules와 CSS namespace, 기존 페이지 회귀 |
| Reset 후 이전 비동기 애니메이션 복귀 | run token/AbortController, 취소 테스트 |
| 작은 화면에서 패킷을 놓침 | 내부 topology viewport 확대/축소, opt-in 가로 따라가기, 세로 문서 강제 스크롤 금지 |
| 계산은 맞지만 설명이 틀림 | /0,/31,/32 예외, 한 호스트 Mask 관점과 왕복 통신 구분 |
| 가짜 Evidence 또는 중복 집계 | provenance, NOT_RUN, capture session/file 수 구분, 결과 검토 gate |
| 장비/라이선스/버전 불일치 | capability preflight와 대체 플랫폼, 미검증 명시 |
| AWS 비용/RF 제약 | 시뮬레이션 우선, 유료/실장비 작업은 별도 명시 범위 |
| 민감정보 공개 | 수집 최소화, 로컬 원본/공개본 분리, 공개 전 내용 검토 |
| Pages 캐시·상대경로 | 로컬 HTTP + 공개 URL 재확인, 배포 SHA와 주요 파일 hash 비교 |

## 12. 검증과 인수

새 계산/상태 전이는 Node 테스트, UI는 Desktop 1440px / Tablet 768px / Mobile 390px와 320px에서 확인한다. 예측, 오답 피드백, 모드, 시나리오 변경, 재생/Reset/재실행, 확대/축소, 따라가기, Packet 상세를 확인한다. 기존 보고서·시뮬레이터·Viewer·로드맵의 링크/JS 오류/페이지 overflow도 비교한다. 통과한 작은 변경만 기능 단위 commit으로 남긴다. 배포 성공 이후 공개 페이지 내용과 인터랙션을 확인한다.

공식 참고: [RFC 5737](https://www.rfc-editor.org/rfc/rfc5737), [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918), [RFC 3021](https://www.rfc-editor.org/rfc/rfc3021), [GNS3 API 문서](https://gns3-server.readthedocs.io/en/stable/).
