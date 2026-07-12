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
} as const;

// Monotone 원칙의 예외: 유저 등급 배지 전용 색상 (1~5단계)
export const gradeColors: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '#B2B965',
  2: '#C99961',
  3: '#82414D',
  4: '#456E9A',
  5: '#5F489A',
};
