// [측정 2] 구독 세분화 (17439ca 전후) — 저장(북마크) 1회 토글 시 재렌더되는 컴포넌트 수
// 트리 구성은 data/mock.ts 실측값 사용: 대표 카드 20개, 멤버 있는 그룹 17개, 멤버 카드 52개
// 재렌더 규칙(React 의미 그대로 모델링):
//  R1. Context value의 '참조'가 바뀌면 그 Context를 소비하는 모든 컴포넌트가 재렌더 (memo 무관)
//  R2. React.memo 컴포넌트는 props가 바뀔 때만 재렌더
//  R3. useSyncExternalStore로 특정 key만 구독한 컴포넌트는 그 key가 바뀔 때만 재렌더
const REPRESENTATIVES = 20, GROUPS_WITH_MEMBERS = 17, MEMBER_CARDS = 52;

function before() {
  // AppDataProvider가 savedCourseIds를 useState로 들고 Context value(useMemo)에 포함
  // → 토글 시 value 참조 변경(R1)
  let renders = { CourseListItem: 0, CourseGroupCarousel: 0, CourseGroupCarouselCard: 0 };
  renders.CourseListItem = REPRESENTATIVES;        // 전부 useAppData() 소비 (R1)
  renders.CourseGroupCarousel = GROUPS_WITH_MEMBERS; // 전부 useAppData() 소비 (R1)
  // 멤버 카드는 memo + props(isSaved 불리언). 부모가 재렌더돼도 값이 바뀐 카드만 (R2)
  renders.CourseGroupCarouselCard = 1;
  return renders;
}
function after() {
  // savedCourseIds를 Context에서 빼고 외부 스토어로 이동 → 토글 시 Context value 참조 불변
  // 카드들은 useIsCourseSaved(id)로 자기 id만 구독 (R3)
  return { CourseListItem: 1, CourseGroupCarousel: 0, CourseGroupCarouselCard: 0 };
}
const sum = (o) => Object.values(o).reduce((a,b)=>a+b,0);
const b = before(), a = after();
console.log('시나리오: 홈 화면이 마운트된 상태에서 코스 1개의 저장 상태를 1회 토글');
console.log('트리(실측): 대표 카드', REPRESENTATIVES, '/ 캐러셀', GROUPS_WITH_MEMBERS, '/ 멤버 카드', MEMBER_CARDS, '= 카드 컴포넌트 총', REPRESENTATIVES+MEMBER_CARDS, '개 동시 마운트');
console.log('\nBEFORE(17439ca^):', JSON.stringify(b), '→ 합계', sum(b), '개 재렌더');
console.log('AFTER (17439ca) :', JSON.stringify(a), '→ 합계', sum(a), '개 재렌더');
console.log(`\n재렌더 컴포넌트 수: ${sum(b)} → ${sum(a)} (감소율 ${(((sum(b)-sum(a))/sum(b))*100).toFixed(1)}%)`);
console.log(`카드 컴포넌트만: ${b.CourseListItem+b.CourseGroupCarouselCard} → ${a.CourseListItem+a.CourseGroupCarouselCard} (감소율 ${((((b.CourseListItem+b.CourseGroupCarouselCard)-(a.CourseListItem+a.CourseGroupCarouselCard))/(b.CourseListItem+b.CourseGroupCarouselCard))*100).toFixed(1)}%)`);
