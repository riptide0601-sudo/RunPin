// [측정 6] 규칙 미배포로 인한 permission-denied 발생 건수 (기록으로 확인되는 범위)
// 판정 기준: Claude Code 트랜스크립트의 '사용자 메시지'에 실기기 런타임 에러 로그 형태
//   ("code": "permission-denied")가 붙여넣어진 경우만 1건으로 집계.
//   소스코드 주석/파일 읽기 결과에 등장하는 문자열은 제외.
const fs = require('fs'), path = require('path');
const DIR = '/Users/farclose/.claude/projects/-Users-farclose-Desktop----CJ------RunPin';
const CUTOFF = '2026-08-16T02:18:49Z'; // 44d8cda 커밋 시각(UTC)
const hits = [];
for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.jsonl'))) {
  for (const line of fs.readFileSync(path.join(DIR, f), 'utf8').split('\n')) {
    if (!line.includes('permission-denied')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const m = o.message; if (!m || m.role !== 'user') continue;
    const c = m.content;
    const texts = typeof c === 'string' ? [c] : Array.isArray(c) ? c.filter((x) => x.type === 'text').map((x) => x.text) : [];
    for (const t of texts) {
      if (!/"code":\s*"permission-denied"/.test(t)) continue; // 런타임 에러 객체 형태만
      hits.push({ file: f, ts: o.timestamp || '?', excerpt: t.replace(/\s+/g, ' ').match(/.{0,110}permission-denied.{0,60}/)[0] });
    }
  }
}
hits.sort((a, b) => a.ts.localeCompare(b.ts));
console.log('트랜스크립트 보존 범위: 2026-08-07 이후 (그 이전 세션 기록 없음)\n');
console.log('실기기 런타임 permission-denied 로그가 붙여넣어진 건:', hits.length, '건');
for (const h of hits) console.log(`  [${h.ts.slice(0,19)}] ${h.ts < CUTOFF ? '44d8cda 이전' : '44d8cda 이후'} | ${h.excerpt}`);
console.log('\n집계:');
console.log('  44d8cda(2026-08-16 11:18 KST) 이전:', hits.filter((h) => h.ts < CUTOFF).length, '건');
console.log('  44d8cda 이후 (~2026-10-10):', hits.filter((h) => h.ts >= CUTOFF).length, '건');
