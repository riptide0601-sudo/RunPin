// 개발 전용 1회성 마이그레이션 스크립트 (이미 실행 완료, 재실행 시 옛 detourVariant 구조를 찾지
// 못해 안전하게 에러를 던지고 종료한다 — data/mock.ts는 이미 이 스크립트의 결과물임).
//
// 목적: 그룹 멤버(관련 코스) 좌표를 임의 오프셋(옛 detourVariant)이 아니라, 각 대표 코스가 이미
// scripts/fetch-routes.js로 검증해둔 실제 도로 좌표의 "부분 구간"(편도 코스) 또는
// "부분 구간 + 미러링"(왕복/루프 코스)으로 생성한다. 두 경우 모두 대표 코스가 이미 지나간 실제
// 도로의 부분집합이므로 100% 실제 도로이고, 미러링 구조상 자기교차가 원천적으로 불가능하다.
// 네트워크 호출 없음(OSRM 재조회 불필요) — scripts/analyze-routes.js로 사후 검증했다.
//
// 실행: node scripts/generate-course-groups.js

const fs = require('fs');
const path = require('path');

const MOCK_FILE = path.join(__dirname, '..', 'data', 'mock.ts');

const text = fs.readFileSync(MOCK_FILE, 'utf8');

function extractArrayLiteral(str, fromIndex) {
  let depth = 0;
  for (let i = fromIndex; i < str.length; i++) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') {
      depth--;
      if (depth === 0) return str.slice(fromIndex, i + 1);
    }
  }
  throw new Error('unterminated array from index ' + fromIndex);
}

function parseCoordsBlock(block) {
  const re = /\{\s*latitude:\s*(-?[\d.]+),\s*longitude:\s*(-?[\d.]+)\s*\}/g;
  const pts = [];
  let m;
  while ((m = re.exec(block))) pts.push({ latitude: parseFloat(m[1]), longitude: parseFloat(m[2]) });
  return pts;
}

const banpoDeclIdx = text.indexOf('const BANPO_COORDINATES');
const banpoEqIdx = text.indexOf('= [', banpoDeclIdx);
const banpoArrStart = banpoEqIdx + 2;
const BANPO = parseCoordsBlock(extractArrayLiteral(text, banpoArrStart));
if (BANPO.length === 0) throw new Error('BANPO_COORDINATES parse failed');

function getRepCoordinates(courseId) {
  if (courseId === 'course-3') return BANPO;
  const idMarker = `id: '${courseId}',`;
  const idIdx = text.indexOf(idMarker);
  if (idIdx === -1) throw new Error('course not found: ' + courseId);
  const coordsKeyIdx = text.indexOf('coordinates:', idIdx);
  const after = text.slice(coordsKeyIdx + 'coordinates:'.length).trimStart();
  if (!after.startsWith('[')) throw new Error('unexpected coordinates form for ' + courseId);
  const arrStart = text.indexOf('[', coordsKeyIdx);
  const pts = parseCoordsBlock(extractArrayLiteral(text, arrStart));
  if (pts.length === 0) throw new Error('empty coordinates parsed for ' + courseId);
  return pts;
}

// ---- geometry helpers ----

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathDistanceKm(points) {
  let totalM = 0;
  for (let i = 0; i < points.length - 1; i++) totalM += haversineMeters(points[i], points[i + 1]);
  return Math.round((totalM / 1000) * 10) / 10;
}

// 왕복/루프 대표 코스의 "왕복 절반"(outbound leg)만 추출.
function outboundLeg(base) {
  return base.slice(0, Math.ceil(base.length / 2));
}

// outbound 중 turnaroundFraction 지점까지만 나갔다가 그대로 미러링해 돌아오는 좌표를 만든다.
// base 전체가 이미 실제 도로이므로 부분집합 + 미러는 항상 실제 도로 & 자기교차 불가.
function mirroredSubPath(outbound, turnaroundFraction) {
  const cutIndex = Math.max(1, Math.round((outbound.length - 1) * turnaroundFraction));
  const outSegment = outbound.slice(0, cutIndex + 1);
  const backSegment = outSegment.slice(0, -1).reverse();
  return [...outSegment, ...backSegment];
}

// 편도/선형 대표 코스의 연속된 부분 구간만 슬라이스 (미러링 없음).
function subPath(base, startFraction, endFraction) {
  const startIndex = Math.floor(base.length * startFraction);
  const endIndex = Math.max(startIndex + 2, Math.floor(base.length * endFraction));
  return base.slice(startIndex, Math.min(endIndex, base.length - 1) + 1);
}

// ---- uploader name pool ----
const UPLOADER_POOL = [
  '러너콘', '한강러너', '지현', '지수', '민수', '하늘', '서연', '유진', '태호', '미래',
  '준영', '소민', '서준', '다은', '현우', '예린', '도윤', '수아', '지훈', '나연',
  '성민', '유나', '재현', '소율', '민준', '하람', '지우', '연우', '다현', '시우', '채원',
];

let nameCursor = 0;
function nextUploaderName(avoid) {
  for (let tries = 0; tries < UPLOADER_POOL.length; tries++) {
    const name = UPLOADER_POOL[nameCursor % UPLOADER_POOL.length];
    nameCursor++;
    if (!avoid || !avoid.has(name)) return name;
  }
  return UPLOADER_POOL[nameCursor % UPLOADER_POOL.length];
}

// ---- group specs ----
// type: 'mirror' (왕복 대표), 'loop' (닫힌 루프 대표), 'linear' (편도 대표)
// members: 기존 id 재생성 + 신규 id 추가, 목표 개수(existing 유지 + new 추가) = 2/4/6
const GROUP_SPECS = [
  {
    repId: 'course-1', type: 'loop', category: '공원', repLikeCount: 1024,
    members: [
      { id: 'course-24', fraction: 0.35, likeCount: 410, difficulty: 3 },
      { id: 'course-25', fraction: 0.5, likeCount: 180, difficulty: 5 },
      { id: 'course-47', fraction: 0.65, likeCount: 260, difficulty: 2 },
      { id: 'course-48', fraction: 0.8, likeCount: 95, difficulty: 4 },
    ],
  },
  {
    repId: 'course-2', type: 'linear', category: '숲길', repLikeCount: 512,
    members: [
      { id: 'course-26', range: [0.15, 0.55], likeCount: 260, difficulty: 2 },
      { id: 'course-49', range: [0.4, 0.85], likeCount: 150, difficulty: 4 },
    ],
  },
  {
    repId: 'course-3', type: 'mirror', category: '강변', repLikeCount: 890,
    members: [
      { id: 'course-21', fraction: 0.9, likeCount: 430, difficulty: 2 },
      { id: 'course-22', fraction: 0.8, likeCount: 210, difficulty: 4 },
      { id: 'course-23', fraction: 0.7, likeCount: 75, difficulty: 3 },
      { id: 'course-31', fraction: 0.6, likeCount: 320, difficulty: 5 },
      { id: 'course-50', fraction: 0.5, likeCount: 200, difficulty: 1 },
      { id: 'course-51', fraction: 0.4, likeCount: 130, difficulty: 3 },
    ],
  },
  {
    repId: 'course-4', type: 'mirror', category: '하천', repLikeCount: 305,
    members: [
      { id: 'course-32', fraction: 0.85, likeCount: 180, difficulty: 2 },
      { id: 'course-33', fraction: 0.7, likeCount: 95, difficulty: 4 },
      { id: 'course-52', fraction: 0.55, likeCount: 140, difficulty: 1 },
      { id: 'course-53', fraction: 0.4, likeCount: 60, difficulty: 3 },
    ],
  },
  {
    repId: 'course-5', type: 'loop', category: '공원', repLikeCount: 640,
    members: [
      { id: 'course-34', fraction: 0.8, likeCount: 410, difficulty: 3 },
      { id: 'course-35', fraction: 0.65, likeCount: 260, difficulty: 1 },
      { id: 'course-54', fraction: 0.5, likeCount: 180, difficulty: 4 },
      { id: 'course-55', fraction: 0.35, likeCount: 95, difficulty: 2 },
    ],
  },
  {
    repId: 'course-6', type: 'linear', category: '숲길', repLikeCount: 130,
    members: [
      { id: 'course-36', range: [0.1, 0.6], likeCount: 70, difficulty: 2 },
      { id: 'course-56', range: [0.35, 0.9], likeCount: 45, difficulty: 4 },
    ],
  },
  {
    repId: 'course-7', type: 'loop', category: '강변', repLikeCount: 270,
    members: [
      { id: 'course-30', fraction: 0.7, likeCount: 150, difficulty: 2 },
      { id: 'course-57', fraction: 0.5, likeCount: 90, difficulty: 4 },
    ],
  },
  {
    repId: 'course-8', type: 'mirror', category: '골목길', repLikeCount: 110,
    members: [
      { id: 'course-37', fraction: 0.75, likeCount: 60, difficulty: 2 },
      { id: 'course-58', fraction: 0.55, likeCount: 35, difficulty: 4 },
    ],
  },
  {
    repId: 'course-9', type: 'loop', category: '공원', repLikeCount: 580,
    members: [
      { id: 'course-27', fraction: 0.85, likeCount: 320, difficulty: 2 },
      { id: 'course-28', fraction: 0.72, likeCount: 205, difficulty: 4 },
      { id: 'course-29', fraction: 0.6, likeCount: 140, difficulty: 3 },
      { id: 'course-59', fraction: 0.48, likeCount: 230, difficulty: 1 },
      { id: 'course-60', fraction: 0.36, likeCount: 160, difficulty: 5 },
      { id: 'course-61', fraction: 0.24, likeCount: 100, difficulty: 2 },
    ],
  },
  {
    repId: 'course-10', type: 'mirror', category: '하천', repLikeCount: 190,
    members: [
      { id: 'course-38', fraction: 0.85, likeCount: 120, difficulty: 1 },
      { id: 'course-39', fraction: 0.7, likeCount: 85, difficulty: 3 },
      { id: 'course-62', fraction: 0.55, likeCount: 150, difficulty: 2 },
      { id: 'course-63', fraction: 0.4, likeCount: 60, difficulty: 4 },
    ],
  },
  {
    repId: 'course-11', type: 'loop', category: '둘레길', repLikeCount: 240,
    members: [
      { id: 'course-40', fraction: 0.75, likeCount: 150, difficulty: 4 },
      { id: 'course-64', fraction: 0.55, likeCount: 90, difficulty: 2 },
    ],
  },
  {
    repId: 'course-12', type: 'loop', category: '공원', repLikeCount: 95,
    members: [
      { id: 'course-41', fraction: 0.75, likeCount: 55, difficulty: 2 },
      { id: 'course-65', fraction: 0.55, likeCount: 35, difficulty: 4 },
    ],
  },
  {
    repId: 'course-14', type: 'loop', category: '골목길', repLikeCount: 80,
    members: [
      { id: 'course-42', fraction: 0.8, likeCount: 45, difficulty: 1 },
      { id: 'course-66', fraction: 0.65, likeCount: 60, difficulty: 3 },
      { id: 'course-67', fraction: 0.5, likeCount: 35, difficulty: 5 },
      { id: 'course-68', fraction: 0.35, likeCount: 20, difficulty: 2 },
    ],
  },
  {
    repId: 'course-15', type: 'mirror', category: '골목길', repLikeCount: 70,
    members: [
      { id: 'course-43', fraction: 0.75, likeCount: 40, difficulty: 3 },
      { id: 'course-69', fraction: 0.55, likeCount: 25, difficulty: 1 },
    ],
  },
  {
    repId: 'course-17', type: 'loop', category: '하천', repLikeCount: 55,
    members: [
      { id: 'course-44', fraction: 0.75, likeCount: 30, difficulty: 1 },
      { id: 'course-70', fraction: 0.55, likeCount: 18, difficulty: 3 },
    ],
  },
  {
    repId: 'course-18', type: 'loop', category: '숲길', repLikeCount: 45,
    members: [
      { id: 'course-45', fraction: 0.75, likeCount: 25, difficulty: 2 },
      { id: 'course-71', fraction: 0.55, likeCount: 15, difficulty: 4 },
    ],
  },
  {
    repId: 'course-20', type: 'loop', category: '골목길', repLikeCount: 25,
    members: [
      { id: 'course-46', fraction: 0.75, likeCount: 15, difficulty: 1 },
      { id: 'course-72', fraction: 0.55, likeCount: 9, difficulty: 3 },
    ],
  },
];

const REP_NAMES = {
  'course-1': '몽마르뜨공원', 'course-2': '경의선숲길', 'course-3': '한강 반포지구',
  'course-4': '안양천 러닝코스', 'course-5': '보라매공원', 'course-6': '연남동 경의선 확장코스',
  'course-7': '망원한강공원 러닝코스', 'course-8': '성산동 골목길 코스', 'course-9': '월드컵공원 둘레길',
  'course-10': '홍제천 산책로', 'course-11': '연희동 둘레길', 'course-12': '가좌역 코스',
  'course-14': '신수동 골목길 코스', 'course-15': '서강대 캠퍼스길', 'course-17': '불광천 산책로',
  'course-18': '성미산 자락길', 'course-20': '창천동 명물길 코스',
};

// 대표 코스 uploaderName도 이 스크립트에서 한 번에 배정(멤버와 겹치지 않게 그룹별로 확인).
const repUpdates = [];
const repUploaderById = {};
for (const spec of GROUP_SPECS) {
  repUploaderById[spec.repId] = nextUploaderName();
}
// 그룹 없는 단일 코스(13,16,19)에도 업로더 배정.
for (const id of ['course-13', 'course-16', 'course-19']) {
  repUploaderById[id] = nextUploaderName();
  repUpdates.push({ repId: id, uploaderName: repUploaderById[id] });
}

function formatCoordinatesBlock(points, indent) {
  const lines = points.map((p) => `${indent}{ latitude: ${p.latitude}, longitude: ${p.longitude} },`);
  const closingIndent = indent.slice(0, -2);
  return `[\n${lines.join('\n')}\n${closingIndent}]`;
}

const memberBlocks = [];

for (const spec of GROUP_SPECS) {
  const repCoords = getRepCoordinates(spec.repId);
  const outbound = spec.type === 'linear' ? null : outboundLeg(repCoords);
  const usedNames = new Set([repUploaderById[spec.repId]]);

  const memberEntries = spec.members.map((m) => {
    const coords =
      spec.type === 'linear' ? subPath(repCoords, m.range[0], m.range[1]) : mirroredSubPath(outbound, m.fraction);
    const distanceKm = pathDistanceKm(coords);
    let uploaderName = nextUploaderName(usedNames);
    usedNames.add(uploaderName);
    return { ...m, coords, distanceKm, uploaderName };
  });

  repUpdates.push({ repId: spec.repId, uploaderName: repUploaderById[spec.repId] });

  for (const m of memberEntries) {
    const block =
      `  {\n` +
      `    id: '${m.id}',\n` +
      `    name: '${REP_NAMES[spec.repId]}',\n` +
      `    coordinates: ${formatCoordinatesBlock(m.coords, '      ')},\n` +
      `    category: '${spec.category}',\n` +
      `    difficulty: ${m.difficulty},\n` +
      `    distanceKm: ${m.distanceKm},\n` +
      `    uploaderName: '${m.uploaderName}',\n` +
      `    likeCount: ${m.likeCount},\n` +
      `  },`;
    memberBlocks.push({ id: m.id, repId: spec.repId, block });
  }
}

console.log('=== REP_UPLOADER_UPDATES (JSON) ===');
console.log(JSON.stringify(repUpdates, null, 2));

console.log('\n=== SUMMARY ===');
for (const spec of GROUP_SPECS) {
  console.log(`${spec.repId} (${REP_NAMES[spec.repId]}): ${spec.members.length + 1}명 그룹 (대표 1 + 멤버 ${spec.members.length})`);
}
console.log('총 코스 수 =', GROUP_SPECS.reduce((sum, s) => sum + 1 + s.members.length, 0) + 3, '(그룹없는 3개 포함)');
console.log('repUpdates.length =', repUpdates.length, '(should be 20)');

// ==========================================================================
// ---- apply patch to mock.ts (재실행 시 아래 anchor를 못 찾으면 에러로 안전 종료) ----
// ==========================================================================

let newText = text;

// 1) rep 코스 20개에 uploaderName 삽입 (해당 코스 블록 안의 첫 `likeCount:` 줄 앞에 삽입)
for (const { repId, uploaderName } of repUpdates) {
  const idMarker = `id: '${repId}',`;
  const idIdx = newText.indexOf(idMarker);
  if (idIdx === -1) throw new Error('rep id not found in text: ' + repId);
  const likeCountIdx = newText.indexOf('likeCount:', idIdx);
  if (likeCountIdx === -1) throw new Error('likeCount not found for: ' + repId);
  const lineStart = newText.lastIndexOf('\n', likeCountIdx) + 1;
  const insertion = `    uploaderName: '${uploaderName}',\n`;
  newText = newText.slice(0, lineStart) + insertion + newText.slice(lineStart);
}

// 2) detourVariant 헬퍼 함수(+안내 주석) 통째로 제거 — 이제 모든 좌표가 정적 리터럴이라 런타임 헬퍼 불필요.
const detourCommentStart = newText.indexOf('// 관련 코스(같은 이름 그룹의 멤버)');
const coordsCommentStart = newText.indexOf('// coordinates는 scripts/fetch-routes.js가');
if (detourCommentStart === -1 || coordsCommentStart === -1 || coordsCommentStart < detourCommentStart) {
  throw new Error('detourVariant 블록 경계를 찾지 못함 (이미 마이그레이션된 mock.ts일 수 있음)');
}
newText = newText.slice(0, detourCommentStart) + newText.slice(coordsCommentStart);

// 3) 기존 "관련 코스 추가" 3개 섹션(인라인 21/22/23/31 + courseById + push 2개)을
//    새로 생성한 멤버 블록 하나로 통째 교체.
const oldMembersSectionStart = newText.indexOf('// 동일 이름 코스 그룹 기능 테스트용:');
const featuredConstIdx = newText.indexOf('\nexport const featuredCourse');
if (oldMembersSectionStart === -1 || featuredConstIdx === -1) {
  throw new Error('멤버 섹션 경계를 찾지 못함 (이미 마이그레이션된 mock.ts일 수 있음)');
}
const sectionLineStart = newText.lastIndexOf('\n', oldMembersSectionStart) + 1;

const newMembersSection =
  `];\n\n` +
  `// 관련 코스(그룹 멤버) 좌표는 각 대표 코스가 이미 실제 도로(OSRM) 기반으로 검증된 좌표를 갖고 있다는\n` +
  `// 점을 이용해, 그 좌표 배열의 부분 구간만 사용하거나(편도 코스) 부분 구간을 그대로 미러링(왕복/루프\n` +
  `// 코스)해서 만든다. 두 경우 모두 대표 코스가 이미 지나간 실제 도로의 부분집합이므로 100% 실제 도로이고,\n` +
  `// 미러링 구조상 자기교차가 원천적으로 불가능하다(scripts/generate-course-groups.js로 생성, 좌표 자체는\n` +
  `// 정적 리터럴로 저장). 그룹 크기는 0개(course-13/16/19, 캐러셀 없이 단순 선택)~2개~4개~6개로 다양화했다.\n` +
  `mockCourses.push(\n` +
  memberBlocks.map((b) => b.block).join('\n') +
  `\n);\n`;

newText = newText.slice(0, sectionLineStart) + newMembersSection + newText.slice(featuredConstIdx);

fs.writeFileSync(MOCK_FILE, newText, 'utf8');
console.log('\nmock.ts 패치 적용 완료. 총 길이:', newText.length);
