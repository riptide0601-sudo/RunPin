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

  if (__DEV__) {
    console.log('[seed] 시작', {
      uid,
      sourceCourseCount: sourceCourses.length,
      sourceCourseNames: sourceCourses.map((course) => course.name),
    });
  }

  const [existingCourseNames, existingRunLogCourseNames] = await Promise.all([
    getUploadedCourseNames(uid),
    getUploadedRunLogCourseNames(uid),
  ]);

  if (__DEV__) {
    console.log('[seed] 기존 데이터', {
      existingCourseNames: [...existingCourseNames],
      existingRunLogCourseNames: [...existingRunLogCourseNames],
    });
  }

  for (const course of sourceCourses) {
    const courseExists = existingCourseNames.has(course.name);
    const runLogExists = existingRunLogCourseNames.has(course.name);
    if (__DEV__) {
      console.log('[seed] 코스 판단', { name: course.name, courseExists, runLogExists });
    }

    if (!courseExists) {
      try {
        await createCourse(uid, SEED_DISPLAY_NAME, {
          name: course.name,
          coordinates: course.coordinates,
          category: course.category,
          difficulty: course.difficulty,
          distanceKm: course.distanceKm,
        });
      } catch (error) {
        // 여기서 잡아서 계속 진행하지 않으면 이 시점 이후 코스는 시도조차 안 되고
        // 다음 로그인 때도 이름 기준 Set에는 안 잡혀 있어 재시도 여부를 알 수 없다.
        if (__DEV__) {
          console.error('[seed] 코스 생성 실패', { name: course.name, error });
        }
      }
    }

    if (!runLogExists) {
      try {
        await createRunLog(uid, buildFinishedRunLog(course.name, course.coordinates, course.difficulty, true));
      } catch (error) {
        if (__DEV__) {
          console.error('[seed] 러닝기록 생성 실패', { name: course.name, error });
        }
      }
    }
  }

  if (__DEV__) {
    console.log('[seed] 완료', { uid });
  }
}
