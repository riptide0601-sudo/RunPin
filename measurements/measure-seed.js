// [측정 B] 시연 데이터 적재 오판 (563d0fe → 542a350 → 3cf081f)
// 적재 대상(실측): 파클로즈 소유 mock 코스 6개 = 한강 반포지구 ×5, 보라매공원 ×1
//   (mockCourses 등장 순서: course-22,23,31,50,51 = 한강 반포지구 / course-54 = 보라매공원)
// 각 코스마다 courses 문서 1개 + runLogs 문서 1개를 만든다 → 완전 적재 시 12개 문서.
//
// 판정 로직 4버전을 저장소 코드 그대로 모델링한다.
//   v0 (ff82ecd)  : appData가 "올린 코스가 하나라도 있으면 스킵". 루프에 코스별 try/catch 없음
//   v1 (563d0fe)  : 이름 Set 기준 "그 이름이 있으면 있다고 판정". try/catch 없음
//   v1b(542a350)  : 이름 Set 기준 + 코스별 try/catch (하나 실패해도 다음 코스 계속)
//   v2 (3cf081f)  : 이름별 개수 Map 기준으로 부족분만 생성 + 코스별 try/catch
//
// 실패 주입: 커밋 기록상 중간 실패(permission-denied 등)가 실제로 있었으므로
//   "1회차 실행의 3번째 항목에서 1번 실패"를 가정하고, 이후 재로그인(재실행)을 반복한다.
//   ※ 실패 지점 자체는 모델링한 가정이며 관측값이 아니다. 판정 로직은 저장소 실제 로직이다.
const SOURCE = ['한강 반포지구', '한강 반포지구', '한강 반포지구', '한강 반포지구', '한강 반포지구', '보라매공원'];
const TOTAL_DOCS = SOURCE.length * 2;
const FAIL_AT_INDEX = 2; // 0-based. 1회차 3번째 항목에서 실패

function run(version, runs = 3) {
  const courses = [], runLogs = [];
  let failedOnce = false;
  for (let r = 1; r <= runs; r++) {
    // --- 게이트/판정 ---
    if (version === 'v0' && courses.length > 0) continue; // 하나라도 있으면 전체 스킵
    const nameSet = new Set(courses);
    const countMap = courses.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
    const logCountMap = runLogs.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
    const needByName = SOURCE.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());

    if (version === 'v2') {
      // 이름별 부족분만 생성
      for (const [name, need] of needByName) {
        const missC = Math.max(0, need - (countMap.get(name) || 0));
        const missL = Math.max(0, need - (logCountMap.get(name) || 0));
        for (let i = 0; i < Math.max(missC, missL); i++) {
          try {
            if (r === 1 && !failedOnce && courses.length === FAIL_AT_INDEX) { failedOnce = true; throw new Error('permission-denied'); }
            if (i < missC) courses.push(name);
            if (i < missL) runLogs.push(name);
          } catch { /* 코스별 try/catch: 다음 항목 계속 */ }
        }
      }
      continue;
    }
    // v0/v1/v1b: 소스 순서대로 순회
    for (let i = 0; i < SOURCE.length; i++) {
      const name = SOURCE[i];
      if ((version === 'v1' || version === 'v1b') && nameSet.has(name)) continue; // 이름만 보고 스킵
      try {
        if (r === 1 && !failedOnce && courses.length === FAIL_AT_INDEX) { failedOnce = true; throw new Error('permission-denied'); }
        courses.push(name); runLogs.push(name);
      } catch (e) {
        if (version === 'v1b') continue;   // 코스별 try/catch 있음 → 다음 코스 계속
        break;                              // 없음 → 함수 전체 reject, 남은 항목 스킵
      }
    }
  }
  return { courses: courses.length, runLogs: runLogs.length, docs: courses.length + runLogs.length };
}

const VS = [
  ['v0 (ff82ecd) 전체 스킵 게이트 + try/catch 없음', 'v0'],
  ['v1 (563d0fe) 이름 Set 판정 + try/catch 없음', 'v1'],
  ['v1b(542a350) 이름 Set 판정 + 코스별 try/catch', 'v1b'],
  ['v2 (3cf081f) 이름별 개수 Map 판정 + try/catch', 'v2'],
];
console.log(`적재 목표: 코스 ${SOURCE.length}개 + 러닝기록 ${SOURCE.length}개 = 문서 ${TOTAL_DOCS}개`);
console.log(`가정: 1회차 3번째 항목에서 1회 실패, 이후 재로그인 2회(총 3회 실행)\n`);
console.log('버전                                            코스    러닝기록  문서   적재 성공률');
for (const [label, v] of VS) {
  const r = run(v);
  console.log(`${label.padEnd(46)} ${String(r.courses).padStart(2)}/6  ${String(r.runLogs).padStart(5)}/6  ${String(r.docs).padStart(2)}/12  ${((r.docs / TOTAL_DOCS) * 100).toFixed(1).padStart(6)}%`);
}
console.log('\n[실패가 전혀 없는 경우(참고)]');
for (const [label, v] of VS) {
  // 실패 주입 없이 1회 실행
  const saved = global.__noFail; global.__noFail = true;
  const r = (() => { const f = FAIL_AT_INDEX; try { return runNoFail(v); } finally { global.__noFail = saved; } })();
  console.log(`${label.padEnd(46)} 문서 ${r.docs}/12 (${((r.docs / TOTAL_DOCS) * 100).toFixed(1)}%)`);
}
function runNoFail(version) {
  const courses = [], runLogs = [];
  const needByName = SOURCE.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
  if (version === 'v2') { for (const [n, c] of needByName) for (let i = 0; i < c; i++) { courses.push(n); runLogs.push(n); } }
  else { for (const n of SOURCE) { courses.push(n); runLogs.push(n); } }
  return { docs: courses.length + runLogs.length };
}
