// .env가 UTF-16으로 저장되면 Metro/dotenv가 값을 읽지 못해
// Firebase auth/invalid-api-key 등으로 이어진다. expo start 전에
// 항상 이 스크립트가 먼저 돌아 BOM을 확인하고, UTF-16이면
// 값 손실 없이 UTF-8(BOM 없음)로 즉시 되돌린다.
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (!fs.existsSync(envPath)) {
  process.exit(0);
}

const buf = fs.readFileSync(envPath);

const isUtf16LE = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe;
const isUtf16BE = buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff;
const hasUtf8Bom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;

if (isUtf16LE || isUtf16BE) {
  const content = buf.toString(isUtf16LE ? 'utf16le' : 'utf16be').replace(/^﻿/, '');
  fs.writeFileSync(envPath, content, { encoding: 'utf8' });
  console.warn(
    '\n[check-env-encoding] .env 파일이 UTF-16으로 저장되어 있어 UTF-8(BOM 없음)로 자동 복구했습니다.\n' +
      '값은 그대로 유지했지만, 이 파일을 저장한 편집기/방법의 기본 인코딩을 UTF-8로 고정해야\n' +
      '재발하지 않습니다 (Notepad "인코딩" 드롭다운, PowerShell Out-File/> 은 -Encoding utf8 명시 등).\n'
  );
} else if (hasUtf8Bom) {
  const content = buf.toString('utf8').replace(/^﻿/, '');
  fs.writeFileSync(envPath, content, { encoding: 'utf8' });
  console.warn('\n[check-env-encoding] .env의 UTF-8 BOM을 제거했습니다.\n');
}
