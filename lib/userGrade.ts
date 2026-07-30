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

// 이미 "이 유저가 올린 코스" 목록으로 걸러진 배열을 받아 점수/등급을 계산한다.
// app/(tabs)/profile.tsx가 실유저(uploaderId 기준)뿐 아니라 파클로즈 mock 계정
// (uploaderName 기준으로 거른 mock 코스)에도 이 함수를 그대로 재사용한다 — 계산식이
// 바뀌어도 두 경로가 항상 같은 로직으로 계산되어 서로 어긋나지 않게 하기 위함.
export function calculateGradeFromCourses(uploadedCourses: Course[]): UserGradeResult {
  const points = uploadedCourses.reduce((sum, course) => sum + 10 + rankingBonusForCourse(course), 0);
  const level = levelForPoints(points);
  return { points, level, color: gradeColors[level] };
}

// uploaderId(Firebase Auth uid) 기준으로 계산한다 — 닉네임(uploaderName)은 중복 가능성이
// 없다곤 해도(닉네임 유일성은 lib/nickname.ts가 보장) 실제 유저 식별자는 uid이고, mock
// 코스처럼 uploaderId가 없는 데이터는 애초에 실제 유저의 업로드가 아니므로 집계에서
// 자연히 제외된다. uploaderId가 없으면(로그인 안 됨) 업로드 이력 없음(0점 = 1단계)로 취급.
export function calculateUserGrade(uploaderId: string | null | undefined, allCourses: Course[]): UserGradeResult {
  const uploadedCourses = uploaderId
    ? allCourses.filter((course) => course.uploaderId === uploaderId)
    : [];
  return calculateGradeFromCourses(uploadedCourses);
}
