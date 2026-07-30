import { gradeColors } from '@/constants/colors';
import { mockRankingsByPeriod } from '@/data/mock';
import type { Course, GradeLevel } from '@/types';

export interface UserGradeResult {
  points: number;
  level: GradeLevel;
  color: string;
}

// components/profile/GradeInfoPopup.tsx가 이 배열을 그대로 읽어 안내 팝업의 점수 구간을
// 표시한다 — 팝업에 값을 따로 하드코딩하면 여기 기준이 바뀔 때 안내 문구가 어긋난다.
export const GRADE_THRESHOLDS: { level: GradeLevel; min: number }[] = [
  { level: 5, min: 700 },
  { level: 4, min: 350 },
  { level: 3, min: 150 },
  { level: 2, min: 50 },
  { level: 1, min: 0 },
];

const topTenAllTimeCourseIds = new Set(mockRankingsByPeriod.all.map((entry) => entry.courseId));

function levelForPoints(points: number): GradeLevel {
  return GRADE_THRESHOLDS.find((threshold) => points >= threshold.min)!.level;
}

// 좋아요 100개/500개 구간은 서로 배타적이지 않고 둘 다 만족하면 둘 다 더한다
// (500개 이상이면 100개 이상 조건도 당연히 만족 -> 30+80=110점).
function likeCountBonus(likeCount: number): number {
  let bonus = 0;
  if (likeCount >= 100) bonus += 30;
  if (likeCount >= 500) bonus += 80;
  return bonus;
}

// 좋아요 보너스와 TOP10 보너스(+50)도 서로 다른 신호라 별도로 합산한다 —
// 좋아요 500+이면서 TOP10이면 30+80+50=160점.
function rankingBonusForCourse(course: Course): number {
  const likeCount = course.likeCount ?? 0;
  const top10Bonus = topTenAllTimeCourseIds.has(course.id) ? 50 : 0;
  return likeCountBonus(likeCount) + top10Bonus;
}

// uploaderId(Firebase Auth uid) 기준으로 계산한다 — 닉네임(uploaderName)은 중복 가능성이
// 없다곤 해도(닉네임 유일성은 lib/nickname.ts가 보장) 실제 유저 식별자는 uid이고, mock
// 코스처럼 uploaderId가 없는 데이터는 애초에 실제 유저의 업로드가 아니므로 집계에서
// 자연히 제외된다. uploaderId가 없으면(로그인 안 됨) 업로드 이력 없음(0점 = 1단계)로 취급.
// 모든 계정(파클로즈 포함)이 이 함수 하나로만 계산된다 — 계정별 하드코딩 예외를 두면
// 계산식이 바뀔 때마다 손으로 맞춰야 하는 문제가 반복돼서, 대신 lib/seedMockAccountData.ts로
// 파클로즈 계정에 실제 Firestore 코스/러닝기록을 심어 이 경로를 그대로 타게 한다.
export function calculateUserGrade(uploaderId: string | null | undefined, allCourses: Course[]): UserGradeResult {
  const uploadedCourses = uploaderId
    ? allCourses.filter((course) => course.uploaderId === uploaderId)
    : [];
  const points = uploadedCourses.reduce((sum, course) => sum + 10 + rankingBonusForCourse(course), 0);
  const level = levelForPoints(points);
  return { points, level, color: gradeColors[level] };
}
