// [측정 4-B] 좋아요(courses.likeCount) 쓰기 권한에 한정한 규칙 비교
// 비교 대상: v1(좋아요 도입 직전, courses.update: if false) / v2(로그인만 확인하고 개방한 반사실)
//           / v3(623cc77 최종, likes 문서 생성·삭제와 같은 batch에서 ±1만 허용)
// 정상 시나리오의 쓰기는 lib/likes.ts의 toggleLike과 동일한 형태를 사용한다
//   (writeBatch + likes 문서 set/delete + courses.likeCount increment(±1)).
// 각 테스트는 beforeEach에서 clearFirestore + 재시드하므로 서로 독립이다.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { beforeAll, beforeEach, afterAll, describe, it } from 'vitest';

const ME = 'uid-me', OTHER = 'uid-other';
let env;

const course = (likeCount) => ({
  name: '코스', coordinates: [{ latitude: 37.5, longitude: 127 }], category: '공원',
  difficulty: 3, distanceKm: 1, uploaderId: OTHER, uploaderName: '타인', likeCount, createdAt: new Date(),
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-runpin-likes',
    firestore: { rules: readFileSync(process.env.RULES || 'rules/v3-final.rules', 'utf8') },
  });
});
afterAll(() => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'courses/c-liked'), course(10)); // 이미 10개 받은 코스
    await setDoc(doc(db, 'courses/c-zero'), course(0));   // 아직 0개인 코스
    await setDoc(doc(db, 'courses/c-a'), course(3));
    await setDoc(doc(db, 'courses/c-b'), course(3));
    await setDoc(doc(db, 'courses/c-dup'), course(1));
    // 내가 이미 좋아요한 코스(c-dup) + 타인이 좋아요한 기록(c-liked)
    await setDoc(doc(db, `likes/${ME}_c-dup`), { uid: ME, courseId: 'c-dup', createdAt: new Date() });
    await setDoc(doc(db, `likes/${OTHER}_c-liked`), { uid: OTHER, courseId: 'c-liked', createdAt: new Date() });
  });
});

const me = () => env.authenticatedContext(ME).firestore();
const anon = () => env.unauthenticatedContext().firestore();
// lib/likes.ts toggleLike과 동일한 batch 구성
const likeBatch = (db, uid, courseId) => {
  const b = writeBatch(db);
  b.set(doc(db, `likes/${uid}_${courseId}`), { uid, courseId, createdAt: serverTimestamp() });
  b.update(doc(db, `courses/${courseId}`), { likeCount: increment(1) });
  return b.commit();
};
const unlikeBatch = (db, uid, courseId) => {
  const b = writeBatch(db);
  b.delete(doc(db, `likes/${uid}_${courseId}`));
  b.update(doc(db, `courses/${courseId}`), { likeCount: increment(-1) });
  return b.commit();
};

describe('나쁜 시도 (차단되어야 함)', () => {
  it('B1 likeCount를 단독으로 +100', () => assertFails(updateDoc(doc(me(), 'courses/c-liked'), { likeCount: 110 })));
  it('B2 likeCount를 단독으로 -100', () => assertFails(updateDoc(doc(me(), 'courses/c-liked'), { likeCount: -90 })));
  it('B3 좋아요 기록 없이 likeCount만 +1', () => assertFails(updateDoc(doc(me(), 'courses/c-liked'), { likeCount: increment(1) })));
  it('B4 좋아요 기록만 만들고 likeCount는 그대로', () => assertFails(setDoc(doc(me(), `likes/${ME}_c-liked`), { uid: ME, courseId: 'c-liked', createdAt: serverTimestamp() })));
  it('B5 남의 uid로 좋아요 기록 생성', () => assertFails(setDoc(doc(me(), `likes/${OTHER}_c-a`), { uid: OTHER, courseId: 'c-a', createdAt: serverTimestamp() })));
  it('B6 같은 코스에 중복 좋아요(이미 기록 있는 상태에서 또 +1)', () => assertFails(likeBatch(me(), ME, 'c-dup')));
  it('B7 남의 좋아요 기록 삭제', () => assertFails(deleteDoc(doc(me(), `likes/${OTHER}_c-liked`))));
  it('B8 likeCount와 다른 필드(name)를 동시 수정', () => assertFails(updateDoc(doc(me(), 'courses/c-liked'), { likeCount: increment(1), name: '탈취' })));
  it('B9 비로그인 상태로 좋아요', () => assertFails(likeBatch(anon(), ME, 'c-a')));
  it('B10 좋아요 0인 코스를 -1해 음수로 만들기', () => assertFails(unlikeBatch(me(), ME, 'c-zero')));
  it('B11 기록은 삭제하면서 likeCount는 +1 (방향 불일치)', () => {
    const db = me(); const b = writeBatch(db);
    b.delete(doc(db, `likes/${ME}_c-dup`));
    b.update(doc(db, 'courses/c-dup'), { likeCount: increment(1) });
    return assertFails(b.commit());
  });
  it('B12 내 좋아요 기록을 수정해 다른 코스로 바꾸기', () => assertFails(updateDoc(doc(me(), `likes/${ME}_c-dup`), { courseId: 'c-liked' })));
  it('B13 남의 좋아요 기록 읽기', () => assertFails(getDoc(doc(me(), `likes/${OTHER}_c-liked`))));
  // B4가 통과하는 것을 확인한 뒤 추가한 연쇄 시나리오.
  // 1) 좋아요 기록만 생성(카운트 그대로) → 2) 취소 batch로 기록 삭제 + 카운트 -1.
  // 2)는 '기록이 있었고 사라졌으며 -1'이라는 최종 규칙의 감소 분기를 모두 만족하므로,
  // 올린 적 없는 카운트를 1씩 깎아낼 수 있는지 확인한다.
  it('B15 기록만 만든 뒤 취소로 카운트만 깎기 (B4 연쇄)', async () => {
    const db = me();
    try {
      await setDoc(doc(db, `likes/${ME}_c-liked`), { uid: ME, courseId: 'c-liked', createdAt: serverTimestamp() });
    } catch {
      return; // 1단계(기록 단독 생성)부터 차단되는 규칙이면 이 연쇄는 성립 자체가 불가 → 차단으로 집계
    }
    return assertFails(unlikeBatch(db, ME, 'c-liked'));
  });
  it('B14 likeCount를 정수가 아닌 값으로 수정', () => assertFails(updateDoc(doc(me(), 'courses/c-liked'), { likeCount: 10.5 })));
});

describe('정상 사용 (통과되어야 함)', () => {
  it('N1 좋아요 누르기', () => assertSucceeds(likeBatch(me(), ME, 'c-a')));
  it('N2 좋아요 취소', () => assertSucceeds(unlikeBatch(me(), ME, 'c-dup')));
  it('N3 취소한 뒤 다시 누르기', async () => {
    await assertSucceeds(unlikeBatch(me(), ME, 'c-dup'));
    await assertSucceeds(likeBatch(me(), ME, 'c-dup'));
  });
  it('N4 서로 다른 두 코스에 각각 좋아요', async () => {
    await assertSucceeds(likeBatch(me(), ME, 'c-a'));
    await assertSucceeds(likeBatch(me(), ME, 'c-b'));
  });
  it('N5 비로그인 상태로 코스의 좋아요 수 조회', () => assertSucceeds(getDoc(doc(anon(), 'courses/c-liked'))));
  it('N6 내 좋아요 목록 구독 쿼리 (where uid == 나)', () => assertSucceeds(getDocs(query(collection(me(), 'likes'), where('uid', '==', ME)))));
  it('N7 타인이 이미 10개 받은 코스에 내가 좋아요', () => assertSucceeds(likeBatch(me(), ME, 'c-liked')));
});
