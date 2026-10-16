# Data Center Networking 실행 사전 점검 — 2026-10-17

결론: **VALIDATION_BLOCKED. DC-01~06은 모두 NOT_RUN이다.** 실제 Cisco 시나리오는 시작하지 않았고 `runId`, `actual`, CLI/PCAP 증거 목록은 비어 있다. 학습 페이지의 초안 표시를 유지한다.

## 이번에 직접 확인한 것

- 기준 소스: main `2aa01da3c8a1a9e14c74e1db09e0d6c390448858`.
- Runtime: 현재 Codex 세션의 turn_context에서 `gpt-6-astra / ultra` 확인. Runtime Gate **PASS**. 확인 시각 2026-10-17 00:02 KST.
- Windows App의 실제 원격 세션에서 VMware를 열고 중단 상태의 기존 PNET VM을 재개했다. PNET 게스트 콘솔 로그인과 명령 실행을 확인했다.
- 2026-10-17 00:09:25 KST 게스트 출력: 4 vCPU, 메모리 7,965 MiB, available 4,421 MiB.
- `/dev/kvm`이 없고 `/proc/cpuinfo`에서 `vmx` 또는 `svm`이 포함된 행은 0개였다.
- QEMU 이미지 디렉터리 9개는 모두 Aruba 계열이었다. Nexus 이미지는 설치되어 있지 않았다. 기존 Cisco IOL 파일은 있으나 해당 이미지의 VXLAN VTEP / BGP EVPN 지원은 확인하지 않았다.

조회 명령:

```sh
date -u
nproc
free -m
ls -l /dev/kvm
grep -c -e vmx -e svm /proc/cpuinfo
ls -1 /opt/unetlab/addons/qemu
ls /opt/unetlab/addons/iol/bin
```

이 기록은 **Windows 원격 화면에서 읽은 PNET 게스트 사전 점검 출력**이다. Guest의 사전 점검 로그와 SHA-256 화면, 로컬 원본 화면을 별도로 보관했다. Guest 로그 파일을 Windows/Mac으로 내려받아 해시를 교차 검증한 것은 아니며, 이를 Cisco CLI 또는 패킷 증거로 계산하지 않는다. 공개 문서에는 관리 주소, 계정, 인증 정보와 원격 데스크톱 원본 화면을 포함하지 않는다.

## 현재 환경으로 시작할 수 없는 이유

비교 후보인 Nexus 9300v Lite의 Cisco 10.5(x) 문서는 VXLAN EVPN과 ECMP 지원, 노드당 기본 부팅 최소 RAM 4.5 GB / 2 vCPU 및 권장 RAM 8 GB / 4 vCPU를 명시한다. Leaf 두 대만 최소 RAM 합계 9 GB이며 Spine, 단말, PNET 자체의 메모리는 별도다. 현재 PNET 전체 메모리는 이보다 작다. 이는 문서 수치의 산술 비교이며 실제 동작을 확인한 용량 설계는 아니다. [Cisco Lite 이미지 요구사항](https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/configuration/n9000v-9300v-9500v/cisco-nexus-9000v-9300v-9500v-guide-release-105x/m-nexus-9300v-and-9500v-lite-nx-os-image.html)

Cisco의 Nexus 9000v KVM 배포 문서에는 KVM 활성화가 필수로 명시되어 있다. 따라서 현재 게스트의 KVM 부재는 RAM과 독립적인 차단 조건이다. 위 버전은 자원 비교 후보이며 선택하거나 부팅한 버전이 아니다. [Cisco KVM 배포 요구사항](https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/105x/configuration/n9000v-9300v-9500v/cisco-nexus-9000v-9300v-9500v-guide-release-105x/m-nexus-9000v-deployment.html)

## 재개 조건

1. 사용권이 있는 Cisco VXLAN / BGP EVPN / ECMP 지원 이미지와 버전을 확정한다.
2. Windows/VMware에서 PNET 게스트에 nested virtualization과 KVM이 노출되도록 준비한다.
3. 선택한 Leaf·Spine과 PNET 자체가 함께 실행될 메모리를 확보한다.
4. 실제 Node Boot, 기능 지원, 인터페이스, 격리 상태와 Capture Point를 확인한다.
5. 기존 요청서의 Expected를 유지하고 DC-01~06을 실행해 CLI·PCAP·해시를 수집한다.

지원 이미지가 없는 현재 상태에서 다른 Vendor나 Linux 시뮬레이션으로 대체해 PASS를 만들지 않았다. 화면·반응형 QA 결과는 [별도 보고서](dc-fabric-browser-20261017.md)에 있으며 네트워크 검증과 분리한다.
