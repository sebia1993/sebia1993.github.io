# BGP · VRF · Redistribution 실습 개선

## 학습 페이지를 먼저 확인한 범위

2026-10-07 작업 시점의 `labs/bgp.html`, `labs/vrf.html`, `labs/redistribution.html` 본문과 보존 상세 자료를 먼저 읽었다. 본문 학습 목표·최신 장비명·주소·AS·토폴로지를 대조한 뒤 아래 수정에 착수했다. Concept Guide 자체는 수정하지 않았다.

| 실습 | 학습 페이지와의 대응 | 기존 조건 보존 |
| --- | --- | --- |
| BGP | Router A/B/C/D = 원래 R1/R2/R3/R4. AS 관계 → 경로 수신 → 후보 비교 → 정책에 따른 선택·광고 | AS65001/65002/65003, TARGET 203.0.113.1/32, EXTRA 198.51.100.2/32, LP100→200, 명시적 next-hop-self |
| VRF | PC A/B = PC-BLUE/PC-RED. Context 먼저 선택 → 해당 RIB Lookup → 출력 → 독립 유지 | 동일 10.10.10.0/24, e0/0 BLUE/e0/1 RED/e0/2 Global, 한 방향 192.0.2.0/24 정적 Leak, 반환 Route 부재 |
| Redistribution | Router A/B/C = R1/R2/R3. 원래 Route → 경계 → Prefix/Tag 정책 → 대상 프로토콜 → RIB | OSPF Area0, AS65001/65002, TARGET/BLOCK/TAGGED/CONFLICT, seed20/E1 metric30, Tag65002, Cisco AD20/110 |

VRF 본문의 짧은 명칭에는 Router와 Global 단말이 나오지 않고 보존 상세 자료에 R1/PC-GLOBAL만 존재한다. 실습의 Router A/PC C는 같은 장비의 짧은 이름이며 `presentation.guideDifferences`와 초기 화면의 명칭 대응 설명에 그 이유를 기록했다. PC A/B는 본문의 명칭 그대로다. 주제마다 AS 번호가 다른 것은 기존 검증 토폴로지의 차이이며 BGP 사례의 AS 번호를 Redistribution에 강제하지 않았다.

## 재사용 구조와 필요한 차이

- 기존 ARP CSS 5개·공통 재생 Controller·예상/결과/힌트/CTA 구조를 유지한다.
- `ip-subnetting-devices.svg`에서 추출된 ARP Router/PC 심볼을 재사용한다.
- BGP의 820px 가로 SVG를 같은 3개 peer 연결의 반응형 HTML 토폴로지로 바꿨다. AS와 장비명은 충분한 크기로 표시한다. 모바일도 같은 연결 관계를 유지한다.
- Redistribution은 데스크톱에서 세 장비/두 연결, 모바일에서 같은 관계를 세로로 배치한다.
- VRF는 Router와 3개 Context별 단말 연결을 반응형으로 구성했다. 기존 모바일 분기의 너비가 없는 링크 대신 실제 보이는 연결과 e0/x 표기를 둔다. RIB는 작은 화면에서 세로로 쌓이고 현재 표/행을 강조한다.
- 주제 전용 `advanced-routing-visual.css`는 이 3개 페이지만 사용한다. 공통 ARP 카드/버튼 스타일은 재정의하지 않는다.

## 시각화와 재생 변경

16개 시나리오를 모두 고유한 4–5개 관찰 장면으로 구성했다. 예전의 공통 3단계 스냅샷 대신 판단 원인과 관련 표·후보·링크만 순서대로 표시한다. 전체 단계에 단일 2490ms를 반복하지 않고 설명 분량에 따라 1650/1800/2100/2400ms의 판단·관찰 시간을 둔다. 재생·정지·다시 보기 실행 소유권은 공통 Controller에 있다.

- BGP: AS 관계 분리, 동일 Prefix 후보와 LP/AS_PATH 비교, Best/RIB 반영, 정책 제거 복구, iBGP 속성 전달, 필터 제거 광고 후 재적용 Withdrawal을 별도 장면으로 표시한다.
- VRF: 각 Context 조회·Interface 소속·동일 주소의 각 경로·Lookup 실패를 구분한다. Leak은 경로 추가 → Request 출력 → Reply 프레임 관측/반환 Lookup 실패 → 실제 기존 복구 근거를 분리한다. Request 3개/Reply 프레임 3개를 원래 BLUE Ping 성공으로 표시하지 않는다.
- Redistribution: 원본 경로 → 명시적 재분배 → 허용 Route 광고, E1 Metric의 20+10=30, Prefix Permit 추가/철회, Tag Deny 우선 평가, Prefix 철회 시 AD 대체/복구를 분리한다.
- BGP와 재분배는 경로 정보·정책의 관찰이므로 사용자 Packet을 임의로 이동시키지 않는다. 동작 강조가 데이터 Packet 전달을 뜻하지 않음을 표시한다.

일반 UI·상태 제목은 한글화하고 네트워크 용어, 실제 CLI·검증 원문은 유지한다. 원래 `lessons`는 수정하지 않고 `presentation` 명칭/문구 계층에만 표시 변환을 둔다. 모든 문제에 학습 목표를 설명하는 제목·brief와 3단계 힌트를 추가했다.

## 검수 상태

| 항목 | 상태 | 실제 수행 범위 |
| --- | --- | --- |
| 학습 페이지 내용·장비명·조건 대조 | PASS | 세 페이지 본문과 보존 상세 자료 전체를 읽고 위 대응 확인 |
| 원본 모델·근거 보존 | PASS | Node VM으로 adapter.raw를 추출하고 기존 fixtures SHA-256 대조: BGP 5, VRF 6, Redistribution 5 시나리오 모두 일치 |
| JS 구문 | PASS | 세 `-model.js`에 `node --check` 실행 |
| HTML ID 중복 | PASS | HTMLParser로 BGP 62 / VRF 53 / Redistribution 60개 ID의 유일성 확인 |
| 반응형 실제 화면·Click Path | NOT_RUN (이 하위 작업 기준) | 작업공간 localhost는 CUA에서 접근되지 않아 통합 담당자의 CI 화면 및 공개 페이지 검수에 인계 |
| 공개 배포와 공개 재검수 | NOT_RUN (이 하위 작업 기준) | 통합 담당자가 코드 통합/CI 이후 수행 |
| 새 프로토콜/실장비 검증 | NOT_RUN | 새 Claim·새 PNETLab 검증 없음. 기존 근거를 표시/순차 관찰에 재사용 |

화면·공개 검수 최종 결과는 같은 디렉터리의 통합 검수 기록을 따른다. 이 문서의 소스 검사 PASS를 브라우저 화면 검수 PASS로 확대하지 않는다.

## CI 실제 화면 육안 검수 추가

통합 CI의 `guide-aligned-v2` 실제 브라우저 캡처를 `view_image`로 열어 확인했다. 검토한 원본은 `qa/ci-final/guide-aligned-v2/` 아래 BGP·VRF·Redistribution의 다음 24장이다.

- 각 주제의 360·768·1366·1920 `visual.jpg`: 12장.
- 각 주제의 360·1366 `idle.jpg`, `completed.jpg`: 12장.

장비명·AS·IP·출력 인터페이스 라벨, 모바일 세로 전환, RIB 행, 예상/결과 카드와 완료 버튼의 줄바꿈을 육안 확인했다. Redistribution의 세로/가로 토폴로지 및 세 실습의 텍스트는 잘림 없이 읽을 수 있었다.

**발견 및 수정:** BGP·VRF의 세로 분기 연결선에 작은 공백이 있었다. 고정 68px 연결 구간이 실제 카드 높이와 달라 생긴 문제로, `advanced-routing-visual.css`의 세로 줄을 각 peer 행의 실제 높이 + gap에 따라 연결하도록 수정했다. 이 후속 CSS 변경은 새 캡처 검증 전이므로 수정 후 시각적 PASS로 표기하지 않는다.

**공통 계층에 전달:** 360px 완료/관찰 캡처에서 sticky 문제 탭이 토폴로지·관찰 설명의 중간을 가리는 모습이 확인됐다. full-page 캡처 시 스크롤 위치에 따른 sticky 합성 영향이 있지만, 내용 위에 탭이 겹치는 실제 상태이므로 통합 담당자에게 전달했다. 본 작업은 공통 Controller/CSS를 직접 수정하지 않았다.
