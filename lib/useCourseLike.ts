import { useEffect, useState } from 'react';

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

  // useState 초기값은 이 훅을 호출하는 컴포넌트가 "처음 마운트될 때" 딱 한 번만 적용된다.
  // 코스 상세 모달(CourseRouteModal)처럼 컴포넌트 자체는 계속 살아있고 course prop만
  // 바뀌는 재사용 구조에서는 이 초기값이 다시 평가되지 않아, 최초 마운트 시점의 course로
  // 고정된 좋아요 수/여부가 다른 코스를 봐도 그대로 남는다(특히 최초 마운트가 course=null인
  // 경우 좋아요 수가 0에 영구 고정됨 — 랭킹 상세보기 하트 0개 버그의 원인). course.id가
  // 바뀔 때마다 그 코스의 실제 값으로 다시 맞춰서 해결한다.
  useEffect(() => {
    if (!course || isRealCourse) return;
    setMockLiked(false);
    setMockLikeCount(course.likeCount ?? 0);
    if (__DEV__) {
      console.log('[useCourseLike] mock 코스 좋아요 상태 재동기화', {
        courseId: course.id,
        courseName: course.name,
        likeCount: course.likeCount ?? 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

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
