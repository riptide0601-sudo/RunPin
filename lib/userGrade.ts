import { gradeColors } from '@/constants/colors';
import { mockRankingsByPeriod } from '@/data/mock';
import type { Course, GradeLevel } from '@/types';

export interface UserGradeResult {
  points: number;
  level: GradeLevel;
  color: string;
}

const GRADE_THRESHOLDS: { level: GradeLevel; min: number }[] = [
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

function rankingBonusForCourse(course: Course): number {
  const likeCount = course.likeCount ?? 0;
  if (likeCount >= 500) return 80;
  if (topTenAllTimeCourseIds.has(course.id)) return 50;
  if (likeCount >= 100) return 30;
  return 0;
}

export function calculateUserGrade(uploaderName: string, allCourses: Course[]): UserGradeResult {
  const uploadedCourses = allCourses.filter((course) => course.uploaderName === uploaderName);
  const points = uploadedCourses.reduce((sum, course) => sum + 10 + rankingBonusForCourse(course), 0);
  const level = levelForPoints(points);
  return { points, level, color: gradeColors[level] };
}
