# Ethernet / MAC Address Table Lab

실험일: 2026-09-13 (KST). **필수 7개 항목 PASS**, 추가 실제 Aging도 PASS.

## 1. Topology

GNS3 프로젝트: **Ethernet-MAC-Table-Lab** (`34f3beba-030f-4e60-9bde-dbaa5acb56d1`). Mac에서 검증된 SSH `gns3-win`과 Tailscale의 GNS3 2.2.61 Controller API로 실험했다.

```text
PC1 ── eth0 (port 1) ─┐
PC2 ── eth1 (port 2) ─┼─ SW1 / br0
PC3 ── eth2 (port 3) ─┘
```

GNS3의 실제 스위치 표시 이름은 `SW1-Linux-Bridge`이며 본문에서는 SW1으로 줄여 쓴다. 4개 노드는 GNS3 VM에서 실행한다. 외부 NAT/Cloud 연결 없이 새 Lab 내부의 세 링크만 연결했다.

## 2. Addressing

| Node | IPv4 | MAC | SW1 port |
|---|---|---|---|
| PC1 / VPCS | 192.168.10.10/24 | 00:50:79:66:68:00 | eth0 / 1 |
| PC2 / VPCS | 192.168.10.20/24 | 00:50:79:66:68:01 | eth1 / 2 |
| PC3 / VPCS | 192.168.10.30/24 | 00:50:79:66:68:02 | eth2 / 3 |

게이트웨이는 세 PC 모두 `0.0.0.0`으로 미설정이다. VPCS의 IP 구성을 `save`로 저장했다. 초기 ARP/FDB와 링크 Up 상태는 [observations.json](observations.json)에 있다. 초기 FDB에는 주소 설정 중 발생한 프레임으로 학습된 PC MAC도 있었으며, 비어 있다고 가정하지 않았다.

## 3. Switch implementation

기존에 설치된 `alpine:3.23`(실행 시 Alpine 3.23.5) Docker와 **Linux kernel bridge**를 사용했다. 관리 도구는 BusyBox `brctl`이며 `bridge` 명령은 설치되어 있지 않았다. 새 상용 이미지나 패키지는 다운로드하지 않았다.

```sh
brctl show
brctl showmacs br0
cat /sys/class/net/eth1/brport/port_no
cat /sys/class/net/br0/bridge/ageing_time
```

`brctl showmacs`에서 `is local? yes`는 Bridge 자신의 로컬 엔트리다. 판정에는 `no`인 동적 학습 엔트리만 사용했다. STP는 새 Bridge에서 off, forwarding delay는 0이다. 시작 명령에 Bridge 생성과 세 포트 연결을 저장했으며, 새 SW1만 재시작한 뒤 br0/300초 Aging 복원과 PC1→PC2 ping 2회 성공을 확인했다.

## 4. Source MAC Learning

먼저 ARP 캐시를 지우고 Bridge의 세 포트를 분리·재등록해 동적 FDB를 초기화했다. **PC2 포트를 일시적으로 down**시켜 응답 없이 PC1의 학습만 분리 관찰했다. 이 구간의 ping 실패는 의도한 실험 조건이다.

- PC1 ARP Request: Src=`00:50:79:66:68:00`, Dst=`ff:ff:ff:ff:ff:ff`.
- `source-pc1-only`: PC1 MAC→port 1만 동적으로 학습됨. PC2 MAC 없음.
- PC2 포트를 up으로 복원하고 통신: PC2 ARP Reply의 Src=`00:50:79:66:68:01`.
- `source-both-learned`: PC1→port 1, PC2→port 2.

PC1 링크 PCAP의 frame 1–3은 응답을 막아둔 ARP 재시도다. frame 4는 복원 후 ARP Request, frame 5는 PC2 ARP Reply, frame 6–11은 ICMP 요청/응답 3쌍이다. **목적지로 언급됐다는 이유만으로 PC2가 학습되지 않았고, PC2에서 프레임이 들어온 뒤 학습됐다.**

## 5. Broadcast

PC1의 ARP를 지우고 PC3(`192.168.10.30`)로 ping했다. Dst MAC이 `ff:ff:ff:ff:ff:ff`인 ARP Request 1개가 PC1 입력 링크와 PC2·PC3 출력 링크 모두에서 관찰됐다. 세 링크의 원본 Ethernet frame SHA256이 일치한다. PC2는 목적지가 아니지만 요청을 받았고, PC3의 응답 후 PC1↔PC3 통신은 성공했다.

## 6. Known Unicast

PC2 MAC이 port 2에 학습된 것을 확인한 뒤 PC1→PC2 ICMP Echo Request를 3회 보냈다. 동일한 3개 프레임은 PC1·PC2 링크에 있고 **PC3에는 0개**다. PC3 PCAP은 정상 Ethernet PCAP 헤더만 있는 24바이트 파일이다. 다른 실험에서 같은 링크가 Broadcast/Unknown Unicast를 실제 수집했으므로, 이 빈 캡처를 단순 수집 실패로 간주하지 않았다.

## 7. Unknown Unicast

PC1 ARP의 `192.168.10.20 → 00:50:79:66:68:01`을 유지한 채 다음을 실행했다.

```sh
brctl delif br0 eth1
brctl addif br0 eth1
brctl showmacs br0
```

이는 **새 Lab의 PC2 연결 포트만** 잠깐 분리·재등록하여 그 포트의 동적 FDB를 삭제한 것이다. 기본 Aging을 기다린 실험과 구분한다. 재등록 후 통신 전에 PC2 MAC이 FDB에 없고 PC1 ARP에는 남아 있음을 각각 조회했다.

그다음 ping 1회를 보냈다. ARP Request 없이 실제 PC2 MAC을 목적지로 한 ICMP가 나갔고 **PC3에서도 같은 유니캐스트 프레임이 잡혔다.**

```text
PC3 capture frame 1
Ethernet Src: 00:50:79:66:68:00
Ethernet Dst: 00:50:79:66:68:01
IPv4: 192.168.10.10 → 192.168.10.20
ICMP: Echo Request, id=21408, seq=1
Frame SHA256: 72292d367cb6fd36157ae094899452ec82a4702db569b2c439b174eb8e8e2407
```

이 SHA256은 PC1/PC2 링크의 해당 요청 프레임과 같다. Broadcast MAC이 아닌 PC2의 Unicast MAC이면서 위치를 모르는 조건에서 Flooding됐음을 증명한다.

## 8. MAC Re-learning

PC2의 ICMP Echo Reply 이후 FDB에서 PC2 MAC→port 2가 다시 나타났다(`unknown-after-reply`). 이어서 보낸 3개의 Echo Request는 PC1·PC2에서만 관찰됐고 PC3는 다시 0개였다.

## 9. ARP Table vs MAC Table

| 구분 | 실제 실험 상태 | 역할 |
|---|---|---|
| PC1 ARP | 192.168.10.20 → 00:50:79:66:68:01, expires 112s | IP→MAC |
| SW1 FDB | PC2 MAC 없음, PC1→1 및 PC3→3은 유지 | MAC→Port |

이 상태에서 ARP 조회는 필요 없었지만 Switch의 출력 포트가 알려지지 않아 Unknown Unicast Flooding이 발생했다. 응답 수신으로 FDB가 다시 학습됐고 ping도 성공했다. **FDB 삭제는 ARP 삭제나 통신의 영구 단절과 같지 않다.**

## 10. Aging

기본 `/sys/class/net/br0/bridge/ageing_time`은 `30000`(centisecond, 300초)이었다. 새 SW1에서만 `brctl setageing br0 5`로 5초로 줄였다. ping 직후 FDB에 PC1/PC2가 있는 것을 확인했으며 당시 표시된 엔트리 나이는 약 4.79초였다. 그 뒤 8초를 추가로 기다렸을 때 두 동적 엔트리가 사라졌다. 이 추가 실험은 **수동 삭제가 아닌 실제 짧게 조정한 Aging 관찰**이다. 기본 300초를 끝까지 기다린 것은 아니다. 실험 후 `brctl setageing br0 300`으로 복원했고 재시작 후에도 `30000`을 확인했다.

## 11. Packet Capture Evidence

5개 실험 × 3개 링크 = **15개 원본 PCAP**. 파일별 전체 레코드를 파싱해 Ethernet link type, 레코드 길이, 캡처 누락/절단 여부를 확인했다. 관련 프레임은 Ethernet 전체 바이트의 SHA256으로 링크 간 대조했다. unrelated IPv6 등은 판정 대상 ARP/ICMP와 구분했다.

| 실험 | PC1→PC2 Echo Request: PC1 / PC2 / PC3 | 관찰 |
|---|---|---|
| First contact | 3 / 3 / 0 | 응답 전 Source Learning과 ARP Request/Reply |
| Known Unicast | 3 / 3 / 0 | 학습된 포트로 전달 |
| Broadcast | 대상은 PC3 | ARP Request 1 / 1 / 1 |
| Unknown Unicast | 1 / 1 / 1 | PC3에서도 실제 PC2 목적지 MAC 관찰 |
| Re-learning | 3 / 3 / 0 | 학습 후 Flooding 종료 |

| PCAP | Bytes | Frames |
|---|---:|---:|
| [01-arp-first-contact-pc1.pcap](01-arp-first-contact/pc1-sw1.pcap) | 1108 | 11 |
| [01-arp-first-contact-pc2.pcap](01-arp-first-contact/pc2-sw1.pcap) | 1566 | 15 |
| [01-arp-first-contact-pc3.pcap](01-arp-first-contact/pc3-sw1.pcap) | 344 | 4 |
| [02-known-unicast-pc1.pcap](02-known-unicast/pc1-sw1.pcap) | 794 | 7 |
| [02-known-unicast-pc2.pcap](02-known-unicast/pc2-sw1.pcap) | 708 | 6 |
| [02-known-unicast-pc3.pcap](02-known-unicast/pc3-sw1.pcap) | 24 | 0 |
| [03-broadcast-pc1.pcap](03-broadcast/pc1-sw1.pcap) | 868 | 8 |
| [03-broadcast-pc2.pcap](03-broadcast/pc2-sw1.pcap) | 104 | 1 |
| [03-broadcast-pc3.pcap](03-broadcast/pc3-sw1.pcap) | 868 | 8 |
| [04-unknown-unicast-pc1.pcap](04-unknown-unicast/pc1-sw1.pcap) | 252 | 2 |
| [04-unknown-unicast-pc2.pcap](04-unknown-unicast/pc2-sw1.pcap) | 338 | 3 |
| [04-unknown-unicast-pc3.pcap](04-unknown-unicast/pc3-sw1.pcap) | 138 | 1 |
| [05-mac-relearning-pc1.pcap](05-mac-relearning/pc1-sw1.pcap) | 708 | 6 |
| [05-mac-relearning-pc2.pcap](05-mac-relearning/pc2-sw1.pcap) | 708 | 6 |
| [05-mac-relearning-pc3.pcap](05-mac-relearning/pc3-sw1.pcap) | 24 | 0 |

실시간 HTTP 캡처 종료 시 GNS3가 chunk stream을 완전히 마감하지 않아 Python `IncompleteRead`가 발생했다. 첫 세 개 0바이트 다운로드는 `.stream-failed-empty`로 보존했다. **VM의 완료된 원본 파일을 SSH 로컬 포워딩과 Compute 파일 API로 직접 회수**해 복구했으며 이후 캡처도 같은 방식으로 저장했다. 원본 캡처를 덮어쓰거나 패킷을 합성하지 않았다.

각 실험 폴더의 pc1-sw1.pcap은 PC1 링크다. PC3 Flooding 판정에는 pc3-sw1.pcap을 함께 본다.

## 12. 핵심 학습 내용

1. **Q1. 어느 MAC으로 학습하는가?** 수신 프레임의 Source MAC이다. PC2 응답을 막았을 때 PC1만 학습됐고, PC2 응답 뒤 PC2가 학습된 FDB가 증거다.
2. **Q2. Destination MAC을 모르면?** 이 Lab의 동일 Bridge/VLAN에서 수신 포트를 제외한 전달 가능한 다른 포트로 Flooding한다. Unknown Unicast가 PC2와 PC3에 같은 바이트로 관찰됐다.
3. **Q3. Known Unicast는?** FDB의 목적지 포트로 보낸다. PC1→PC2 요청 3개가 PC2에만 나가고 PC3에는 없었다.
4. **Q4. Broadcast와 Unknown Unicast의 차이는?** 둘 다 Flooding되었지만 전자는 Dst=`ff:ff:ff:ff:ff:ff`, 후자는 Dst=`00:50:79:66:68:01`이었다. 후자의 Unknown은 Switch의 FDB 관점이다.
5. **Q5. MAC Entry가 사라지면 완전히 끊기는가?** 이번 실험에서는 아니다. Flooding된 요청이 PC2에 도달해 응답했고 Source Learning으로 엔트리가 회복됐다.
6. **Q6. ARP에는 있고 FDB에는 없으면?** PC1은 ARP 없이 Unicast를 만들고 Switch가 Unknown Unicast로 Flooding한다. `unknown-arp-retained`, `unknown-before`, 04번 PCAP이 이 상태를 직접 보여준다.
7. **Q7. 첫 통신에서 언제 각각 학습되는가?** PC1의 ARP Request를 받을 때 PC1→port 1, PC2의 ARP Reply를 받을 때 PC2→port 2를 학습했다. Source MAC은 학습에, Destination MAC은 출력 포트 결정에 쓰인다.

## 13. 자동 판정

| 항목 | 결과 |
|---|---|
| Source MAC Learning | PASS |
| ARP Broadcast Flooding | PASS |
| Known Unicast Forwarding | PASS |
| Unknown Unicast Flooding | PASS |
| MAC Re-learning | PASS |
| ARP/FDB Separation | PASS |
| Packet Capture | PASS |
| Actual Accelerated Aging | PASS |

판정 코드: [analyze.py](verify-packets.py). 상세 프레임/해시: [packet-analysis.json](packet-analysis.json). 원격 명령 원문: [console-transcript.jsonl](console-transcript.jsonl).

## 14. 최종 상태 및 범위

- Remote Windows SSH: PASS. GNS3 2.2.61 API: PASS.
- 새 프로젝트의 PC1/PC2/PC3/SW1-Linux-Bridge 모두 started, 세 캡처 모두 중지 상태.
- 기존 `01-Basic-ARP-ICMP`, `02-ARP-Default-Gateway`는 모두 closed이며 API 프로젝트 메타데이터의 실행 전후 값이 동일하다. 해당 프로젝트에 변경 API나 콘솔 명령을 보내지 않았다.
- Windows 네트워크/방화벽/Tailscale/기존 VM 설정은 변경하지 않았다. Windows/GNS3 VM 재부팅은 수행하지 않았다.
- 인증정보는 기존 방식으로 프로세스 메모리에서만 사용했고 보고서/스크립트/결과 파일에 저장하지 않았다.
- 이 결과는 실제 Linux Bridge/VPCS의 가상 Lab 증거이며 Cisco/Aruba 하드웨어나 모든 Switch 구현의 검증을 의미하지 않는다.
- 필수 실험에 남은 미검증 항목은 없다. Controller 재부팅 후 자동 실행은 이번 작업 범위에 포함하지 않았다.
- 다음 학습: 이 보고서 Q1–Q7을 직접 설명해 본 뒤 VLAN Access / 802.1Q Trunk로 진행한다.

참고한 실제 버전 API 소스: [GNS3 v2.2.61 link handler](https://github.com/GNS3/gns3-server/blob/v2.2.61/gns3server/handlers/api/controller/link_handler.py), [Compute project file API](https://github.com/GNS3/gns3-server/blob/v2.2.61/gns3server/handlers/api/compute/project_handler.py). 실험 판정 근거는 문서의 예상 동작이 아니라 위 PCAP/FDB 기록이다.
