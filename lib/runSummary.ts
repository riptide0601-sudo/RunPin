import { MY_PACE_LABEL, MY_PACE_SEC_PER_KM } from '@/constants/pace';
import type { LatLng, RunLog } from '@/types';

// 러닝 종료 화면에 쓰이는 더미 요약값. "내 페이스"는 constants/pace의 값을
// 그대로 참조해 러닝 중 화면과 항상 같은 값을 보여준다.
export const RUN_SUMMARY = {
  durationSec: 1428, // 23:48, MY_PACE_SEC_PER_KM(340) * 4.2km
  distanceKm: 4.2,
  paceLabel: MY_PACE_LABEL,
  cadenceSpm: 172,
  avgHeartRateBpm: 152,
};

export function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const RUN_SUMMARY_TIME_LABEL = formatElapsed(RUN_SUMMARY.durationSec);

function randomSeries(base: number, swing: number, min: number, max: number, points = 14): number[] {
  let value = base;
  return Array.from({ length: points }, () => {
    value = Math.min(max, Math.max(min, value + (Math.random() - 0.5) * swing));
    return Math.round(value * 10) / 10;
  });
}

export function buildFinishedRunLog(
  courseName: string,
  trajectory: LatLng[],
  difficulty: 1 | 2 | 3 | 4 | 5,
  isUploaded: boolean,
): RunLog {
  return {
    id: `runlog-${Date.now()}`,
    userId: 'user-me',
    trajectory,
    startedAt: Date.now() - RUN_SUMMARY.durationSec * 1000,
    durationSec: RUN_SUMMARY.durationSec,
    paceSecPerKm: MY_PACE_SEC_PER_KM,
    courseName,
    distanceKm: RUN_SUMMARY.distanceKm,
    cadenceSpm: RUN_SUMMARY.cadenceSpm,
    avgHeartRateBpm: RUN_SUMMARY.avgHeartRateBpm,
    elevationSeries: randomSeries(30, 6, 5, 55),
    paceSeries: randomSeries(MY_PACE_SEC_PER_KM, 20, MY_PACE_SEC_PER_KM - 35, MY_PACE_SEC_PER_KM + 45),
    heartRateSeries: randomSeries(140, 8, 115, 166),
    difficulty,
    isUploaded,
  };
}
