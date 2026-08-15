import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Course } from '@/types';

const COURSES_COLLECTION = 'courses';

export class CourseSaveError extends Error {
  constructor() {
    super('코스를 저장하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'CourseSaveError';
  }
}

// 새 코스를 만들 때 필요한 값만 담은 타입. id/uploaderId/uploaderName/likeCount/createdAt은
// createCourse가 호출자(uploaderId, uploaderName)와 서버(likeCount, createdAt)에서 채운다.
export type NewCourseDraft = Pick<Course, 'name' | 'coordinates' | 'category' | 'difficulty' | 'distanceKm'>;

// firestore.rules의 courses.create 조건(허용 필드 목록·타입)과 반드시 동일하게 유지할 것 —
// 어긋나면 여기서 permission-denied로 실패한다.
export async function createCourse(uploaderId: string, uploaderName: string, draft: NewCourseDraft): Promise<void> {
  try {
    await addDoc(collection(db, COURSES_COLLECTION), {
      ...draft,
      uploaderId,
      uploaderName,
      likeCount: 0,
      createdAt: serverTimestamp(),
    });
    if (__DEV__) {
      console.log('[courses] 생성 성공', { uploaderId, name: draft.name });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[courses] 생성 실패', {
        uploaderId,
        name: draft.name,
        errorName: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new CourseSaveError();
    }
    throw error;
  }
}

// 실시간 구독(subscribeToCourses)과 별개로, "이 유저가 이미 올린 코스가 이름별로 몇 개씩
// 있는지"를 1회성으로 확인할 때 쓴다 — lib/seedMockAccountData.ts가 파클로즈 계정 시드 중
// 이름이 같은 코스가 여러 개(예: '한강 반포지구' 5개) 필요할 때 부족한 개수만 이어서
// 채우는 데 쓴다. 이름만으로 존재 여부(Set)를 판단하면 1개만 있어도 5개 다 있는 것으로
// 오판하기 때문에 개수(Map)로 반환한다.
export async function getUploadedCourseNameCounts(uploaderId: string): Promise<Map<string, number>> {
  const snapshot = await getDocs(query(collection(db, COURSES_COLLECTION), where('uploaderId', '==', uploaderId)));
  const counts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const name = doc.data().name as string;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return counts;
}

function mapCourseDoc(doc: QueryDocumentSnapshot): Course {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    coordinates: data.coordinates,
    category: data.category,
    difficulty: data.difficulty,
    distanceKm: data.distanceKm,
    uploaderName: data.uploaderName,
    uploaderId: data.uploaderId,
    likeCount: data.likeCount,
    // 방금 이 기기에서 쓴 문서는 서버 확인 전까지 createdAt(serverTimestamp)이 잠깐 null로
    // 보인다 — 그 사이엔 지금 시각으로 대체한다(서버 값이 도착하면 스냅샷이 다시 온다).
    createdAt: data.createdAt ? data.createdAt.toMillis() : Date.now(),
  };
}

// 코스 전체 목록을 실시간 구독한다. 홈 화면 등에서는 이 목록에 mock 코스를 이어붙여 쓴다
// (lib/appData.tsx 참고).
export function subscribeToCourses(onChange: (courses: Course[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, COURSES_COLLECTION),
    (snapshot) => onChange(snapshot.docs.map(mapCourseDoc)),
    (error) => console.error('[courses] 구독 실패', error),
  );
}
