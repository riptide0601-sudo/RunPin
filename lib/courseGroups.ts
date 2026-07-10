import type { Course } from '@/types';

export interface CourseGroup {
  key: string;
  representative: Course;
  members: Course[];
}

// 같은 이름을 가진 코스들을 하나의 그룹으로 묶는다. 그룹 내 likeCount가 가장 높은
// 코스가 대표 코스가 되고(동률이면 먼저 나온 코스), 나머지는 members로 남는다.
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
    const representative = group.reduce((best, course) =>
      (course.likeCount ?? 0) > (best.likeCount ?? 0) ? course : best,
    );
    const members = group.filter((course) => course.id !== representative.id);
    return { key: name, representative, members };
  });
}
