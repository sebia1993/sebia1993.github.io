# 전체 로드맵 학습페이지 검수 — 2026-10-07

## 범위와 판정

- 기준 커밋: `3e8e810c67f9a8d1f92ffed23532b4f960cf579c`.
- 로드맵 26개 주제 중 공개된 Concept Guide 25개를 검수·수정했습니다.
- `dc-fabric`은 아직 학습페이지가 없는 예정 주제이므로 제외했습니다.
- 실습 HTML/JS/CSS, 로드맵 순서·상태·집계, 기존 네트워크 검증 결과는 변경하지 않았습니다.
- Network Learning Pipeline v1.10, Two Stage Design v2.7, Beginner Learning Audit v1.7 기준을 적용했습니다. 재사용 가능한 전체 로드맵 점검 항목은 Beginner Learning Audit v1.8에 반영했습니다.

## 공통 수정

기존 페이지는 초반부터 전문용어와 검증 세부사항이 함께 제시되었습니다. 24개 페이지를 질문 → 핵심 그림 → 용어 → 3–5단계 동작 → 비교 → 세 가지 요점·자기 설명 → 실습 이동 순서로 정리했습니다. 학습 순서상 앞에서 배운 개념을 연결하고, 각 그림이 전달 경로·판단 순서·수치 비교 중 무엇을 의미하는지 명시했습니다.

기존 상세 설명·CLI·PCAP·출처는 선택형 펼침 영역에 보존했습니다. 기존 본문 24개를 원본과 대조했으며, 제목 수준 조정 및 LACP의 중복 문구 외에는 보존했습니다. 기존 앵커도 유지하고, 직접 링크로 들어오면 필요한 펼침 영역이 열리도록 했습니다. 기존 검사에서는 실제 클릭으로 상세 근거를 연 뒤 기존 내용 검사를 수행하게 수정했습니다.

IP 페이지는 기존 그림 중심 구성을 유지하며 bit 설명, 부모 주소 범위, 글자 확대 시 메뉴·배지 줄바꿈만 보완했습니다. Concept Guide 전용 CSS/JS를 사용해 실습 스타일과 분리했습니다.

## 페이지별 확인

| 학습페이지 | 설명의 핵심·보완점 | 로컬 판정 |
|---|---|---|
| [IP 주소 / Subnetting](../.././labs/ip-subnetting.html) | bit를 먼저 설명하고 부모 주소 범위와 확대 시 줄바꿈을 명확화 | PASS |
| [Ethernet / MAC Table](../.././labs/ethernet-mac-table.html) | 스위치가 출발지 주소를 배우고 목적지 주소로 전달할 포트를 고르는 과정을 설명합니다. | PASS |
| [ARP / Default Gateway](../.././labs/arp-default-gateway.html) | 최종 IP 목적지와 지금 프레임을 받을 대상을 구분하고 ARP의 역할을 설명합니다. | PASS |
| [ICMP / Ping / Traceroute](../.././labs/icmp-troubleshooting.html) | Ping의 왕복 확인과 Traceroute의 중간 경로 확인을 구분합니다. | PASS |
| [VLAN / 802.1Q](../.././labs/vlan-trunk.html) | VLAN으로 그룹을 나누고 스위치 사이에서 그룹 정보를 유지하는 원리를 설명합니다. | PASS |
| [Inter-VLAN Routing](../.././labs/inter-vlan-routing.html) | 다른 네트워크로 갈 때 Gateway가 IP 패킷을 전달하고 프레임을 새로 만드는 이유를 설명합니다. | PASS |
| [STP / RSTP](../.././labs/stp.html) | 여분의 물리 링크를 유지하면서 순환 없는 전달 경로를 만드는 원리를 설명합니다. | PASS |
| [LACP / Link Aggregation](../.././labs/lacp.html) | 여러 물리 링크의 묶음과 개별 통신에 선택되는 링크를 구분합니다. | PASS |
| [DHCP / DHCP Relay](../.././labs/dhcp.html) | 단말이 네트워크 설정을 자동으로 받고, 서버가 멀리 있으면 중계가 필요한 이유를 설명합니다. | PASS |
| [DNS](../.././labs/dns.html) | 이름 조회와 조회한 IP로 실제 통신하는 단계를 구분합니다. | PASS |
| [Routing Table / Static / Default Route](../.././labs/routing-table.html) | 목적지에 맞는 경로 중 가장 구체적인 주소 범위를 고르는 원리를 설명합니다. | PASS |
| [OSPF](../.././labs/ospf.html) | 이웃과 연결 정보를 맞추고 누적 Cost로 경로를 계산하는 흐름을 설명합니다. | PASS |
| [Packet Filtering / ACL](../.././labs/acl.html) | 정책이 적용되는 위치·방향과 패킷 조건을 연결해 허용 또는 차단을 설명합니다. | PASS |
| [NAT / PAT](../.././labs/nat-pat.html) | 주소 변환과 변환 기록을 통한 응답의 원래 통신 연결을 설명합니다. | PASS |
| [Stateful Firewall / IPsec VPN](../.././labs/firewall-vpn.html) | 통신 상태를 보는 방화벽과 구간을 보호하는 VPN의 역할을 구분합니다. | PASS |
| [Wi-Fi / RF 기초](../.././labs/wifi-rf.html) | 신호 세기와 잡음, 채널 사용 조건을 구분해 무선 품질을 설명합니다. | PASS |
| [802.11 접속 / WPA2·WPA3](../.././labs/wlan-association.html) | AP 발견, 연결 협상, 보안 키 준비를 서로 다른 단계로 설명합니다. | PASS |
| [802.1X / EAP / RADIUS](../.././labs/dot1x-radius.html) | 단말·중계 장비·인증 서버 역할과 인증·인가 결과를 구분합니다. | PASS |
| [Roaming / WLAN Troubleshooting](../.././labs/roaming-wlan-troubleshooting.html) | AP 전환 사실과 전환 이후 서비스 상태를 분리해 설명합니다. | PASS |
| [First-Hop Redundancy / FHRP](../.././labs/fhrp.html) | 단말이 사용하는 가상 출구와 실제 전달을 맡은 라우터를 구분합니다. | PASS |
| [VRF](../.././labs/vrf.html) | 먼저 사용할 경로표를 고르고 그 표 안에서 목적지 경로를 찾는 원리를 설명합니다. | PASS |
| [BGP / Route Policy](../.././labs/bgp.html) | 경로 후보의 정보와 운영 정책이 선택·광고 결과를 바꾸는 원리를 설명합니다. | PASS |
| [Redistribution / Route Control](../.././labs/redistribution.html) | 서로 다른 경로 정보 체계 사이에서 넘길 경로를 선택하는 재분배 경계를 설명합니다. | PASS |
| [Packet / Log / SNMP 관측](../.././labs/observability.html) | 패킷·사건 기록·상태 조회를 같은 장비와 시간 흐름으로 연결합니다. | PASS |
| [Network Automation](../.././labs/network-automation.html) | 대상·정상 기준·수집 결과를 분리해 반복 가능한 점검을 설명합니다. | PASS |

## 검증 결과

- 전체 25페이지 × 4뷰포트(360×800, 768×1024, 1366×768, 1920×1080): 100개 페이지·화면 조합 PASS.
- 가로 넘침, 잘린 학습 내용, 중복 ID, 내부 앵커, 하나의 표시된 실습 CTA, 메뉴·펼침 동작, 실습 실제 이동 및 뒤로 이동, 콘솔 예외·HTTP 오류 검사 PASS.
- 25페이지 각각 200% root 글자 확대, 강제 색상, JavaScript 없는 읽기 PASS. 24개 새 펼침 영역의 Enter 조작 및 기존 앵커 자동 펼침 PASS.
- 모바일 25개 상단 비교 시트, Ethernet 전체 모바일, BGP 전체 데스크톱 화면을 시각 검수했습니다.
- 기존 IP 시각 회귀검사 9뷰포트 PASS. 기존 ACL 회귀검사 10 assertions 및 DHCP 회귀검사 15 assertions PASS(학습·실습·검증 페이지·상호작용).
- CSS 파싱, 신규 JavaScript 구문, 상대 링크 파일 존재, `git diff --check` PASS.
- 기존 전체 사이트 검사 `python3 tests/check_site.py`는 기존 커리큘럼 개수 조건(27개)과 현재 실제 로드맵(26개)이 달라 첫 검사에서 실패합니다. 기준 커밋에서도 같은 조건과 데이터이므로 이번 변경과 무관합니다. 요청 범위 밖인 로드맵과 해당 조건은 변경하지 않았습니다.
- 새로운 PNETLab/장비/패킷 검증을 수행한 것이 아닙니다. 기존 실측 자료의 의미와 범위는 유지했습니다.

재현 명령:

```sh
python3 tools/build-concept-guides.py
CHROMIUM_PATH=/path/to/chromium node tests/concept-guides-audit.mjs
BROWSER_EXECUTABLE=/path/to/chromium node tests/ip-concept-visual.mjs
```

기계 판독 결과: [로컬 검사](concept-guides-local-20261007.json).

## 공개 사이트 확인

수정본 배포 커밋: `bbe23bcb2d3a9ac887a96b3068a0688f6b5f6793`.

공개 주소에서 **25페이지 × 4뷰포트 = 100개 조합 PASS**. 글자 200% 확대, 강제 색상, 기존 앵커, 키보드 펼침, 실습 실제 이동·뒤로 이동, 콘솔·자산 오류, JavaScript 없는 읽기도 모두 PASS입니다. 최종 순차 실행에서는 HTTP 오류가 없었습니다. IP 페이지는 HTTPS로 내려받은 공개 HTML과 저장소 파일이 byte 단위로 일치함을 확인했습니다.

검사 환경의 사설 프록시 인증서 때문에 브라우저 검사에만 인증서 예외 옵션을 사용했습니다. 공개 사이트의 TLS 설정은 변경하지 않았습니다. 첫 병렬 실행에서는 429 요청 제한이 발생했으므로 중단하고, 페이지를 재사용하는 순차 실행으로 바꿨습니다. 중단된 실행은 PASS 결과에 포함하지 않습니다.

공개 결과: [브라우저 검사 JSON](concept-guides-public-20261007.json).

```sh
BASE_URL=https://sebia1993.github.io/ CHROMIUM_PATH=/path/to/chromium node tests/concept-guides-audit.mjs
```

사설 CA를 사용하는 QA 프록시 환경에 한해서 `QA_PROXY_PRIVATE_CA=1`을 추가할 수 있습니다. 일반 실행에서는 인증서 검증을 유지합니다.
