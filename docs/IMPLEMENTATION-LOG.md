# 구현·검증 기록

## 2026-09-21 — 첫 단계

### 변경

- 최신 main `aaaa409`를 별도 checkout에서 분석했다. 기존 27 Topic ID, 9 Stage, 25 신규 과정 순서를 보존했다.
- Master Plan → Framework Design → IP/Subnetting Lab Plan을 먼저 작성했다.
- 기존 ARP 모바일 스크립트의 단일 선택자 `$m(...).forEach` 오류를 390px Chromium에서 재현했다. 세 곳을 다중 선택자 `$$m`로 고친 뒤 같은 화면에서 JavaScript 오류 0개와 모바일 장치 4개 초기화를 확인했다.
- 신규 공통 Framework와 IP 교육 파일럿을 독립 모듈로 추가했다. 예측·단계/자동 재생·Reset·모드·패킷 상세·로그·줌·선택적 가로 따라가기를 제공한다. 명시된 패킷 출발점으로 방향을 구분하며 모바일은 읽을 수 있는 크기와 내부 스크롤을 유지한다. 로드맵의 실제 Evidence 카운터는 그대로다.

### 저장 Evidence 조사

로드맵: 완료 1 / Lab 2 / 장애 5 / **캡처 실험 16** / 복구 5 / 설명 1 / 검증 도구 2. 원본 PCAP 파일은 ARP 33 + Ethernet 15 = 48개. 현재 새 실험을 수행한 수가 아니다.

Ethernet의 기존 오프라인 패킷 검증은 macOS에서 8/8 통과했다. SHA-256은 Ethernet 31/31, ARP 97/98 일치했다. ARP의 `learning/foundations/arp-default-gateway/report.html`만 과거 manifest 및 ZIP 안의 보고서와 다르고 원본 Evidence 항목의 해시는 일치한다. 기존 ZIP과 해시를 소급 덮어쓰지 않았다. ZIP CRC와 두 `.gns3project` archive 구조는 정상이며 검사한 프로젝트에 OS 이미지 디스크는 없었다. 이 결과는 파일 무결성 점검이고 신규 GNS3 실행·개인정보 전수 감사·Windows 검증은 아니다.

### Windows 연결 관측

2026-09-21 21:29 KST, 기존 SSH 연결을 BatchMode/StrictHostKeyChecking과 8초 연결 제한으로 1회 점검했다. TCP/22에서 `Operation timed out`, exit 255. 인증/PowerShell/API에는 도달하지 않았다. GNS3 실행 상태, 프로젝트 위치, Wireshark/tshark/Python 설치 여부는 판단 불가다. 실제 주소·호스트명·로컬 경로·비밀은 저장소에 기록하지 않는다. [Windows 체크리스트](WINDOWS-LAB-CHECKLIST.md)에서 이어간다.

### 현재 검증 상태

macOS 로컬 검증 완료:

| 검사 | 결과 / 범위 |
|---|---|
| Node 순수 계산·상태 | 9/9 통과: IPv4 경계/잘못된 입력, 예측 gate, Reset, 독립 상태, 패킷 출발점 |
| 구조·Evidence·링크 | 27 Topic/9 Stage, 합계 일치, 미수행 결과와 6개 시나리오의 actual/provenance/artifacts 검사, 8페이지 118개 로컬 대상 통과 |
| 기존 페이지 회귀 | 7페이지 × 390/768/1440px = 21조합, JS/console 오류·페이지 가로 넘침 없음, 기존 simulator 예측/Reset 확인 |
| IP 교육 파일럿 | 320/390/768/1440px = 4조합, 6개 정상·장애·복구 단계, 오답 후 학습, 재실행·실행 중 Reset/전환·모드·계산기 오류·퀴즈 통과 |
| 모바일 Packet follow | 확대 후 실제 단계 진행에서 내부 scrollLeft 변화 확인, 문서 scrollY 유지, 표시 필드 확인 |
| 저장 Ethernet Evidence | 기존 오프라인 검증 8/8 통과; 새 네트워크 실험 아님 |

재현: `pnpm install --frozen-lockfile`, `pnpm test`, `python tests/check_site.py`, `pnpm exec playwright install chromium`, `pnpm test:browser`. HTML은 HTTP에서 실행한다. `BASE_URL` 지정 시 같은 브라우저 검사를 공개 사이트에 적용한다. 스크린샷·결과 요약은 git에서 제외된 `test-results/`에 저장된다.

GitHub Actions는 Ubuntu/Windows의 동일 테스트와 Chromium 검사를 실행하도록 추가했다. CI/배포 결과는 PR Checks와 Pages 실행 기록으로 최종 확인한다. CI 성공도 실제 GNS3 Lab/PCAP/장애/복구를 수행했다는 뜻이 아니다.

### 다음 작업

IP 교육/UI 검토 → Windows read-only preflight 재확인 → 격리 프로젝트와 합법적 이미지 준비 → 정상 2종·장애 2종·각 복구의 실제 근거 수집 → 완료 11개 gate 검토. 실제 검증 전 `completed`로 바꾸거나 ICMP 과정 구현을 시작하지 않는다.

## 공개 배포 readback 보완

[PR #6](https://github.com/sebia1993/sebia1993.github.io/pull/6)을 `28248fd`로 병합했다. [PR CI](https://github.com/sebia1993/sebia1993.github.io/actions/runs/35601794258)는 Ubuntu/Windows 모두 성공했고 [Pages 배포](https://github.com/sebia1993/sebia1993.github.io/actions/runs/35602331308)도 성공했다. 공개된 교육·설계·결과 파일 20개는 PR head의 바이트/SHA-256과 일치했다.

공개 브라우저 재검사에서 24/25 조합은 통과했고 첫 로드맵 방문의 `/favicon.ico` 404 한 건을 확인했다. 학습 스크립트 오류는 아니지만 console 무오류 조건을 위해 정적 아이콘을 추가했다. 로컬 test server가 이 경로를 204로 대신 응답하던 처리도 제거하여 동일 문제가 로컬에서도 검출되도록 했다. 실제 Lab 상태와 Evidence 수치는 변경하지 않는다.
