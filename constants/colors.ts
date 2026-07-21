export const colors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEAEA',
  border: '#E0E0E0',
  gridLabel: '#B3B3B3',
  text: '#111111',
  textMuted: '#767676',
  textInverse: '#FFFFFF',
  ink: '#1A1A1A',
  inkMuted: '#595959',
  accentMe: '#B5544A',
  accentMatch: '#5B7C99',
  // Monotone 원칙의 예외: 좋아요(추천) 하트 전용 색상
  like: '#E63946',
  // Monotone 원칙의 예외: 구독(프리미엄) 상태 전용 포인트 컬러
  accentSubscribe: '#B08A3E',
} as const;

// Monotone 원칙의 예외: 유저 등급 배지 전용 색상 (1~5단계)
export const gradeColors: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#A9AE6A',
  2: '#BC9466',
  3: '#814C56',
  4: '#4F7195',
  5: '#655295',
};
