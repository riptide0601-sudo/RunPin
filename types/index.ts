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

export interface Course {
  id: string;
  name: string;
  coordinates: LatLng[];
  category: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  distanceKm: number;
  isPopular?: boolean;
  likeCount?: number;
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

export type RankingPeriod = 'monthly' | 'yearly' | 'all';

export interface RankingEntry {
  id: string;
  rank: number;
  courseId: string;
  courseName: string;
  uploaderName: string;
  likeCount: number;
}

export type PaceComparison = 'faster' | 'similar' | 'slower';

export interface RunnerMapDot {
  id: string;
  nickname: string;
  position: LatLng;
  paceLabel: string;
  distanceLabel: string;
  paceComparison: PaceComparison;
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
