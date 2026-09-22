# Windows PNETLab 준비 체크리스트

[Master Plan](../NETWORK-LEARNING-MASTER-PLAN.md)의 Windows 사전 점검용 문서다. 실제 L2/L3 실행 기준은 [PNETLab 실습 표준](./PNETLAB-LAB-STANDARD.md)을 따른다. 아래 항목은 준비 여부를 확인하기 위한 체크리스트이며, 체크만 했다고 Lab 완료로 집계하지 않는다.

## 0. 이전 관측 기록

2026-09-21에 기존 Windows 관리 연결을 SSH로 한 번 확인했을 때 TCP/22 연결 단계에서 시간 초과가 발생했다. 당시 GNS3/API/PowerShell에는 도달하지 않았으며 원인은 확정하지 않았다. 이 기록은 과거 관리 연결 관측으로만 보존하며 현재 PNETLab 준비 상태를 의미하지 않는다.

## 1. 목표 환경

```text
Windows PC (32 GB RAM)
└─ VMware Workstation
   └─ PNETLab VM
      ├─ Cisco L2/L3
      ├─ Aruba AOS-CX
      └─ 테스트 Host

PNETLab Capture → Windows Wireshark → PCAP/Evidence
```

기본 원칙:
- Lab data plane은 회사망과 분리한다.
- PNETLab 관리 UI/SSH를 인터넷에 직접 노출하지 않는다.
- NOS 이미지는 Git/GitHub에 저장하지 않는다.
- Cisco 1순위, Aruba 2순위 교차검증 순서를 사용한다.
- 비공식 공유 이미지보다 공식 Vendor 취득 경로와 사용 권한 확인을 우선한다.

## 2. Windows에서 사람이 먼저 확인할 것

### 가상화 / VMware

```powershell
Get-CimInstance Win32_ComputerSystem |
  Select-Object Manufacturer, Model, TotalPhysicalMemory

Get-CimInstance Win32_Processor |
  Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, VirtualizationFirmwareEnabled

Get-Process -Name vmware, vmware-vmx -ErrorAction SilentlyContinue |
  Select-Object ProcessName, Id
```

확인 기준:
- BIOS/UEFI 가상화가 사용 가능한지 확인한다.
- VMware Workstation이 실제 설치/실행 가능한지 확인한다.
- Hyper-V/VBS와 중첩 가상화 충돌이 의심되면 먼저 현 상태를 기록하고 무작정 기능을 끄지 않는다.
- 회사 보안 정책이 적용된 PC라면 정책을 우회하지 않는다.

### 메모리 / 디스크

```powershell
Get-CimInstance Win32_OperatingSystem |
  Select-Object TotalVisibleMemorySize, FreePhysicalMemory

Get-PSDrive -PSProvider FileSystem |
  Select-Object Name, Used, Free
```

32 GB 호스트에서는 PNETLab VM 자체와 가상 네트워크 노드가 동시에 메모리를 사용한다. Nexus 계열 같은 고메모리 노드를 여러 대 실행하기 전에 합산 메모리를 계산한다. Windows가 지속적으로 높은 메모리 압박이나 paging 상태라면 노드 수를 줄인다.

## 3. PNETLab VM 확인

PNETLab VM을 부팅한 뒤 Web UI에서 다음만 확인한다.

| 항목 | 확인 값 |
|---|---|
| PNETLab version | 기록 |
| System mode | Offline / Online |
| PNETLab VM RAM | 기록 |
| PNETLab VM vCPU | 기록 |
| Free disk | 기록 |
| Web UI 접근 | PASS / FAIL |
| Console 실행 | PASS / FAIL |
| Link Capture | PASS / FAIL |

PNETLab 내부의 실제 IP, root password, token, 개인 계정 정보는 공개 저장소에 기록하지 않는다.

공개 포트나 방화벽 설정을 임의로 변경하지 않는다. Mac에서 Tailscale을 통해 Windows를 관리하더라도 PNETLab Web UI는 가능한 한 Windows/로컬 관리 범위에 둔다.

## 4. Wireshark 확인

Windows에 이미 설치된 Wireshark를 우선 사용한다.

```powershell
$wireshark = Get-Command wireshark.exe -ErrorAction SilentlyContinue
$tshark = Get-Command tshark.exe -ErrorAction SilentlyContinue

[pscustomobject]@{
  Wireshark = [bool]$wireshark
  TShark    = [bool]$tshark
}

if ($tshark) {
  tshark.exe --version | Select-Object -First 1
}
```

PATH에서 찾지 못했다고 곧바로 미설치로 판정하지 않는다. PNETLab의 Default Console 방식 또는 HTML/Docker Wireshark 방식 중 실제 환경에서 동작하는 한 가지 방식을 먼저 고정한다.

최초 Capture 검증:
1. 테스트 Host 2개 또는 작은 Router topology를 만든다.
2. 한 링크를 Capture 한다.
3. Ping 3~5회를 발생시킨다.
4. Wireshark에서 ARP/ICMP가 보이는지 확인한다.
5. PCAP 저장이 가능한지 확인한다.
6. 저장 파일 SHA-256을 계산한다.

```powershell
Get-FileHash .\test-capture.pcapng -Algorithm SHA256
```

## 5. 이미지 준비 체크

### Cisco 1순위

각 이미지마다 아래를 확인한다.

```text
Vendor:
Platform:
Version:
Source:
Source type: official vendor / entitled download / other
License checked: yes / no
Image format:
PNETLab boot tested: PASS / FAIL / NOT_RUN
vCPU:
RAM:
Disk:
Console:
Feature notes:
```

우선 후보:
- Catalyst 8000V: L3, Static/Default Route, OSPF, BGP, ACL, NAT
- Nexus 9000v/9300v 계열: VLAN/Trunk/STP/LACP/SVI/OSPF/BGP/VRF

주의:
- Cisco CML reference platform ISO에 포함된 Cisco VM 이미지는 CML 외부 사용 권한이 별도로 확인되지 않는 한 PNETLab로 복사하지 않는다.
- PNETLab 지원 목록에 IOL/vIOS가 있어도 이미지 취득 권한을 별도로 확인한다.
- Cisco 이미지가 준비되지 않았으면 해당 과정은 NOT_RUN 또는 대체 플랫폼으로 명시한다.

### Aruba 2순위

우선 후보:
- Aruba AOS-CX Switch Simulator

확인:
- OVA version
- 공식 Support Portal/공식 자료 출처
- RAM/vCPU 요구량
- 사용할 기능의 simulator caveat
- PNETLab 변환/부팅이 실제로 성공했는지
- VLAN/Trunk/STP/LACP/SVI/VRRP/OSPF/BGP 중 필요한 기능이 선택 버전에서 동작하는지

## 6. 최소 Smoke Test

이미지를 준비한 직후 복잡한 topology를 만들지 않는다.

### Cisco L3 Smoke Test

```text
PC1 ─ R1 ─ PC2
```

검증:
- R1 부팅/콘솔
- 양쪽 Interface up
- Connected route
- Ping
- 양 링크 ARP/ICMP Capture
- config 저장/재부팅 후 상태

### Cisco/Aruba L2 Smoke Test

```text
PC1 ─ SW1 ─ PC2
```

검증:
- Switch 부팅/콘솔
- Access port
- MAC learning
- 같은 VLAN Ping
- ARP/Broadcast/Unicast Capture
- MAC table 확인

Smoke Test가 실패하면 3-switch STP 같은 다음 Lab으로 넘어가지 않는다.

## 7. 첫 정식 PNETLab Lab

현재 로드맵 기준 첫 장비 기반 목표는 `icmp-troubleshooting`이다.

최소 topology:

```text
PC1 ─ R1 ─ PC2
```

시나리오:
1. 정상 Ping
2. 목적지 Down 또는 Interface Down
3. Route/return path 오류
4. 각 장애 복구

필수 Evidence:
- 정상 CLI
- 장애 CLI
- 복구 CLI
- ICMP PCAP
- TTL/Unreachable 관측 가능 시 해당 Packet
- topology 설명
- expected vs actual
- SHA-256
- 최종 원인 설명

첫 Lab이 끝까지 완료되면 `vlan-trunk`로 이동한다.

## 8. 자원 보호 기준

Windows 32 GB 환경에서는 다음 조건 중 하나가 보이면 Lab 규모를 축소한다.

- 메모리 사용률이 지속적으로 매우 높고 Windows 반응성이 크게 저하됨
- VMware/PNETLab VM에서 swap 또는 I/O 지연이 과도함
- Node console 반응과 protocol convergence가 비정상적으로 느려짐
- Wireshark Capture 자체가 packet loss 또는 UI freeze를 유발함

축소 순서:
1. 불필요한 Node 종료
2. topology의 Node 수 축소
3. 고메모리 Cisco node를 Aruba CX 또는 경량 대체 플랫폼으로 변경
4. 한 Vendor의 검증을 먼저 완료한 뒤 다른 Vendor를 별도 실행
5. Capture 지점을 동시에 여러 개 열지 않고 순차 실행

## 9. Evidence 공개 전 확인

- [ ] 회사 IP/MAC/Hostname/VLAN/SSID가 없음
- [ ] 회사 RADIUS/ClearPass/Controller 정보가 없음
- [ ] 계정/token/password가 없음
- [ ] Vendor NOS 이미지가 없음
- [ ] 라이선스 파일이 없음
- [ ] PCAP에 외부/회사 트래픽이 없음
- [ ] 테스트 주소와 합성 MAC만 사용
- [ ] Vendor/Platform/Version 기록
- [ ] 정상/장애/복구가 서로 구분됨
- [ ] 실패/미수행을 성공으로 표시하지 않음
- [ ] SHA-256 기록

## 10. 공식 참고

- [PNETLab Supported Images](https://www.pnetlab.com/pages/documentation?slug=PNETLab-Supported-Images)
- [PNETLab Wireshark Capture](https://www.pnetlab.com/pages/documentation?slug=wireshark-docker)
- [Cisco Catalyst 8000V KVM](https://www.cisco.com/c/en/us/td/docs/routers/C8000V/Configuration/c8000v-installation-configuration-guide/install-cisco-catalyst-8000v-in-kvm-environment.html)
- [Cisco CML-Free image license note](https://developer.cisco.com/docs/modeling-labs/cml-free/)
- [Aruba AOS-CX Switch Simulation OVA Release Notes](https://www.arubanetworks.com/techdocs/AOS-CX/10.13/OVA/RN/rn_ova_10.13.1000.pdf)
