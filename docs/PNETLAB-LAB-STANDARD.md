# PNETLab 실습 표준 — Cisco 우선 / Aruba 교차검증

기준: 2026-09-22. 이 문서는 Windows PC에서 PNETLab과 Wireshark를 이용해 Network Learning Journey의 실제 L2/L3 실습을 수행할 때 적용하는 공통 기준이다. 실습 성공 여부는 `NETWORK-LEARNING-MASTER-PLAN.md`의 Evidence/완료 게이트를 따른다.

## 1. 기본 실행 환경

```text
Windows PC
└─ VMware Workstation
   └─ PNETLab VM
      ├─ Cisco L2/L3 node (1순위)
      ├─ Aruba AOS-CX node (2순위 교차검증)
      └─ Linux/VPCS 테스트 호스트

PNETLab link capture → Wireshark → PCAP/분석 → GitHub 공개용 Evidence
```

- 실제 패킷 검증의 1차 환경은 Windows의 PNETLab이다.
- 패킷 캡처는 PNETLab의 대상 링크에서 수행하고 Wireshark로 분석한다.
- 회사망, 회사 장비, 실제 운영 주소·SSID·VLAN·RADIUS/ClearPass 정보는 Lab에 연결하거나 공개하지 않는다.
- 외부 NAT/Cloud 연결은 해당 과정에서 명시적으로 필요한 경우에만 별도 승인 범위로 사용한다.

## 2. Vendor 우선순위와 이미지 원칙

| 우선 | 플랫폼 | 주 용도 | 기본 판단 |
|---|---|---|---|
| 1 | Cisco Nexus 9000v/9300v 계열 | VLAN, Trunk, STP, LACP, SVI, OSPF, BGP, VRF 등 L2/L3 | 사용 권한과 PNETLab 부팅 호환성이 확인된 이미지가 있을 때 사용 |
| 1 | Cisco Catalyst 8000V | Static/Default Route, OSPF, BGP, ACL, NAT 등 L3 | Cisco가 KVM용 `qcow2`를 제공하므로 L3 Lab의 우선 후보 |
| 2 | Aruba AOS-CX Switch Simulator | VLAN, Trunk, STP/RSTP, LACP, SVI, VRRP, OSPF, BGP 등 | Cisco 실습 후 동일 원리를 다른 Vendor CLI로 교차검증 |
| 대체 | Linux/FRR/VyOS | 표준 프로토콜 검증, 자원 절감, 이미지 제약 대체 | Cisco/Aruba 사용 권한·자원·기능 제약이 있을 때 명시적으로 사용 |

### 이미지 취득/보관 규칙

1. Vendor 공식 다운로드·지원 포털 또는 사용 권한이 명확한 경로만 사용한다.
2. Cisco CML의 reference platform ISO에 포함된 Cisco VM 이미지는 CML 외부 사용 권한이 별도로 확인되지 않는 한 PNETLab로 복사해 사용하지 않는다.
3. PNETLab이 IOL/vIOS/NX-OS 등의 형식을 지원한다는 사실과 해당 이미지의 배포·사용 권한은 별개의 문제로 취급한다.
4. NOS 이미지, OVA/QCOW2/VMDK, 라이선스 파일, activation 정보는 Git/GitHub에 저장하지 않는다.
5. 저장소에는 이미지 자체가 아니라 `vendor`, `platform`, `version`, `source-type`, `license-checked`, `resource-profile`만 기록한다.
6. 비공식 공유 링크·토렌트·파일 공유 사이트에서 받은 이미지는 포트폴리오의 검증 기준으로 사용하지 않는다.

## 3. 자원 기준

32 GB Windows PC에서는 노드를 무작정 늘리지 않는다. Lab 시작 전 `PNETLab VM + 실행 노드 + Windows/Wireshark`의 합산 메모리를 확인하고, 호스트 메모리 압박이 발생하면 노드 수를 줄인다.

- Catalyst 8000V: Cisco KVM 문서의 예시는 4 GB RAM VM을 사용한다. 실제 필요한 값은 선택 릴리스 문서를 우선한다.
- AOS-CX Simulator: 공식 OVA 릴리스 노트의 대표 요구사항은 4 GB RAM / 2 core다. 선택 버전의 릴리스 노트를 다시 확인한다.
- Nexus 9000v/9300v: 릴리스별 요구 메모리가 크므로 선택 버전의 공식 가이드를 기준으로 한다. 3대 이상 토폴로지에서 자원이 부족하면 Aruba CX 또는 경량 대체 플랫폼으로 재구성한다.

자원 부족으로 Host가 swap/thrashing 상태가 되면 그 실행은 성능 Evidence로 사용하지 않는다.

## 4. 25과정 중 PNETLab 적용 범위

| Topic | Cisco 1차 | Aruba 2차 | 필수 Packet/Evidence |
|---|---|---|---|
| `icmp-troubleshooting` | C8000V | CX | ICMP Echo/Unreachable/TTL |
| `vlan-trunk` | Nexus | CX | Access/Trunk 양쪽 802.1Q 비교 |
| `inter-vlan-routing` | Nexus/C8000V | CX | ARP + ICMP, L2/L3 경계 |
| `stp` | Nexus | CX | BPDU, Root/Port Role, 수렴 |
| `lacp` | Nexus | CX | LACPDU + member 상태 |
| `dhcp` | C8000V | CX | DORA + Relay |
| `routing-table` | C8000V | CX | 입력/출력 링크 + Route 선택 |
| `ospf` | C8000V/Nexus | CX | Hello/DBD/LSA + Neighbor/Route |
| `acl` | C8000V/Nexus | CX | 허용/차단 양방향 + counter |
| `nat-pat` | C8000V | 대체 가능 | NAT 전/후 5-Tuple + translation |
| `fhrp` | HSRP 가능한 Cisco | VRRP | VIP/ARP/GARP + 연속 Ping |
| `vrf` | Nexus/C8000V | CX | VRF별 Route/Ping |
| `bgp` | C8000V/Nexus | CX | Neighbor + best path 변화 |
| `redistribution` | C8000V | CX | Route source/tag/metric 변화 |
| `observability` | Cisco + Aruba | 양쪽 | 동일 장애의 PCAP/CLI/Event timeline |
| `network-automation` | Cisco + Aruba | 양쪽 | 동일 수집 스키마, expected/actual |
| `dc-fabric` | Nexus 우선 | 기능 가능 범위 | Underlay/Overlay 분리 근거 |

RF/WLAN 과정은 PNETLab만으로 실제 RF 검증을 완료한 것으로 집계하지 않는다.

## 5. 실습 실행 순서

모든 PNETLab 과정은 아래 순서를 기본으로 한다.

1. **예측**: 어떤 장비/포트/프로토콜이 보여야 하는지 먼저 적는다.
2. **Topology**: 최소 노드로 정상 구성을 만든다.
3. **Baseline**: `show` 명령, Ping/Traceroute, 필요한 링크 Capture를 저장한다.
4. **정상 검증**: 예상과 실제가 일치하는지 확인한다.
5. **장애 1**: 한 번에 한 가지 설정만 의도적으로 바꾼다.
6. **분석**: CLI + Wireshark로 실패 지점을 좁힌다.
7. **복구**: 원래 구성으로 되돌리고 정상화 근거를 다시 수집한다.
8. **장애 2**: 첫 장애와 다른 원인의 실패를 재현한다.
9. **Vendor 교차검증**: 학습 가치가 있는 핵심 과정은 Aruba CX에서 같은 원리를 다시 확인한다.
10. **공개본 생성**: 민감정보·이미지·라이선스 파일을 제외하고 Evidence만 저장한다.

## 6. Capture 표준

PNETLab은 링크/인터페이스 Capture를 통해 Wireshark를 사용할 수 있다. Capture는 목적에 맞는 최소 지점만 선택한다.

예: `PC1—SW1—R1—SW2—PC2`

- L2 판단: `PC1—SW1`, `SW1—R1`
- 라우팅 판단: `SW1—R1`, `R1—SW2`
- Relay/NAT/ACL: 정책 적용 전·후 링크
- STP/LACP: 제어 프레임을 실제로 볼 수 있는 switch-to-switch 링크

각 PCAP에는 최소한 다음 메타데이터를 남긴다.

```text
runId
vendor / platform / version
scenario: normal | failure | recovery
capturePoint
startUtc / endUtc
displayFilter
expected
actual
sha256
reviewStatus
```

캡처 파일 개수 자체를 학습 성과로 집계하지 않는다. 하나의 실험이 여러 지점에서 캡처되면 `1 experiment / N capture files`로 구분한다.

## 7. 공개 디렉터리 기준

```text
topologies/<topic>/README.md
configs/<topic>/
  cisco/
  aruba/
evidence/<topic>/
  normal/<run-id>/
  failure/<run-id>/
  recovery/<run-id>/
results/<topic>.json
```

공개 가능한 것:
- 직접 작성한 topology 설명/다이어그램
- 직접 작성한 Cisco/Aruba Lab config
- 테스트 주소를 사용한 CLI 출력
- 검토된 PCAP 및 필터/분석
- 장애 원인/복구 설명
- 버전 및 자원 프로필

공개 금지:
- Vendor NOS 이미지/설치 패키지
- 라이선스 파일, token, serial/account 정보
- 회사 실환경 설정·주소·로그
- 다른 출처에서 받은 Lab 파일을 출처/권한 확인 없이 재배포한 것

## 8. 첫 실행 우선순위

현재 로드맵의 선행 학습을 유지한다. 장비 기반 PNETLab 실습은 아래 순서로 착수한다.

1. `icmp-troubleshooting`: 가장 작은 Cisco L3 topology로 PNETLab/Wireshark Evidence 파이프라인 검증
2. `vlan-trunk`: Cisco L2에서 Access/Trunk/802.1Q
3. `inter-vlan-routing`: L2와 L3 연결
4. `stp`: 3-switch 구조가 자원상 가능할 때 Cisco 우선, 불가능하면 Aruba CX로 검증
5. `lacp`
6. `dhcp`
7. `routing-table` → `ospf`

첫 목표는 복잡한 토폴로지가 아니라 **정상 1개 + 장애 2개 + 각 복구 + Wireshark Evidence**를 한 과정에서 끝까지 완성하는 것이다.

## 9. 공식 참고

- PNETLab Supported Images: https://www.pnetlab.com/pages/documentation?slug=PNETLab-Supported-Images
- PNETLab Wireshark capture: https://www.pnetlab.com/pages/documentation?slug=wireshark-docker
- Cisco Catalyst 8000V KVM: https://www.cisco.com/c/en/us/td/docs/routers/C8000V/Configuration/c8000v-installation-configuration-guide/install-cisco-catalyst-8000v-in-kvm-environment.html
- Cisco CML image license note: https://developer.cisco.com/docs/modeling-labs/cml-free/
- Aruba AOS-CX Switch Simulation OVA Release Notes: https://www.arubanetworks.com/techdocs/AOS-CX/10.13/OVA/RN/rn_ova_10.13.1000.pdf
