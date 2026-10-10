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
npm run m4:emulator  # 4. 규칙 에뮬레이터 실행 — 전 기능 21개 (JDK 필요)
npm run m4b          # 4-B. 좋아요 한정 22개 × 규칙 4버전 + 집계
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
| 4 | 규칙 공격 차단율 / 정상 통과율 (전 기능 21개) | v1 100% / 55.6%<br>v2 75% / 100% | v3 **100% / 100%** | 에뮬레이터 실측 |
| 4-B | 좋아요 한정 차단율 / 통과율 (22개) | v1 100% / 14.3%<br>v2 46.7% / 100% | v3 86.7% / 100%<br>v4(제안) **100% / 100%** | 에뮬레이터 실측 |
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

### 4. 규칙 차단율 — `rules/`, `eval4.js` (에뮬레이터 실측 완료)

- `rules/rules.test.mjs`: 공격 12 + 정상 9 = **21개 시나리오**.
- 비교 3버전: `v1-7a3f09c`(courses.update 전면 차단) / `v2-naive-open`(반사실: `auth != null`만
  확인하도록 단순 개방했다고 가정) / `v3-final`(`623cc77` 최종).
- 실행 환경: OpenJDK 27(Homebrew) + firebase-tools Firestore 에뮬레이터(포트 8181,
  project `demo-runpin-rules`) + vitest 3.2.7 + @firebase/rules-unit-testing 5.0.2.
- vitest 통과/실패가 곧 차단/허용에 대응한다: 공격 테스트는 `assertFails`이므로 **통과 = 차단됨**,
  정상 테스트는 `assertSucceeds`이므로 **통과 = 허용됨**.

| 버전 | 공격 차단 | 정상 통과 | 성격 |
|---|---|---|---|
| v1 = `7a3f09c` | **12/12 (100%)** | **5/9 (55.6%)** | 안전하지만 기능 불가 |
| v2 = 반사실 단순 개방 | **9/12 (75%)** | **9/9 (100%)** | 기능은 되지만 조작 가능 |
| v3 = `623cc77` 최종 | **12/12 (100%)** | **9/9 (100%)** | 둘 다 충족 |

- v2에서 뚫린 3건: **A1**(likeCount 단독 +100) / **A2**(likeCount 단독 +1, likes 문서 없이) /
  **A5**(타인 코스 이름 수정)
- v1에서 막힌 정상 기능 4건: **L3·L4**(좋아요 추가·취소) / **L7**(본인 러닝기록 삭제) /
  **L8**(본인 프로필 사진 저장)
- 시나리오별 전체 결과: `result4-emulator.json`. 원본 vitest 출력은 `result-emulator-<버전>.json`
  (gitignore 대상, `npm run m4:emulator`로 재생성).
- `eval4.js`의 조건식 수동 평가표와 **에뮬레이터 실측 결과가 21/21 전부 일치**했다
  (차이 0건). 수동 평가는 판정 근거 줄 번호를 함께 담고 있어 해설용으로 남겨둔다.

실행:
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk && export PATH="$JAVA_HOME/bin:$PATH"
RULES=rules/v3-final.rules npx firebase-tools emulators:exec --only firestore \
  --project demo-runpin-rules "npx vitest run --reporter=basic"
```

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

---

## 4-B. 좋아요(courses.likeCount) 쓰기 권한에 한정한 측정 — `rules/likes.test.mjs`

좋아요 기능을 도입하면서 공개 컬렉션 `courses`의 `likeCount`에 쓰기를 열어야 했다.
"어떻게 열었는지"를 수치로 보이기 위해, 좋아요와 직접 관련된 시나리오만으로
**나쁜 시도 15개 + 정상 사용 7개 = 22개**를 만들어 규칙 4버전에 에뮬레이터로 돌렸다.

- 정상 시나리오의 쓰기는 `lib/likes.ts`의 `toggleLike`과 동일한 형태를 쓴다
  (`writeBatch` + `likes` 문서 `set`/`delete` + `courses.likeCount` `increment(±1)`).
- 각 테스트는 `beforeEach`에서 `clearFirestore()` 후 재시드하므로 서로 독립이다.
- 시드: `c-liked`(이미 10개), `c-zero`(0개), `c-a`/`c-b`(3개), `c-dup`(내가 이미 좋아요),
  `likes/{타인}_c-liked`(타인의 기록).

### 버전별 결과

| 버전 | 나쁜 시도 차단 | 정상 사용 통과 |
|---|---|---|
| v1-7a3f09c | 15/15 (100.0%) | 1/7 (14.3%) |
| v2-naive-open | 7/15 (46.7%) | 7/7 (100.0%) |
| v3-final | 13/15 (86.7%) | 7/7 (100.0%) |
| v4-proposed | 15/15 (100.0%) | 7/7 (100.0%) |

- **v1** = `7a3f09c` (좋아요 도입 직전, `courses.update: if false`)
- **v2** = 반사실 (`courses.update: if request.auth != null`로만 열었다고 가정)
- **v3** = `623cc77` 최종 (`likes` 문서 생성·삭제와 같은 batch에서 `likeCount` ±1만 허용)
- **v4** = 제안 (측정 중 발견한 빈틈을 막은 안. **실제 프로젝트에 적용하지 않았다** — `rules/v4-proposed.rules`)

### 시나리오 전체 목록

| # | 시나리오 | v1 차단 | v2 단순개방 | v3 최종 | v4 제안 |
|---|---|---|---|---|---|
| B1 | likeCount를 단독으로 +100 | 차단 | **뚫림** | 차단 | 차단 |
| B2 | likeCount를 단독으로 -100 | 차단 | **뚫림** | 차단 | 차단 |
| B3 | 좋아요 기록 없이 likeCount만 +1 | 차단 | **뚫림** | 차단 | 차단 |
| B4 | 좋아요 기록만 만들고 likeCount는 그대로 | 차단 | **뚫림** | **뚫림** | 차단 |
| B5 | 남의 uid로 좋아요 기록 생성 | 차단 | 차단 | 차단 | 차단 |
| B6 | 같은 코스에 중복 좋아요(이미 기록 있는 상태에서 또 +1) | 차단 | 차단 | 차단 | 차단 |
| B7 | 남의 좋아요 기록 삭제 | 차단 | 차단 | 차단 | 차단 |
| B8 | likeCount와 다른 필드(name)를 동시 수정 | 차단 | **뚫림** | 차단 | 차단 |
| B9 | 비로그인 상태로 좋아요 | 차단 | 차단 | 차단 | 차단 |
| B10 | 좋아요 0인 코스를 -1해 음수로 만들기 | 차단 | 차단 | 차단 | 차단 |
| B11 | 기록은 삭제하면서 likeCount는 +1 (방향 불일치) | 차단 | **뚫림** | 차단 | 차단 |
| B12 | 내 좋아요 기록을 수정해 다른 코스로 바꾸기 | 차단 | 차단 | 차단 | 차단 |
| B13 | 남의 좋아요 기록 읽기 | 차단 | 차단 | 차단 | 차단 |
| B14 | likeCount를 정수가 아닌 값으로 수정 | 차단 | **뚫림** | 차단 | 차단 |
| B15 | 기록만 만든 뒤 취소로 카운트만 깎기 (B4 연쇄) | 차단 | **뚫림** | **뚫림** | 차단 |
| N1 | 좋아요 누르기 | 차단됨 | 통과 | 통과 | 통과 |
| N2 | 좋아요 취소 | 차단됨 | 통과 | 통과 | 통과 |
| N3 | 취소한 뒤 다시 누르기 | 차단됨 | 통과 | 통과 | 통과 |
| N4 | 서로 다른 두 코스에 각각 좋아요 | 차단됨 | 통과 | 통과 | 통과 |
| N5 | 비로그인 상태로 코스의 좋아요 수 조회 | 통과 | 통과 | 통과 | 통과 |
| N6 | 내 좋아요 목록 구독 쿼리 (where uid == 나) | 차단됨 | 통과 | 통과 | 통과 |
| N7 | 타인이 이미 10개 받은 코스에 내가 좋아요 | 차단됨 | 통과 | 통과 | 통과 |

### v2(로그인만 확인하고 개방)에서 뚫린 8건과 그 결과

| # | 시나리오 | 뚫리면 생기는 일 |
|---|---|---|
| B1 | likeCount 단독 +100 | 아무 코스나 임의 수치로 부풀려 랭킹 순위를 조작할 수 있다 |
| B2 | likeCount 단독 −100 | 타인 코스의 카운트를 깎아 랭킹에서 밀어낼 수 있다 |
| B3 | 기록 없이 likeCount만 +1 | 좋아요 기록이 안 남으므로 중복 방지도 걸리지 않아 한 사람이 무한히 올릴 수 있다 |
| B4 | 좋아요 기록만 생성 | 기록과 카운트가 어긋난다 — 하트는 켜졌는데 공개 수치는 그대로 |
| B8 | likeCount + 다른 필드 동시 수정 | 좋아요 요청에 코스 이름 변조를 끼워 넣을 수 있다 |
| B11 | 기록 삭제 + likeCount +1 | 증감 방향이 어긋나, 좋아요를 취소하면서 카운트가 오른다 |
| B14 | likeCount를 10.5로 수정 | 정수가 아닌 값이 들어가 정렬·집계(`byLikeCountDesc`, 등급 보너스)가 깨진다 |
| B15 | B4 뒤 취소로 카운트만 깎기 | 올린 적 없는 카운트를 반복 감소시킬 수 있다 |

### 측정 중 발견한 최종 규칙(v3)의 빈틈 — B4 / B15

최종 규칙은 **`courses` 쪽만 `likes`와 결박**돼 있었다. "좋아요 기록 없이 카운트를 바꿀 수 없다"는
방향은 막혀 있지만, 반대 방향 — **"카운트를 안 바꾸고 기록만 만드는 것"** — 은 열려 있었다
(`likes.create` 조건에 `courses` 관련 검사가 없음).

이 빈틈은 단독으로는 불일치만 만들지만, 연쇄하면 카운트를 깎을 수 있다:
① 기록만 생성(카운트 그대로) → ② 취소 batch(기록 삭제 + −1)는 감소 분기 조건
(`기록이 있었고 사라졌으며 −1`)을 모두 만족해 통과. `rules/likes-gap.test.mjs`로
실측한 결과 **좋아요를 한 번도 올리지 않은 공격자가 `likeCount`를 10 → 9 → 8 → 7로
3회 감소**시켰다(`likeCount > 0` 가드 때문에 0까지만 가능).

제안한 수정(v4)은 `likes.create`/`likes.delete`에 `getAfter()`를 추가해 같은 batch에서
`courses.likeCount`가 정확히 +1 / −1 될 때만 허용하도록 **양방향으로 묶는다**.
v4에서 같은 연쇄 공격은 1단계부터 `PERMISSION_DENIED`로 막히고, 나쁜 시도 15/15 차단 +
정상 사용 7/7 통과를 동시에 달성했다.

### 실행

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk && export PATH="$JAVA_HOME/bin:$PATH"
SUITE=rules/likes.test.mjs RULES=rules/v3-final.rules \
  npx firebase-tools emulators:exec --only firestore --project demo-runpin-likes \
  "npx vitest run --reporter=basic"
# 4버전 집계: 위를 v1-7a3f09c / v2-naive-open / v3-final / v4-proposed 로 반복한 뒤
node agg-likes.js
# 빈틈 재현: SUITE=rules/likes-gap.test.mjs (v3에서 통과, v4에서 차단)
```

---

---

## 7. 문제 발생 → 원인 추적 → 해결 사례의 추가 측정

### A. 랭킹 숫자 불일치 — `measure-ranking.js`

커밋 `35b8cb7` 시점 데이터로, 정렬 기준(`mockRankingsByPeriod[].likeCount`)과
표시값(`mockCourses[].likeCount`)의 괴리를 센다.

| 지표 | 값 |
|---|---|
| 랭킹 엔트리 총수 | 30개 (monthly/yearly/all 각 10개) |
| 정렬 기준과 표시값이 다른 엔트리 | **30개 / 30개 (100%)** |
| 최대 괴리 | 전체 1위 몽마르뜨공원 — 정렬 1000 vs 표시 11 (차이 989) |
| 인접 순위 쌍 중 "앞 순위가 더 작은 숫자로 표시" | **15/27쌍 (55.6%)** |
| `a319af3` 이후 | 정렬·표시가 `course.likeCount` 하나뿐 → 불일치 가능 엔트리 **0개** |

커밋 `0adeafc` 메시지의 "몽마르뜨공원이 월간 1위인데 표시 숫자는 11 vs 정렬 기준 200"이
측정에서 그대로 재현됐다(monthly 1위: entry 200 / course 11).

### B. 시연 데이터 적재 성공률 — `measure-seed.js`

적재 대상(실측): 파클로즈 소유 mock 코스 6개 = 한강 반포지구 ×5 + 보라매공원 ×1.
코스마다 `courses` 1건 + `runLogs` 1건 → 완전 적재 시 문서 12개.
"1회차 3번째 항목에서 1회 실패 후 재로그인 2회"를 가정해 판정 로직 4버전을 비교한다.
(※ 실패 지점은 모델링한 가정이고, 판정 로직은 저장소 실제 로직이다.)

| 버전 | 코스 | 러닝기록 | 문서 | 적재 성공률 |
|---|---|---|---|---|
| v0 `ff82ecd` 전체 스킵 게이트 + 항목별 try/catch 없음 | 2/6 | 2/6 | 4/12 | **33.3%** |
| v1 `563d0fe` 이름 Set 판정 + try/catch 없음 | 3/6 | 3/6 | 6/12 | **50.0%** |
| v1b `542a350` 이름 Set 판정 + 항목별 try/catch | 5/6 | 5/6 | 10/12 | **83.3%** |
| v2 `3cf081f` 이름별 개수 Map 판정 + try/catch | 6/6 | 6/6 | 12/12 | **100%** |

실패가 전혀 없으면 4버전 모두 12/12다 — 즉 차이는 **중간 실패 이후의 복구력**에서만 난다.

### C. `.env` 인코딩 가드 동작 검증 — `measure-env.js`

`scripts/check-env-encoding.js`를 샌드박스로 복사해 **가짜 `.env`**(키 이름만 실제, 값은 전부
`FAKE_*`)에만 적용한다. 실제 `.env`는 읽지도 쓰지도 않는다(CLAUDE.md 6번).

| 인코딩 | 가드 전 파싱 | 가드 후 파싱 | 값 손실 | 가드 동작 |
|---|---|---|---|---|
| UTF-16LE + BOM | 0/6 | **6/6** | 0 | 복구 수행 |
| UTF-16BE + BOM | 0/6 | **0/6** | 6 | **스크립트 크래시** |
| UTF-8 + BOM | 5/6 | **6/6** | 0 | 복구 수행 |
| UTF-8 (정상) | 6/6 | 6/6 | 0 | 변경 없음 (불필요하게 건드리지 않음) |

깨진 인코딩 3종 중 값 손실 없이 복구: **2/3 (67%)**.

**[측정으로 발견한 결함]** UTF-16BE 파일에서 가드가 `TypeError: Unknown encoding: utf16be`로
죽는다. `scripts/check-env-encoding.js:21`이 `buf.toString('utf16be')`를 호출하는데 Node는
`utf16le`/`ucs2`만 지원하고 `utf16be`라는 인코딩 이름이 없다. 이 스크립트는 `prestart` 훅이라
크래시하면 `npm start` 자체가 멈춘다. 실무에서 UTF-16BE 저장은 드물어 지금까지 드러나지
않았을 뿐이다. **master에는 수정하지 않았다**(제안: 2바이트씩 swap 후 `utf16le`로 디코딩).

### D. 랭킹 상세보기 좋아요 수 0 고정 — `measure-likehook.js`

`d3ed429` 전/후의 `useCourseLike` 훅만 교체하고 같은 트리를 React 19로 렌더해,
모달에 mock 코스 5개를 차례로 띄웠을 때 표시값이 실제 `likeCount`와 맞는지 센다.

| 버전 | 표시값이 틀린 코스 |
|---|---|
| 수정 전 (`useState` 초기값만) | **5/5 (100%)** — 전부 0으로 표시 |
| 수정 후 (`course.id` 변경 시 재동기화) | **0/5 (0%)** |

최초 마운트가 `course = null`이라 `useState` 초기값이 0으로 굳고, 모달이 언마운트되지 않는
재사용 구조라 이후 어떤 코스를 열어도 0이 유지된다.

### E. 규칙 미배포 — 배포 누락이 가능했던 커밋 수

| 구간 | `firestore.rules`를 바꾼 커밋 | 그중 배포를 커밋에 적은 것 |
|---|---|---|
| 규칙 신설(`44d8cda`) 이전 | 5건 (`e6e1f96`,`7a3f09c`,`536e685`,`9cf8bdf`,`29a0c09`) | 2건 (그중 `e6e1f96`은 "콘솔에서 수동 진행"이라는 단서) |
| 이후 | 1건 (`623cc77`) | 1건 ("runpin-f47c0에 배포 완료") |

배포 언급이 전혀 없는 3건 중 마지막이 `29a0c09`이고, 그 10분 뒤 권한 오류가 발생했다.
"차단/허용" 측면의 수치는 위 4-B 섹션(좋아요 한정 측정) 참고.

---

## 측정하지 못한 항목

| 항목 | 이유 |
|---|---|
| 72개 코스 전체 원본 좌표 | 원본 미보존 + waypoint 정의 13개만 잔존 |
| 실기기 RN 렌더 시간 | 실기기 프로파일링 기록 없음, 이 환경에서 RN 렌더러 실행 불가 |
| 스와이프 제스처 수치 | 프레임 타이밍 의존이라 Node 하네스 재현 시 조건이 불공정. 당시 실기기 로그는 `dcd8d91` 주석 참고 |
| 런타임 permission-denied 로그 집계 | 트랜스크립트 삭제됨 |
