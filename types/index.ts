import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  paceHistory: number[];
}

// Firebase Auth로 로그인한 실제 유저 정보. mock 데이터 기반인 위 User와 달리
// Firestore 연동 전까지는 이 필드들(uid/email/displayName/createdAt)만 실제 값이다.
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: number | null;
}

export interface Course {
  id: string;
  name: string;
  coordinates: LatLng[];
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  distanceKm: number;
  uploaderName: string;
  // Firestore로 실제 업로드된 코스에만 있는 필드(업로더 uid). data/mock.ts의 기존 코스에는
  // 없으므로 옵션으로 둔다 — 필수로 만들면 mock 코스 데이터를 전부 고쳐야 한다.
  uploaderId?: string;
  isPopular?: boolean;
  likeCount?: number;
  createdAt: number;
}

export interface RunLog {
  id: string;
  userId: string;
  trajectory: LatLng[];
  startedAt: number;
  durationSec: number;
  paceSecPerKm: number;
  courseName: string;
  distanceKm: number;
  cadenceSpm: number;
  avgHeartRateBpm: number;
  elevationSeries: number[];
  paceSeries: number[];
  heartRateSeries: number[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  isUploaded: boolean;
}

export interface Match {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  participantIds: string[];
  radiusMeters: number;
}

export type RankingPeriod = 'daily' | 'monthly' | 'yearly' | 'all';

export interface RankingEntry {
  id: string;
  rank: number;
  courseId: string;
  courseName: string;
  uploaderName: string;
  likeCount: number;
}

export type PaceComparison = 'faster' | 'similar' | 'slower';

export type GradeLevel = 1 | 2 | 3 | 4 | 5;

export interface RunnerMapDot {
  id: string;
  nickname: string;
  position: LatLng;
  paceLabel: string;
  distanceLabel: string;
  paceComparison: PaceComparison;
  gradeLevel?: GradeLevel;
}

export interface ProfileStats {
  totalDistanceKm: number;
  uploadedCourseCount: number;
  runMatesCount: number;
  myPaceLabel: string;
}

export interface MenuItemData {
  id: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}
