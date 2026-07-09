// 코스 좌표 품질 검증 스크립트 (읽기 전용, mock.ts를 수정하지 않음).
//
// 검증 규칙:
//   1. (참고용, 네트워크 필요) 실제 도로/보행로 기반 여부는 이 스크립트만으로는 증명하지 못한다.
//      대신 아래 2~4번 규칙 위반 여부로 "손으로 그린 좌표일 가능성"을 강하게 추정한다.
//   2. 한 번 지나간 도로(edge)는 원칙적으로 다시 지나가지 않는다. 왕복(out-and-back) 코스는 예외.
//   3. 급격한 방향 전환(유턴급, 막다른 길 왕복)이 없어야 한다. 왕복 코스의 "회차 지점" 1곳은 예외.
//   4. 실제 거리(좌표 기반 haversine 합)와 표시 거리(distanceKm)가 크게 다르지 않아야 한다 (±15% 초과 시 경고).
//
// 실행: node scripts/analyze-routes.js [course-id ...]

const fs = require('fs');
const path = require('path');

const MOCK_FILE = path.join(__dirname, '..', 'data', 'mock.ts');
const EDGE_PRECISION = 5; // 소수 5자리 ≈ 1.1m. 같은 도로 구간으로 볼 반올림 정밀도.
const SHARP_TURN_DEG = 150; // 이 각도(진행방향 변화량) 이상이면 유턴급으로 간주.
const DISTANCE_TOLERANCE = 0.15; // distanceKm 대비 허용 오차율.

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDeg(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function angleDiffDeg(a, b) {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function edgeKey(a, b) {
  const ka = `${a.latitude.toFixed(EDGE_PRECISION)},${a.longitude.toFixed(EDGE_PRECISION)}`;
  const kb = `${b.latitude.toFixed(EDGE_PRECISION)},${b.longitude.toFixed(EDGE_PRECISION)}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

// 좌표 배열이 "A ... B ... A" 형태의 왕복(out-and-back)인지 판별.
// 뒷부분이 앞부분을 역순으로 (근사) 그대로 되짚는 형태면 true, 그리고 회차 지점 인덱스를 반환.
function detectOutAndBack(points) {
  const n = points.length;
  const closeEnoughM = 15;
  // 절반 지점 부근에서 각 i에 대해 points[i] ~= points[n-1-i] 인지 확인
  let mismatches = 0;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const d = haversineMeters(points[i], points[n - 1 - i]);
    if (d > closeEnoughM) mismatches++;
  }
  const isMirror = mismatches <= Math.max(1, Math.floor(half * 0.1));
  return { isMirror, turnaroundIndex: isMirror ? Math.floor((n - 1) / 2) : -1 };
}

// 루프 코스가 "시작점 진입/이탈용 짧은 접속로(spur)"를 공유하는 경우를 감지.
// points[1]≈points[n-2], points[2]≈points[n-3] ... 식으로 바깥쪽부터 몇 개의 인덱스 쌍이
// 거울 대칭인지 세어, 그 구간(진입로를 그대로 되짚어 나가는 구간)은 "재사용" 위반에서 제외한다.
// 실제 도로망에서 루프 진입점이 출발지와 정확히 일치하지 않을 때 자연스럽게 발생하는 패턴이다.
function detectEntryExitSpur(points) {
  const n = points.length;
  const closeEnoughM = 15;
  const half = Math.floor(n / 2);
  let k = 0;
  while (k < half - 1 && haversineMeters(points[k], points[n - 1 - k]) < closeEnoughM) {
    k++;
  }
  return k; // k개의 선행 edge(0..k-1 <-> n-1-k..n-1)가 spur로 간주됨
}

function analyzeCourse(course) {
  const { id, name, coordinates: pts, distanceKm } = course;
  const issues = [];

  // 규칙 4: 실제 거리 vs distanceKm
  let totalM = 0;
  for (let i = 0; i < pts.length - 1; i++) totalM += haversineMeters(pts[i], pts[i + 1]);
  const actualKm = totalM / 1000;
  const diffRatio = Math.abs(actualKm - distanceKm) / distanceKm;
  if (diffRatio > DISTANCE_TOLERANCE) {
    issues.push(
      `[거리 불일치] 실제 ${actualKm.toFixed(2)}km vs 라벨 ${distanceKm}km (오차 ${(diffRatio * 100).toFixed(0)}%)`,
    );
  }

  const isClosedLoop = haversineMeters(pts[0], pts[pts.length - 1]) < 15;
  const { isMirror, turnaroundIndex } = detectOutAndBack(pts);
  // 루프 시작/종료가 공유하는 짧은 진입·이탈 접속로(spur) — 왕복 회차 지점과 동일한 이유로 예외 허용.
  const spurK = isClosedLoop && !isMirror ? detectEntryExitSpur(pts) : 0;
  const n = pts.length;
  const isSpurEdge = (i) => spurK > 0 && (i < spurK || i >= n - 1 - spurK);
  const isSpurVertex = (i) => spurK > 0 && (i < spurK || i > n - 1 - spurK);

  // 규칙 2: 반복 edge (왕복 코스의 거울 구간, 루프의 진입·이탈 spur는 허용된 반복이므로 제외)
  const edgeCount = new Map();
  for (let i = 0; i < pts.length - 1; i++) {
    if (isMirror && i >= turnaroundIndex) continue;
    if (isSpurEdge(i)) continue;
    const key = edgeKey(pts[i], pts[i + 1]);
    edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
  }
  const reusedEdges = [...edgeCount.entries()].filter(([, c]) => c > 1);
  if (reusedEdges.length > 0) {
    const detail = reusedEdges
      .map(([key]) => {
        const [a, b] = key.split('|');
        return `(${a})-(${b})`;
      })
      .join(', ');
    issues.push(`[도로 재사용] 동일 구간을 ${reusedEdges.length}개 edge에서 반복 통과: ${detail}`);
  }

  // 규칙 3: 급격한 방향 전환 (왕복 코스의 회차 지점, 루프 진입·이탈 spur 지점은 예외)
  const sharpTurns = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (isMirror && i === turnaroundIndex) continue; // 의도된 회차 지점
    if (isSpurVertex(i)) continue; // 의도된 진입·이탈 접속로
    const b1 = bearingDeg(pts[i - 1], pts[i]);
    const b2 = bearingDeg(pts[i], pts[i + 1]);
    const turn = angleDiffDeg(b1, b2);
    if (turn >= SHARP_TURN_DEG) {
      sharpTurns.push({ index: i, turn: turn.toFixed(0), point: pts[i] });
    }
  }
  if (sharpTurns.length > 0) {
    issues.push(
      `[급격한 방향전환] ${sharpTurns.length}곳: ` +
        sharpTurns
          .map((t) => `idx${t.index}(${t.turn}°, ${t.point.latitude.toFixed(5)},${t.point.longitude.toFixed(5)})`)
          .join(', '),
    );
  }

  return {
    id,
    name,
    pointCount: pts.length,
    actualKm: actualKm.toFixed(2),
    distanceKm,
    isClosedLoop,
    isMirror,
    spurK,
    issues,
  };
}

function parseCoursesFromMockTs(fileText) {
  // mockCourses 배열 블록만 추출 (featuredCourse 이전까지)
  const startMarker = 'export const mockCourses: Course[] = [';
  const start = fileText.indexOf(startMarker);
  const end = fileText.indexOf('\nexport const featuredCourse');
  const block = fileText.slice(start + startMarker.length, end);

  const courseRegex = /id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*coordinates:\s*\[([\s\S]*?)\],\s*category:\s*'([^']+)',\s*difficulty:\s*(\d),\s*distanceKm:\s*([\d.]+)/g;

  const courses = [];
  let m;
  while ((m = courseRegex.exec(block)) !== null) {
    const [, id, name, coordsBlock, , , distanceKm] = m;
    const coordRegex = /\{\s*latitude:\s*(-?[\d.]+),\s*longitude:\s*(-?[\d.]+)\s*\}/g;
    const coordinates = [];
    let cm;
    while ((cm = coordRegex.exec(coordsBlock)) !== null) {
      coordinates.push({ latitude: parseFloat(cm[1]), longitude: parseFloat(cm[2]) });
    }
    courses.push({ id, name, coordinates, distanceKm: parseFloat(distanceKm) });
  }
  return courses;
}

function main() {
  const onlyIds = process.argv.slice(2);
  const fileText = fs.readFileSync(MOCK_FILE, 'utf8');
  const courses = parseCoursesFromMockTs(fileText).filter(
    (c) => onlyIds.length === 0 || onlyIds.includes(c.id),
  );

  console.log(`총 ${courses.length}개 코스 분석\n`);

  let problemCount = 0;
  for (const course of courses) {
    const result = analyzeCourse(course);
    const status = result.issues.length === 0 ? 'OK' : 'FAIL';
    if (result.issues.length > 0) problemCount++;
    console.log(
      `[${status}] ${result.id} (${result.name}) — 포인트 ${result.pointCount}개, 실거리 ${result.actualKm}km / 라벨 ${result.distanceKm}km, ${result.isClosedLoop ? '루프' : result.isMirror ? '왕복' : '편도(?)'}`,
    );
    for (const issue of result.issues) {
      console.log(`    - ${issue}`);
    }
  }

  console.log(`\n=== 요약: ${problemCount}/${courses.length}개 코스에서 문제 발견 ===`);
}

main();
