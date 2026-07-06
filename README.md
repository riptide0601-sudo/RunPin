# RunPin

GPS 기반 러닝 코스 추천 & 근거리 러너 매칭 앱. 자세한 기획 배경은 [PLAN.md](./PLAN.md) 참고.

## 기술 스택

- **플랫폼:** Expo (React Native) + TypeScript
- **라우팅:** Expo Router (파일 기반 라우팅)
- **백엔드/인증:** Firebase (Auth + Realtime Database)

## 폴더 구조

```
app/          화면 라우팅 (Expo Router)
  (tabs)/     하단 탭 네비게이션 (홈 / 랭킹 / 커뮤니티 / 마이)
components/   재사용 UI 컴포넌트
lib/          Firebase 설정, 유틸 함수
types/        타입 정의
constants/    색상 등 상수
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사하고 Firebase 프로젝트 설정값을 채운다.

```bash
cp .env.example .env
```

### 3. 개발 서버 실행

```bash
npx expo start
```

터미널에 뜨는 QR코드를 Expo Go 앱으로 스캔하거나, `a`(Android 에뮬레이터) / `i`(iOS 시뮬레이터) / `w`(웹) 키로 실행한다.

## 코드 품질

```bash
npm run lint     # ESLint 검사
npm run format   # Prettier 포맷팅
npx tsc --noEmit # 타입 체크
```
