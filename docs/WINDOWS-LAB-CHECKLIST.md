# Windows Lab 준비 체크리스트

[Master Plan](../NETWORK-LEARNING-MASTER-PLAN.md)의 Windows 사전 점검용 문서다. [IP/Subnetting Lab Plan](../lab-plans/ip-subnetting.md)의 실제 구성·장애·복구 실험은 아직 수행하지 않았다. 아래 명령은 사람이 Windows 로컬 PowerShell에서 읽기 전용으로 확인하는 예시이며, 실행 결과를 기록한 내용이 아니다.

## 1. 2026-09-21 확인 결과

21:29 KST / 12:29 UTC에 기존 관리 연결로 SSH를 한 번 시도했다. `BatchMode=yes`, `StrictHostKeyChecking=yes`, `ConnectTimeout=8`, `ConnectionAttempts=1`을 적용했으며 **TCP/22 연결 단계에서 `Operation timed out`, 종료 코드 255**가 발생했다. SSH 인증·PowerShell·GNS3 API에는 도달하지 않았다. 재시도, 설치, 서비스·방화벽·GNS3 프로젝트 변경은 하지 않았다.

이 결과만으로 전원, Tailscale, SSH 서비스, 접근 정책 중 원인을 확정할 수 없다. 실제 호스트 이름·주소·사용자 경로·원본 오류 전체는 공개하지 않는다.

| Capability | 당일 결과 | 연결 복구 후 확인할 근거 |
|---|---|---|
| SSH TCP 연결 | 시간 초과 | 연결·인증·명령 실행을 각각 확인 |
| GNS3 프로세스 / 버전 | UNKNOWN | 실행 프로세스와 API 버전 |
| GNS3 API / compute | UNKNOWN | 허용된 GET 응답과 compute 연결 상태 |
| 프로젝트 저장 루트 | UNKNOWN | 선택된 설정 필드와 디렉터리 존재 여부 |
| Wireshark / tshark | UNKNOWN | 실행 파일 존재와 버전 |
| Python | UNKNOWN | 실제 인터프리터 실행 및 버전 |
| Windows Tailscale / sshd | UNKNOWN | 로컬 서비스 상태와 관리 클라이언트 UI |
| 실제 토폴로지 / 캡처 | NOT_RUN | 격리 프로젝트의 CLI·링크 캡처·복구 기록 |

## 2. 사람이 Windows에서 확인할 순서

먼저 Windows 전원·로컬 로그인과 Tailscale UI의 연결 상태를 확인한다. 이 체크리스트는 서비스를 시작하거나 재설치하지 않는다. 조회 권한 오류가 나면 오류 종류만 기록하고 상태를 UNKNOWN으로 둔다.

### 도구 존재 확인

```powershell
'gns3.exe', 'gns3server.exe', 'wireshark.exe', 'tshark.exe',
'python.exe', 'py.exe', 'tailscale.exe' | ForEach-Object {
    [pscustomobject]@{
        Tool = $_
        FoundOnPath = [bool](Get-Command $_ -CommandType Application -ErrorAction SilentlyContinue)
    }
}
```

`False`는 PATH에서 찾지 못했다는 뜻이다. 미설치 판정은 아니다. 시작 메뉴·앱 설정에서 설치 위치를 로컬로 확인하고, 공개 결과에는 전체 경로를 넣지 않는다. Python의 Windows 앱 실행 별칭도 실제 인터프리터와 구별한다. 확인된 실행 파일에만 다음 버전 조회를 사용한다. 경로가 필요하면 로컬에서만 지정한다.

```powershell
python.exe --version
tshark.exe --version | Select-Object -First 1
tailscale.exe version | Select-Object -First 1
```

Python 별칭이 Store를 열면 설치를 진행하지 않고 미확인으로 기록한다. `tshark`는 인수 없이 실행하면 캡처를 시작할 수 있으므로 위 버전 인수를 생략하지 않는다. [TShark 공식 매뉴얼](https://www.wireshark.org/docs/man-pages/tshark)

### GNS3·SSH·Tailscale 상태 확인

```powershell
Get-Process -Name gns3, gns3server -ErrorAction SilentlyContinue |
    Select-Object ProcessName, Id
Get-Service -Name sshd, Tailscale -ErrorAction SilentlyContinue |
    Select-Object Name, Status, StartType
Get-NetTCPConnection -State Listen -LocalPort 22 -ErrorAction SilentlyContinue |
    Select-Object LocalPort, State
```

프로세스 이름은 설치 방식에 따라 다를 수 있다. 출력 없음은 실행 불가의 확정 근거가 아니다. `sshd`가 Running이고 리스너가 있어도 Mac에서의 인증·접근 허용까지 증명하지는 않는다. Tailscale 서비스 Running도 로그인·peer 연결 성공과 다르므로 로컬 UI에서 함께 확인한다. 전체 프로세스 명령줄, `ipconfig /all`, tailnet 전체 목록은 수집하지 않는다. [Microsoft TCP 조회](https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-nettcpconnection), [Tailscale Windows 서비스](https://tailscale.com/docs/reference/tailscaled)

### GNS3 설정과 로컬 API 확인

GNS3 설정 화면 또는 로컬 설정 파서에서 다음 필드만 확인한다. 설정 파일 전체를 출력하거나 SSH로 반출하지 않는다.

| 허용 필드 | 로컬 확인 | 공개 기록 |
|---|---|---|
| `port` | 현재 API 포트 | 확인 여부·표준 예시만 |
| `auth` | 인증 사용 여부 | enabled / disabled / unknown |
| `projects_path` | 저장 루트와 존재 여부 | configured / exists / unknown, 실제 경로 제외 |
| `host` | 루프백 바인딩 여부 | loopback / other / unknown, 주소 제외 |

`user`, `password`, token, Authorization 헤더, 전체 설정·로그는 허용 대상이 아니다. 필드 이름과 파일 위치는 실제 GNS3 버전에서 확인한다. 인증이 필요한 GET은 기존 승인된 자격 증명을 Windows 프로세스 메모리에서만 사용하고 결과를 allowlist로 축소한다.

아래는 **루프백에서 수신하는 GNS3 2.x와 포트를 로컬로 확인한 뒤** 사용하는 비인증 GET 예시다. `3080`은 문서상 기본 예시이며 당일 확인된 값이 아니다. 다른 바인딩이면 이 명령으로 서버 다운을 판정하거나 바인딩을 변경하지 않는다. [GNS3 버전·compute 조회 예시](https://gns3-server.readthedocs.io/en/stable/curl.html#server-version)

```powershell
$labApiPort = 3080 # 로컬 설정에서 확인한 값으로만 변경
$labApiUri = 'http://127.0.0.1:{0}/v2/version' -f $labApiPort
try {
    $labResponse = Invoke-WebRequest -Uri $labApiUri -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $labVersion = $null
    try { $labVersion = ($labResponse.Content | ConvertFrom-Json -ErrorAction Stop).version } catch {}
    [pscustomobject]@{ HttpStatus = [int]$labResponse.StatusCode; Version = $labVersion }
} catch {
    if ($_.Exception.Response) {
        [pscustomobject]@{ HttpStatus = [int]$_.Exception.Response.StatusCode; Version = $null }
    } else {
        'HTTP 응답 없음: 연결/시간 초과/로컬 설정을 확인하고 원인은 미확정으로 기록'
    }
}
```

| 응답 | 해석 / 다음 단계 |
|---|---|
| 200 + 예상 버전 필드 | 버전 조회 성공. project·compute·실습 성공은 별도 확인 |
| 401 | HTTP 응답자가 인증을 요구함. 자격 증명 오류로 단정하지 않으며 서버 정체·GNS3 준비 완료도 아직 미확인 |
| 403 | 요청 거부. 승인된 접근 범위·인증 방식 확인, 우회 금지 |
| 404 | API 버전·경로·선택 서버 불일치 가능성 확인 |
| 응답 없음 | 로컬 리스너·포트·바인딩·접근 가능성 미확정 |

버전과 인증 방식을 확인한 후 `/v2/projects`, `/v2/computes`를 GET으로 점검한다. 공개 보고는 프로젝트 개수와 연결된 compute 개수만 기록하며 원본 이름·ID·경로·주소를 내보내지 않는다. API 버전이 다르면 해당 버전 문서를 먼저 확인한다. [GNS3 Project GET 계약](https://gns3-server.readthedocs.io/en/stable/api/v2/controller/project.html)

## 3. 관리 경로와 실습 경로

계획된 관리 경로는 `Mac → Tailscale → 기존 Windows SSH → Windows localhost GNS3 API`다. Windows가 루프백에서 API를 수신하는 것을 확인한 뒤 SSH 내부 localhost GET 또는 SSH 포트 전달을 사용한다. 전달 포트도 Mac의 `127.0.0.1`에만 바인딩하고 strict host key 검사·timeout을 유지한다. 공개 문서에 실제 SSH 별칭·주소를 하드코딩하지 않는다.

GNS3가 현재 다른 주소에서만 수신하면 그 사실을 기록하고 별도 구성 검토로 넘긴다. 읽기 전용 점검 중 서버 바인딩, 방화벽, SSH 서비스나 tailnet 정책을 바꾸지 않는다. API를 인터넷에 노출하거나 실습망을 subnet route / exit node로 연결하지 않는다. 관리 접근 정책은 필요한 관리 장치·포트로 한정하는 설계다. [Tailscale grants](https://tailscale.com/docs/features/access-control/grants)

실습 데이터는 `PC1—SW1—R1—SW2—PC2`와 `SW1—PC3`의 내부 링크에서만 흐른다. 캡처 지점은 [Lab Plan](../lab-plans/ip-subnetting.md)의 PC1—SW1, SW1—R1, R1—SW2다. Tailscale·호스트 Wi-Fi·회사 NIC·외부 Cloud/NAT를 붙이거나 관리 인터페이스를 캡처하지 않는다. 원본은 로컬 보관하고 전송 전후 SHA-256을 비교한다. 공개용 복사본에만 비밀·개인정보 검토를 적용한다.

## 4. 자동화와 사람의 역할

| 단계 | 자동화 범위 | 사람의 확인 |
|---|---|---|
| 사전 점검 | SSH/API GET, 도구 버전, 선택된 설정, 시간·용량 | 이미지 사용 권한, 기존 프로젝트 보호, 외부망 미연결 |
| 실습 준비 | 승인된 별도 프로젝트 allowlist와 Plan 일치 확인 | 장비 기능 차이, 최초 부팅·콘솔·가상화 설정 |
| 정상·장애·복구 | 제한된 실행·캡처, expected/actual, rollback | 캡처 지점·장애 단독 적용·실제 복구 검토 |
| 결과 공개 | manifest·해시·링크 검사 | 원본/공개본 구분, 민감정보·설명 검토 |

사전 점검 실패로 실행을 시작하지 못한 시나리오는 `NOT_RUN`, 실행했지만 캡처 누락·관측 부족으로 결론을 못 내리면 `INCONCLUSIVE`다. 충분한 근거로 기대와 불일치하면 `FAIL`이다. 이번 SSH 시간 초과는 실습의 실패 관측이나 완료 건수로 집계하지 않는다. 실행 및 복구 설계는 [Runner 문서](../windows-lab-runner/README.md)를 따른다.
