global.IS_REACT_ACT_ENVIRONMENT = true;
// [측정 2-B] 같은 트리를 실제 React 19로 렌더해 토글 1회의 재렌더 수와 커밋 시간(ms) 측정
// 주의: react-test-renderer 환경의 패턴 벤치마크이며, 실기기 RN 렌더 시간이 아니다.
const React = require('react');
const { createElement: h, memo, useContext, useMemo, useState, useSyncExternalStore, createContext } = React;
const TR = require('react-test-renderer');
const { act } = TR;

const REPRESENTATIVES = 20, GROUPS = 17, MEMBERS_PER_GROUP = [5,3,7,5,5,3,3,3,7,5,3,3,5,3,3,3,3]; // 실측 그룹 크기-1
const ALL_IDS = [];
for (let i = 0; i < REPRESENTATIVES; i++) ALL_IDS.push('rep-' + i);
MEMBERS_PER_GROUP.forEach((n, g) => { for (let i = 0; i < n - 1; i++) ALL_IDS.push(`mem-${g}-${i}`); });

let counts = {};
const bump = (k) => { counts[k] = (counts[k] || 0) + 1; };
const Leaf = () => null;

// ── Pattern A: Context에 Set을 담아 내려주는 방식 (17439ca 이전)
const CtxA = createContext(null);
const CardA = memo(function CardA({ id }) { bump('card'); const { ids } = useContext(CtxA); void ids.has(id); return h(Leaf); });
const MemberCardA = memo(function MemberCardA({ isSaved }) { bump('member'); void isSaved; return h(Leaf); });
const CarouselA = memo(function CarouselA({ g, n }) {
  bump('carousel');
  const { ids } = useContext(CtxA);
  const kids = []; for (let i = 0; i < n - 1; i++) kids.push(h(MemberCardA, { key: i, isSaved: ids.has(`mem-${g}-${i}`) }));
  return kids;
});
function AppA({ onReady }) {
  const [ids, setIds] = useState(() => new Set());
  const value = useMemo(() => ({ ids, toggle: (id) => setIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }) }), [ids]);
  onReady(value.toggle);
  const kids = [];
  for (let i = 0; i < REPRESENTATIVES; i++) kids.push(h(CardA, { key: 'r' + i, id: 'rep-' + i }));
  MEMBERS_PER_GROUP.forEach((n, g) => kids.push(h(CarouselA, { key: 'c' + g, g, n })));
  return h(CtxA.Provider, { value }, kids);
}

// ── Pattern B: 외부 스토어 + id별 구독 (17439ca 이후)
class Store {
  constructor() { this.ids = new Set(); this.perId = new Map(); }
  isSaved = (id) => this.ids.has(id);
  subscribeToId = (id) => (cb) => { let s = this.perId.get(id); if (!s) { s = new Set(); this.perId.set(id, s); } s.add(cb); return () => s.delete(cb); };
  toggle = (id) => { const n = new Set(this.ids); n.has(id) ? n.delete(id) : n.add(id); this.ids = n; this.perId.get(id)?.forEach((cb) => cb()); };
}
const CtxB = createContext(null);
function useIsSaved(store, id) { return useSyncExternalStore(useMemo(() => store.subscribeToId(id), [store, id]), () => store.isSaved(id)); }
const CardB = memo(function CardB({ id }) { bump('card'); const { store } = useContext(CtxB); void useIsSaved(store, id); return h(Leaf); });
const MemberCardB = memo(function MemberCardB({ id }) { bump('member'); const { store } = useContext(CtxB); void useIsSaved(store, id); return h(Leaf); });
const CarouselB = memo(function CarouselB({ g, n }) {
  bump('carousel');
  const kids = []; for (let i = 0; i < n - 1; i++) kids.push(h(MemberCardB, { key: i, id: `mem-${g}-${i}` }));
  return kids;
});
function AppB({ store }) {
  const value = useMemo(() => ({ store }), [store]);
  const kids = [];
  for (let i = 0; i < REPRESENTATIVES; i++) kids.push(h(CardB, { key: 'r' + i, id: 'rep-' + i }));
  MEMBERS_PER_GROUP.forEach((n, g) => kids.push(h(CarouselB, { key: 'c' + g, g, n })));
  return h(CtxB.Provider, { value }, kids);
}

const REPEAT = 50;
function bench(label, mount, toggleOf) {
  let root, toggle;
  act(() => { root = TR.create(mount((t) => { toggle = t; })); });
  const firstCounts = { ...counts };
  // 측정: 토글 1회당 재렌더 수(첫 1회) + 커밋 시간(REPEAT회 평균)
  counts = {};
  act(() => toggleOf(toggle)(ALL_IDS[0]));
  const perToggle = { ...counts };
  const times = [];
  for (let i = 0; i < REPEAT; i++) {
    const id = ALL_IDS[i % ALL_IDS.length];
    const t0 = performance.now();
    act(() => toggleOf(toggle)(id));
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`\n[${label}] 마운트 시 렌더: ${JSON.stringify(firstCounts)}`);
  console.log(`  토글 1회 재렌더: ${JSON.stringify(perToggle)} = 합계 ${Object.values(perToggle).reduce((a,b)=>a+b,0)}개`);
  console.log(`  토글 커밋 시간(${REPEAT}회): 평균 ${mean.toFixed(3)}ms / 중앙값 ${times[Math.floor(times.length/2)].toFixed(3)}ms / 최소 ${times[0].toFixed(3)}ms / 최대 ${times[times.length-1].toFixed(3)}ms`);
  return { renders: Object.values(perToggle).reduce((a,b)=>a+b,0), mean, median: times[Math.floor(times.length/2)] };
}

counts = {};
const A = bench('BEFORE: Context + Set 전체 구독', (onReady) => h(AppA, { onReady }), (t) => t);
const store = new Store();
counts = {};
const B = bench('AFTER : 외부 스토어 + id별 구독', () => h(AppB, { store }), () => store.toggle);
console.log(`\n요약: 재렌더 ${A.renders} → ${B.renders}개 (${(((A.renders-B.renders)/A.renders)*100).toFixed(1)}% 감소) / 커밋시간 중앙값 ${A.median.toFixed(3)}ms → ${B.median.toFixed(3)}ms (${(((A.median-B.median)/A.median)*100).toFixed(1)}% 감소)`);
