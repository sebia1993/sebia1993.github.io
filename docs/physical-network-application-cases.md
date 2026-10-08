# 물리 네트워크 — 장소 중심 적용 사례 근거

확인일: 2026-10-08

범위: `labs/physical-network.html#utp-category-guide`의 적용환경 행과 선택적 실제 사례 설명. 기존 Cat5e/Cat6 성능·거리·구조, 광 연결 설명, 실습 모델과 로드맵은 변경하지 않는다.

## 사례별 출처 맵

| ID | 장소 / 자료 | 확인한 사실 | 시점과 한계 |
|---|---|---|---|
| PHY-PLACE-01 | [ICC: 미줄라시 경찰 부서 건물](https://icc.com/success-stories/city-of-missoula-awards-project-to-elite-installer/) | 수사 인력·증거 보관 건물 개보수에 Cat6 배선, 약 170개 연결 지점. 업무 공간 접속부와 통신실 패치패널에 Cat6 적용 | 미국. 게시 2019-08-16. 별도 준공일과 현재 상태는 확인하지 않음 |
| PHY-PLACE-02 | [ICC: 2011년 사례 모음](https://icc.com/success-stories/2011-success-stories/)의 Clear Creek Independent School District 항목 | 텍사스 교육구 네트워크를 Cat5e 통합 배선으로 개선 | 미국. 해당 항목에 2011-06으로 기록. 개별 학교·교실·장비·링크 속도는 미공개 |
| PHY-PLACE-03 | [ICC: 의료기관 본부의 Cat5e/Cat6 혼합 구축](https://icc.com/success-stories/health-care-facility-headquarters-installs-cat5e-and-cat6-structured-cabling-system/) | 전화·데이터 통신 증설에 Cat5e와 Cat6 케이블·잭·패치패널 사용 | 미국 뉴저지. 게시 2016-02-01. 기관명과 각 등급의 상세 사용 구간은 미공개. 본문 Category 5e 뒤의 CAT5 표기는 제목과 풀어 쓴 등급에 맞춰 Cat5e로 해석 |
| PHY-PLACE-04 | [ICS: Expeditors Structured Cabling System](https://www.ics-panduit.com/expeditors-structured-cabling-system/) | 히스로공항 화물 구역 사무실·창고의 Cat6 연결 지점 4,644개, 주요 통신실 사이 광케이블 연결 | 영국. 공사 완료 2011-03, 소개 글 게시 2022-09-13. 게시일을 준공일로 사용하지 않음 |

## 학습 문구의 경계

- 장소는 사례를 떠올리게 하는 출발점이지 Cat5e/Cat6 선택 규칙이 아니다.
- 국내 관공서의 공통 규격, 최신 신축 권장안 또는 현재 설치 상태로 일반화하지 않는다.
- 케이블 등급을 확인했다고 해서 차폐 구조·실제 링크 속도·실측 거리까지 확인한 것으로 쓰지 않는다.
- 위 해외 사례는 사용자의 실제 사업장 정보가 아니다. 외부 사진이나 기관 로고를 가져오지 않는다.
- 긴 기관명·연도·수량·출처는 기본적으로 접힌 근거 영역에 두고, 본문 비교표는 장소 중심으로 유지한다.
- 단말이 연결되는 배선과 통신실 간 연결 매체를 구분한다. 소개 글에 없는 상세 토폴로지는 만들지 않는다.

## 검증 분류

이번 추가 내용은 공개 구축 사례의 문헌 검토다. 새 프로토콜 동작 Claim이나 네트워크 모델은 추가하지 않았다.

- 자료 검토: 위 원문 내용과 사례의 범위·시점을 대조.
- 재현 가능한 콘텐츠 회귀검사: `tests/physical-network-applications.test.mjs`.
- 브라우저 검증: 360×800, 768×1024, 1366×768, 1920×1080에서 접힘/펼침, 가로 넘침, 키보드 조작, 학습↔실습 이동 검사. 360px에서 200% 글자 확대도 검사.
- 실제 네트워크 장비 / PNETLab 실행: NOT_RUN. 이 변경에 불필요하며 수행했다고 주장하지 않는다.
- 배포 및 공개 URL 검증 상태는 커밋의 GitHub Actions 결과와 별도의 실제 확인 결과로 보고한다.
