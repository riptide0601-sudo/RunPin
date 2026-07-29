# RunPin

GPS 기반 러닝 코스 추천 & 근거리 러너 매칭 앱. 자세한 기획 배경은 [PLAN.md](./PLAN.md) 참고.

> **현재 상태:** 프론트엔드(UI/인터랙션) 중심 프로토타입. 화면 흐름과 애니메이션은 실기기 수준으로
> 다듬어져 있지만, 데이터는 전부 목업이고 GPS·인증·백엔드 연동은 아직 없다. 자세한 내용은
> 아래 "현재 한계" 참고.

## 기술 스택

- **플랫폼:** Expo (React Native 0.81 / React 19) + TypeScript (strict)
- **라우팅:** Expo Router (파일 기반 라우팅)
- **애니메이션/제스처:** react-native-reanimated 4, react-native-worklets, react-native-gesture-handler
  (일부 라이브러리 내부 버그를 `patch-package`로 패치해서 사용 중 — `patches/` 참고)
- **지도:** WebView + Leaflet (`components/map/leafletHtml.ts`에 HTML/JS 인라인 주입).
  `react-native-maps`로 전환을 시도했다가 iOS 커스터마이징 한계로 롤백한 이력이 있음 — 재전환 논의 전 사용자 확인 필요.
- **백엔드/인증:** Firebase (Auth + Realtime Database) — SDK만 설치·설정돼 있고 **아직 앱 어디에서도 사용하지 않음**
  (`lib/firebase.ts` 참고). 모든 데이터는 인메모리 목업.

## 완성된 기능 (화면 기준)

| 화면 | 경로 | 상태 |
|---|---|---|
| 홈 (코스 추천) | `app/(tabs)/index.tsx` | 지도 위 코스 표시, 거리순/인기순 정렬, 초성 검색, 동일 코스 그룹 캐러셀 |
| 커뮤니티 (러너 매칭) | `app/(tabs)/community.tsx` | 지도 위 러너 목업 표시, 매칭 제안/수락/거절 UI, 러닝 시작~종료 플로우, 종료 후 코스 저장 제안 |
| 랭킹 | `app/(tabs)/ranking.tsx` | 일간/월간/연간/전체 탭, 코스 경로 모달 |
| 마이 (프로필) | `app/(tabs)/profile.tsx` | 등급 배지, 통계, 구독 배너, 메뉴 |
| 러닝 기록 목록/상세 | `app/run-log/` | 기록 목록, 페이스·심박수·고도 차트, 코스 업로드 |
| 저장한 코스 | `app/saved-courses/index.tsx` | 스와이프 삭제, 삭제 후 카드 재정렬 애니메이션 (제스처 경쟁·리렌더 관련 버그를 여러 차례 수정해온 화면 — `git log app/saved-courses` 참고) |
| 구독/알림/개인정보/고객센터 | `app/subscription/`, `app/notifications/`, `app/privacy/`, `app/support/` | 정적 화면 위주, 인터랙션 완료 |

핵심 사용자 플로우(홈에서 코스 탐색 → 커뮤니티에서 매칭 → 러닝 종료 후 코스 저장 → 저장한 코스/기록 확인)는 목업 데이터 기준으로 전부 동작한다.

## 프로젝트 구조

```
app/                    화면 라우팅 (Expo Router)
  (tabs)/               하단 탭: 홈 / 커뮤니티 / 랭킹 / 마이
  run-log/              러닝 기록 목록 · 상세
  saved-courses/        저장한 코스
  subscription/ notifications/ privacy/ support/   부가 화면
components/
  home/ community/ ranking/ profile/    화면별 전용 컴포넌트
  map/                  Leaflet WebView 지도 (leafletHtml.ts는 WebView에 주입되는 HTML/JS 문자열)
  charts/               러닝 기록용 라인 차트
  ui/                   공용 UI (모달, 배지, 필, 카드 등)
lib/                    상태 관리(appData), 매칭/등급/포맷 로직, Firebase 설정
data/mock.ts            코스/러너/기록 목업 데이터 (실제 도로 좌표 기반)
types/                  공용 타입 정의
constants/               색상 등 상수
patches/                 서드파티 라이브러리 버그 패치 (patch-package)
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 Firebase 프로젝트 설정값을 채운다. (SDK 초기화만 되어 있고
아직 실제 인증/DB 연동에는 쓰이지 않지만, 앱 구동을 위해 필요하다.)

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

- **모든 데이터가 목업.** `data/mock.ts`의 코스/러너/기록을 앱 시작 시 메모리에 로드해서 쓴다.
  새로고침하면 초기화된다.
- **GPS/위치 추적 없음.** 실제 위치 권한 요청이나 실시간 좌표 수집 로직이 없다 (`expo-location` 미설치).
  "내 위치"와 러닝 궤적은 모두 고정 목업 좌표.
- **인증/백엔드 미연동.** Firebase SDK는 초기화만 되어 있고 로그인, 코스 업로드, 실시간 매칭 등
  실제 네트워크 호출은 아직 하나도 없다.
- **지오펜싱/실시간 매칭은 시뮬레이션.** 커뮤니티 화면의 러너 매칭은 목업 러너 점과 정적 로직으로
  구현돼 있고, 실시간 위치 기반 매칭·알림은 아직 없다.
