// 좋아요 시나리오 4버전 결과를 하나의 표로 합친다.
const fs = require('fs');
const VS = ['v1-7a3f09c', 'v2-naive-open', 'v3-final', 'v4-proposed'];
const data = {}, titles = {};
for (const v of VS) {
  const r = JSON.parse(fs.readFileSync(`result-emulator-likes-${v}.json`, 'utf8'));
  data[v] = {};
  for (const t of r.testResults.flatMap((f) => f.assertionResults)) {
    const id = t.title.split(' ')[0];
    titles[id] = t.title.replace(id + ' ', '');
    const isBad = id.startsWith('B');
    const asExpected = t.status === 'passed';
    data[v][id] = asExpected ? (isBad ? '차단' : '통과') : (isBad ? '**뚫림**' : '차단됨');
  }
}
const ids = Object.keys(titles).sort((a, b) => (a[0] === b[0] ? +a.slice(1) - +b.slice(1) : a < b ? -1 : 1));
const bad = ids.filter((i) => i.startsWith('B')), nor = ids.filter((i) => i.startsWith('N'));
console.log('| # | 시나리오 | v1 차단 | v2 단순개방 | v3 최종 | v4 제안 |');
console.log('|---|---|---|---|---|---|');
for (const id of ids) console.log(`| ${id} | ${titles[id]} | ${data['v1-7a3f09c'][id]} | ${data['v2-naive-open'][id]} | ${data['v3-final'][id]} | ${data['v4-proposed'][id]} |`);
console.log('\n| 버전 | 나쁜 시도 차단 | 정상 사용 통과 |');
console.log('|---|---|---|');
for (const v of VS) {
  const b = bad.filter((i) => data[v][i] === '차단').length, n = nor.filter((i) => data[v][i] === '통과').length;
  console.log(`| ${v} | ${b}/${bad.length} (${((b / bad.length) * 100).toFixed(1)}%) | ${n}/${nor.length} (${((n / nor.length) * 100).toFixed(1)}%) |`);
}
fs.writeFileSync('result4-emulator-likes.json', JSON.stringify({ titles, data }, null, 1));
