# Data Center Networking — 검증 요청서

- Topic ID: `dc-fabric`
- Roadmap: [8단계 Data Center Networking](https://sebia1993.github.io/roadmap.html)
- Concept Draft: [`../labs/dc-fabric.html`](../labs/dc-fabric.html)
- Result Manifest: [`../results/dc-fabric.json`](../results/dc-fabric.json)
- 작성일: 2026-10-13 (Asia/Seoul)
- Expected 작성 상태: `PREWRITTEN`
- Pipeline Status: `VALIDATION_BLOCKED`
- 모든 Claim / Scenario: `NOT_RUN`
- Run ID: 없음 (`null`)

이 문서는 **실행 전 검증 계획**이다. 현재 연결된 승인 검증 Runtime과 PNETLab 세션이 없으며, 이 주제에 재사용할 기존 CLI·PCAP Evidence도 확인되지 않았다. 아래 Expected는 관측 결과가 아니다. HTML의 그림이나 브라우저 동작 확인은 실제 네트워크 검증 Evidence로 사용하지 않는다.

## 목표와 범위

**Learning Goal:** 다른 Leaf에 연결된 같은 서브넷의 두 서버가 통신할 때, Leaf–Spine 구조·Underlay·VXLAN·VNI·EVPN의 역할을 구분해 설명한다.

**Core Question:** 다른 Leaf에 연결된 두 서버의 Ethernet 프레임이 IP 패브릭을 지나 어떻게 목적지 서버까지 전달되는가?

| 구분 | 이번 범위 |
| --- | --- |
| Vendor-Neutral Core | Leaf–Spine 구조, Underlay/Overlay 역할 분리, 알려진 목적지로의 L2 전달 |
| Standard / Protocol | VXLAN 데이터 평면, VNI, BGP EVPN Type 2 원격 MAC 정보 |
| Validation Implementation | Cisco 기본. VXLAN·BGP EVPN을 지원하는 실제 플랫폼·버전 확인 후 확정 |
| Validation Mode | Concept Validation: Expected → Preflight → Baseline → Action → CLI/PCAP Observe → 비교 → Result |
| 제외 | Inter-VNI routing/IRB, Anycast Gateway, EVPN Multihoming, BUM 설계, 장비 성능, 장애 수렴 시간, 보안성 보장 |
| Failure / Recovery | 이번 정상 개념 Claim에는 해당 없음. 장애·복구를 실행하거나 완료했다고 기록하지 않음 |

Known unicast 구간만 비교한다. Server A/B의 Neighbor와 각 Leaf의 목적지 정보가 준비된 뒤 시험 프레임을 보낸다. 초기 ARP/BUM을 생략했다는 전제를 기록하고, 이 시험으로 모든 ARP/BUM 동작을 검증했다고 주장하지 않는다. 같은 서브넷의 L2 브리징이므로 Gateway/IRB를 경유하지 않는다.

## 실행 전 Hard Gate

상위 규칙은 `Network-Learning-Pipeline-SKILL.md` §5–9, 실제 실행 기준은 `Network-Lab-Validation-Standard-SKILL.md` §0, §7, §17이다.

1. 실행 Runtime의 Model과 Reasoning Effort를 신뢰할 수 있는 메타데이터로 확인한다. 최소 기준은 `GPT-6 Astra / High`이다.
2. 현재 기록은 `runtime_model: null`, `runtime_reasoning_effort: null`, `runtime_gate: UNVERIFIED`, 사유 `RUNTIME_UNVERIFIED`이다. Runtime Gate가 PASS가 되기 전 실제 검증을 시작하지 않는다.
3. 승인된 Windows PC / PNETLab / 장비 콘솔 / Capture 접근과 Lab 격리를 확인한다. 현재 연결된 검증 세션은 없다.
4. Cisco 플랫폼·이미지·OS 버전과 VXLAN, EVPN, ECMP, Capture 지원을 확인한다. 지원 여부를 확인하지 않은 IOL/IOS 이미지에 VXLAN/EVPN 지원을 가정하지 않는다. 다른 Vendor로 임의 대체하지 않는다.
5. 실제 Node/Interface 이름, 링크 주소, Underlay 라우팅 설계, EVPN 세션 설계, VLAN–VNI/RT 매핑, MTU를 기록한다. 아래 계획을 실제 지원 명령으로 완성한 뒤 Expected와 범위가 맞는지 다시 확인한다.
6. Run이 실제 시작된 때에만 Run ID와 시작 시간을 만든다. 지금은 모든 `actual = null`, `result = NOT_RUN`, `artifacts = []`를 유지한다.

## 최소 토폴로지와 주소 계획

아래는 실제 발견된 토폴로지가 아니라 **계획**이다.

| 표시 이름 | 역할 | 계획 주소·연결 |
| --- | --- | --- |
| Server A | 송신 서버 | `10.10.10.11/24`, Switch A의 로컬 access segment |
| Server B | 수신 서버 | `10.10.10.12/24`, Switch B의 로컬 access segment |
| Switch A | Leaf / VTEP | VTEP `192.0.2.11/32`, Switch C와 D에 각각 L3 uplink |
| Switch B | Leaf / VTEP | VTEP `192.0.2.12/32`, Switch C와 D에 각각 L3 uplink |
| Switch C | Spine / IP transit | Switch A와 B 연결. 이 예시에서 VTEP 역할 없음 |
| Switch D | Spine / IP transit | Switch A와 B 연결. 이 예시에서 VTEP 역할 없음 |

- Overlay: Server A/B 모두 같은 bridge-domain의 `VNI 10100`. access VLAN 번호는 플랫폼 확인 후 기록하며 VNI와 같은 숫자일 필요가 없다.
- Underlay: A–C, A–D, B–C, B–D의 네 L3 링크. 각 링크 주소·실제 Interface 이름과 라우팅 프로토콜/ASN은 Preflight에서 확정한다.
- 구조 범위: Leaf 간 직접 링크와 Spine 간 직접 링크가 없는 단순 2-tier 예시이다. 이 제한을 모든 데이터센터의 필수 구조라고 일반화하지 않는다.
- 예상 후보 경로: Server A → Switch A → Switch C **또는** Switch D → Switch B → Server B.
- ECMP는 지원·설정·경로 조건이 충족될 때 확인한다. 한 패킷을 모든 Spine에 복제하거나 반드시 두 경로가 50:50으로 쓰인다고 예상하지 않는다.
- MAC 주소는 실제 Test Host에서 수집한다. 임의 MAC을 Actual로 넣지 않는다.
- 위 주소는 문서/실습 계획이다. 운영망 주소, Credential, 라이선스 이미지는 기록하거나 공개하지 않는다.

## Capture Point 계획

| ID | 위치 | 비교 목적 |
| --- | --- | --- |
| CP-BEFORE | Server A ↔ Switch A access link | VXLAN 캡슐화 전 Ethernet/IP |
| CP-UNDERLAY-C-A | Switch A ↔ Switch C | C 경로 진입의 outer/inner 헤더 |
| CP-UNDERLAY-C-B | Switch C ↔ Switch B | C 경로 transit 후 outer/inner 헤더 |
| CP-UNDERLAY-D-A | Switch A ↔ Switch D | D 경로 진입의 outer/inner 헤더 |
| CP-UNDERLAY-D-B | Switch D ↔ Switch B | D 경로 transit 후 outer/inner 헤더 |
| CP-AFTER | Switch B ↔ Server B access link | VXLAN 제거 후 Ethernet/IP |

실제 선택된 경로를 모르는 상태에서 하나의 uplink 캡처만 보고 패킷 부재를 판정하지 않는다. ECMP 경로 판별에 필요한 uplink를 수집하고, 수집 자원 때문에 나눠 실행하면 Run/시간/flow 조건을 구분한다. End-to-end 동일 패킷 비교는 캡슐화 전·Underlay·제거 후의 PCAP에서 주소, ICMP ID/sequence 또는 다른 고유 payload, 시각을 함께 대조한다. outer TTL/MAC 등 홉별 값과 inner 필드를 분리한다.

## Required CLI / 실행 계획

**플랫폼·버전과 공식 명령 문서를 먼저 확인한 후 정확한 명령을 채운다.** 아래는 명령이 확인해야 할 항목이며, 실행한 명령이나 장비 출력이 아니다.

| 수집 항목 | 확인할 내용 | 확정할 실제 명령 |
| --- | --- | --- |
| Platform | 장비 모델·OS 버전·기능 지원·라이선스 조건 | `TBD — 공식 플랫폼 문서와 장비 help 확인 후 기록` |
| Link / Interface | 네 uplink, 두 access link의 실제 대응·up 상태·주소·MTU | `TBD` |
| Underlay RIB/FIB | 상대 VTEP /32 도달 경로와 실제 설치된 두 ECMP next-hop | `TBD` |
| VTEP reachability | 출발 VTEP 주소를 지정한 상대 VTEP 왕복 probe | `TBD` |
| VXLAN/VNI | VTEP 주소, 터널 상태, bridge-domain/VLAN과 VNI 10100 매핑 | `TBD` |
| EVPN | EVPN address-family 세션, Type 2 route의 MAC·선택적 IP·next-hop·RT와 import 결과 | `TBD` |
| Forwarding | 로컬/원격 MAC의 출처, VNI/bridge-domain, remote VTEP 매핑과 실제 설치 상태 | `TBD` |
| Test Host | IP/prefix/MAC/neighbor, 같은 subnet의 알려진 목적지에 대한 시험 traffic | `TBD` |
| Capture | 각 Capture Point의 실제 Interface, 시작/종료 시각, drop counter, raw PCAP 저장 | `TBD` |

기본 절차:

1. Runtime/환경/플랫폼 Gate를 통과하고 위 `TBD`와 실제 주소·Interface 표를 완성한다.
2. Baseline CLI와 Capture 동작을 수집한다. Source/Expected 변경이 필요한 구현 차이는 먼저 기록한다.
3. 상대 VTEP 도달성과 ECMP의 설치 상태를 확인한다. 이 성공만으로 Overlay 성공을 판정하지 않는다.
4. VNI 매핑과 EVPN Type 2 수신/import, 원격 MAC 전달 상태를 확인한다. BGP 세션이 Established인 것만으로 MAC 전달을 판정하지 않는다.
5. Server A/B Neighbor와 원격 목적지 상태가 준비되었는지 확인하고, Known unicast 시험 traffic을 생성한다.
6. CP-BEFORE → 실제 선택된 Underlay 경로 → CP-AFTER의 동일 패킷을 비교한다. 반대 방향 응답도 별도로 추적한다.
7. Claim별 Expected/Actual/CLI/PCAP를 교차검증하고 실제 Artifact 경로를 Result에 기록한다.

## 공통 판정 기준

- PASS: 해당 Claim의 사전 Expected와 Actual이 일치하고, 대응 CLI·PCAP 및 필요한 Node/Link 매핑이 있다.
- FAIL: Preflight/Baseline과 관측 신뢰성이 확보된 상태에서 Actual이 Expected와 불일치한다.
- INCONCLUSIVE: Capture/장비 지원/설정·관측 범위 문제로 Claim을 신뢰성 있게 판정할 수 없다.
- NOT_RUN: 실제 Scenario를 수행하지 않았다. 이번 문서의 모든 Claim은 이 상태다.
- 패킷 부재는 정상 대조 traffic, Capture 활성 구간과 위치, 필터 조건·drop 여부를 함께 확인해야 판정 근거로 사용할 수 있다.

## DC-01 — Leaf–Spine과 ECMP

- Claim Type: `Vendor-Neutral Core`; 경로 선택 방식은 `Implementation Behavior` 범위를 별도 기록.
- Claim: 이 2-tier 계획에서 각 Leaf는 두 Spine에 연결되며, ECMP가 설정·설치되면 목적지 VTEP에 대한 동등한 두 next-hop을 사용할 수 있다.
- Source: [RFC 7938 §3.2](https://www.rfc-editor.org/rfc/rfc7938.html#section-3.2), [§6](https://www.rfc-editor.org/rfc/rfc7938.html#section-6). 이 RFC는 설계 경험을 정리한 Informational 문서이다.
- Expected (`PREWRITTEN`): 링크 네 개와 RIB/FIB의 두 next-hop이 일치한다. 알려진 unicast flow의 관측 경로가 C 또는 D를 거쳐 B로 이어진다. per-packet 복제나 정확한 균등 비율을 요구하지 않는다.
- Validation Goal: 토폴로지 연결과 실제 설치된 전달 경로를 구분해 확인.
- Capture Point: CP-UNDERLAY-C-A/B 및 CP-UNDERLAY-D-A/B.
- Required CLI: 실제 Interface Map, 상대 VTEP route와 FIB/multipath 상태.
- Required Evidence: CLI, 흐름을 구분할 수 있는 uplink PCAP, 실제 Node/Link Map.
- Claim PASS 조건: 두 동등 next-hop 설치 증거와 그 중 한 경로로 전달된 시험 traffic 증거가 있다. 두 경로의 이용률은 별도 성능 검증 범위이다.
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## DC-02 — Underlay 도달성

- Claim Type: `Vendor-Neutral Core` / `Standard Behavior`.
- Claim: VXLAN 종단 간 전송을 위해 Underlay가 상대 VTEP IP로 패킷을 전달할 수 있어야 한다.
- Source: [RFC 7348 §4.3](https://www.rfc-editor.org/rfc/rfc7348.html#section-4.3), [RFC 8365 §1](https://www.rfc-editor.org/rfc/rfc8365.html#section-1).
- Expected (`PREWRITTEN`): `192.0.2.11`에서 `192.0.2.12`로, 역방향으로도 VTEP source를 지정한 probe가 전달된다. RIB/FIB·next-hop과 Underlay PCAP가 대응한다.
- Validation Goal: 서버 overlay 주소와 VTEP transport 주소를 분리해 확인.
- Capture Point: 실제 선택된 Underlay 경로의 양쪽 링크.
- Required CLI: VTEP /32 route, 출발 주소를 지정한 도달성 probe, Interface 상태·MTU.
- Required Evidence: CLI와 VTEP 간 probe의 PCAP.
- Claim PASS 조건: 양방향 VTEP 도달성과 경로를 입증한다. **VTEP ping 성공은 VXLAN·VNI·EVPN 또는 서버 통신 성공의 충분조건이 아니다.**
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## DC-03 — VTEP의 VXLAN 추가와 제거

- Claim Type: `Vendor-Neutral Core` / 공개 프로토콜 규격. RFC 7348은 Informational이며 Standards Track으로 표시하지 않는다.
- Claim: 송신 VTEP는 inner Ethernet 프레임을 VXLAN/UDP/IP로 감싸고, 수신 VTEP는 해당 VXLAN segment의 프레임을 꺼내 로컬 segment에 전달한다.
- Source: [RFC 7348 §4](https://www.rfc-editor.org/rfc/rfc7348.html#section-4), [§5](https://www.rfc-editor.org/rfc/rfc7348.html#section-5).
- Expected (`PREWRITTEN`): CP-BEFORE의 프레임이 Underlay에서 outer source/destination `192.0.2.11 → 192.0.2.12`, VXLAN VNI `10100` 안에 보인다. CP-AFTER에서는 VXLAN 헤더가 제거된다. 역방향은 VTEP source/destination이 반대이다.
- Validation Goal: 서버 주소와 터널 끝점 주소, 캡슐화 전·중·후를 구분.
- Capture Point: CP-BEFORE, 선택된 Underlay 양쪽, CP-AFTER.
- Required CLI: VTEP 및 VXLAN peer, VNI 상태와 매핑.
- Required Evidence: 같은 패킷을 연결할 수 있는 세 구간 raw PCAP와 CLI.
- Claim PASS 조건: VTEP 사이에서만 VXLAN 포장이 관측되고 해당 프레임이 목적지 access segment까지 전달된다.
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## DC-04 — VNI의 범위

- Claim Type: `Vendor-Neutral Core` / 공개 프로토콜 규격. RFC 7348은 Informational이며 Standards Track으로 표시하지 않는다.
- Claim: VNI는 VXLAN의 inner MAC 프레임이 속한 논리 L2 segment를 식별한다.
- Source: [RFC 7348 §4](https://www.rfc-editor.org/rfc/rfc7348.html#section-4), [§5](https://www.rfc-editor.org/rfc/rfc7348.html#section-5), [RFC 8365 §5](https://www.rfc-editor.org/rfc/rfc8365.html#section-5).
- Expected (`PREWRITTEN`): 양쪽 Leaf에서 Server A/B가 속한 로컬 bridge-domain이 VNI `10100`에 매핑되고, 전송된 VXLAN 패킷에 `10100`이 기록된다. VNI를 서버 IP나 VLAN 번호와 같은 값으로 해석하지 않는다.
- Validation Goal: 설정의 segment 범위와 packet header를 대조.
- Capture Point: 선택된 Underlay 링크, CP-AFTER.
- Required CLI: 로컬 segment–VNI 매핑, MAC entry의 bridge-domain/VNI 범위.
- Required Evidence: 매핑·전달 상태 CLI와 VNI 필드를 확인한 PCAP.
- Claim PASS 조건: 양단 매핑과 실제 VNI가 일치하고 로컬 segment 전달이 확인된다.
- Scope Limit: 이 최소 시험에는 VNI가 하나뿐이다. 다른 VNI 간 격리, Inter-VNI routing, 보안성을 검증했다는 주장에는 사용하지 않는다.
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## DC-05 — EVPN Type 2의 원격 MAC 정보

- Claim Type: `Standard Behavior`; forwarding-state 설치 시점은 `Implementation Behavior`.
- Claim: EVPN Type 2는 원격 MAC 도달 정보를 BGP로 광고한다. IP 정보는 선택적으로 함께 포함할 수 있다. VXLAN 적용에서 이 정보와 next-hop을 원격 VTEP 전달 정보에 연결한다.
- Source: [RFC 7432 §7.2](https://www.rfc-editor.org/rfc/rfc7432.html#section-7.2), [§9.2](https://www.rfc-editor.org/rfc/rfc7432.html#section-9.2), [RFC 8365 §4–5](https://www.rfc-editor.org/rfc/rfc8365.html#section-4). RFC 7432의 MPLS 기반 절차를 VXLAN에 적용하는 범위는 RFC 8365와 함께 해석한다.
- Expected (`PREWRITTEN`): Switch A가 Server B의 MAC에 대한 Type 2를 수신·import하고 next-hop `192.0.2.12`와 연결한다. 알려진 unicast 시험 시 해당 원격 MAC의 실제 forwarding state도 확인한다. Type 2에 IP가 없어도 그 자체로 FAIL로 판정하지 않는다.
- Validation Goal: EVPN 제어 정보와 VXLAN 데이터 전달의 역할을 분리해 확인.
- Capture Point: EVPN 세션이 지나는 실제 Underlay 링크, 필요 시 제어 plane Capture 지원 여부 확인.
- Required CLI: EVPN 세션, 해당 Type 2 route의 MAC/선택적 IP/next-hop/RT, 수신·import 상태, 원격 MAC forwarding state와 출처.
- Required Evidence: CLI, 수집 가능한 BGP EVPN UPDATE PCAP 및 해당 목적지 VXLAN unicast PCAP. 수집 실패로 핵심 교차검증을 할 수 없으면 INCONCLUSIVE.
- Claim PASS 조건: 관련 Type 2 정보와 원격 forwarding state 및 실제 전달을 연결한다. Type 2 수신만으로 즉시 모든 장비에 forwarding entry가 설치된다고 일반화하지 않는다.
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## DC-06 — 같은 서브넷 Known unicast의 End-to-end 비교

- Claim Type: `Standard Behavior`.
- Claim: 이 같은 서브넷 L2 브리징 예시에서 서버 Ethernet/IP 정보는 inner 프레임에 실리고, Underlay는 VTEP 사이의 outer IP를 사용한다. Spine은 이 예시에서 VXLAN 종단이 아니다.
- Source: [RFC 7348 §4.1](https://www.rfc-editor.org/rfc/rfc7348.html#section-4.1), [§5](https://www.rfc-editor.org/rfc/rfc7348.html#section-5), [RFC 8365 §4–5](https://www.rfc-editor.org/rfc/rfc8365.html#section-4).
- Expected (`PREWRITTEN`): 동일한 시험 프레임에서 inner source/destination MAC, IP `10.10.10.11 → 10.10.10.12`, IP TTL 및 payload가 CP-BEFORE/Underlay/CP-AFTER에서 대응한다. Underlay 구간의 outer endpoint는 `192.0.2.11 → 192.0.2.12`이고, outer TTL/MAC은 라우팅 홉에 따라 처리된다. 같은 프레임의 응답도 반대 방향으로 대응한다.
- Validation Goal: inner/outer 필드를 혼동하지 않고 캡슐화 전·중·후를 끝까지 추적.
- Capture Point: CP-BEFORE, 선택된 Spine의 진입·진출 링크, CP-AFTER.
- Required CLI: Server 주소/Neighbor, 양단 원격 MAC 및 VNI, Underlay FIB.
- Required Evidence: 동일 패킷 비교표와 raw PCAP, CLI, 실제 선택된 순방향/응답 경로.
- Claim PASS 조건: 같은 서브넷 L2 전달에서 위 필드와 패킷이 대응하고 실제 서버 도착/응답이 확인된다.
- Scope Limit: frame padding/FCS 및 로컬 VLAN tag의 바이트 단위 동일성을 요구하지 않는다. 다른 서브넷의 IRB에서는 inner MAC/TTL 처리 전제가 달라지므로 이 결과를 그대로 확대하지 않는다.
- Result: `NOT_RUN`; Actual: `null`; Artifacts: `[]`.

## Topology Handoff 요청

- Topology Visualization: `REQUIRED`
- Node Map: 실제 PNETLab 이름·플랫폼·역할·주소를 `Switch A/B/C/D`, `Server A/B` 표시 이름에 매핑.
- Link / Interface Map: 위 여섯 연결의 실제 Interface와 Capture Point.
- Actual Path / Reply Path: CLI·PCAP로 확인한 순서만 기록. 현재는 `null`.
- Broadcast / Flood Branch: 이번 Known unicast Claim 범위 밖. 초기 학습 절차가 관측되면 별도 표시하며 검증 Claim으로 자동 확대하지 않음.
- Failure / Stop Point / Recovery Path: 이번 계획에는 해당 없음. 실행하지 않은 장애·복구를 완료로 표시하지 않음.
- Teaching Simplification: 관리망·라우팅/BGP 세션 배선은 학습 그림에서 생략 가능하나 실제 Handoff에는 남김. 그림의 경로 선택을 실제 관측 경로로 역작성하지 않음.

## Result 작성과 콘텐츠 승격

`dc-fabric.json`의 DC-01–DC-06을 이 문서의 동일 Claim ID와 대조한다. 실제 실행 전에는 `runId: null`, `actual: null`, `artifacts: []`, `NOT_RUN`을 유지한다. CLI/PCAP의 경로·수집 시각·실제 플랫폼·Runtime·Capture Point와 필요한 Hash를 관측 후 기록한다.

Runtime Gate PASS, 실제 Claim 검증, Actual/Evidence 및 구현 차이 검토가 완료되기 전에는 이 Concept Draft를 최종 검증된 학습 콘텐츠로 승격하거나 전체 상태를 `COMPLETE`/`VALIDATED`로 표시하지 않는다. 이 제한은 HTML의 디자인·접근성·링크 QA와 별개이다.
