# Data Center Networking — 문헌 조사 및 Claim Map

- Topic: `dc-fabric` / `Leaf-Spine / VXLAN / EVPN`
- Roadmap: `learning-data.json`, 8단계 · Data Center Networking
- 대상: `labs/dc-fabric.html` Concept Guide 초안 1개
- 문헌 확인일: 2026-10-13
- 적용 규칙: Network Learning Pipeline v1.10, Two-Stage Technical Learning Design v2.16
- 문헌 초안: `DRAFT_READY` / Pipeline: `VALIDATION_BLOCKED` / 실제 동작 검증 상태: 모든 Claim `NOT_RUN`
- 실제 Evidence: 없음. 이번 조사에서 장비 CLI, PCAP, PNETLab 결과를 수집하지 않았다. 공식 자료의 설명 및 제조사 검증 기록은 이번 제작의 Actual Evidence가 아니다.

## 학습 목표와 범위

**서로 다른 Leaf에 연결된 같은 네트워크의 서버 사이에서 Underlay·VXLAN·EVPN의 역할을 구분하고 알려진 목적지까지의 전달 경로를 설명한다.**

하나의 동일한 예시를 사용한다. Server A/B는 `10.10.10.11/24`, `10.10.10.12/24`, 같은 L2 VNI `10100`에 속한다. Switch A/B는 Leaf와 VTEP를 겸하며 VTEP 주소는 `192.0.2.11`, `192.0.2.12`이다. Switch C/D는 이 도식에서 L3 transit Spine 역할만 맡는다. 모든 주소와 장비명은 학습용이다.

Underlay 경로, VNI 연결, EVPN 경로 및 원격 MAC 전달 정보가 준비되고 Server A의 ARP 항목도 존재하는 **Known Unicast** 상황으로 한정한다. 첫 ARP, BUM 처리, 서로 다른 서브넷의 라우팅, Multihoming, 장애 수렴, 실제 CLI는 본문 범위 밖이다.

## 핵심 Claim 6개

| ID | Claim | 분류 | Source / 적용 절 | 제한 및 Expected |
|---|---|---|---|---|
| DC-01 | 기본 Leaf–Spine 축소 모델에서는 서버가 Leaf에 연결되고 각 Leaf가 모든 Spine에 연결된다. 동일 비용 경로가 준비되면 ECMP로 트래픽을 분산할 수 있다. | Vendor-neutral 구조 / Teaching Simplification | S1 §3.2.1–3.2.2, §6.4; S5 Reference Design Overview | 모든 Data Center가 이 구조라는 뜻은 아니다. Expected: Switch A→Switch C→Switch B와 Switch A→Switch D→Switch B가 가능한 경로이며, 선택 경로 1개를 그린 것이 패킷 복제를 뜻하지 않는다. |
| DC-02 | Underlay는 터널 끝점 사이의 IP 도달성을 제공한다. | Standard Behavior | S3 §1 | 특정 Underlay 프로토콜을 필수로 고정하지 않는다. Expected: 원격 VTEP `192.0.2.12`까지의 운반 경로가 원래 서버 목적지 `10.10.10.12`와 구분된다. |
| DC-03 | 송신 VTEP는 원래 Ethernet 프레임에 VXLAN·UDP·IP 등의 운반 정보를 붙이고 수신 VTEP는 이를 제거한다. | 공개 프로토콜 규격 / Common Behavior | S2 §4.1, §5; S3 §5.1 | S2는 Informational이다. 서버 간 원본 프레임의 FCS까지 동일하게 보존한다는 뜻은 아니다. Expected: 중간 구간에는 캡슐화된 패킷이, 수신 서버 구간에는 캡슐화가 제거된 프레임이 나타난다. |
| DC-04 | VNI는 VXLAN 논리 네트워크를 식별하는 24비트 값이다. 이 예시는 동일 L2 VNI를 사용해 두 서버의 L2 영역을 잇는다. | 공개 프로토콜 규격 / Common Behavior | S2 §4, §5; S3 §5.1–5.1.2 | VNI가 다르면 별도의 L3 라우팅으로도 통신 불가능하다고 일반화하지 않는다. 로컬 VLAN ID와 VNI 값이 같아야 하는 것은 아니다. Expected: VNI `10100`이 양쪽 로컬 L2 영역의 연결 범위를 나타낸다. |
| DC-05 | EVPN은 MP-BGP로 원격 MAC 도달 정보를 교환한다. Type 2 MAC/IP Advertisement Route에는 IP 주소를 선택적으로 포함할 수 있다. 이 정보 교환은 VXLAN의 데이터 캡슐화와 구분된다. | Standard Behavior | S4 §7.2, §9.2–9.2.1; S3 §4, §5.1.3 | EVPN의 모든 경로를 Type 2로 축소하지 않는다. 로컬 MAC 학습과 원격 EVPN 학습을 구분한다. Expected: Server B의 MAC에 대한 경로와 VTEP next hop 정보를 구별하며 IP 필드 생략이 가능함을 설명한다. |
| DC-06 | 같은 서브넷·같은 L2 VNI의 Known Unicast는 Server A→Switch A(VTEP)→Switch C(중계)→Switch B(VTEP)→Server B로 전달되는 모델로 설명한다. 중계 구간의 목적지는 외부 VTEP IP이고 원본 서버 목적지는 내부에 있다. | Standard/Common 기반 Teaching Simplification | S2 §4.1, §5; S3 §1, §5.1.3; S6 기본 구조·Underlay 설명 | 이 그림의 Spine은 VXLAN 종료나 서버 간 라우팅을 수행하지 않는다. 모든 Spine이 항상 이 역할만 맡는다고 일반화하지 않는다. Expected: 외부 목적 IP와 내부 목적 MAC/IP를 구분하고 양 끝 VTEP에서만 캡슐화가 바뀌는 정상 모델을 추적한다. |

`Expected`는 후속 검증을 위한 예상이며 실제 관측값이 아니다. 모든 행의 Actual은 미수집, Result는 `NOT_RUN`이다.

## Source Map

| Source | 공식 문서 / URL | 문서 성격과 사용 범위 |
|---|---|---|
| S1 | [RFC 7938 — Use of BGP for Routing in Large-Scale Data Centers](https://www.rfc-editor.org/rfc/rfc7938) | Informational. §3.2.1의 Folded Clos/Leaf–Spine 관계, §3.2.2의 ECMP, §6.4의 Flow/Next-hop affinity 설명. VXLAN/EVPN 전체 설계의 필수 Underlay를 정하는 근거로 사용하지 않는다. |
| S2 | [RFC 7348 — VXLAN](https://www.rfc-editor.org/rfc/rfc7348.html) | Independent Submission / Informational. §4·4.1·5로 VNI, VTEP, 캡슐화와 Known Unicast 형식을 확인했다. 이 문서의 Data-plane Learning 예시를 EVPN Control-plane Learning 근거로 전용하지 않는다. |
| S3 | [RFC 8365 — A Network Virtualization Overlay Solution Using EVPN](https://www.rfc-editor.org/rfc/rfc8365.html) | Standards Track. §1은 Underlay 도달성, §4는 EVPN 기능, §5.1은 VXLAN Data Plane, §5.1.3은 EVPN 경로의 NVE next hop을 확인하는 근거다. |
| S4 | [RFC 7432 — BGP MPLS-Based Ethernet VPN](https://www.rfc-editor.org/rfc/rfc7432.html) | Standards Track. §7.2·§9.2·§9.2.1로 Type 2 경로와 IP 필드의 선택적 포함을 확인했다. MPLS 전달 절차는 VXLAN 본문에 그대로 옮기지 않으며 S3와 함께 적용한다. |
| S5 | [Juniper — Data Center Fabric Reference Design Overview and Validated Topology](https://www.juniper.net/documentation/us/en/software/nce/sg-005-data-center-fabric/topics/concept/solution-cloud-data-center-topology-overview.html) | 공식 구현/설계 문서. 각 Leaf↔모든 Spine, 서버↔Leaf 연결 사례를 확인했다. 해당 문서의 Junos 버전·장비·테스트 규모를 일반 규격이나 이번 제작의 실증 결과로 확대하지 않는다. |
| S6 | [Cisco — Nexus 9000 VXLAN BGP EVPN Data Center Fabrics Fundamental Design and Implementation Guide](https://www.cisco.com/c/en/us/td/docs/dcn/whitepapers/cisco-vxlan-bgp-evpn-design-and-implementation-guide.html) | 공식 구현/설계 문서. 기본 Clos 배치, VTEP 간 Underlay 전달, Spine의 추가 역할 가능성을 교차 확인했다. Cisco 권장 Underlay 프로토콜을 모든 Vendor의 필수 조건으로 제시하지 않는다. |
| S7 | [RFC 9746 — BGP EVPN Multihoming Extensions for Split-Horizon Filtering](https://www.rfc-editor.org/rfc/rfc9746.html) | RFC 7432·8365의 업데이트 확인용. Multihoming Split-Horizon 선택을 확장한다. 이번 single-homed Known Unicast 설명에는 직접 적용하지 않는다. |

## 후속 실제 검증에 필요한 관측

최종 Validation Request는 별도 작성한다. 아래는 필요한 관측의 개요이며 실행 기록이 아니다.

1. Switch A/B/C/D의 실제 링크와 인터페이스 주소, VTEP 위치를 기록한다. ECMP를 구현할 경우 해당 VTEP 경로의 동일 비용 next hop을 확인한다.
2. Underlay의 원격 VTEP 도달성과 EVPN 원격 MAC 경로를 서로 다른 항목으로 확인한다. Type 2의 MAC, 선택적 IP, next hop을 기록한다.
3. 사전 ARP·전달 정보가 준비된 Server A→B 유니캐스트를 생성한다. 서버측과 Fabric측 Capture를 비교해 내부 MAC/IP, 외부 VTEP IP, VNI를 확인한다.
4. VNI 확인을 위해 양쪽 VTEP의 실제 매핑과 Capture를 대조한다. 단순 브라우저 표식 일치를 프로토콜 검증으로 취급하지 않는다.

실행 장비·Runtime·CLI·PCAP 근거가 확보되기 전에는 `PASS`, `VALIDATED`, 최종 콘텐츠 승격을 기록하지 않는다.

## HTML 기술 검토 메모

2026-10-13 `labs/dc-fabric.html` 검토 시 본문의 동일 Subnet/L2 VNI, EVPN/VXLAN 역할 분리, Known Unicast 전제, 내부/외부 주소와 Spine 역할 제한은 위 조사 범위와 일치했다.

- RFC 7938 출처 절 오기를 발견해 `§3.2, §6`으로 수정했다. 상세 근거는 §3.2.1–3.2.2, §6.4이다.
- RFC 7432의 IP 선택 필드 근거를 좁혀 표시하려면 `§7.2, §9.2–9.2.1`을 사용한다.
- 주소 표현을 “같은 서브넷의 서로 다른 IP 주소로 설정하는 것만으로”로 수정해 동일 IP 중복 설정이라는 오해를 없앴다.
- Switch B의 절차를 `VNI와 대상 L2 영역 확인 → 캡슐화 제거 → 로컬 포트 전달`로 명확히 했다.
- 본 검토는 기술 문헌 대조다. 실제 브라우저 Visual QA나 장비 검증 완료를 의미하지 않는다.
