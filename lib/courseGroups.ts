import { topCoursesByLikes } from '@/lib/ranking';
import type { Course } from '@/types';

export interface CourseGroup {
  key: string;
  representative: Course;
  members: Course[];
}

// 같은 이름을 가진 코스들을 하나의 그룹으로 묶는다. 그룹 내 likeCount가 가장 높은
// 코스가 대표 코스가 되고(동률이면 먼저 나온 코스 — sort가 안정 정렬이라 입력 순서가
// 유지된다), 나머지는 members로 남는다. 대표를 고르는 기준은 랭킹 화면·등급 계산과
// 같아야 하므로 여기서 비교식을 다시 쓰지 않고 lib/ranking.ts의 선정 함수를 그대로 쓴다.
export function groupCoursesByName(courses: Course[]): CourseGroup[] {
  const order: string[] = [];
  const byName = new Map<string, Course[]>();

  for (const course of courses) {
    if (!byName.has(course.name)) {
      order.push(course.name);
      byName.set(course.name, []);
    }
    byName.get(course.name)!.push(course);
  }

  return order.map((name) => {
    const group = byName.get(name)!;
    const representative = topCoursesByLikes(group, 1)[0];
    const members = group.filter((course) => course.id !== representative.id);
    return { key: name, representative, members };
  });
}
