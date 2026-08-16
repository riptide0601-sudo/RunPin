import { useState } from 'react';

import { useAppData, useIsCourseLiked } from '@/lib/appData';
import { useRequireAuth } from '@/lib/useRequireAuth';
import type { Course } from '@/types';

interface CourseLikeResult {
  isLiked: boolean;
  likeCount: number;
  toggle: () => void;
}

// 홈 카드/랭킹 아이템/코스 상세 모달 세 곳에서 똑같이 필요한 좋아요 표시·토글 로직.
// course.uploaderId 유무로 실제 Firestore 코스와 mock 코스를 나눈다(types/index.ts의
// uploaderId 필드 설명 참고) — mock 코스는 좋아요를 붙일 실제 유저별 기록 자체가 없어서
// 로그인 요구 없이 화면에서만 토글되는 기존 동작을 그대로 둔다. course가 null이어도(모달이
// 닫히는 애니메이션 중 등) 훅 호출 순서를 유지할 수 있도록 null을 받아준다.
export function useCourseLike(course: Course | null): CourseLikeResult {
  const { toggleLikeCourse } = useAppData();
  const { requireAuth } = useRequireAuth();
  const isRealCourse = Boolean(course?.uploaderId);

  // 두 훅은 조건 없이 항상 호출한다 — isRealCourse는 컴포넌트가 살아있는 동안 course prop이
  // 바뀌지 않는 한 값이 바뀌지 않으므로, 아래에서 결과만 골라 쓴다.
  const isLikedReal = useIsCourseLiked(course?.id ?? '');
  const [mockLiked, setMockLiked] = useState(false);
  const [mockLikeCount, setMockLikeCount] = useState(course?.likeCount ?? 0);

  if (!course) {
    return { isLiked: false, likeCount: 0, toggle: () => {} };
  }

  if (isRealCourse) {
    return {
      isLiked: isLikedReal,
      likeCount: course.likeCount ?? 0,
      toggle: () => requireAuth(() => toggleLikeCourse(course.id), '좋아요를 누르려면 먼저 로그인해주세요'),
    };
  }

  return {
    isLiked: mockLiked,
    likeCount: mockLikeCount,
    toggle: () => {
      setMockLiked((prev) => !prev);
      setMockLikeCount((prev) => (mockLiked ? prev - 1 : prev + 1));
    },
  };
}
