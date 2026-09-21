# Lab Framework Design — v0.1

설계 기준: 2026-09-21, `aaaa409`. [Master Plan](NETWORK-LEARNING-MASTER-PLAN.md)의 P1 범위. 기존 페이지를 이관하지 않고 첫 IP/Subnetting 페이지에서만 최소 공통 기능을 검증한다.

## 1. 실제 코드 분석

| 기능 | ARP | Ethernet | 분리 기준 |
|---|---|---|---|
| 장치/주소/상태 | `arp-simulator-1.js`: `state`, `ipToInt`, `sameSubnet` | `ethernet-mac-simulator.js`: `devices`, `setFdb`, `learn` | 도메인 계산과 UI 상태 분리 |
| 패킷/링크 | `animateLinks`, `markRequest`, `markReply` | `animateSprite`, `animateIngress/Egress`, `setLinks` | 좌표/경로는 데이터, 시간/취소는 엔진 |
| 예측/피드백 | 여러 script의 학습 단계/Packet study | `renderPrediction`, `revealPrediction` | question/choices/correctId/feedback 계약 |
| 로그/표 | `log`, `renderArp`, `setLiveEvent` | `addTimeline`, `addLog`, `renderTables` | run별 Event 배열 + 뷰 |
| Reset | 전역 `resetFlow` 및 여러 초기화 함수 | `resetScenario`, `loadLesson` | 단일 상태 재생성 + 진행 중 작업 취소 |
| 모드/학습 진도 | 분할 코드·DOM 후처리 | `setMode`, `renderProgress`, `completeIfReady` | 기본 모드 시작, 세션 진도만 관리 |
| 모바일 | `arp-simulator-mobile*.js/css`와 follow v2 | 자체 mobile flow/focus 구현 | 고립된 viewport, 사용자 opt-in |

`styles.css`/`lab-ui.css`는 보고서 공통 디자인이며 simulator 공통 런타임이 아니다. `ethernet-guide.js`는 보고서용 안내와 기본/고급 모드다. 기존 자료의 검증 상태는 엔진의 정답/학습 완료와 합치지 않는다.

## 2. 아키텍처와 범위

```text
labs/ip-subnetting.html (17개 교육 구획, 결과 상태 표시)
       ├─ scenarios/ip-subnetting.js (Topology + Scenario + Packet 정의)
       ├─ ipv4.js (검증된 순수 IPv4 계산)
       └─ engine.js (공통 DOM/이벤트/재생 수명 관리)
             └─ core.js (순수 상태 전이, DOM/네트워크 없음)
```

새 모듈은 build-free, 외부 CDN/프레임워크/계정/분석 추적 없음. 새 스타일은 `.nl-lab` 내부로 한정한다. DOM에는 데이터 문자열을 `textContent`로 넣고 arbitrary HTML/명령을 scenario에서 실행하지 않는다. 엔진은 SSH/GNS3를 호출하지 않는다.

이번 최소 기능: 시나리오 선택, 예측/정오 피드백, 단계별 재생/한 단계, Device/Link/Packet 표시, Event Log, Packet 상세, 기본/고급, Reset/재실행, topology 줌과 선택적 가로 따라가기. 장애/복구는 각각 명시된 교육 시나리오로 선택한다. 실제 fault injection/Runner, persistence, 임의 장치 편집, 기존 Lab migration은 후속이다.

## 3. Scenario 계약

ID는 파일명·결과·링크에서 안정적으로 유지한다. Topology는 `{nodes:[{id,label,x,y}], links:[{id,from,to}]}`. Scenario는 `id`, `title`, `kind`(normal/failure/recovery), `description`, `question`, `choices:[{id,label}]`, `correctId`, `feedback`, `steps:[{title,detail,nodeId,packet}]`를 가진다. packet은 `sourceIp`, `destinationIp`, `arpTarget`, `destinationMac`, `note` 같은 교육용 문자열이다. 모든 데이터는 `provenance: simulation` 범위다. 이후 실제 evidence reference는 별도 result manifest만 참조한다.

최소 engine API는 `mountLab(root, {title, topology, scenarios}) → {destroy()}`. `core.js`의 `createState(scenario)`, `choose(state, scenario, choiceId)`, `advance(state, scenario)`, `reset(scenario)`는 새 상태를 반환한다. 엔진이 DOM과 run token을 소유한다. 세부 export/API 변경 시 이 문서를 함께 갱신한다.

## 4. 상태 전이·비동기 취소

```text
predicting → answered → playing → finished
                  ↘ step-by-step ↗
Reset / Scenario change: 어떤 단계에서든 새 predicting 상태
```

선택 전 실행을 막는다. 답을 선택하면 정답/오답과 이유를 보여주되 시뮬레이션은 둘 다 가능하다. 최초 예측은 실행 후 바꾸지 않는다. Reset은 답, 로그, Packet 상세, 현재 단계, 완료 표시를 비운다. 시나리오 변경/Reset/destroy는 run token을 갱신하고 timer/animation을 취소한다. 오래된 callback은 현재 DOM/로그를 변경할 수 없다. 실행 버튼 중복 입력은 무시한다. 모드/확대 상태는 교육 진도와 별개이며 Reset 의미를 UI에 명시한다.

## 5. 도메인 모델

IPv4 문자열은 정확한 4옥텟 0..255, Prefix 정수 0..32만 허용한다. 32비트 JS signed overflow를 피하며 /0 마스크와 /32를 별도로 다룬다. /1..30 일반 subnet의 host range는 network+1..broadcast-1. /31은 RFC 3021 P2P 문맥에서 두 주소, /32는 단일 host route라고 표시하고 일반 LAN broadcast/host 공식을 적용하지 않는다.

송신 호스트의 connected subnet 판단은 `source & mask`와 `destination & mask` 비교다. 서로의 Mask가 다르거나 더 구체적인 Route가 있으면 단순 한 번의 계산으로 왕복 성공을 보장하지 않는다. 파일럿 가정은 static host route 없음, Proxy ARP 없음, NAT 없음, 정상 링크이며 오류 시나리오마다 바뀌는 조건 하나를 명시한다.

## 6. UX/접근성/모바일

기본 모드가 항상 시작값이다. 고급 모드는 header/CLI/RFC 설명만 더 보여주며 답이나 Packet 결과를 바꾸지 않는다. 키보드로 접근 가능한 버튼/라디오, 명확한 label, `aria-pressed`, 피드백 `role=status`를 사용한다. Packet 상세는 modal 대신 펼침 영역으로 구현해 focus trap 위험을 줄인다.

topology는 내부 가로 viewport와 확대/축소 버튼을 제공한다. 따라가기는 기본 꺼짐, 사용자가 켠 경우 viewport 안에서만 수평 이동하며 문서 세로 위치는 바꾸지 않는다. 읽고 있는 문단으로 강제 scroll하지 않는다. reduced-motion이면 단계 결과를 즉시 표시한다. 버튼 44px 이상, 최소 16px 본문, 작은 폭에서도 페이지 전체 horizontal overflow 없음. 링크/Packet 색 외에 텍스트로 의미를 전달한다.

## 7. Evidence와 진도 경계

UI 완료는 현재 연습의 마지막 단계 도달이다. `results/`나 `learning-data.json`에 쓰지 않는다. 실제 Lab 완료는 Master Plan의 11개 gate, 최소 2개 장애와 각각의 복구/근거가 있어야 한다. 최초 IP 결과는 `labStatus: not-run`, 정상·장애·복구 판정은 `NOT_RUN`, actual null, artifact 빈 배열로 저장한다. 로드맵은 교육 파일럿을 안내할 수 있지만 모든 실험 카운터는 0이다.

## 8. 테스트와 점진 이관

Node: /0,/24,/25,/30,/31,/32 경계, 잘못된 IP/Prefix, 같은/다른 subnet, 선택 전 advance 금지, Reset 독립성, 오답 후 진행, 다중 instance 독립성. 브라우저: 페이지/스크립트/링크 오류, 처음 기본 모드, 예측→실행, 실행 중 Reset·Scenario 변경, 완료 후 Reset/재실행, 고급 전환, 줌·따라가기, 상세와 좁은 폭 확인. 기존 ARP/Ethernet 보고서·시뮬레이터·Viewer·로드맵은 그대로 smoke 검증한다.

이번 gate 통과 후 실제 IP Lab을 준비한다. 다음 과정은 자동 시작하지 않는다. 이후 ICMP 요구에서 두 번째 소비자가 생기면 engine 계약의 과도한 IP 결합 여부를 확인한다. 기존 ARP의 global function을 monkey-patch하는 공통화는 하지 않는다.
