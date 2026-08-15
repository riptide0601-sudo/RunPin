import { mockCourses } from '@/data/mock';
import { createCourse, getUploadedCourseNameCounts } from '@/lib/courses';
import { createRunLog, getUploadedRunLogCourseNameCounts } from '@/lib/runLogs';
import { buildFinishedRunLog } from '@/lib/runSummary';
import type { Course } from '@/types';

const SEED_DISPLAY_NAME = '파클로즈';

// 1회성 시드 — 파클로즈 계정을 등급/통계 하드코딩 예외 없이 다른 계정과 동일하게
// 100% 실데이터로 보여주기 위해, 지금까지 mock 카탈로그에만 있던 코스 6개를 실제
// Firestore 문서로도 만들고 그에 대응하는 러닝 기록도 함께 만든다. 코스 이름/좌표는
// data/mock.ts의 기존 코스를 그대로 재사용해 화면에 보이는 코스 카드와 어긋나지 않는다.
// lib/appData.tsx가 파클로즈 계정으로 로그인할 때마다 호출한다 — 코스/러닝 기록을 이름별
// "개수" 단위로 비교해 필요한 개수(mock 소스 기준)보다 부족한 만큼만 만들기 때문에,
// permission-denied 등으로 중간에 실패해 코스 수와 러닝 기록 수가 어긋난 상태로 남아도
// 다음 로그인 때 자동으로 이어서 채워진다. 이름만으로 존재 여부(Set)를 판단하면 같은
// 이름의 코스가 여러 개(예: '한강 반포지구' 5개) 필요한 경우 1개만 있어도 다 있는 것으로
// 오판하기 때문에, 이름별 그룹과 개수(Map)를 비교하는 방식을 쓴다.
export async function seedParkCloseAccountData(uid: string): Promise<void> {
  const sourceCourses = mockCourses.filter((course) => course.uploaderName === SEED_DISPLAY_NAME);

  const sourceCoursesByName = new Map<string, Course[]>();
  for (const course of sourceCourses) {
    const group = sourceCoursesByName.get(course.name);
    if (group) {
      group.push(course);
    } else {
      sourceCoursesByName.set(course.name, [course]);
    }
  }

  if (__DEV__) {
    console.log('[seed] 시작', {
      uid,
      sourceCourseCount: sourceCourses.length,
      neededCountsByName: Object.fromEntries(
        [...sourceCoursesByName.entries()].map(([name, group]) => [name, group.length])
      ),
    });
  }

  const [existingCourseCounts, existingRunLogCourseCounts] = await Promise.all([
    getUploadedCourseNameCounts(uid),
    getUploadedRunLogCourseNameCounts(uid),
  ]);

  if (__DEV__) {
    console.log('[seed] 기존 데이터', {
      existingCourseCounts: Object.fromEntries(existingCourseCounts),
      existingRunLogCourseCounts: Object.fromEntries(existingRunLogCourseCounts),
    });
  }

  for (const [name, group] of sourceCoursesByName) {
    const needed = group.length;
    const existingCourseCount = existingCourseCounts.get(name) ?? 0;
    const existingRunLogCount = existingRunLogCourseCounts.get(name) ?? 0;
    const missingCourseCount = Math.max(0, needed - existingCourseCount);
    const missingRunLogCount = Math.max(0, needed - existingRunLogCount);

    if (__DEV__) {
      console.log('[seed] 코스 판단', {
        name,
        needed,
        existingCourseCount,
        existingRunLogCount,
        missingCourseCount,
        missingRunLogCount,
      });
    }

    for (const course of group.slice(existingCourseCount)) {
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
        // 다음 로그인 때도 개수가 그대로라 재시도 여부를 알 수 없다.
        if (__DEV__) {
          console.error('[seed] 코스 생성 실패', { name: course.name, error });
        }
      }
    }

    for (const course of group.slice(existingRunLogCount)) {
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
