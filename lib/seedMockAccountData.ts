import { mockCourses } from '@/data/mock';
import { createCourse, getUploadedCourseNames } from '@/lib/courses';
import { createRunLog, getUploadedRunLogCourseNames } from '@/lib/runLogs';
import { buildFinishedRunLog } from '@/lib/runSummary';

const SEED_DISPLAY_NAME = '파클로즈';

// 1회성 시드 — 파클로즈 계정을 등급/통계 하드코딩 예외 없이 다른 계정과 동일하게
// 100% 실데이터로 보여주기 위해, 지금까지 mock 카탈로그에만 있던 코스 6개를 실제
// Firestore 문서로도 만들고 그에 대응하는 러닝 기록도 함께 만든다. 코스 이름/좌표는
// data/mock.ts의 기존 코스를 그대로 재사용해 화면에 보이는 코스 카드와 어긋나지 않는다.
// lib/appData.tsx가 파클로즈 계정으로 로그인할 때마다 호출한다 — 코스/러닝 기록 이름
// 단위로 이미 있는지 확인 후 빠진 것만 만들기 때문에, permission-denied 등으로 중간에
// 실패해 코스 수와 러닝 기록 수가 어긋난 상태로 남아도 다음 로그인 때 자동으로 이어서
// 채워진다(이미 있는 항목을 중복 생성하지 않는다).
export async function seedParkCloseAccountData(uid: string): Promise<void> {
  const sourceCourses = mockCourses.filter((course) => course.uploaderName === SEED_DISPLAY_NAME);

  const [existingCourseNames, existingRunLogCourseNames] = await Promise.all([
    getUploadedCourseNames(uid),
    getUploadedRunLogCourseNames(uid),
  ]);

  for (const course of sourceCourses) {
    if (!existingCourseNames.has(course.name)) {
      await createCourse(uid, SEED_DISPLAY_NAME, {
        name: course.name,
        coordinates: course.coordinates,
        category: course.category,
        difficulty: course.difficulty,
        distanceKm: course.distanceKm,
      });
    }
    if (!existingRunLogCourseNames.has(course.name)) {
      await createRunLog(uid, buildFinishedRunLog(course.name, course.coordinates, course.difficulty, true));
    }
  }
}
