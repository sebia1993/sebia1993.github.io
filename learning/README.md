# Enterprise Network Learning Evidence

이 디렉터리는 학습 계획 자체가 아니라, 실제로 수행한 네트워크 Lab과 장애 재현 결과를 남기기 위한 원본 Evidence 저장소입니다.

## 기록 원칙

1. 실제로 수행하지 않은 항목은 완료로 표시하지 않습니다.
2. 회사의 실제 IP, Hostname, VLAN ID, SSID, 구성도, 로그는 저장하지 않습니다.
3. 개인 Lab용 주소와 가상/테스트 장비만 사용합니다.
4. 정상 구성뿐 아니라 장애 재현 → 원인 확인 → 복구 검증까지 남깁니다.
5. Packet Capture, CLI 출력, Config, 이미지가 있을 때 각각 원본 파일과 설명을 함께 보관합니다.
6. 학습 시간보다 `직접 구성한 Lab`, `장애 시나리오`, `Packet Capture`, `복구 검증` 수를 주요 지표로 사용합니다.

## 학습 흐름

`Learn → Configure → Verify → Break → Troubleshoot → Recover → Explain → Automate`

## 현재 시작 주제

- [ARP / Default Gateway](./foundations/arp-default-gateway/README.md)
