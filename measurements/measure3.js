// [측정 3] 지도 payload 안정화 (17cb2d3 전후)
// React useMemo/useEffect의 의존성 비교 규칙(Object.is)을 그대로 구현한 하네스로,
// 검색어 10글자 입력(=HomeScreen 10회 재렌더) 시 LeafletMap이 WebView에
// injectJavaScript를 몇 번 호출하는지 센다.
// - 의존성 배열은 components/map/LeafletMap.tsx의 payload useMemo 실제 deps를 그대로 사용
// - prop 생성 방식만 before/after 코드에서 그대로 가져와 교체

function makeMemo() { // useMemo 1개를 흉내내는 셀
  let deps = null, value = null;
  return (nextDeps, factory) => {
    const changed = !deps || nextDeps.some((d, i) => !Object.is(d, deps[i]));
    if (changed) { deps = nextDeps; value = factory(); }
    return { value, changed };
  };
}

// LeafletMap 내부: payload useMemo → sendData useCallback → useEffect(sendData) → injectJavaScript
function makeLeafletMap() {
  const payloadMemo = makeMemo();
  let injections = 0;
  return {
    render(props) {
      const { center, zoom = 15, route, routeColor = 'ink', fitBounds, fitBoundsPadding, keepCenterOnZoom, markers } = props;
      const { changed } = payloadMemo(
        [center, zoom, route, routeColor, fitBounds, fitBoundsPadding, keepCenterOnZoom, markers],
        () => ({ center, zoom, route, markers })
      );
      if (changed) injections++; // payload 참조가 바뀌면 useEffect가 재실행되어 재주입
      return injections;
    },
    get injections() { return injections; },
  };
}

const mockMeLocation = { latitude: 37.5599, longitude: 126.9358 };
const selectedCourse = { id: 'course-1', coordinates: [{ latitude: 37.5495, longitude: 126.9165 }] };
const getRouteCenter = (coords) => ({ latitude: coords[0].latitude, longitude: coords[0].longitude }); // 매 호출 새 객체

// ── BEFORE (17cb2d3^): center/fitBoundsPadding/markers 전부 렌더마다 새 리터럴
function propsBefore() {
  return {
    center: getRouteCenter(selectedCourse.coordinates),
    route: selectedCourse.coordinates,
    fitBounds: true,
    fitBoundsPadding: { top: 90, right: 32, bottom: 32, left: 32 },
    markers: [{ id: 'me', position: mockMeLocation, variant: 'me' }],
    keepCenterOnZoom: true,
  };
}
// ── AFTER (17cb2d3): 모듈 상수 + useMemo
const ME_MARKERS = [{ id: 'me', position: mockMeLocation, variant: 'me' }];
const HOME_FIT_BOUNDS_PADDING = { top: 90, right: 32, bottom: 32, left: 32 };
function makeAfter() {
  const centerMemo = makeMemo();
  return () => ({
    center: centerMemo([selectedCourse], () => getRouteCenter(selectedCourse.coordinates)).value,
    route: selectedCourse.coordinates,
    fitBounds: true,
    fitBoundsPadding: HOME_FIT_BOUNDS_PADDING,
    markers: ME_MARKERS,
    keepCenterOnZoom: true,
  });
}

const KEYSTROKES = 10;
function run(label, propsFactory) {
  const map = makeLeafletMap();
  map.render(propsFactory());            // 최초 마운트
  const mountInjections = map.injections;
  for (let i = 0; i < KEYSTROKES; i++) map.render(propsFactory()); // 검색어 1글자 = 재렌더 1회
  const total = map.injections;
  console.log(`${label}: 마운트 ${mountInjections}회 + 입력 10글자로 인한 재주입 ${total - mountInjections}회 (총 ${total}회)`);
  return total - mountInjections;
}
const before = run('BEFORE(17cb2d3^)', propsBefore);
const after  = run('AFTER (17cb2d3) ', makeAfter());
console.log(`\n검색 입력으로 인한 재주입: ${before}회 → ${after}회 (감소율 ${(((before-after)/before)*100).toFixed(0)}%)`);
