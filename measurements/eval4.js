// [측정 4 대체] 규칙 조건식 수동 평가 — 에뮬레이터 미실행. 각 판정의 근거 줄을 함께 기록.
// v1 = 7a3f09c (likes/users 컬렉션 없음, courses.update: false)
// v2 = 반사실(최종에서 courses.update를 'auth != null'로만 단순 개방했다고 가정)
// v3 = 623cc77 최종
const S = [
  // [id, 구분, 시나리오, v1, v2, v3, v3 판정 근거(firestore.rules 줄)]
  ['A1','공격','likeCount 단독 +100',           '차단','통과(실패)','차단','58-70 (±1 조건 불만족)'],
  ['A2','공격','likeCount 단독 +1 (likes 없이)','차단','통과(실패)','차단','63-64 (existsAfter 불만족)'],
  ['A3','공격','타인 runLog 읽기',              '차단','차단','차단','94'],
  ['A4','공격','타인 runLog 삭제',              '차단','차단','차단','124'],
  ['A5','공격','타인 코스 이름 수정',            '차단','통과(실패)','차단','59 (affectedKeys 위반)'],
  ['A6','공격','코스 생성 시 허용 외 필드',      '차단','차단','차단','34-37 (hasOnly)'],
  ['A7','공격','코스 생성 시 likeCount=999',     '차단','차단','차단','50'],
  ['A8','공격','usernames 전체 목록 조회',       '차단','차단','차단','8 (list:false)'],
  ['A9','공격','타인 프로필 사진 읽기',          '차단(컬렉션 없음)','차단','차단','131'],
  ['A10','공격','미정의 컬렉션(badges) 쓰기',    '차단','차단','차단','153-155 (catch-all)'],
  ['A11','공격','타인 uid로 likes 생성',         '차단(컬렉션 없음)','차단','차단','82-83'],
  ['A12','공격','본인 runLog trajectory 수정',   '차단','차단','차단','121 (affectedKeys)'],
  ['L1','정상','비로그인 코스 읽기',             '통과','통과','통과','27'],
  ['L2','정상','본인 코스 업로드',               '통과','통과','통과','32-51'],
  ['L3','정상','본인 좋아요 추가(batch)',        '실패(update:false)','통과','통과','58-64 + 81-86'],
  ['L4','정상','본인 좋아요 취소(batch)',        '실패(update:false)','통과','통과','66-69 + 89'],
  ['L5','정상','본인 runLog 생성',               '통과','통과','통과','96-114'],
  ['L6','정상','본인 runLog 조회',               '통과','통과','통과','94'],
  ['L7','정상','본인 runLog 삭제',               '실패(delete:false)','통과','통과','124'],
  ['L8','정상','본인 프로필 사진 저장',          '실패(컬렉션 없음)','통과','통과','135-147'],
  ['L9','정상','닉네임 단건 조회(미인증)',       '통과','통과','통과','7'],
];
const atk = S.filter(r=>r[1]==='공격'), leg = S.filter(r=>r[1]==='정상');
function rate(rows, col, want) { return rows.filter(r=>r[col].startsWith(want)).length; }
console.log('시나리오 총', S.length, '건 (공격', atk.length, '/ 정상', leg.length, ')\n');
console.log('버전               | 공격 차단율        | 정상 통과율');
console.log('-------------------+-------------------+------------------');
[['v1 (7a3f09c)',3],['v2 (반사실 단순개방)',4],['v3 (623cc77 최종)',5]].forEach(([label,c])=>{
  const b=rate(atk,c,'차단'), p=rate(leg,c,'통과');
  console.log(`${label.padEnd(18)} | ${b}/${atk.length} (${((b/atk.length)*100).toFixed(1)}%)`.padEnd(40)+`| ${p}/${leg.length} (${((p/leg.length)*100).toFixed(1)}%)`);
});
console.log('\n[v2에서 뚫리는 시나리오]', atk.filter(r=>r[4].startsWith('통과')).map(r=>r[0]+' '+r[2]).join(' / '));
console.log('[v1에서 막히는 정상 기능]', leg.filter(r=>r[3].startsWith('실패')).map(r=>r[0]+' '+r[2]).join(' / '));
require('fs').writeFileSync('result4-manual.json', JSON.stringify(S,null,1));
