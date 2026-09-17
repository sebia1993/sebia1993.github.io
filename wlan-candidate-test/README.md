# 무선 네트워크 운영자 신입 사전 테스트

GitHub Pages에서 제공하는 응시 화면입니다.

- 전 문항 주관식 4문항
- 문항별 최대 600자
- 문항별 첫 입력 시각 기록
- 문항별 붙여넣기 횟수 기록
- 페이지 최초 진입 ~ 최종 제출까지 총 작성시간 기록
- 이메일 또는 응시번호 기준 서버측 중복 제출 차단
- 제출 후 수정 불가
- PC / 태블릿 / 모바일 대응
- 10분 타이머 및 자동 제출 없음

## 구조

GitHub Pages는 정적 호스팅이므로 개인정보가 포함된 응답을 저장하거나 이메일을 직접 발송하지 않습니다.
응시 화면은 Google Apps Script 웹앱 백엔드에 POST하고, 백엔드는 Google Sheet 저장과 담당자 이메일 발송을 처리합니다.

## 백엔드 연결

`index.html`의 `BACKEND_URL` 값을 배포된 Google Apps Script Web App의 `/exec` URL로 교체해야 제출이 활성화됩니다.

응시 페이지: `https://sebia1993.github.io/wlan-candidate-test/`
