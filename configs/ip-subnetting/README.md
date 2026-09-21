# IP / Subnetting 설정 작성 기준 — 미적용

이 문서는 실제 장비 설정의 기록이 아니다. 장치·OS·버전을 선정하기 전이므로 실행 가능한 vendor 설정을 확정하거나 적용하지 않는다. 주소/장애/복구 기준은 [Lab Plan](../../lab-plans/ip-subnetting.md), 노드 정의는 [Topology](../../topologies/ip-subnetting/README.md)를 따른다.

## 플랫폼 선정

1. 사용 권한이 있는 Cisco 이미지와 필요한 IP forwarding 기능을 먼저 확인한다.
2. 해당 권한/이미지가 없으면 Aruba의 정확한 OS·버전·인터페이스 기능을 확인한다.
3. 불가하면 Linux/FRR 등 합법적 대체 플랫폼을 선정하고 차이를 기록한다.

NOS 이미지·디스크·라이선스 파일·실제 회사 설정은 저장소에 넣지 않는다. 사용할 수 없는 이미지의 다운로드나 설치를 자동 진행하지 않는다.

## 기준 설정과 읽기 명령

| 대상 | 준비할 기준 | 읽기 전용 확인 예 |
|---|---|---|
| VPCS PC1/2/3 | 실제 Lab 계획의 IP/Mask/Gateway, 초기 ARP 조건 | `show ip`, `show arp`, 버전에 맞는 `help` |
| Cisco R1 | 좌/우 주소, 두 Connected Route, forwarding, Proxy ARP off | `show ip interface brief`, `show ip route`, `show ip arp`, 대상 interface 설정 |
| Aruba R1 | 같은 의미의 주소/경로/Proxy ARP 조건 | OS/버전 공식 문서에서 대응 명령 확인 후 기록 |
| Linux/FRR R1 | 좌/우 주소와 link up, forwarding=1, Proxy ARP off | `ip -br address`, `ip route`, `ip neigh`, `sysctl net.ipv4.ip_forward`, 대상 interface의 proxy_arp |

명령의 출력 전체를 무조건 공개하지 않는다. 대상 Lab 노드와 필요한 인터페이스만 조회하고 외부 환경 정보가 포함되지 않았는지 확인한다. 인터페이스 이름은 플랫폼에서 확인하며 다른 호스트나 Windows의 실제 NIC에 Linux 예시를 적용하지 않는다.

## 정상 → 변경 → 복원

시작 전 원래 설정을 기록하고 각 장애의 복원 명령을 준비한다. PC1의 Mask만 바꾸는 장애와 Gateway만 바꾸는 장애는 독립적으로 실행한다. 각 장애 뒤 원래 정상 기준으로 복구하고 같은 LAN·원격 LAN 통신과 ARP 대상을 다시 검증한다. 복원 실패 시 다음 시나리오를 진행하지 않는다.

설정 템플릿을 확정하면 향후 `cisco/`, `aruba/`, `linux/` 중 실제 사용하는 플랫폼 하위에 버전·전제·정상/장애/복구·검증 명령을 함께 저장한다. 지금은 수행하지 않은 플랫폼별 파일을 생성하지 않는다.
