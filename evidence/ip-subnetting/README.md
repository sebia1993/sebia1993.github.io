# IP / Subnetting Evidence — NOT_RUN

실제 Windows/GNS3 Lab은 아직 수행하지 않았다. 정상·장애·복구의 실제값은 `null`, 근거 목록은 빈 배열이다. [교육 페이지](../../labs/ip-subnetting.html)의 애니메이션·퀴즈·계산 결과는 시뮬레이션이며 캡처나 실험 근거가 아니다.

- 계획: [LAB-PLAN](../../lab-plans/ip-subnetting.md)
- 상태: [results/ip-subnetting.json](../../results/ip-subnetting.json)
- 순서: `same-subnet` → `different-subnet` → `wrong-mask` → `mask-recovery` → `wrong-gateway` → `gateway-recovery`
- 수행 준비: [Windows 체크리스트](../../docs/WINDOWS-LAB-CHECKLIST.md)

## 수집 단위

실제 실행 후 `normal/<run-id>/`, `failure/<run-id>/`, `recovery/<run-id>/`에 공개 검토한 사본만 넣는다. 지금 빈 PCAP이나 PASS 결과를 만들지 않는다. 하나의 캡처 실험에서 여러 링크 PCAP이 나와도 캡처 실험 횟수와 파일 수를 분리한다.

각 파일의 scenario ID, phase, 시작/종료 UTC, 도구/장치 버전, capture point, 관측 범위·필터, 원본/공개본 구분, SHA-256을 manifest에 기록한다. 시작 시점이 다르거나 시계 차이가 있으면 기록하고, 근거가 부족하면 `INCONCLUSIVE`로 남긴다. 실제 수집 파일이 없는 상태를 PASS로 기록하지 않는다.

## 확보해야 하는 근거

| Phase | 최소 근거 |
|---|---|
| normal | PC1/2/3 주소·경로, R1 forwarding/Proxy ARP 조건, 같은/다른 subnet 왕복, Gateway ARP와 IP 목적지 유지 |
| failure / wrong-mask | PC1의 변경 Mask, 원격 대상 ARP, Proxy ARP 꺼짐, 원격 실패·같은 LAN 성공, 라우터 양쪽 관측 |
| recovery / mask-recovery | Mask 복원, 정상 ARP 대상, 원격 및 같은 LAN 왕복, 관련 CLI/PCAP |
| failure / wrong-gateway | 정상 Mask·잘못된 Gateway, 미사용 Gateway ARP 무응답, 원격 실패·같은 LAN 성공 |
| recovery / gateway-recovery | Gateway 복원, ARP 응답, 원격 및 같은 LAN 왕복, 관련 CLI/PCAP |

GNS3 내부 `PC1—SW1`, `SW1—R1`, `R1—SW2` 링크를 캡처한다. Tailscale은 관리·파일 전달 전용이며 캡처 대상 인터페이스가 아니다. 실제 실험 주소와 문서 주소의 대응표를 함께 기록하고 서로 다른 주소 집합의 자료를 같은 실험으로 취급하지 않는다.

## 공개 전 검토

원본은 공개 저장소 밖의 실행 작업 공간에 먼저 수집한다. 회사 IP/MAC/Hostname/VLAN/SSID, 회사 RADIUS/ClearPass/Controller/ACL, 운영 로그, 개인정보, Credential/Token/API Key/Password, 외부 실제 세션, NOS 이미지가 포함되지 않았는지 확인한다. 필요한 경우 원본 PCAP을 공개하지 않고 검토된 분석 결과만 공개하고 그 한계를 표시한다. 검토·해시·결과가 연결되기 전에는 완료 상태나 로드맵 수치를 올리지 않는다.

기존 ARP/Ethernet 증거는 별도 실험이다. 기존 자료를 참고 링크로 사용할 수 있지만 이 과정의 새 실행으로 재집계하지 않는다.
