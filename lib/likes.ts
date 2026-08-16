import { FirebaseError } from 'firebase/app';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

const LIKES_COLLECTION = 'likes';
const COURSES_COLLECTION = 'courses';

export class LikeToggleError extends Error {
  constructor() {
    super('좋아요를 반영하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'LikeToggleError';
  }
}

function likeDocId(uid: string, courseId: string): string {
  return `${uid}_${courseId}`;
}

// firestore.rules의 courses.update/likes.create 조건과 반드시 같이 맞춰서 유지할 것 —
// likes 문서 생성/삭제와 courses.likeCount 증감을 하나의 batch로 묶어야 규칙이 통과된다.
export async function toggleLike(uid: string, courseId: string, currentlyLiked: boolean): Promise<void> {
  try {
    const batch = writeBatch(db);
    const likeRef = doc(db, LIKES_COLLECTION, likeDocId(uid, courseId));
    const courseRef = doc(db, COURSES_COLLECTION, courseId);

    if (currentlyLiked) {
      batch.delete(likeRef);
      batch.update(courseRef, { likeCount: increment(-1) });
    } else {
      batch.set(likeRef, { uid, courseId, createdAt: serverTimestamp() });
      batch.update(courseRef, { likeCount: increment(1) });
    }

    await batch.commit();
    if (__DEV__) {
      console.log('[likes] 토글 성공', { uid, courseId, liked: !currentlyLiked });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[likes] 토글 실패', {
        uid,
        courseId,
        errorName: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new LikeToggleError();
    }
    throw error;
  }
}

function mapLikeDocCourseId(doc: QueryDocumentSnapshot): string {
  return doc.data().courseId as string;
}

// 로그인한 유저 본인이 좋아요한 코스 id 집합을 실시간 구독한다. uid가 바뀌면(로그인/로그아웃)
// 호출한 쪽에서 새 uid로 다시 구독해야 한다 — lib/appData.tsx가 이를 처리한다.
export function subscribeToMyLikedCourseIds(uid: string, onChange: (courseIds: Set<string>) => void): Unsubscribe {
  const q = query(collection(db, LIKES_COLLECTION), where('uid', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => onChange(new Set(snapshot.docs.map(mapLikeDocCourseId))),
    (error) => console.error('[likes] 구독 실패', error),
  );
}
