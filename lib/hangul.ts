const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const CHOSUNG_UNIT = 21 * 28;

export function getChosung(text: string): string {
  let result = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= HANGUL_BASE && code <= HANGUL_LAST) {
      const chosungIndex = Math.floor((code - HANGUL_BASE) / CHOSUNG_UNIT);
      result += CHOSUNG_LIST[chosungIndex];
    } else {
      result += char;
    }
  }
  return result;
}

export function matchesChosung(text: string, query: string): boolean {
  if (!query) return true;
  // Spacing in the query shouldn't matter — "ㅅㅁㄷㄱㅁㄱ" and "ㅅㅁㄷ ㄱㅁㄱ"
  // should both match "성산동 골목길", so whitespace is stripped from both
  // sides before comparing.
  const normalizedQuery = query.replace(/\s+/g, '');
  if (!normalizedQuery) return true;
  return getChosung(text).replace(/\s+/g, '').includes(normalizedQuery);
}
