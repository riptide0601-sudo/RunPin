// [측정 4] Firestore 보안 규칙 차단율 테스트 — 에뮬레이터 실행용 (현재 환경은 Java 미설치로 미실행)
// 실행법:
//   1) brew install --cask temurin        (JDK 설치, 1회)
//   2) npm i -D @firebase/rules-unit-testing firebase vitest
//   3) RULES=rules/v3-final.rules npx firebase-tools emulators:exec --only firestore "npx vitest run rules/rules.test.mjs"
//   RULES 환경변수를 v1-7a3f09c.rules / v2-naive-open.rules / v3-final.rules 로 바꿔 3버전 비교
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { beforeAll, afterAll, describe, it } from 'vitest';

const ME = 'uid-me', OTHER = 'uid-other';
let env;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-runpin-rules',
    firestore: { rules: readFileSync(process.env.RULES || 'rules/v3-final.rules', 'utf8') },
  });
  // 시드: 타인 소유 문서들을 규칙 우회로 미리 심는다
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'courses/c-other'), { name: '타인코스', coordinates: [{ latitude: 1, longitude: 1 }], category: '공원', difficulty: 3, distanceKm: 1, uploaderId: OTHER, uploaderName: '타인', likeCount: 10, createdAt: new Date() });
    await setDoc(doc(db, 'runLogs/log-other'), { userId: OTHER, trajectory: [{ latitude: 1, longitude: 1 }], startedAt: 1, durationSec: 1, paceSecPerKm: 1, courseName: 'x', distanceKm: 1, cadenceSpm: 1, avgHeartRateBpm: 1, elevationSeries: [], paceSeries: [], heartRateSeries: [], difficulty: 3, isUploaded: false });
    await setDoc(doc(db, 'runLogs/log-mine'), { userId: ME, trajectory: [{ latitude: 1, longitude: 1 }], startedAt: 1, durationSec: 1, paceSecPerKm: 1, courseName: 'x', distanceKm: 1, cadenceSpm: 1, avgHeartRateBpm: 1, elevationSeries: [], paceSeries: [], heartRateSeries: [], difficulty: 3, isUploaded: false });
    await setDoc(doc(db, 'users/' + OTHER), { photoBase64: 'x', updatedAt: new Date() });
    await setDoc(doc(db, 'usernames/타인'), { uid: OTHER, displayName: '타인', createdAt: new Date() });
  });
});
afterAll(() => env?.cleanup());
const me = () => env.authenticatedContext(ME).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('공격 시나리오 (차단되어야 함)', () => {
  it('A1 likeCount를 단독으로 +100', () => assertFails(updateDoc(doc(me(), 'courses/c-other'), { likeCount: 110 })));
  it('A2 likeCount를 +1 (likes 문서 없이 단독)', () => assertFails(updateDoc(doc(me(), 'courses/c-other'), { likeCount: 11 })));
  it('A3 타인 runLog 읽기', () => assertFails(getDoc(doc(me(), 'runLogs/log-other'))));
  it('A4 타인 runLog 삭제', () => assertFails(deleteDoc(doc(me(), 'runLogs/log-other'))));
  it('A5 타인 코스 이름 수정', () => assertFails(updateDoc(doc(me(), 'courses/c-other'), { name: '탈취' })));
  it('A6 코스 생성 시 허용 외 필드 추가', () => assertFails(setDoc(doc(me(), 'courses/c-new1'), { name: 'n', coordinates: [{ latitude: 1, longitude: 1 }], category: '공원', difficulty: 3, distanceKm: 1, uploaderId: ME, uploaderName: '나', likeCount: 0, createdAt: serverTimestamp(), isFeatured: true })));
  it('A7 코스 생성 시 likeCount를 999로 시작', () => assertFails(setDoc(doc(me(), 'courses/c-new2'), { name: 'n', coordinates: [{ latitude: 1, longitude: 1 }], category: '공원', difficulty: 3, distanceKm: 1, uploaderId: ME, uploaderName: '나', likeCount: 999, createdAt: serverTimestamp() })));
  it('A8 usernames 전체 목록 조회', () => assertFails(getDocs(collection(me(), 'usernames'))));
  it('A9 타인 프로필 사진 읽기', () => assertFails(getDoc(doc(me(), 'users/' + OTHER))));
  it('A10 규칙에 없는 컬렉션(badges) 쓰기', () => assertFails(setDoc(doc(me(), 'badges/b1'), { x: 1 })));
  it('A11 타인 uid로 likes 문서 생성', () => assertFails(setDoc(doc(me(), `likes/${OTHER}_c-other`), { uid: OTHER, courseId: 'c-other', createdAt: serverTimestamp() })));
  it('A12 본인 runLog의 trajectory 수정', () => assertFails(updateDoc(doc(me(), 'runLogs/log-mine'), { trajectory: [] })));
});

describe('정상 시나리오 (통과되어야 함)', () => {
  it('L1 비로그인 상태로 코스 읽기', () => assertSucceeds(getDoc(doc(anon(), 'courses/c-other'))));
  it('L2 본인 코스 업로드', () => assertSucceeds(setDoc(doc(me(), 'courses/c-mine'), { name: 'n', coordinates: [{ latitude: 1, longitude: 1 }], category: '공원', difficulty: 3, distanceKm: 1, uploaderId: ME, uploaderName: '나', likeCount: 0, createdAt: serverTimestamp() })));
  it('L3 본인 좋아요 추가 (batch: likes create + likeCount +1)', async () => {
    const db = me(); const b = writeBatch(db);
    b.set(doc(db, `likes/${ME}_c-other`), { uid: ME, courseId: 'c-other', createdAt: serverTimestamp() });
    b.update(doc(db, 'courses/c-other'), { likeCount: 11 });
    return assertSucceeds(b.commit());
  });
  it('L4 본인 좋아요 취소 (batch: likes delete + likeCount -1)', async () => {
    const db = me(); const b = writeBatch(db);
    b.delete(doc(db, `likes/${ME}_c-other`));
    b.update(doc(db, 'courses/c-other'), { likeCount: 10 });
    return assertSucceeds(b.commit());
  });
  it('L5 본인 runLog 생성', () => assertSucceeds(setDoc(doc(me(), 'runLogs/log-new'), { userId: ME, trajectory: [{ latitude: 1, longitude: 1 }], startedAt: 1, durationSec: 1, paceSecPerKm: 1, courseName: 'x', distanceKm: 1, cadenceSpm: 1, avgHeartRateBpm: 1, elevationSeries: [], paceSeries: [], heartRateSeries: [], difficulty: 3, isUploaded: false })));
  it('L6 본인 runLog 조회', () => assertSucceeds(getDoc(doc(me(), 'runLogs/log-mine'))));
  it('L7 본인 runLog 삭제', () => assertSucceeds(deleteDoc(doc(me(), 'runLogs/log-mine'))));
  it('L8 본인 프로필 사진 저장', () => assertSucceeds(setDoc(doc(me(), 'users/' + ME), { photoBase64: 'a'.repeat(1000), updatedAt: serverTimestamp() })));
  it('L9 닉네임 단건 조회 (미인증)', () => assertSucceeds(getDoc(doc(anon(), 'usernames/타인'))));
});
