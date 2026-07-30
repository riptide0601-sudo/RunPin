import { mockCourses } from '@/data/mock';
import { createCourse } from '@/lib/courses';
import { createRunLog } from '@/lib/runLogs';
import { buildFinishedRunLog } from '@/lib/runSummary';

const SEED_DISPLAY_NAME = '파클로즈';

// 1회성 시드 — 파클로즈 계정을 등급/통계 하드코딩 예외 없이 다른 계정과 동일하게
// 100% 실데이터로 보여주기 위해, 지금까지 mock 카탈로그에만 있던 코스 6개를 실제
// Firestore 문서로도 만들고 그에 대응하는 러닝 기록도 함께 만든다. 코스 이름/좌표는
// data/mock.ts의 기존 코스를 그대로 재사용해 화면에 보이는 코스 카드와 어긋나지 않는다.
// lib/appData.tsx가 파클로즈 계정으로 처음 로그인했을 때(아직 올린 코스가 없을 때) 자동으로
// 한 번만 호출한다 — 화면에 별도 버튼을 노출하지 않는다.
export async function seedParkCloseAccountData(uid: string): Promise<void> {
  const sourceCourses = mockCourses.filter((course) => course.uploaderName === SEED_DISPLAY_NAME);

  for (const course of sourceCourses) {
    await createCourse(uid, SEED_DISPLAY_NAME, {
      name: course.name,
      coordinates: course.coordinates,
      category: course.category,
      difficulty: course.difficulty,
      distanceKm: course.distanceKm,
    });
    await createRunLog(uid, buildFinishedRunLog(course.name, course.coordinates, course.difficulty, true));
  }
}
