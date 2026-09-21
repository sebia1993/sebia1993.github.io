# IP / Subnetting Topology — 계획

상태: 실제 토폴로지 생성·부팅·import 미수행. 이 폴더는 재현할 노드/링크 정의이며 GNS3 실행 결과나 OS 이미지가 아니다. 상세 조건은 [Lab Plan](../../lab-plans/ip-subnetting.md)을 따른다.

```text
PC1 ─ SW1 ─ R1 ─ SW2 ─ PC2
       │
      PC3
```

| ID | 역할 | 문서/브라우저 주소 | Gateway |
|---|---|---|---|
| pc1 | 출발지 VPCS | 192.0.2.10/25 | 192.0.2.1 |
| pc3 | 같은 LAN 대조 VPCS | 192.0.2.20/25 | 192.0.2.1 |
| r1 | 두 LAN을 잇는 라우터 | 왼쪽 192.0.2.1/25 / 오른쪽 192.0.2.129/25 | 두 Connected Route |
| pc2 | 원격 LAN VPCS | 192.0.2.140/25 | 192.0.2.129 |
| sw1 | 왼쪽 L2 영역 | IP 없음 | 해당 없음 |
| sw2 | 오른쪽 L2 영역 | IP 없음 | 해당 없음 |

링크 ID는 `pc1-sw1`, `sw1-r1`, `r1-sw2`, `sw2-pc2`, `sw1-pc3`이다. 브라우저 좌표·표시는 [scenario data](../../assets/lab/scenarios/ip-subnetting.js)에 있고, 캡처 지점은 첫 세 링크다. VLAN/Trunk 실습이 아니며 SW1/SW2는 서로 분리된 untagged L2 영역이다.

위 TEST-NET 주소는 RFC 5737 문서 예시다. 실제 격리 Lab 주소는 Lab Plan의 별도 RFC 1918 계획을 사용하며 실행 전 충돌 여부를 확인한다. 문서에서는 PC1 /25→/24로 Mask 오류를 만들지만 실제 계획에서는 /24→/16이다. 두 주소 집합의 대응을 기록해야 한다.

실제 실행은 새 프로젝트 ID에서만 수행한다. 기존 ARP/Ethernet 프로젝트를 덮어쓰지 않는다. Tailscale·Cloud/NAT·호스트 실제 NIC·회사망을 데이터 경로에 연결하지 않는다. 이미지 권한 및 기능 확인 후 Cisco 우선, Aruba 대체, Linux/FRR 대체 순으로 R1을 선정한다. 생성된 프로젝트 export를 공개할 때 이미지·경로·비밀 포함 여부를 별도로 검토한다.
