// [측정 A] 랭킹 숫자 불일치 (35b8cb7 → 0adeafc → a319af3)
// 당시 랭킹은 데이터 소스가 둘이었다.
//   - 정렬 기준: mockRankingsByPeriod[기간][].likeCount  (기간별 랭킹용 하드코딩 수치)
//   - 코스 실제값: mockCourses[].likeCount               (코스 상세·홈이 쓰는 값)
// 35b8cb7은 "표시"만 course.likeCount로 바꿨고 정렬은 entry.likeCount에 그대로 둬서
// 순위와 표시 숫자가 어긋났다. 그 어긋남의 규모를 당시 데이터로 센다.
const { execFileSync } = require('node:child_process');

const REPO = require('node:path').join(__dirname, '..');
const src = execFileSync('git', ['-C', REPO, 'show', '35b8cb7:data/mock.ts'], { encoding: 'utf8', maxBuffer: 20e6 });

// mockCourses의 id → likeCount
const coursesBlock = src.slice(src.indexOf('export const mockCourses'), src.indexOf('\nexport const', src.indexOf('export const mockCourses') + 10));
const courseLike = {}, courseName = {};
for (const m of coursesBlock.matchAll(/id: '(course-\d+)'[\s\S]*?name: '([^']+)'[\s\S]*?(?:likeCount: (\d+),)?\n  \},/g)) {
  courseLike[m[1]] = m[3] === undefined ? null : +m[3];
  courseName[m[1]] = m[2];
}
// 위 정규식이 놓치는 경우 보강: 코스 블록을 id 기준으로 쪼개 직접 파싱
const chunks = coursesBlock.split(/\n  \{\n/).slice(1);
for (const c of chunks) {
  const id = (c.match(/id: '(course-\d+)'/) || [])[1];
  if (!id) continue;
  courseName[id] = (c.match(/name: '([^']+)'/) || [])[1];
  const lc = c.match(/likeCount: (\d+)/);
  courseLike[id] = lc ? +lc[1] : null;
}

// mockRankingsByPeriod
const rankBlock = src.slice(src.indexOf('export const mockRankingsByPeriod'));
const periods = {};
for (const p of ['monthly', 'yearly', 'all']) {
  const i = rankBlock.indexOf(`\n  ${p}: [`);
  const j = rankBlock.indexOf('\n  ],', i);
  periods[p] = [...rankBlock.slice(i, j).matchAll(/rank: (\d+), courseId: '([^']+)', courseName: '([^']+)', uploaderName: '[^']*', likeCount: (\d+)/g)]
    .map((m) => ({ rank: +m[1], courseId: m[2], name: m[3], entryLike: +m[4] }));
}

let totalEntries = 0, mismatched = 0, maxGap = null, invPairs = 0, totalPairs = 0;
console.log('기간    순위 코스                 정렬기준(entry)  표시값(course)  일치');
for (const [p, list] of Object.entries(periods)) {
  for (const e of list) {
    const shown = courseLike[e.courseId];
    const same = shown === e.entryLike;
    totalEntries++;
    if (!same) mismatched++;
    const gap = shown === null ? null : Math.abs(e.entryLike - shown);
    if (gap !== null && (maxGap === null || gap > maxGap.gap)) maxGap = { gap, p, ...e, shown };
    console.log(`${p.padEnd(7)} ${String(e.rank).padStart(2)}  ${e.name.padEnd(20)} ${String(e.entryLike).padStart(8)} ${String(shown).padStart(14)}  ${same ? 'O' : 'X'}`);
  }
  // 35b8cb7 상태에서 화면상 "앞 순위인데 표시 숫자가 더 작은" 역전 쌍
  for (let i = 1; i < list.length; i++) {
    const prev = courseLike[list[i - 1].courseId], cur = courseLike[list[i].courseId];
    if (prev === null || cur === null) continue;
    totalPairs++;
    if (prev < cur) invPairs++;
  }
}
console.log('\n--- 결과 ---');
console.log(`랭킹 엔트리 총수: ${totalEntries}개 (monthly/yearly/all 각 10개)`);
console.log(`정렬기준과 표시값이 다른 엔트리: ${mismatched}개 (${((mismatched / totalEntries) * 100).toFixed(1)}%)`);
console.log(`최대 괴리: ${maxGap.p} ${maxGap.rank}위 ${maxGap.name} — 정렬 ${maxGap.entryLike} vs 표시 ${maxGap.shown} (차이 ${maxGap.gap})`);
console.log(`인접 순위 쌍 중 "앞 순위가 더 작은 숫자로 표시"되는 역전: ${invPairs}/${totalPairs}쌍 (${((invPairs / totalPairs) * 100).toFixed(1)}%)`);
console.log(`a319af3 이후: 정렬·표시가 course.likeCount 하나뿐 → 불일치 가능 엔트리 0개 (구조적으로 0%)`);
require('node:fs').writeFileSync('result-ranking.json', JSON.stringify({ totalEntries, mismatched, invPairs, totalPairs, maxGap, periods, courseLike }, null, 1));
