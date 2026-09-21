# Windows Lab Runner — 장기 설계

**현재 상태: 설계만 작성, 실행 코드·패키지·Windows CI 미구현.** 이 디렉터리에는 Windows에서 실행할 runner가 없다. [Master Plan](../NETWORK-LEARNING-MASTER-PLAN.md), [Framework 계약](../LAB-FRAMEWORK-DESIGN.md), [IP/Subnetting Lab Plan](../lab-plans/ip-subnetting.md)을 기준으로 실제 실습 자동화의 경계를 정의한다. 브라우저 엔진은 시뮬레이션만 재생하며 SSH/GNS3 API나 이 runner를 호출하지 않는다.

## 역할과 구성 요소

Mac은 Plan·교육 코드·결과 검토·Pages 공개를 담당한다. Windows runner는 사용 권한을 확인한 격리 GNS3 실습에서만 동작한다. 운영 장비, 기존 프로젝트, 회사망, 실제 RF·Cloud 실험까지 자동 확장하지 않는다.

| 구성 요소 | 책임 / 경계 |
|---|---|
| Plan validator | schema, topic/scenario ID, 기대값, 필수 근거, 복구 명령 계약 검사 |
| Read-only preflight | SSH/API 버전, 인증, compute, 도구, 선택된 저장 루트·용량·시간 확인 |
| Project guard | 명시된 별도 project ID allowlist, 노드·링크 일치, 외부망 미연결, 중복 실행 방지 |
| GNS3 adapter | 검증된 API 버전별 동작. 사전 점검은 GET만 허용 |
| Device adapter | Vendor/버전별 허용 CLI, timeout, baseline 수집·복원·재검증 |
| Capture controller | 지정한 내부 링크에서 시작·종료·파일 존재·관측 구간 확인 |
| Evaluator | CLI·패킷·시간 근거로 expected/actual 비교. Ping 무응답만으로 원인 확정 금지 |
| Evidence writer | run별 원본과 manifest, 상대경로·SHA-256, 공개 검토 상태 기록 |

로컬 설정은 관리 SSH alias, API 포트, private 프로젝트 경로, 자격 증명 참조를 보관한다. 이 값과 라이선스·NOS 이미지·디스크는 저장소에 넣지 않는다. 자격 증명은 대상 프로세스 메모리에서 사용하고 로그·예외·명령줄에 출력하지 않는다. API 응답은 필요한 필드만 기록한다. 설정 조회 allowlist는 [체크리스트](../docs/WINDOWS-LAB-CHECKLIST.md)를 따른다.

## 실행 수명

```text
Plan validate → read-only preflight → project guard → baseline
  → 정상 capture/test → 장애 하나 적용 → 장애 관측
  → 원본 상태 복구 → 복구 capture/test → 다음 독립 장애
  → captures 종료·무결성 확인 → manifest → 사람 검토
```

각 run은 유일한 `runId`와 시작/종료 UTC를 가진다. 중복 ID·기존 output 덮어쓰기·동일 프로젝트 병렬 실행은 거부한다. Project guard가 통과하기 전에는 생성·시작·설정·캡처 API를 호출하지 않는다. Plan이 지정한 새 프로젝트만 대상으로 삼고 기존 프로젝트 전체 삭제·중지·자동 정리 기능은 만들지 않는다.

IP 파일럿은 `same-subnet`, `different-subnet` 기준을 확보한 뒤 `wrong-mask → mask-recovery`, 다시 정상 기준에서 `wrong-gateway → gateway-recovery` 순서로 수행한다. 장애를 누적하지 않는다. 시뮬레이션 주소와 실제 격리 Lab 주소의 대응 관계를 manifest에 명시한다.

## 취소·오류·rollback

장애 적용 전에 원본 설정, 복구 절차, 복구 기대값을 run 전용 로컬 기록에 저장한다. 캡처와 장치 명령에는 제한 시간을 두고 변경 단계마다 진행 상태를 남긴다. 정상 종료·예외·사용자 취소 시 모두 복구 경로에 진입하도록 설계한다.

프로세스 종료·전원 단절·연결 상실에서는 `finally`만으로 복구를 보장할 수 없다. 지속 기록으로 마지막 변경을 식별하고 다음 실행은 기존 run의 복구 상태 확인부터 시작한다. 변경 결과가 불명확하면 장애 명령을 무조건 재시도하지 않는다. 연결이 끊어진 동안은 `recoveryVerified: false`로 남기고 새 장애 적용을 차단한다.

| 상황 | 기록과 다음 동작 |
|---|---|
| 사전 점검 실패, 시나리오 미시작 | `NOT_RUN`; actual은 null, artifact는 빈 배열 |
| 실험 시작 후 근거 부족·캡처 누락 | `INCONCLUSIVE`; 확보한 근거와 누락 이유 보존 |
| 충분한 관측으로 기대와 불일치 | `FAIL`; 불일치를 실제 값으로 기록 |
| 복구 명령이 실패한 것으로 확인됨 | 복구 `FAIL`; 실제 잔여 상태 기록, 다음 실험 중단 |
| 단절로 복구 여부를 확인할 수 없음 | 복구 `INCONCLUSIVE`; 미복구 가능 상태로 격리, 사람 확인 필요 |
| 복구 설정·통신·필수 근거가 모두 확인됨 | 해당 복구 `PASS`; 이후 단계 진행 가능 |

복구 명령의 종료 코드 0만으로 복구 PASS를 부여하지 않는다. 원본 설정과 실제 연결·캡처 기대값을 다시 확인한다. 이미 복구된 run에 재접속해도 장애를 다시 적용하지 않도록 단계 재개를 멱등적으로 설계한다. 사람의 수동 복구가 필요할 때는 대상·마지막 확인 상태·남은 절차를 최소 정보로 제시한다.

## 관리 통신과 캡처

관리 통신은 Tailscale의 기존 SSH 경로를 사용한다. SSH strict host key 검사를 유지하고 Windows의 localhost GNS3 API를 SSH 내부 호출하거나 Mac 루프백에만 바인딩한 SSH 터널로 접근한다. 루프백 수신 여부와 API 버전을 먼저 확인하며 서버·방화벽·tailnet 설정을 임의 변경하지 않는다. 401 응답은 인증 요구의 근거이며 Lab readiness PASS가 아니다.

학습 트래픽과 PCAP은 승인된 GNS3 내부 링크에 한정한다. 관리 인터페이스, 호스트 Wi-Fi, 회사 NIC 전체 캡처는 제외한다. 실습망을 Tailscale subnet route / exit node로 연결하지 않는다. 파일 전송 후 SHA-256을 원본과 비교하고 공개 전 검토한 복사본만 사이트에 연결한다.

## 결과 계약과 공개 게이트

결과는 Master Plan의 `schemaVersion`, `lab`, `runId`, UTC 시각, 플랫폼·도구 버전, `provenance`, `status`, 시나리오별 expected/actual/verdict, artifact의 상대경로·SHA-256·capture point·관측 구간·filter, 검토 상태를 따른다. 원본 절대경로·호스트·개인정보는 공개 manifest에서 제거한다.

`provenance: real-lab`은 실제 실행 근거가 있을 때만 사용한다. Fixture와 브라우저 결과는 simulation 또는 명확한 테스트 근거로 구분한다. 계획의 기대값을 actual로 복사하지 않는다. 빈 PCAP은 capture 시작·종료·인터페이스·시간 구간의 정상 수집을 별도로 확인한 경우에만 패킷 부재의 근거가 될 수 있다.

JSON 생성·테스트 통과·API 연결 성공은 학습 완료가 아니다. 정상, 대표 장애 2개 이상, 각각의 복구, 재검토 가능한 근거와 Master Plan의 11개 gate를 모두 검토한 후에만 `completed`를 부여한다. Runner는 로드맵 누적 숫자를 직접 올리지 않는다.

## 구현 시작 시 Windows 검증 정책

실행 코드를 추가할 때 저장소의 기존 GitHub Actions Windows 작업·러너·버전 매트릭스를 먼저 확인한다. 적절한 작업이 없으면 저장소 관례에 맞는 최소 `runs-on: windows-latest` 작업을 추가한다. 일반 빌드·단위/통합 테스트·패키징은 해당 Windows CI가 성공해야 Windows 자동 검증 통과로 보고한다.

의미 있는 초기 테스트는 Plan/allowlist 거부, 중복 run 방지, 인증 정보 비노출, API 오류·timeout, 캡처 실패, 각 변경 단계에서의 취소·rollback·재개, 미검증 복구의 후속 실행 차단, manifest 상태·해시 검사다. 외부 Windows 호스트 자격 증명을 hosted CI에 넣지 않고 fixture/API 대역으로 자동화 계약을 검증한다.

Hosted Windows CI는 실제 GNS3 노드 부팅·GUI·드라이버·관리자 권한/재부팅·RF·실장비를 증명하지 않는다. 그 범위는 승인된 실제 Windows 세션 또는 적절한 self-hosted 러너에서 별도 근거로 남긴다. macOS 로컬 테스트 결과도 Windows CI 및 실제 실습 결과와 각각 구분한다. 현재 문서만으로 통과했다고 주장하는 CI나 실습은 없다.
