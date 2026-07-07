// 개발 전용 1회성 스크립트: data/mock.ts의 mockCourses 좌표를 실제 도로 기반 경로로 교체한다.
//
// OSRM 공개 데모 서버(router.project-osrm.org)는 프로토타입/개발용이며,
// 실제 서비스 운영 시에는 자체 호스팅 OSRM 또는 유료 라우팅 서비스로 반드시 교체해야 한다.
//
// 실행: node scripts/fetch-routes.js
// 앱 실행 중에는 네트워크 호출이 전혀 없다 — 이 스크립트가 만든 결과가 data/mock.ts에 그대로 하드코딩된다.

const fs = require('fs');
const path = require('path');

const MOCK_FILE = path.join(__dirname, '..', 'data', 'mock.ts');
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot';
const SAMPLE_MIN = 30; // 목표 포인트 수 하한
const SAMPLE_MAX = 50; // 목표 포인트 수 상한
const REQUEST_DELAY_MS = 300; // 공개 데모 서버 예의상 요청 간 지연

// data/mock.ts에 현재 하드코딩되어 있던 코스별 원본 waypoint (도형 형태).
// mock.ts를 직접 import하지 않는 이유: '@/...' 경로 별칭이 plain Node에서 해석되지 않기 때문.
// 아래 waypoint들은 (1) 코스 이름이 가리키는 실제 지형(공원/둘레길처럼 루프형인지,
// 하천/강변처럼 선형인지)을 판단하고 (2) 각 코스의 기존(장식용) waypoint가 차지하던
// 대략적 위치·반경을 유지한 채로, 소수의 실제 도로 위 지점만 남기고
// (3) OSRM 응답 거리가 distanceKm 라벨에 가깝게 수렴할 때까지 반복 조정해서 구했다.
// 자세한 산출 과정은 PR 설명/커밋 참고. 점 개수를 줄인 이유는 촘촘한 장식용 다각형
// waypoint를 그대로 두면 OSRM이 각 점을 순서대로 반드시 통과해야 해서, 점들 사이를
// 실제 도로로 연결하더라도 전체 윤곽선은 원래의 별/도형 모양을 그대로 물려받기 때문이다.
const COURSE_WAYPOINTS = {
  // 공원 루프: 원래 waypoint들이 차지하던 대각선 범위를 감싸는 사각형 루프로 축소.
  // 남서쪽 모서리(37.5513,126.9265)가 와우산로의 막다른 지선에 스냅되어 OSRM이
  // 그 지점까지 들어갔다가 그대로 되돌아오는 유턴이 발생해, 실제 관통로인
  // 와우산로 본선 위 지점(126.9285)으로 옮기고, 시작/종료점도 인접한 교차로 구간의
  // 겹치는 급회전(약 150°)을 피해 남쪽으로 소폭 이동.
  'course-1': [
    { latitude: 37.5495, longitude: 126.9165 },
    { latitude: 37.5577, longitude: 126.9165 },
    { latitude: 37.5577, longitude: 126.9265 },
    { latitude: 37.5513, longitude: 126.9285 },
    { latitude: 37.5495, longitude: 126.9165 },
  ],
  // 경의선숲길(Gyeongui Line Forest Park)의 실제 구간 양 끝점.
  // OSM relation 8616724 조회 + Overpass로 확인한 공원 경계 좌표를 바탕으로,
  // 연남동 쪽 끝(서북단)과 대흥동 쪽 끝(동남단)만 waypoint로 사용해 OSRM이
  // 그 사이 실제 도로/보행로를 직접 찾도록 함 (기존의 장식용 원형 waypoint 13개 제거).
  'course-2': [
    { latitude: 37.567, longitude: 126.9182 },
    { latitude: 37.5493, longitude: 126.9384 },
  ],
  // 강변(반포 한강공원) 선형 코스: 왕복(out-and-back)으로 처리.
  'course-3': [
    { latitude: 37.508, longitude: 126.9883 },
    { latitude: 37.51, longitude: 127.0067 },
    { latitude: 37.508, longitude: 126.9883 },
  ],
  // 하천(안양천) 선형 코스: 왕복.
  // 기존 종점(37.5354,126.8971)이 선유로 본선에서 살짝 벗어나 있어, OSRM이 100m
  // 오버슈트한 뒤 그대로 되돌아오는 유턴이 발생했다. 종점을 선유로 본선 위
  // 지점(37.5359,126.8979)으로 옮겨 해소. 편도 거리도 변경돼 왕복 거리 라벨 갱신 필요.
  'course-4': [
    { latitude: 37.5181, longitude: 126.8934 },
    { latitude: 37.5359, longitude: 126.8979 },
    { latitude: 37.5181, longitude: 126.8934 },
  ],
  // 보라매공원 루프: Nominatim으로 확인한 실제 공원 경계(37.4903~37.4962, 126.9159~126.9261)
  // 안쪽에 루프를 두면 OSRM이 매번 공원 외곽 실제 순환로로 라우팅하는 것을 확인함.
  // 그 결과 실제 거리가 기존 라벨(4.0km)보다 커서 distanceKm도 함께 갱신 필요.
  // 북서쪽 모서리(37.495315,126.91743)가 막다른 지점이라 완전히 되돌아오는 유턴이
  // 발생해, 여의대방로20길 본선 위 지점(37.4958,126.9178)으로 이동해 해소.
  'course-5': [
    { latitude: 37.491185, longitude: 126.91743 },
    { latitude: 37.4958, longitude: 126.9178 },
    { latitude: 37.495315, longitude: 126.92457 },
    { latitude: 37.491185, longitude: 126.92457 },
    { latitude: 37.491185, longitude: 126.91743 },
  ],
  // 연남동 경의선 확장코스: course-2와 마찬가지로 선형 구간이라 양 끝점만 사용(편도).
  'course-6': [
    { latitude: 37.5698, longitude: 126.9285 },
    { latitude: 37.5576, longitude: 126.9399 },
  ],
  // 강변(망원한강공원) 루프. 기존 사각형은 북쪽 모서리가 막다른 골목에 물려 유턴이
  // 2회 발생하고, 동쪽 변은 성산로(간선도로) 횡단 지점이 안 맞아 중앙분리대를 따라
  // 되돌아오는 유턴이 발생했다. 루프 전체를 관통로 위주로 재배치해 유턴 없이
  // 닫히는 형태로 조정(반복 시행착오로 확인).
  // (2차 검증) 재검증 결과 북동쪽 모서리(37.5592,126.946)가 여전히 막다른 골목
  // 안쪽이라, 이화여대7길 구간을 왕복하며 두 번 지나가는 배회가 남아있었다.
  // 해당 모서리를 관통로 위 지점(37.5585,126.9445)으로 옮겨 완전히 해소.
  'course-7': [
    { latitude: 37.553, longitude: 126.9365 },
    { latitude: 37.5592, longitude: 126.9365 },
    { latitude: 37.5585, longitude: 126.9445 },
    { latitude: 37.553, longitude: 126.946 },
    { latitude: 37.553, longitude: 126.9365 },
  ],
  // 골목길 루프. 남동쪽 모서리가 막다른 골목 안쪽에 물려 왕복 유턴이 발생해,
  // 인접한 관통 골목 위 지점으로 옮겨 해소.
  // (2차 검증) 기존 사각형의 북동쪽 구간(37.5616,126.9443)~(37.5616,126.9473)이
  // 실제로는 도로망이 끊긴 고립 지역이라, 성산로를 통한 큰 우회 후 같은 교차로를
  // 3번이나 지나가는 배회가 남아있었다. Overpass 도로 그래프 분석으로 실제
  // 연결된 도로만으로 닫히는 더 작은 루프를 다시 설계(북동쪽 고립 구간 전체 제외).
  // 거리가 기존 라벨(3.0km)보다 크게 줄어드는데, 이 지역 도로망 제약상 이보다
  // 긴 루프를 만들면 반드시 같은 길을 되짚거나 자기교차가 생기므로 자연스러운
  // 루프를 우선했다. distanceKm도 함께 갱신 필요.
  'course-8': [
    { latitude: 37.5592, longitude: 126.9443 },
    { latitude: 37.5586, longitude: 126.9463 },
    { latitude: 37.5558, longitude: 126.9455 },
    { latitude: 37.5592, longitude: 126.9443 },
  ],
  // 월드컵공원 둘레길 루프. 남동쪽 모서리가 막다른 골목 안쪽이라 완전히 되돌아오는
  // 유턴이 발생해, 백범로 본선 위 지점으로 옮겨 해소.
  'course-9': [
    { latitude: 37.5473, longitude: 126.94038 },
    { latitude: 37.5557, longitude: 126.94038 },
    { latitude: 37.5557, longitude: 126.94962 },
    { latitude: 37.5445, longitude: 126.949 },
    { latitude: 37.5473, longitude: 126.94038 },
  ],
  // 홍제천 산책로: 원래 waypoint가 상류 지점을 찍고 거의 원점으로 돌아오는 형태였으므로
  // 그 왕복 구조를 그대로 살려 두 지점 사이 왕복으로 단순화.
  // 왕복 자체는 규칙상 허용되지만, 원래 상류 지점(37.55195,126.9386)이 백범로
  // 중앙분리대 횡단 지점과 맞지 않아 편도 구간 중간에 불필요한 유턴이 한 번 더
  // 발생했다. 상류 지점을 조금 당겨 그 유턴을 제거.
  'course-10': [
    { latitude: 37.54215, longitude: 126.933 },
    { latitude: 37.555, longitude: 126.9383 },
    { latitude: 37.54215, longitude: 126.933 },
  ],
  // 연희동 둘레길 루프.
  'course-11': [
    { latitude: 37.5467, longitude: 126.9197 },
    { latitude: 37.5537, longitude: 126.9197 },
    { latitude: 37.5537, longitude: 126.9287 },
    { latitude: 37.5467, longitude: 126.9287 },
    { latitude: 37.5467, longitude: 126.9197 },
  ],
  // 가좌역 코스(공원) 루프. 북동쪽 모서리 부근에서 월드컵북로12길/12안길 쪽
  // 막다른 구간을 찍고 그대로 되돌아오는 구간이 있어, 모서리를 관통로 위로 당겨 해소.
  'course-12': [
    { latitude: 37.5565, longitude: 126.9065 },
    { latitude: 37.5635, longitude: 126.9065 },
    { latitude: 37.5635, longitude: 126.9135 },
    { latitude: 37.5565, longitude: 126.9145 },
    { latitude: 37.5565, longitude: 126.9065 },
  ],
  // 서강대교 남단(강변) 선형 코스: 왕복.
  'course-13': [
    { latitude: 37.5682, longitude: 126.9162 },
    { latitude: 37.5864, longitude: 126.9098 },
    { latitude: 37.5682, longitude: 126.9162 },
  ],
  // mockMyRunningRoute(러닝 중 화면에 그려지는 "지금까지 뛴 경로") 전용.
  // mockCourses 안의 코스가 아니라 data/mock.ts에 독립적으로 선언된 배열이라
  // 아래에서 별도 치환 함수(replaceMyRunningRoute)로 처리한다.
  // 시작점은 기존 mock 좌표를 유지해 mockMeLocation과 같은 신촌/연세로 인근
  // 구역을 유지. 원래 끝점(37.561,126.9372)은 연세대 앞 지하보도 진입로에
  // 스냅되어 성산로 중앙분리대에서 그대로 되돌아오는 유턴(uturn)이 발생해,
  // 성산로 표면 도로 위 지점(37.5602,126.9365)으로 옮겨 해소.
  'my-running-route': [
    { latitude: 37.5589, longitude: 126.9345 },
    { latitude: 37.5602, longitude: 126.9365 },
  ],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 점(point)에서 (lineStart, lineEnd)를 잇는 직선까지의 수직 거리.
// lat/lng는 매우 좁은 범위 안에서만 비교하므로 평면 근사로 충분하다.
function perpendicularDistance(point, lineStart, lineEnd) {
  const { latitude: x, longitude: y } = point;
  const { latitude: x1, longitude: y1 } = lineStart;
  const { latitude: x2, longitude: y2 } = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const cross = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  return cross / Math.sqrt(lengthSquared);
}

// Ramer-Douglas-Peucker: 커브/회전 구간은 점을 더 많이, 직선 구간은 더 적게 남기는
// 곡률 인식 단순화. 인덱스 기준 균등 추출과 달리 경로의 실제 형태를 보존한다.
function douglasPeucker(points, epsilon) {
  if (points.length < 3) {
    return points;
  }

  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance <= epsilon) {
    return [first, last];
  }

  const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
  const right = douglasPeucker(points.slice(maxIndex), epsilon);
  return [...left.slice(0, -1), ...right];
}

// epsilon을 이분 탐색해 결과 점 개수가 [min, max] 범위에 들어오도록 조정한다.
// 원본 점 개수가 이미 max 이하라면 손실 없이 그대로 사용한다.
function samplePoints(points, min, max) {
  if (points.length <= max) {
    return points;
  }

  let low = 0;
  let high = 1; // 위도/경도 단위 — 이 범위의 경로엔 충분히 큰 상한
  let result = douglasPeucker(points, high);

  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2;
    const simplified = douglasPeucker(points, mid);
    result = simplified;

    if (simplified.length > max) {
      low = mid;
    } else if (simplified.length < min) {
      high = mid;
    } else {
      return simplified;
    }
  }

  return result;
}

async function fetchRoadRoute(waypoints, courseId) {
  const coords = waypoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM 응답 오류: ${data.code || 'unknown'}`);
  }

  const route = data.routes[0];
  console.log(`\n[fetch-routes] ${courseId} OSRM 응답 확인`);
  console.log(`  code: ${data.code}, 총 거리: ${(route.distance / 1000).toFixed(2)}km, 원본 포인트 수: ${route.geometry.coordinates.length}`);
  route.legs.forEach((leg, i) => {
    console.log(`  leg ${i}: ${leg.distance.toFixed(0)}m`);
  });
  const streetNames = [...new Set(route.legs.flatMap((leg) => leg.steps.map((s) => s.name).filter(Boolean)))];
  console.log(`  경유 도로명: ${streetNames.join(', ') || '(없음)'}`);

  const rawPoints = route.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  return samplePoints(rawPoints, SAMPLE_MIN, SAMPLE_MAX);
}

function formatCoordinatesBlock(points, indent = '      ') {
  const lines = points.map(
    (p) => `${indent}{ latitude: ${p.latitude}, longitude: ${p.longitude} },`,
  );
  const closingIndent = indent.slice(0, -2);
  return `[\n${lines.join('\n')}\n${closingIndent}]`;
}

// mock.ts 텍스트에서 특정 코스의 `coordinates: [ ... ]` 블록만 안전하게 치환한다.
// coordinates 배열 내부는 { } 객체만 있고 중첩 배열이 없으므로, `coordinates: [` 다음
// 첫 `]`까지가 항상 해당 배열의 끝이다.
function replaceCourseCoordinates(fileText, courseId, newPoints) {
  const idMarker = `id: '${courseId}',`;
  const idIndex = fileText.indexOf(idMarker);
  if (idIndex === -1) {
    throw new Error(`mock.ts에서 ${courseId}를 찾을 수 없음`);
  }

  const coordsKeyIndex = fileText.indexOf('coordinates: [', idIndex);
  if (coordsKeyIndex === -1) {
    throw new Error(`${courseId}의 coordinates 배열을 찾을 수 없음`);
  }

  const arrayStart = coordsKeyIndex + 'coordinates: '.length;
  const arrayEnd = fileText.indexOf(']', arrayStart) + 1;

  const before = fileText.slice(0, arrayStart);
  const after = fileText.slice(arrayEnd);
  return `${before}${formatCoordinatesBlock(newPoints)}${after}`;
}

// mockMyRunningRoute는 mockCourses 배열 안의 객체가 아니라
// `export const mockMyRunningRoute: LatLng[] = [ ... ];` 형태로 독립 선언되어 있어
// id 기반 replaceCourseCoordinates를 쓸 수 없다. 선언부를 직접 찾아 치환한다.
function replaceMyRunningRoute(fileText, newPoints) {
  const declMarker = 'export const mockMyRunningRoute: LatLng[] = ';
  const declIndex = fileText.indexOf(declMarker);
  if (declIndex === -1) {
    throw new Error('mock.ts에서 mockMyRunningRoute 선언을 찾을 수 없음');
  }

  const arrayStart = declIndex + declMarker.length;
  const arrayEnd = fileText.indexOf(']', arrayStart) + 1;

  const before = fileText.slice(0, arrayStart);
  const after = fileText.slice(arrayEnd);
  return `${before}${formatCoordinatesBlock(newPoints, '  ')}${after}`;
}

async function main() {
  // 개발 편의용: `node scripts/fetch-routes.js course-2` 처럼 인자를 주면 해당 코스만 처리.
  const onlyCourseIds = process.argv.slice(2);
  const entries = Object.entries(COURSE_WAYPOINTS).filter(
    ([courseId]) => onlyCourseIds.length === 0 || onlyCourseIds.includes(courseId),
  );

  let fileText = fs.readFileSync(MOCK_FILE, 'utf8');
  const results = [];

  for (const [courseId, waypoints] of entries) {
    try {
      const roadPoints = await fetchRoadRoute(waypoints, courseId);
      fileText = courseId === 'my-running-route'
        ? replaceMyRunningRoute(fileText, roadPoints)
        : replaceCourseCoordinates(fileText, courseId, roadPoints);
      results.push({ courseId, status: 'ok', count: roadPoints.length });
    } catch (error) {
      console.error(`[fetch-routes] ${courseId} 실패, 기존 좌표 유지: ${error.message}`);
      results.push({ courseId, status: 'failed', reason: error.message });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync(MOCK_FILE, fileText, 'utf8');

  console.log('\n=== fetch-routes 결과 요약 ===');
  for (const result of results) {
    if (result.status === 'ok') {
      console.log(`  ${result.courseId}: 성공 (${result.count}개 포인트)`);
    } else {
      console.log(`  ${result.courseId}: 실패 - ${result.reason} (기존 좌표 유지)`);
    }
  }
}

main().catch((error) => {
  console.error('[fetch-routes] 스크립트 실행 중 예상치 못한 오류:', error);
  process.exitCode = 1;
});
