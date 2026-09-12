# ARP / Default Gateway

상태: **실습 준비**  
시작일: **2026-09-13**  
완료일: **미완료**

## 목표

다른 Subnet으로 Packet을 보낼 때 ARP와 Default Gateway가 어떤 역할을 하는지 Frame/Packet 수준에서 설명하고, 정상/장애 상황을 직접 구성해 증명합니다.

## 완료 기준

- [ ] ARP가 필요한 이유를 설명할 수 있음
- [ ] 같은 Subnet과 다른 Subnet 통신 차이를 설명할 수 있음
- [ ] 정상 Lab을 직접 구성함
- [ ] ARP Request / Reply를 Packet Capture로 확인함
- [ ] ICMP Echo Request / Reply의 Ethernet/IP Header를 비교함
- [ ] Wrong Default Gateway 장애를 재현함
- [ ] Wrong Subnet Mask 장애를 재현함
- [ ] Gateway Interface Down을 재현함
- [ ] 원인 확인 후 복구를 검증함
- [ ] 결과를 면접 질문 형태로 설명할 수 있음

## Lab Topology

```text
PC1 192.168.10.10/24
GW  192.168.10.1
        |
       SW1
        |
R1 192.168.10.1/24
        |
R1 192.168.20.1/24
        |
       SW2
        |
PC2 192.168.20.10/24
```

## 정상 동작 실험 계획

1. 같은 Subnet Ping 전후 ARP Cache 비교
2. 다른 Subnet Ping 시 Gateway ARP 확인
3. ARP Cache 삭제 후 ARP → ICMP 순서 확인
4. Switch MAC Table과 Ethernet Destination MAC 비교

## 장애 실험 계획

### 1. Wrong Default Gateway
- 예상 증상:
- 실제 증상:
- 확인 명령:
- Packet 근거:
- 원인:
- 복구:
- 복구 검증:

### 2. Wrong Subnet Mask
- 예상 증상:
- 실제 증상:
- 확인 명령:
- Packet 근거:
- 원인:
- 복구:
- 복구 검증:

### 3. Gateway Interface Down
- 예상 증상:
- 실제 증상:
- 확인 명령:
- Packet 근거:
- 원인:
- 복구:
- 복구 검증:

## Evidence

실제 수행 후 아래 폴더에 원본 자료를 저장합니다.

- [`captures/`](./captures/) — PCAP/PCAPNG 및 캡처 설명
- [`outputs/`](./outputs/) — CLI/OS 명령 출력
- [`configs/`](./configs/) — 개인 Lab용 설정
- [`images/`](./images/) — Topology / Wireshark 화면
- [`notes/`](./notes/) — 개념 정리와 최종 설명

## 현재 누적

| 항목 | 수량 |
|---|---:|
| 직접 구성한 Lab | 0 |
| 장애 시나리오 | 0 |
| Packet Capture | 0 |
| 복구 검증 | 0 |
| 설명 노트 | 0 |
| Automation | 0 |

> 실제 수행한 Evidence가 생길 때만 수치를 증가시킵니다.
