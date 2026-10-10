// [측정 C] .env 인코딩 자동 복구 가드 동작 검증 (fe44716)
// scripts/check-env-encoding.js를 샌드박스 디렉터리로 복사해 '가짜 .env'에만 적용한다.
// 실제 프로젝트 .env는 읽지도 쓰지도 않는다 (CLAUDE.md 6번: .env 내용 열람·노출 금지).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { execFileSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-env-encoding.js');
// 실제 키 이름만 쓰고 값은 전부 가짜(FAKE_*)로 만든다
const FIXTURE = [
  'EXPO_PUBLIC_FIREBASE_API_KEY=FAKE_api_key_1234567890',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=FAKE.firebaseapp.com',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID=FAKE-project',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=FAKE.appspot.com',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000',
  'EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:FAKEappid',
].join('\n') + '\n';

const CASES = [
  ['UTF-16LE + BOM (Notepad "유니코드" 저장)', () => Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(FIXTURE, 'utf16le')])],
  ['UTF-16BE + BOM', () => {
    const le = Buffer.from(FIXTURE, 'utf16le'); const be = Buffer.alloc(le.length);
    for (let i = 0; i < le.length; i += 2) { be[i] = le[i + 1]; be[i + 1] = le[i]; }
    return Buffer.concat([Buffer.from([0xfe, 0xff]), be]);
  }],
  ['UTF-8 + BOM', () => Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(FIXTURE, 'utf8')])],
  ['UTF-8 (정상)', () => Buffer.from(FIXTURE, 'utf8')],
];

// dotenv와 같은 방식으로 KEY=VALUE를 파싱해 "환경변수가 실제로 읽히는지"를 센다
function parsed(buf) {
  const text = buf.toString('utf8');
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const EXPECTED = parsed(Buffer.from(FIXTURE, 'utf8'));
const expectedKeys = Object.keys(EXPECTED);

console.log(`가짜 .env 키 ${expectedKeys.length}개로 4가지 인코딩을 만들어, 가드 실행 전/후에`);
console.log(`dotenv와 같은 방식으로 파싱되는 키 개수를 센다.\n`);
console.log('인코딩                                   가드 전 파싱  가드 후 파싱  값 손실  가드 동작');
const rows = [];
for (const [label, make] of CASES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envguard-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(SCRIPT, path.join(dir, 'scripts', 'check-env-encoding.js'));
  const envFile = path.join(dir, '.env');
  const original = make();
  fs.writeFileSync(envFile, original);
  const before = Object.keys(parsed(fs.readFileSync(envFile))).length;
  const beforeBytes = fs.readFileSync(envFile);
  let log = '', crashed = false;
  try {
    log = execFileSync('node', [path.join(dir, 'scripts', 'check-env-encoding.js')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    crashed = true;
    log = String(e.stderr || e.message).split('\n').find((l) => l.includes('Error')) || 'crash';
  }
  const afterBuf = fs.readFileSync(envFile);
  const after = parsed(afterBuf);
  const afterCount = Object.keys(after).length;
  const lost = expectedKeys.filter((k) => after[k] !== EXPECTED[k]);
  rows.push({ label, before, afterCount, lost: lost.length, crashed, log });
  const changed = !afterBuf.equals(beforeBytes);
  const verdict = crashed ? '스크립트 크래시' : changed ? '복구 수행' : '변경 없음';
  console.log(`${label.padEnd(40)} ${String(before).padStart(6)}/${expectedKeys.length}  ${String(afterCount).padStart(9)}/${expectedKeys.length}  ${String(lost.length).padStart(6)}  ${verdict}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
const broken = rows.filter((r) => r.before < expectedKeys.length);
const fixed = broken.filter((r) => r.afterCount === expectedKeys.length && r.lost === 0);
console.log(`\n깨진 인코딩 ${broken.length}종 중 가드가 값 손실 없이 복구한 것: ${fixed.length}/${broken.length} (${((fixed.length / broken.length) * 100).toFixed(0)}%)`);
console.log(`정상 UTF-8 파일을 불필요하게 건드렸는지: ${rows[3].log || rows[3].crashed ? '건드림' : '건드리지 않음'}`);
for (const r of rows.filter((x) => x.crashed)) console.log(`  [발견] ${r.label}: ${r.log}`);
require('node:fs').writeFileSync(path.join(__dirname, 'result-env.json'), JSON.stringify(rows, null, 1));
