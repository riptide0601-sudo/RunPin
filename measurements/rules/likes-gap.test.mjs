// [검증] 최종 규칙(v3)에서 B4+B15 연쇄가 실제로 likeCount를 깎는지, 숫자로 확인한다.
// 좋아요를 한 번도 올리지 않은 상태에서 카운트만 감소시킬 수 있는지 본다.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { beforeAll, afterAll, it, expect } from 'vitest';

const ME = 'uid-attacker';
let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-runpin-gap',
    firestore: { rules: readFileSync(process.env.RULES || 'rules/v3-final.rules', 'utf8') },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'courses/c-target'), {
      name: '표적코스', coordinates: [{ latitude: 37.5, longitude: 127 }], category: '공원',
      difficulty: 3, distanceKm: 1, uploaderId: 'uid-victim', uploaderName: '피해자',
      likeCount: 10, createdAt: new Date(),
    });
  });
});
afterAll(() => env?.cleanup());

const read = async () => {
  let v;
  await env.withSecurityRulesDisabled(async (ctx) => {
    v = (await getDoc(doc(ctx.firestore(), 'courses/c-target'))).data().likeCount;
  });
  return v;
};

it('좋아요를 올린 적 없이 likeCount를 3회 감소시킬 수 있는가', async () => {
  const db = env.authenticatedContext(ME).firestore();
  const before = await read();
  const trace = [before];
  for (let i = 0; i < 3; i++) {
    // 1단계: 좋아요 기록만 생성 (카운트는 그대로 — 규칙이 이 단독 생성을 막지 않음)
    await setDoc(doc(db, `likes/${ME}_c-target`), { uid: ME, courseId: 'c-target', createdAt: serverTimestamp() });
    const mid = await read();
    // 2단계: 취소 batch (기록 삭제 + 카운트 -1) — 감소 분기 조건을 모두 만족
    const b = writeBatch(db);
    b.delete(doc(db, `likes/${ME}_c-target`));
    b.update(doc(db, `courses/c-target`), { likeCount: increment(-1) });
    await b.commit();
    const after = await read();
    console.log(`  사이클 ${i + 1}: 시작 ${trace[trace.length - 1]} → 기록생성 후 ${mid} → 취소 후 ${after}`);
    trace.push(after);
  }
  console.log(`  likeCount 추이: ${trace.join(' → ')}  (순수 증가 0회, 감소 ${before - trace[trace.length - 1]}회)`);
  expect(trace[trace.length - 1]).toBe(before - 3);
});
