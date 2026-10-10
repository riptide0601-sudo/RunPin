# 측정 기록 (measurements)

자기소개서·면접에서 "개선 전후 수치"를 설명하기 위해 실제로 측정한 스크립트와 결과입니다.
**이 브랜치(`measurements`)에만 존재하며 앱 빌드/실행과 무관합니다. `master`에는 포함되지 않습니다.**

측정일: 2026-10-10 / 환경: macOS(darwin 25.4.0), Node 24.18.0

## 원칙

- 저장소 알고리즘을 **재구현하지 않는다.** `make-pipeline.js`가 `scripts/fetch-routes.js`에서
  `main()` 자동 실행부만 떼어낸 사본을 만들고, 그 안의 `samplePoints`/`douglasPeucker`를 그대로 호출한다.
  (`main()`을 제거하므로 `data/mock.ts`에 쓰기가 일어나지 않는다.)
- 개선 전/후는 **해당 커밋 트리에서 직접 꺼내** 비교한다 (`git show <commit>:<path>`).
- 재현 가능한 조건(반복 횟수, 입력값, 판정 기준)을 스크립트에 주석으로 남긴다.

## 실행

```bash
npm install          # 측정용 devDependencies (앱과 별개)
npm run m1           # 1. 좌표 단순화 (OSRM 네트워크 필요)
npm run m1:verify    # 1-검증. 재현성 3회 반복 + mock.ts 실제 반영값 대조
npm run m2           # 2-A. 재렌더 수 분석 모델
npm run m2b          # 2-B. React 19 실렌더 벤치마크 (재렌더 수 + 커밋 시간)
npm run m3           # 3. 지도 payload 재주입 횟수
npm run m4           # 4. 규칙 조건식 수동 평가표
npm run m4:emulator  # 4. 규칙 에뮬레이터 실행 (JDK 필요)
npm run m6           # 6. permission-denied 기록 집계
```

## 결과 요약

| # | 항목 | 개선 전 | 개선 후 | 변화율 |
|---|---|---|---|---|
| 1-a | 좌표 포인트 수 (13코스+궤적1) | 1,595 pt | 461 pt | −71.1% |
| 1-b | 경로 데이터 크기 | 83.73 KB | 24.26 KB | −71.0% |
| 1-c | 경로 거리 오차 | — | 평균 0.132% / 최대 0.874% | — |
| 2-a | 토글 1회 재렌더 컴포넌트 수 | 37개 | 1개 | −97.3% |
| 2-b | 토글 커밋 시간 (중앙값, 50회) | 0.588 ms | 0.027 ms | −95.4% |
| 3 | 검색 10글자 입력 시 WebView 재주입 | 10회 | 0회 | −100% |
| 5-a | 인증 게이트 코드 줄 수 | 89줄 | 22줄 | −75.3% |
| 5-b | 인증 게이트 관련 파일 수 | 9개 | 1개 | −88.9% |
| 6 | 규칙 미배포로 인한 permission-denied | 3건(2026-08-16) | 0건(기록 범위 내) | — |

### 1. 좌표 단순화 — `measure1.js`, `agg1.js`, `verify1.js`

- 대상: `COURSE_WAYPOINTS`에 waypoint가 남아 있는 14개(코스 13 + `my-running-route`).
  **72개 전체는 측정 불가** — 원본 좌표가 저장소에 없고, 나머지 코스는 "편도 OSRM + 역순 미러링"으로
  `mock.ts`에 직접 반영돼 waypoint 정의가 제거됐다.
- 원본: 저장소와 동일한 OSRM 질의(`/route/v1/foot/...?overview=full&geometries=geojson&steps=true`),
  요청 간 300ms 지연(저장소 `REQUEST_DELAY_MS`와 동일).
- 크기: 실제 `mock.ts`에 실리는 리터럴 텍스트(`formatCoordinatesBlock()`) 바이트 기준.
- 거리 오차: haversine 누적 거리 비교. 최대 오차는 course-7의 −0.874%(4.8571km → 4.8147km).
- 검증 ①: course-7/9/14 각 3회 반복 → `215→32`, `214→33`, `101→36` 3회 모두 동일.
- 검증 ②: 재측정 결과 vs 현재 `mock.ts` 좌표 수 → 13개 중 10개 일치.
  불일치 3건(course-7 32/33, course-12 30/32, course-16 27/26)은 OSRM 도로 데이터 갱신 또는
  fetch 후 수동 조정이 섞인 것으로 보이나 **확정 근거는 없음.**
- 참고: course-9의 `214→33`은 커밋 `7a571b9` 메시지의 "원본(214pt)·샘플링(33pt)"과,
  course-14의 `101→36`은 같은 파일 주석의 "원본(101개)·샘플링(36개)"과 일치한다.

### 2. 구독 세분화 (`17439ca`) — `measure2.js`, `measure2b.js`

- 트리는 `data/mock.ts` 실측값: 그룹 20개(대표 카드 20) / 멤버 있는 그룹 17개 / 멤버 카드 52개.
  캐러셀 멤버는 접힌 상태에서도 항상 마운트되므로 카드 컴포넌트 72개가 동시 마운트된다.
- 재렌더 규칙: ① Context value 참조 변경 시 소비 컴포넌트는 `memo` 무관 재렌더
  ② `memo`는 props 변경 시만 ③ `useSyncExternalStore`는 구독 key 변경 시만.
- **⚠️ 0.588ms → 0.027ms는 실기기 React Native 값이 아니다.** Node + react-test-renderer
  패턴 벤치마크다. 실기기 프로파일링 기록은 저장소에 없다.
- **⚠️ `17439ca`가 세분화한 것은 "저장(북마크)" 상태다.** 좋아요에 같은 패턴이 적용된 것은
  3주 뒤 `e0a7b1d`(`LikeStore`)다.

### 3. 지도 payload 안정화 (`17cb2d3`) — `measure3.js`

- `components/map/LeafletMap.tsx`의 payload `useMemo` 실제 의존성 9개를 그대로 쓰는 하네스에
  부모의 prop 생성 코드만 before/after로 교체해, 10회 재렌더(검색어 10글자) 시 payload 참조
  변경 횟수를 센다. payload 참조 변경 → `sendData` → `useEffect` → `injectJavaScript` 1회.
- before는 `center`/`fitBoundsPadding`/`markers` 3개가 매 렌더 새 참조, after는 3개 모두 안정.

### 4. 규칙 차단율 — `rules/`, `eval4.js`

- `rules/rules.test.mjs`: 공격 12 + 정상 9 = **21개 시나리오** (에뮬레이터 실행용).
- 비교 대상 3버전: `v1-7a3f09c`(courses.update 전면 차단) / `v2-naive-open`(반사실: `auth != null`만
  확인하도록 단순 개방했다고 가정) / `v3-final`(`623cc77` 최종).
- `eval4.js`는 에뮬레이터 없이 조건식을 추적한 수동 평가표이며, 판정 근거 줄 번호를 함께 기록한다.

### 5. 인증 게이트 통합 (`fa48a28` → `29709ed`)

```bash
git show fa48a28:lib/useRequireAuth.tsx | wc -l            # 63
git grep -h 'requireAuth\|useRequireAuth' fa48a28 -- app components lib | wc -l   # 30 (파일 내부 4 포함)
git grep -l 'AuthGate\|requireAuth' 29709ed -- app components lib | wc -l         # 1
git show 29709ed:app/_layout.tsx | awk '/^function AuthGate/,/^}/' | wc -l        # 20
```
- before: 전용 모듈 63줄 + 8개 파일 호출부 26줄 = **89줄 / 9개 파일**
- after: `AuthGate` 블록 20줄 + JSX 래핑 2줄 = **22줄 / 1개 파일**
- **⚠️** `useRequireAuth`는 `e0a7b1d`에서 좋아요 로그인 유도용으로 재도입된다.
  "액션 게이트를 영구히 없앴다"가 아니라 "진입 통제를 라우트 1곳으로 통합했다"가 정확하다.

### 6. permission-denied 집계 — `measure6.js`

- 이전: **3건**(2026-08-16) — `44d8cda` 커밋 본문과 `CLAUDE.md` 5번 항목에 기록.
- 이후: **0건** — 이후 커밋·문서·주석에 규칙 미배포로 인한 발생 기록 없음.
- **⚠️ 한계**: 교차검증용 Claude Code 트랜스크립트가 2026-10-09 자동 정리로 삭제돼
  런타임 로그 기반 집계가 불가능하다(`measure6.js` 실행 결과 0건은 "기록 소실"을 뜻한다).
  "이후 0건"은 기록이 없다는 뜻이며 실제 0회의 증명은 아니다.
- 성격이 다른 유사 사례: `e76c278` 주석의 "두 차례 발생"은 복합 인덱스 누락으로 쿼리가 조용히
  빈 결과를 반환한 건으로, 규칙 미배포와 원인이 다르다. 합산하지 말 것.

## 측정하지 못한 항목

| 항목 | 이유 |
|---|---|
| 72개 코스 전체 원본 좌표 | 원본 미보존 + waypoint 정의 13개만 잔존 |
| 실기기 RN 렌더 시간 | 실기기 프로파일링 기록 없음, 이 환경에서 RN 렌더러 실행 불가 |
| 스와이프 제스처 수치 | 프레임 타이밍 의존이라 Node 하네스 재현 시 조건이 불공정. 당시 실기기 로그는 `dcd8d91` 주석 참고 |
| 런타임 permission-denied 로그 집계 | 트랜스크립트 삭제됨 |
