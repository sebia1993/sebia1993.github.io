# 무선 실습 4개: 학습 페이지 대조와 구현 기록

대상: `wifi-rf`, `wlan-association`, `dot1x-radius`, `roaming-wlan-troubleshooting`.

## 먼저 읽은 학습 페이지와 대응

2026-10-07 최신 저장소의 각 동일 이름 Concept Guide를 먼저 읽었다. 본문의 학습 목표·장비명 대응표·기존 상세 자료·관측 한계를 함께 대조했다. Concept Guide 파일과 원본 시나리오 배열은 수정하지 않았다.

| 실습 | 학습 목표와 고정 조건 | 적용한 표시 이름 / 보존 조건 |
| --- | --- | --- |
| Wi-Fi / RF | Band → Channel → Width → RSSI/Noise/SNR → CCI/ACI → DFS. 5 GHz/ch149/80 MHz/KR, RSSI -22 dBm·Noise -97 dBm·계산 SNR75 dB 유지 | AP-A → AP A. AP-06/12/13은 원자료의 익명 BSSID 별칭 유지. 네 BSSID를 물리 AP 네 대로 설명하지 않음 |
| WLAN Association | AP 발견·연결 협상·키 준비 분리. WPA2 최초 접속, 새 SAE 접속, PMF 역할과 예외 유지 | STA-A → PC A, AP-A → AP A. PC A가 STA/Supplicant 역할임을 표시. 6문제/45개 원본 단계·실패·복구 순서 유지 |
| 802.1X / RADIUS | 인증·인가, EAPOL/RADIUS 경계, Access-Reject/서버 무응답 분리 | SUPP-LINUX → PC A, SW1 → Switch A, 인증 서버 → Server A. FreeRADIUS는 소프트웨어 명칭으로 유지. BLUE/VLAN20/10.77.20.10, GREEN/VLAN30/10.77.30.10 유지 |
| Roaming | AP 전환 사실과 이후 서비스 상태를 분리. k/v/r 역할, Sticky 조건, 진단 순서의 한계 유지 | STA-A → PC A, AP-A/B → AP A/B. 공식 사례를 사용자 단말 실측으로 승격하지 않음. 데이터 재개·시간·무손실을 만들어 넣지 않음 |

## 변경 사항

- 공통 ARP Shell과 공개 URL을 유지했다. 질문형 제목·주제별 시작 설명·힌트를 presentation에 분리했다.
- 일반 UI의 관찰/근거/범위/대기 등의 영어를 한국어로 표시했다. 실제 명령/로그/원본 근거는 보존하고 내부 데이터는 변경하지 않았다.
- RF는 전체 결과를 한 번에 공개하던 상태 화면을 각 문제 3단계로 분리했다. Width는 20 MHz 기준 1/2/4칸을 비교하고, SNR은 신호→잡음→차이의 계산 순서로 공개한다. RF에 패킷 이동을 억지로 추가하지 않았다.
- WLAN은 원본 메시지 순서를 그대로 유지하면서 PC A/AP A 사이에서 방향에 맞춰 Marker가 실제로 이동한다. 내부 상태·중단은 이동하지 않는다. 양방향 요약은 왕복 표현이다.
- 802.1X는 3장비 역할 그림과 함께 원인 사건·상태를 순서대로 공개한다. EAPOL과 RADIUS 구간을 구분한다. Reject/Timeout의 복구는 각각 별도 3단계로 원본 #416/#523와 Ping 3/3 근거를 사용한다.
- Roaming은 초기 조건→근거 대조→판단 범위를 공개한다. AP 그림은 관계를 보여주는 개념 표시이며 물리 이동 거리나 실측 시간으로 표시하지 않는다.
- 메시지 이동은 ARP의 420 ms/구간을 기준으로 하고, 도착 이후 설명 시간을 별도로 둔다. 일반 판단은 1470~1800 ms, 왕복 요약은 2070 ms이다. 모든 단계를 2490 ms로 고정하지 않는다.
- 메시지 그림은 좁은 화면에서 PC/AP/서버를 세로로 배치한다. 움직이는 Marker의 좌표를 실제 장비 배치에서 다시 계산하므로 가로 스크롤 없이 같은 방향 의미를 유지한다.

## 확인 결과

| 검사 | 결과 | 근거 |
| --- | --- | --- |
| 학습 페이지 선행 확인 | PASS | 위 4페이지의 최신 본문·이름 대응표·기존 상세 자료 읽음 |
| 원본 시나리오·근거 보존 | PASS | Node VM으로 adapter.raw를 읽어 SHA-256 대조. 4개 모두 `tests/fixtures/roadmap-simulator-models.json`과 일치 |
| 문법 | PASS | 4개 model.js 및 공통 무선 Renderer `node --check` |
| 단계 계약 | PASS | 모든 새 정상 단계 title/detail/action/duration 확인. RF18, WLAN45, DOT1X22, Roaming18 단계. WLAN modelStepIndex는 원본 단계 순서와 일치 |
| 주제별 설명/힌트 | PASS | 4개 모두 원본 6문제와 동일한 개수의 presentation이 있음 |
| 새 PNETLab/실장비/무선 실측 | NOT_RUN | 이번 범위에 포함하지 않음. 기존 근거 재사용 |
| 실제 브라우저/4개 해상도/공개 배포 | 통합 QA에서 판정 | 공통 Controller 수정과 함께 상위 작업에서 실제 실행·반응형·공개 검증 수행. 이 문서의 소스 검사로 브라우저 PASS를 주장하지 않음 |

## ARP와 필요한 차이

RF/로밍 근거 검토는 패킷 전달 문제가 아니므로 상태·계산·근거를 주 관찰 영역으로 둔다. 802.1X는 학습 페이지와 같은 유선 실제 실습의 구성을 유지한다. WLAN 접속은 학습용 모델이며 공개 PCAP 및 사용자 장비 직접 실측의 범위를 구분한다. 장비명 표시만 대응시키고 원본 Evidence의 장비명/프레임 번호/해시는 그대로 보존한다.
