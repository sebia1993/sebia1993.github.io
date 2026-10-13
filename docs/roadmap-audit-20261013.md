# 2026-10-13 학습 로드맵 개선

대상: 기존 26개 주제의 Concept Guide와 Interactive Lab. 기존 URL과 Roadmap 순서를 유지한다. 이 변경은 학습 설명·화면 상태·브라우저 모델의 개선이며, 실제 네트워크 장비 검증을 새로 수행한 기록이 아니다.

## 수정 내용

| 범위 | 수정 |
| --- | --- |
| 공통 22개 실습 | 완료 답안 복원·잠금, 명시적 초기화 후 새 채점, 최초 제출 점수 표시, 미완료 문제 순환, 복습 중 최종 결과 숨김, 반복 문구 치환 안정화, 보이는 위치로 키보드 포커스 이동 |
| ARP | 기본 장애 관찰과 복구 성공 기록 분리, 비동기 실행 취소, 조건 변경 시 고정 문제 채점 무효화, 학습/다음 주제 링크, 표시 이름, 모바일 따라가기 기본 OFF |
| IP / Ethernet | IP 토폴로지 다음에 계산 배치·선수 설명, 전체 완료 판정, Ethernet 예측 후 Aging 포함 단일 재생·일시정지·재생·장면 복습 |
| VLAN / Inter-VLAN / STP / LACP | 중립 제외 경로, 실제 목적지 분기 강조, 삼각형 STP 그림·역할 설명·창 크기 변경 시 좌표 안정화, LACP 초기 Bundled 상태와 원리 중심 문항 |
| DHCP / DNS | 초기 상태값 복원, 서비스 실패와 정상 링크 구분, Relay/조회 원리와 질문 연결 |
| Routing / OSPF | 로컬 인터페이스 장애 범위, 아이콘 경계 연결, Router ID·MTU·DBD·EXSTART 설명 |
| ACL / NAT / Firewall | Stateless·관찰 지점·Static PAT·Inspect/Pass·Zone Pair·IKE 선수 설명, NAT 복구의 각 요청과 같은 출발지로 돌아가는 응답 |
| WLAN 4주제 | 동일 축 채널 폭/겹침 그림, 필수 개념과 시작 조건, EAP 중계 원리, 공식 로밍 기록의 실제 시각과 출처 |
| FHRP / BGP / Redistribution | Tracking·iBGP·Next-hop-self·E1/Type 5·Route-map 설명 |
| Observability / Automation | 복구 장면의 링크·장비·토큰·표 동시 갱신, 현재 장면과 과거 기록 분리, 보존된 원문의 정규화·기준 비교·JSON 표현 |

기존 120개 공통 시나리오의 원본 데이터와 Concept Guide의 원본 상세 근거는 해시로 보존을 확인한다. 표시용 질문을 바꾼 경우 원본 Evidence와 별도 객체로 유지한다. 변경 범위에 들어온 UI 전체를 예전 파일 해시로 동결하던 검사는 원본 근거·도메인 모델·의미 있는 동작 회귀로 대체했고, 기존 고급 자료와 공통 ARP CSS의 보존 검사는 유지했다.

## 수행한 로컬 검증

- Node 단위/상태/원문 보존 검사 73개 통과.
- IP 계산 독립 oracle 429건 통과.
- 공통 22개 실습·120개 시나리오: 360/768/1366/1920px, 24,207개 검사 통과. 최초 선택, 자동 재생, 일시정지, 복습, 재시도, 복구, 화면 이동 포함.
- 26개 Concept Guide: 네 화면 폭, 200% 글자 크기, 키보드, 강제 색상, 기존 앵커와 실습 이동 검사 통과.
- ARP, IP, Ethernet 및 Physical의 별도 실행·모델·취소 회귀와 주제별 표적 장면 검사 수행.
- 새 Chromium 프로세스와 한글 폰트에서 그림·장비명·경로·라벨을 육안 검토. 가상 시계 검사와 실제 시간 재생은 별도 기록한다.
- 배포용 브라우저 검사 사전 실행: 52 URL·208 화면 크기 검사·원본 120개·대표 실행 27회, 1,631개 검사 통과. STP 창 크기 변경 회귀 포함.
- 기존 사이트 통합 검사의 원격 Python 로더는 초기 네트워크 실패 후 이 환경의 프록시를 적용한 표적 재실행에서 통과.
- 실제 Cisco/PNETLab/GNS3/AP 재검증: NOT_RUN. 과거 Actual을 새 Actual로 작성하지 않는다.

## 재실행

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test
pnpm test:site
pnpm test:browser
node tests/concept-guides-audit.mjs
```

`test:audit-browser`는 이번 결함에 대한 표적 회귀만 실행한다. `test-results/`의 JSON/이미지는 실행 환경의 증거이며 소스에 합치지 않는다. 공개 반영 후에는 `BASE_URL=https://sebia1993.github.io node tests/public-roadmap-audit.mjs`로 실제 페이지와 동작을 별도 확인한다.

## 스킬 환류

기존 ID를 유지하여 Pipeline v1.11, Two-Stage v2.17, Beginner v1.11, Topology v1.9를 저장하고 원문 재조회 일치를 확인했다. 설치된 network-simulator-template의 상태·완료·표시·회귀 규칙도 저장했다. 실제 장비 검증의 Runtime/Claim Gate는 변경하지 않았다.
