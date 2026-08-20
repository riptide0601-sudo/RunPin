import type { Course, RankingPeriod } from '@/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// 랭킹 정렬의 유일한 기준. 랭킹 화면과 등급 계산(lib/userGrade.ts), 홈 인기 코스 선정이
// 전부 이 비교자 하나를 공유한다 — 예전엔 같은 식이 세 파일에 각각 복사돼 있어서, 정렬
// 기준이 바뀔 때 한 곳만 고치면 조용히 어긋났다.
export function byLikeCountDesc(a: Course, b: Course): number {
  return (b.likeCount ?? 0) - (a.likeCount ?? 0);
}

export function topCoursesByLikes(courses: Course[], limit: number): Course[] {
  return [...courses].sort(byLikeCountDesc).slice(0, limit);
}

interface RankingPeriodMeta {
  label: string;
  // 이 기간 탭에 노출할 "최근 N" 구간의 폭. all은 하한이 없다는 뜻으로 Infinity를 쓴다
  // (Date.now() - Infinity === -Infinity이라 모든 createdAt이 통과한다).
  windowMs: number;
  emptyText: string;
}

// 기간 탭의 라벨·구간·빈 상태 문구를 한 곳에서 정의한다. 예전엔 라벨이 RankingTabs.tsx,
// 구간과 문구가 랭킹 화면에 흩어져 있어서, 탭을 추가하거나 이름을 바꿀 때 라벨과 실제
// 필터 구간이 조용히 어긋날 수 있었다(예: 라벨만 "반기"로 바꾸고 365일 구간은 그대로).
export const PERIOD_META: Record<RankingPeriod, RankingPeriodMeta> = {
  daily: { label: '일간', windowMs: DAY_MS, emptyText: '오늘 업로드된 코스가 없어요' },
  monthly: { label: '월간', windowMs: 30 * DAY_MS, emptyText: '최근 한 달 안에 업로드된 코스가 없어요' },
  yearly: { label: '연간', windowMs: 365 * DAY_MS, emptyText: '최근 1년 안에 업로드된 코스가 없어요' },
  all: { label: '전체', windowMs: Infinity, emptyText: '아직 업로드된 코스가 없어요' },
};

// 탭에 보여줄 순서. Record 리터럴의 키 순서를 그대로 따른다.
export const RANKING_PERIODS = Object.keys(PERIOD_META) as RankingPeriod[];

export const RANKING_LIMIT = 20;

// 각 탭은 createdAt으로 "최근 N" 구간만 걸러내고, 정렬/표시는 항상 course.likeCount
// 하나만 쓴다. 구간은 배타적이지 않고 포함 관계다(일간 ⊂ 월간 ⊂ 연간 ⊂ 전체).
export function getRankingsForPeriod(period: RankingPeriod, courses: Course[]): Course[] {
  const cutoff = Date.now() - PERIOD_META[period].windowMs;
  // filter가 이미 새 배열을 주므로 sort를 그 위에 바로 걸어도 원본은 안전하다.
  return courses
    .filter((course) => course.createdAt >= cutoff)
    .sort(byLikeCountDesc)
    .slice(0, RANKING_LIMIT);
}
