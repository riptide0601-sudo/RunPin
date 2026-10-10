global.IS_REACT_ACT_ENVIRONMENT = true;
// [측정 D] 랭킹 상세보기 좋아요 수가 0으로 고정되던 버그 (d3ed429)
// 원인: useCourseLike가 mock 코스의 좋아요 수를 useState(course?.likeCount ?? 0)로 잡았는데,
//       CourseRouteModal은 컴포넌트가 계속 살아있고 course prop만 교체되는 재사용 구조라
//       useState 초기값이 다시 평가되지 않는다. 최초 마운트가 course=null이면 0에 영구 고정.
// 측정: 모달을 열어 서로 다른 mock 코스 5개를 차례로 보여줬을 때, 화면에 표시되는 좋아요 수가
//       실제 course.likeCount와 일치하는지 센다. 수정 전/후 훅만 교체하고 트리는 동일.
const React = require('react');
const { createElement: h, useState, useEffect } = React;
const TR = require('react-test-renderer');
const { act } = TR;

// 실제 mock 코스에서 가져온 값 (랭킹 전체 탭 상위 5개)
const COURSES = [
  { id: 'course-1', name: '몽마르뜨공원', likeCount: 11 },
  { id: 'course-3', name: '한강 반포지구', likeCount: 26 },
  { id: 'course-5', name: '보라매공원', likeCount: 30 },
  { id: 'course-9', name: '월드컵공원 둘레길', likeCount: 19 },
  { id: 'course-2', name: '경의선숲길', likeCount: 11 },
];

// --- 수정 전 훅 (d3ed429 이전) ---
function useCourseLikeBefore(course) {
  const [mockLikeCount] = useState(course?.likeCount ?? 0);
  return course ? mockLikeCount : 0;
}
// --- 수정 후 훅 (d3ed429) ---
function useCourseLikeAfter(course) {
  const [mockLikeCount, setMockLikeCount] = useState(course?.likeCount ?? 0);
  useEffect(() => {
    if (!course) return;
    setMockLikeCount(course.likeCount ?? 0);
  }, [course?.id]);
  return course ? mockLikeCount : 0;
}

function run(label, useHook) {
  let shown = null, setCourse = null;
  function Modal({ course }) { shown = useHook(course); return null; }
  function Host() {
    const [course, set] = useState(null); // 최초 마운트는 course=null (모달이 닫힌 상태)
    setCourse = set;
    return h(Modal, { course });
  }
  act(() => { TR.create(h(Host)); });
  const rows = [];
  for (const c of COURSES) {
    act(() => setCourse(c));          // 모달에 다른 코스를 표시
    rows.push({ name: c.name, real: c.likeCount, shown });
    act(() => setCourse(null));       // 모달 닫기 (컴포넌트는 언마운트되지 않음)
  }
  const wrong = rows.filter((r) => r.shown !== r.real);
  console.log(`\n[${label}]`);
  for (const r of rows) console.log(`  ${r.name.padEnd(16)} 실제 ${String(r.real).padStart(3)} / 화면 표시 ${String(r.shown).padStart(3)} ${r.shown === r.real ? '일치' : '불일치'}`);
  console.log(`  → 표시값이 틀린 코스: ${wrong.length}/${rows.length} (${((wrong.length / rows.length) * 100).toFixed(0)}%)`);
  return wrong.length;
}

const before = run('수정 전 (useState 초기값만)', useCourseLikeBefore);
const after = run('수정 후 (course.id 변경 시 재동기화)', useCourseLikeAfter);
console.log(`\n요약: 좋아요 수가 틀리게 표시된 코스 ${before}/${COURSES.length} → ${after}/${COURSES.length}`);
