# Data Center Networking 학습 초안 — Beginner Audit

- 검토일: 2026-10-13
- 대상: `labs/dc-fabric.html` 최초 작성 초안
- 범위: 읽기 흐름, 용어 진입, 인지부하, 장비 표시명, Concept-only 범위, 출처 제시 구조
- 적용 기준: `Beginner-Network-Learning-Page-Audit-SKILL.md` v1.10, `Two-Stage-Technical-Learning-Design-SKILL.md`의 Concept Guide 규칙
- 이 검토는 실제 Lab 검증이나 최종 학습 콘텐츠 승격 판정이 아니다. 브라우저는 실행하지 않았다.

## Learner Baseline

- 현재 주제: 8단계 · Data Center Networking / `dc-fabric`
- Roadmap 위치: Network Automation 다음의 마지막 예정 주제
- 허용 선행지식: IP 주소와 서브넷, MAC과 Ethernet 프레임, Known Unicast, ARP, VLAN, L2/L3 전달, 라우팅, BGP의 경로 정보 교환
- 이번에 도입하는 말: Leaf, Spine, Fabric, Underlay, Overlay, VXLAN, VTEP, VNI, EVPN
- 보조 신규 용어: ECMP는 인접한 한국어 설명으로 도입됨. Clos는 첫 그림의 핵심 설명에서 제외하고 선택적 출처에만 남겼다.

선행 페이지의 실제 본문과 대조했다. `labs/ethernet-mac-table.html` 기본 설명은 MAC/Ethernet/Known Unicast를, `labs/bgp.html` 기본 설명은 BGP의 경로 정보와 정책을, `labs/firewall-vpn.html`은 두 끝점 사이에서 원래 패킷을 보호하는 개념을 소개한다. UDP는 기존 DHCP의 선택형 상세 근거에서 보이지만, 새 페이지의 기본 문맥에도 짧은 역할 설명을 추가했다.

## Overall Result

**재검토 결과: 정적 내용 PASS. BLOCKER 0, MAJOR 0, MINOR 0.** 실제 브라우저·반응형·네트워크 검증은 NOT_RUN이다.

최초 검토에서는 BLOCKER 0, MAJOR 1, MINOR 3을 발견했다. 주 담당자가 DC-A01~04를 적용한 뒤 이 검토자가 같은 Learner Baseline과 HTML 본문을 다시 대조했다.

단일 목표가 유지되고, 같은 4개 스위치와 2개 서버를 세 가지 정적 그림으로 반복한다. 장비 역할 → 운반망/논리망 → 안팎 헤더 → 네 단계 전달 → 자기 설명의 흐름은 적절하다. 이중 연결, 다른 서브넷 간 라우팅, 첫 ARP, 장애 수렴을 본문 목표 밖으로 분리한 점도 적절하다. 첫 그림의 보조 용어와 주소 설명의 모호함을 정리하면 기본 설명을 전면 재작성할 필요는 없다.

정적 내용의 발견 사항은 모두 해결했다. 이 판정은 브라우저 PASS나 게시 승인을 뜻하지 않는다.

## Findings

| ID | 위치 | 심각도 | 문제와 학습자 영향 | 구체 수정 권고 | Validation Impact |
|---|---|---|---|---|---|
| DC-A01 | `#cg-layers` 그림 캡션, 최초 초안 156행 | MAJOR | “두 서버의 주소만 같게 맞춘다고”는 같은 서브넷 설정이 아니라 동일 IP 주소를 두 장비에 넣으라는 전제로 읽힐 수 있다. 앞 그림의 서로 다른 `.11`/`.12` 주소와도 문장이 어긋난다. | “두 서버를 **같은 서브넷의 서로 다른 IP 주소**로 설정하는 것만으로 연결되지는 않습니다.”로 바꾸고, 후속 논리 네트워크/운반 경로 조건은 유지한다. | NONE: 예시·주소·Claim 유지, 모호한 설명만 명확화 |
| DC-A02 | 그림/본문/캡션/접근성 설명 전체 | MINOR | `SW A/B/C/D`, `서버 A/B`는 간결하고 내부적으로 일관되지만 Two-Stage §12.1 및 기존 Concept Guide의 `Switch A/B`, `Server A/B` 표시 규칙과 다르다. | 식별용 표시명은 `Switch A/B/C/D`, `Server A/B`로 통일한다. 일반 서술의 “서버/스위치”는 한국어를 유지한다. `data-device` 같은 내부 ID는 바꾸지 않는다. | NONE: 표시 이름만 수정 |
| DC-A03 | `#cg-picture`의 Fabric 설명, 최초 초안 134행 | MINOR | Leaf/Spine/Fabric을 도입하는 첫 그림 아래에서 `Clos`까지 이름만 추가한다. 핵심 목표에 필요한 말이 아니어서 새로운 분류를 더 외워야 한다고 느끼게 한다. | 기본 설명은 “여러 스위치가 함께 만드는 연결망입니다.”까지만 둔다. Clos라는 명칭은 기존 RFC 7938 출처 설명에 유지한다. ECMP는 이미 쉬운 설명이 있으므로 꼭 삭제할 필요는 없다. | NONE: 보조 명칭의 노출 위치만 변경 |
| DC-A04 | `#cg-vxlan`의 바깥쪽 헤더 라벨, 최초 초안 168행 | MINOR | `UDP`는 헤더 라벨에 갑자기 등장한다. 현재 목표를 설명하는 데 세부 UDP 이론은 필요하지 않지만 운반망에서 왜 추가됐는지 짧은 역할 안내가 유용하다. | 라벨 아래에 “UDP는 여기서 VXLAN 데이터를 운반하는 데 사용하는 프로토콜입니다.” 정도의 짧은 문구를 추가하거나, 동일 의미를 인접 캡션에 넣는다. 별도 UDP 카드나 심화 설명은 추가하지 않는다. | NONE: 기존 IP+UDP 캡슐화 Claim의 역할 설명 |

## 확인한 양호 항목

- 학습 목표 1개: 원래 서버 통신의 목적지와 IP 운반망 목적지를 분리한다.
- 첫 질문, 데이터센터가 필요한 이유, 30초 요약이 있으며 전문용어만으로 시작하지 않는다.
- Leaf/Spine은 장비 역할과 함께, Underlay/Overlay는 운반망/논리망 의미와 함께 도입된다.
- VTEP와 VNI는 인접 문장·그림에서 역할을 제공한다. EVPN은 이미 배운 BGP를 새 목적에 연결한다.
- 실선의 의미, 교차가 연결점이 아니라는 점, Overlay 상자가 별도 케이블이 아니라는 점을 명시한다.
- 정상 전달 네 단계, 두 열 비교표 한 개, 기억 문장 네 개, 자기 설명 질문 한 개로 정보를 제한했다.
- VTEP IP와 서버 IP를 일관되게 재사용하며, 같은 L2 VNI·Known Unicast라는 시작 조건이 있다.
- 실습이 준비 중임을 밝히고 존재하지 않는 실습 URL을 만들지 않았다. 끝의 기본 CTA는 로드맵 복귀 하나다.
- 원문 링크, 문서별 설명 범위와 절 번호를 출처 펼침 영역으로 분리했다. 표준 문헌과 이번 실제 관측을 혼동하지 않는다.
- 제목·상단·하단에 초안임을 알리고, 실제 장비 검증 전임을 표시한다.
- Native `details/summary`, skip link, 단일 `h1`, 표의 `scope`, 도식의 인접 캡션은 소스상 확인된다. 이는 실제 접근성 조작 PASS를 뜻하지 않는다.

## Applied Fixes / Re-Audit

이 검토자가 학습 페이지 소스를 수정하지는 않았다. 주 담당자 적용본을 다시 읽어 아래 네 수정을 확인했다.

| 항목 | 재검토 결과 |
|---|---|
| DC-A01 주소 설명 | 해결. “같은 서브넷의 서로 다른 IP 주소로 설정하는 것만으로”라는 문구를 확인했다. 기존 예시 IP·전달 전제는 유지된다. |
| DC-A02 짧은 장비명 | 해결. 그림·본문·표현·접근성 이름에서 `Switch A/B/C/D`, `Server A/B`를 사용한다. 내부 `data-device` ID는 유지된다. |
| DC-A03 Clos 노출 | 해결. 첫 그림 뒤에서는 연결망의 역할만 설명한다. Clos 명칭은 선택적 공식 출처 영역에 남아 있다. |
| DC-A04 UDP 역할 설명 | 해결. VXLAN 포장 도식에 UDP의 운반 역할을 설명하는 한 문장을 확인했다. |

같은 예시와 단일 목표, 4단계 흐름, 4개 요점, 실제 실습 미제작 안내가 유지된다. `git diff --check`도 오류 없이 끝났지만 이 결과는 HTML 렌더링을 검증하는 시험이 아니다.

실제 브라우저 검사는 주 담당자의 별도 결과를 사용해야 하며, 이 문서에 자동으로 PASS를 붙이지 않는다. 현재 브라우저·반응형·키보드·200% 확대·공개 URL 및 실제 네트워크 검증은 모두 NOT_RUN이다.

## QA Scope

| 항목 | 상태 | 범위 |
|---|---|---|
| Static Content Review | 수행 | 페이지 본문 전체, 공통 Concept CSS, 관련 선행학습 본문 |
| Source Presentation Review | 수행 | 출처 링크와 적용 범위가 읽기 흐름에서 분리됐는지 확인 |
| Source / Claim Cross-check | NOT_RUN | 이번 Audit에서는 RFC 원문을 다시 대조하지 않음. 제작 담당자의 조사 기록과 구분 |
| Browser Visual QA | NOT_RUN | 실제 렌더링 미검사 |
| Responsive QA | NOT_RUN | CSS 규칙 열람만 했으며 네 viewport를 실행하지 않음 |
| Interaction / Accessibility QA | NOT_RUN | 소스 구조 검토만 했으며 키보드·펼침·200% 확대 실조작 미실행 |
| Public URL QA | NOT_RUN | 초안이며 게시하지 않음 |
| Actual Network Validation | NOT_RUN | 이 Audit 작업의 범위가 아님 |
