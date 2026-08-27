# RunPin

GPS 기반 러닝 코스 추천 & 근거리 러너 매칭 앱. 자세한 기획 배경은 [PLAN.md](./PLAN.md) 참고.

> **현재 상태:** 프론트엔드(UI/인터랙션) 중심 프로토타입 + Firebase 백엔드 일부 연동.
> 인증(로그인/회원가입), 코스 업로드, 러닝 기록, 좋아요, 프로필 사진은 실제 Firebase(Auth +
> Firestore)에 붙어 있고, 매칭·저장한 코스·구독은 아직 목업/로컬 state다. GPS 실시간 추적도
> 아직 없다. 자세한 내용은 아래 "현재 한계" 참고.

## 기술 스택

- **플랫폼:** Expo (React Native 0.81 / React 19) + TypeScript (strict)
- **라우팅:** Expo Router (파일 기반 라우팅)
- **애니메이션/제스처:** react-native-reanimated 4, react-native-worklets, react-native-gesture-handler
  (일부 라이브러리 내부 버그를 `patch-package`로 패치해서 사용 중 — `patches/` 참고)
- **지도:** WebView + Leaflet (`components/map/leafletHtml.ts`에 HTML/JS 인라인 주입).
  `react-native-maps`로 전환을 시도했다가 iOS 커스터마이징 한계로 롤백한 이력이 있음 — 재전환 논의 전 사용자 확인 필요.
- **백엔드/인증:** Firebase (Auth + Cloud Firestore) — `lib/firebase.ts`에서 `auth`/`db` 두 개를
  export하고, 아래 표의 컬렉션들이 실제로 연동돼 있다. 보안 규칙은 `firestore.rules`, 인덱스는
  `firestore.indexes.json`(프로젝트 `runpin-f47c0`). Realtime Database와 Storage는 쓰지 않는다
  (Storage가 Blaze 플랜 전용이라 프로필 사진은 Firestore에 base64로 저장하는 임시방편 —
  `CLAUDE.md` 11번 체크리스트 참고).

### Firestore 컬렉션

| 컬렉션 | 용도 | 접근 코드 |
|---|---|---|
| `usernames` | 닉네임 선점 (문서ID = 닉네임). 문서 생성의 원자성으로 동시 가입 중복을 서버에서 막는다 | `lib/nickname.ts` |
| `courses` | 유저가 업로드한 코스 카탈로그 (공개 읽기). `likeCount` 포함 | `lib/courses.ts` |
| `likes` | 좋아요 (문서ID = `uid_courseId`). `courses.likeCount` ±1 갱신과 batch로 묶임 | `lib/likes.ts` |
| `runLogs` | 러닝 기록 (본인만 읽기/쓰기) | `lib/runLogs.ts` |
| `users` | 프로필 사진 `photoBase64` (문서ID = uid) | `lib/userProfile.ts` |

전체 ERD(아직 없는 계획 컬렉션 포함)는 [docs/ERD.md](./docs/ERD.md) 참고.

## 완성된 기능 (화면 기준)

| 화면 | 경로 | 상태 |
|---|---|---|
| 로그인/회원가입 | `app/auth/index.tsx` | Firebase Auth 연동 완료. 로그인/회원가입/비밀번호 재설정, 닉네임 중복 검사, 뒤로가기로 빠져나갈 수 없는 강제 로그인 게이트 |
| 홈 (코스 추천) | `app/(tabs)/index.tsx` | 지도 위 코스 표시, 거리순/인기순 정렬, 초성 검색, 동일 코스 그룹 캐러셀 |
| 커뮤니티 (러너 매칭) | `app/(tabs)/community.tsx` | 지도 위 러너 목업 표시, 매칭 제안/수락/거절 UI, 러닝 시작~종료 플로우, 종료 후 코스 저장 제안 |
| 랭킹 | `app/(tabs)/ranking.tsx` | 일간/월간/연간/전체 탭, 코스 경로 모달 |
| 마이 (프로필) | `app/(tabs)/profile.tsx` | 등급 배지, 통계, 구독 배너, 메뉴 |
| 러닝 기록 목록/상세 | `app/run-log/` | 기록 목록, 페이스·심박수·고도 차트, 코스 업로드 |
| 저장한 코스 | `app/saved-courses/index.tsx` | 스와이프 삭제, 삭제 후 카드 재정렬 애니메이션 (제스처 경쟁·리렌더 관련 버그를 여러 차례 수정해온 화면 — `git log app/saved-courses` 참고) |
| 구독/알림/개인정보/고객센터 | `app/subscription/`, `app/notifications/`, `app/privacy/`, `app/support/` | 정적 화면 위주, 인터랙션 완료 |

핵심 사용자 플로우(로그인 → 홈에서 코스 탐색 → 커뮤니티에서 매칭 → 러닝 종료 후 코스 업로드/저장
→ 저장한 코스/기록 확인)는 전부 동작한다. 이 중 로그인·코스 업로드·러닝 기록·좋아요는 실제 Firestore에
저장되고, 매칭과 저장한 코스는 목업 기준으로 동작한다.

## 프로젝트 구조

```
app/                    화면 라우팅 (Expo Router)
  (tabs)/               하단 탭: 홈 / 커뮤니티 / 랭킹 / 마이
  auth/                 로그인 · 회원가입 (강제 로그인 게이트)
  run-log/              러닝 기록 목록 · 상세
  saved-courses/        저장한 코스
  subscription/ notifications/ privacy/ support/   부가 화면
components/
  home/ community/ ranking/ profile/    화면별 전용 컴포넌트
  map/                  Leaflet WebView 지도 (leafletHtml.ts는 WebView에 주입되는 HTML/JS 문자열)
  charts/               러닝 기록용 라인 차트
  ui/                   공용 UI (모달, 배지, 필, 카드 등)
lib/                    상태 관리(appData), 매칭/등급/포맷 로직
  firebase.ts           Firebase 초기화 (auth, db만 export)
  auth.tsx nickname.ts  인증 · 닉네임 선점
  courses.ts likes.ts runLogs.ts userProfile.ts   Firestore 접근 계층
data/mock.ts            코스/러너/기록 목업 데이터 (실제 도로 좌표 기반)
types/                  공용 타입 정의
constants/               색상 등 상수
patches/                 서드파티 라이브러리 버그 패치 (patch-package)
scripts/                 .env 인코딩 검사 등 유틸
docs/ERD.md              Firestore 완성형 ERD (구현됨/mock/계획만 있음 구분)
firestore.rules          Firestore 보안 규칙
firestore.indexes.json   Firestore 복합 인덱스
```

> `firestore.rules` / `firestore.indexes.json`을 수정했다면 커밋 전에 반드시
> `npx firebase-tools deploy --only firestore:rules,firestore:indexes`로 배포까지 마친다
> (`CLAUDE.md` 5번).

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 Firebase 프로젝트 설정값을 채운다. 로그인·코스 업로드·러닝
기록 등이 실제로 이 값을 써서 Firebase에 붙으므로, 값이 없으면 앱이 정상 동작하지 않는다.

> `.env`는 반드시 **UTF-8(BOM 없음)** 으로 저장해야 한다. UTF-16으로 저장되면 dotenv가 값을
> 못 읽어 `auth/invalid-api-key` 같은 엉뚱한 에러로 이어진다. `npm start` 전에
> `scripts/check-env-encoding.js`가 자동으로 검사·복구한다 (`CLAUDE.md` 10번 참고).

```bash
cp .env.example .env
```

### 3. 개발 서버 실행

```bash
npx expo start
```

터미널에 뜨는 QR코드를 Expo Go 앱으로 스캔하거나, `a`(Android 에뮬레이터) / `i`(iOS 시뮬레이터) / `w`(웹) 키로 실행한다.

> WebView 지도, Modal 등 일부 컴포넌트는 Fast Refresh로 변경이 반영되지 않는다. 수정 후에는
> 앱을 완전히 재시작(reload)해서 확인할 것.

## 코드 품질

```bash
npm run lint     # ESLint 검사
npm run format   # Prettier 포맷팅
npx tsc --noEmit # 타입 체크
```

## 현재 한계 (실제 서비스 전환 시 필요한 것)

- **코스 목록은 목업 + 실제 데이터 혼합.** 홈 화면은 `data/mock.ts`의 검증된 코스 뒤에 Firestore
  `courses`를 이어붙여 보여준다 — Firestore가 비어 있어도 화면이 채워져 보이게 하기 위한 의도된
  구성이다 (`lib/appData.tsx`). 반면 러닝 기록처럼 "내 것"인 데이터는 목업과 섞지 않는다
  (`CLAUDE.md` 12번 판단 기준 참고).
- **GPS/위치 추적 없음.** 실제 위치 권한 요청이나 실시간 좌표 수집 로직이 없다 (`expo-location` 미설치).
  "내 위치"와 러닝 궤적은 모두 고정 목업 좌표.
- **매칭·저장한 코스·구독은 아직 목업/로컬 state.** 커뮤니티 화면의 러너 점(`mockRunnerDots`),
  제안 보내기/수락/거절, 저장한 코스(`SavedCourseStore`), 구독 상태가 전부 인메모리라 앱을
  재시작하거나 다른 기기·계정으로 옮기면 유지되지 않는다.
- **지오펜싱/실시간 매칭은 시뮬레이션.** 위 항목의 연장선으로, 실시간 위치 기반 매칭·알림이 없다.
  실시간 위치를 어떤 저장소로 다룰지는 [docs/ERD.md](./docs/ERD.md)의 `liveLocations` 항목 참고.
- **Firestore 쿼리 실패가 UI에 안 드러남.** 인덱스 누락 등으로 쿼리가 실패해도 콘솔에만 로그되고
  화면에는 "데이터 없음"과 구분되지 않는다. 배포 전 처리 필요 (`CLAUDE.md` 11번).
