# LAB-PLAN — IP 주소 / Subnetting

상태: 계획 작성, 실제 Lab 미수행. 교육용 브라우저 시뮬레이션과 GNS3 검증은 별개다. 정상·장애·복구의 예상값은 관측값이 아니다. [Master Plan](../NETWORK-LEARNING-MASTER-PLAN.md)과 [Framework 계약](../LAB-FRAMEWORK-DESIGN.md)을 따른다.

## 학습 목표 / 선행

IPv4, Mask, Prefix에서 Network/Broadcast/Host Range를 계산한다. 송신 호스트의 Mask를 적용해 같은 subnet인지 판단하고 ARP 대상과 실제 IP 목적지를 구별한다. 처음에는 숫자·이진수 기초만 필요하며 이후 [Ethernet](../labs/ethernet-mac-table.html)과 [ARP/Gateway](../labs/arp-default-gateway.html) 설명을 연결한다. ARP가 IP 과정의 순환 선행조건이 되지 않도록 첫 화면에서는 “로컬 전달에 필요한 MAC 확인”만 설명한다.

## 필요한 Node / Vendor

VPCS 3대(PC1/PC2/PC3), 단순 L2 Switch 2대(SW1/SW2), 라우터 1대(R1), 고립된 링크. 라우터는 사용 권한과 기능을 확인한 Cisco 우선, Aruba 대체, 불가하면 Linux/FRR 라우터를 사용한다. 이미지 다운로드/등록/부팅은 이번에 수행하지 않는다. Cisco interface 이름은 사용 장비에서 확인한다. Linux의 forwarding/proxy_arp는 초기값을 수집하고 승인된 테스트 노드에서만 조정한다.

```text
PC1 ─ SW1 ─ R1 ─ SW2 ─ PC2
       │
      PC3
```

VLAN 실습이 아니다. 각 SW는 독립된 untagged L2 영역, Trunk 없음. Tailscale·외부 Cloud/NAT·회사 NIC 연결 없음.

## IP Plan

| 노드 | 브라우저/문서 예시 | 실제 격리 Lab 계획 |
|---|---|---|
| PC1 | 192.0.2.10/25, GW 192.0.2.1 | 10.77.10.10/24, GW 10.77.10.1 |
| PC3 (같은 LAN) | 192.0.2.20/25, GW 192.0.2.1 | 10.77.10.20/24, GW 10.77.10.1 |
| R1 왼쪽 | 192.0.2.1/25 | 10.77.10.1/24 |
| R1 오른쪽 | 192.0.2.129/25 | 10.77.20.1/24 |
| PC2 (다른 LAN) | 192.0.2.140/25, GW 192.0.2.129 | 10.77.20.10/24, GW 10.77.20.1 |

RFC 5737 주소는 문서 예시이며 실제 할당 권고가 아니다. 실제 Lab은 RFC 1918의 사용하지 않는 격리 주소를 점검 후 사용한다. 두 주소 집합의 대응표를 결과에 함께 남기고 서로 다른 값의 캡처를 같은 실험이라고 연결하지 않는다. MAC은 로컬 관리용 합성 예시이며 실제 관측과 구분한다.

기준 조건: 추가 host/static route 없음, NAT 없음, Proxy ARP 꺼짐, PC1/2/3 Mask 정상, R1 forwarding 정상. 같은 subnet 판단만으로 왕복 통신 성공을 보장하지 않음을 설명한다.

## 정상 상태 / 검증 명령

VPCS: `show ip`, `show arp`, `ping <Lab 목적지> -c 3`. ARP 캐시 초기화는 해당 버전의 `help`로 정확한 명령을 확인한 뒤 적용한다. 캡처 시작 전에 무작정 노드를 재시작하지 않는다.

Cisco 읽기: `show ip interface brief`, `show ip route`, `show ip arp`, 대상 interface 설정과 proxy ARP 상태. Aruba: 해당 OS 버전의 interface/route/ARP 조회 명령을 사전에 확인한다. Linux: `ip -br address`, `ip route`, `ip neigh`, `sysctl net.ipv4.ip_forward` 및 대상 interface의 `proxy_arp`. 광범위한 실제 호스트 설정/전체 운영 로그는 수집하지 않는다.

정상 PC1→PC3 및 PC1→PC2 각각 3회 응답. PC1→PC3은 PC3 IP에 ARP. PC1→PC2는 Gateway IP에 ARP, IP 목적지는 PC2 유지. 라우터 앞뒤 Ethernet 헤더와 TTL 변화를 비교한다. ping 결과만으로 ARP 판단을 완료하지 않는다.

## Capture 위치 / 예상 Packet

GNS3 링크 PC1—SW1, SW1—R1, R1—SW2에서 캡처한다. 각 phase의 시작/종료 UTC, capture point, 원본 filename, SHA-256을 기록한다. Wireshark 분석 필터는 `arp || icmp`; 수집은 실험 링크 전체를 시작한 뒤 해당 구간으로 분석한다. Tailscale·호스트 Wi-Fi 인터페이스는 캡처하지 않는다.

| 시나리오 ID | 적용 / 예상값 | 장애 근거 / 복구 |
|---|---|---|
| `same-subnet` | 정상 PC1→PC3 | PC3 대상 ARP + Echo/Reply 3회 |
| `different-subnet` | 정상 PC1→PC2 | Gateway ARP + PC2 목적지 IP 유지 + 왕복 |
| `wrong-mask` | PC1만 /16 (브라우저는 /24) | PC1이 원격 PC2를 on-link로 오판, PC2에 ARP 반복·응답 없음. R1 proxy ARP off 증거 필요 |
| `mask-recovery` | PC1 /24 복원 (브라우저 /25) | 올바른 next hop, 원격 ping 3회 성공 |
| `wrong-gateway` | PC1 GW를 미사용 10.77.10.254로 변경 (브라우저 192.0.2.126) | 같은 LAN PC3 정상, PC2 실패, 잘못된 GW에 ARP 무응답 |
| `gateway-recovery` | PC1 GW .1 복원 | Gateway ARP 응답 + 원격 ping 3회 성공 |

각 장애는 정상 기준에서 하나씩 적용한다. 두 장애를 누적하지 않는다. 장애 적용 전 원본 설정과 복구 명령을 준비한다. ping 실패만으로 PASS라 하지 않고 ARP 대상/CLI/링크 위치를 함께 확인한다. 예상과 다르면 actual을 기록하고 FAIL/INCONCLUSIVE로 유지한다.

## 실제 수행 체크리스트 (현재 모두 미수행)

- [ ] 별도 프로젝트 생성과 이미지 권한/외부망 미연결 확인
- [ ] Topology 구성, Device Boot 확인, 기본 Config와 초기 스냅샷
- [ ] IP/VLAN/Route/Proxy ARP 기준 확인
- [ ] 정상 상태, 같은/다른 subnet Ping/Test
- [ ] 정상 CLI Evidence와 세 링크 Packet Capture
- [ ] wrong-mask 단독 적용, 장애 확인, CLI/PCAP 수집
- [ ] 원인 분석, Mask 복원, 정상화/Recovery Evidence
- [ ] wrong-gateway 단독 적용, 같은 LAN 대조 테스트, 장애 Evidence
- [ ] 원인 분석, Gateway 복원, 정상화/Recovery Evidence
- [ ] Capture 종료, UTC 구간/필터/도구 버전/SHA-256 기록
- [ ] 개인정보·외부 세션·Credential·이미지 포함 여부 검토
- [ ] result.json expected/actual과 각 phase 근거 기록
- [ ] 실제 자료와 교육 HTML의 차이 반영
- [ ] Desktop/Tablet/Mobile, Reset/재실행, 모드, 예측 검토
- [ ] 학습자 최종 설명 검토, 11개 gate 판정

## 교육 페이지 요소 / 진단 순서

IPv4 calculator는 Prefix에 따른 Network/Broadcast/Host Range를 표시한다. /31은 P2P 특례, /32는 단일 host route로 고급 설명한다. 직접/Gateway 전달을 먼저 선택한 뒤 교육용 단계 흐름을 보여준다. 정상·Mask 장애·Gateway 장애와 각각의 복구를 선택할 수 있다. 초급은 IP/Mask/ARP 대상/다음 홉에 집중하고 상세 필드는 고급에서 펼친다.

진단은 Source IP/Mask → Destination에 대한 on-link 판단 → 선택 Route → Gateway가 같은 LAN에 있는지 → ARP 대상/응답 → Router 입력/출력 → Return Route 순서다. UI의 마지막 단계 도달은 개인 연습 진도이며 실험 완료가 아니다.

## 완료 조건 / 다음 과정

정상 2종, 서로 다른 장애 2종, 각각의 복구를 실제 구성에서 검증하고 근거를 리뷰해야 한다. 그 후 Master Plan의 11개 gate와 UI/교육 설명 검토를 완료해야 `completed`를 부여한다. 현재 [result](../results/ip-subnetting.json)은 NOT_RUN으로 유지한다. IP 검토가 끝나기 전에 ICMP 과정 구현을 자동 시작하지 않는다.
