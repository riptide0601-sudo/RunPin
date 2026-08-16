import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { RunLog } from '@/types';

const RUN_LOGS_COLLECTION = 'runLogs';

export class RunLogSaveError extends Error {
  constructor() {
    super('러닝 기록을 저장하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'RunLogSaveError';
  }
}

export class RunLogDeleteError extends Error {
  constructor() {
    super('러닝 기록을 삭제하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'RunLogDeleteError';
  }
}

// 러닝 종료 시 만드는 값. id/userId는 createRunLog가 Firestore auto-ID와 호출자(userId)로 채운다.
export type NewRunLogDraft = Omit<RunLog, 'id' | 'userId'>;

// firestore.rules의 runLogs.create 조건(허용 필드 목록·타입)과 반드시 동일하게 유지할 것.
export async function createRunLog(userId: string, draft: NewRunLogDraft): Promise<void> {
  try {
    await addDoc(collection(db, RUN_LOGS_COLLECTION), {
      ...draft,
      userId,
    });
    if (__DEV__) {
      console.log('[runLogs] 생성 성공', { userId, courseName: draft.courseName });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[runLogs] 생성 실패', {
        userId,
        courseName: draft.courseName,
        errorName: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new RunLogSaveError();
    }
    throw error;
  }
}

// "나중에 할게요"로 미뤄둔 기록을 뒤늦게 코스로 업로드할 때(app/run-log) 쓴다. firestore.rules의
// runLogs.update는 courseName/isUploaded 두 필드만 바뀌는 것만 허용하므로 이 두 필드만 보낸다.
export async function markRunLogUploaded(logId: string, courseName: string): Promise<void> {
  try {
    await updateDoc(doc(db, RUN_LOGS_COLLECTION, logId), {
      courseName,
      isUploaded: true,
    });
  } catch (error) {
    if (__DEV__) {
      console.error('[runLogs] 업로드 표시 실패', {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new RunLogSaveError();
    }
    throw error;
  }
}

// "내 러닝 기록" 화면의 스와이프 삭제에서 쓴다. firestore.rules의 runLogs.delete가 본인
// 문서(userId 일치)에 한해서만 허용하므로, 다른 유저 문서 id를 넘기면 규칙에서 거부된다.
export async function deleteRunLog(logId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RUN_LOGS_COLLECTION, logId));
    if (__DEV__) {
      console.log('[runLogs] 삭제 성공', { logId });
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[runLogs] 삭제 실패', {
        logId,
        errorName: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new RunLogDeleteError();
    }
    throw error;
  }
}

// "이 유저가 이미 만든 러닝 기록이 코스 이름별로 몇 개씩 있는지"를 1회성으로 확인할 때
// 쓴다 — lib/seedMockAccountData.ts가 파클로즈 계정 시드 중 이름이 같은 코스가 여러 개
// 필요할 때 부족한 개수만 이어서 채우는 데 쓴다. getUploadedCourseNameCounts와 동일한
// 이유로 Set이 아닌 Map(이름 → 개수)으로 반환한다.
export async function getUploadedRunLogCourseNameCounts(userId: string): Promise<Map<string, number>> {
  const snapshot = await getDocs(query(collection(db, RUN_LOGS_COLLECTION), where('userId', '==', userId)));
  const counts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const courseName = doc.data().courseName as string;
    counts.set(courseName, (counts.get(courseName) ?? 0) + 1);
  }
  return counts;
}

function mapRunLogDoc(doc: QueryDocumentSnapshot): RunLog {
  const data = doc.data();
  return {
    id: doc.id,
    userId: data.userId,
    trajectory: data.trajectory,
    startedAt: data.startedAt,
    durationSec: data.durationSec,
    paceSecPerKm: data.paceSecPerKm,
    courseName: data.courseName,
    distanceKm: data.distanceKm,
    cadenceSpm: data.cadenceSpm,
    avgHeartRateBpm: data.avgHeartRateBpm,
    elevationSeries: data.elevationSeries,
    paceSeries: data.paceSeries,
    heartRateSeries: data.heartRateSeries,
    difficulty: data.difficulty,
    isUploaded: data.isUploaded,
    runMateName: data.runMateName,
  };
}

// 로그인한 유저 본인의 러닝 기록만 실시간 구독한다(최신순). uid가 바뀌면(로그인/로그아웃)
// 호출한 쪽에서 새 uid로 다시 구독해야 한다 — lib/appData.tsx가 이를 처리한다.
//
// 정렬은 쿼리의 orderBy가 아니라 클라이언트에서 한다: where + orderBy를 함께 쓰면 Firestore
// 복합 인덱스(userId+startedAt)가 필요한데, 이 저장소는 firestore.indexes.json으로 인덱스를
// 관리하지 않아(콘솔 수동 생성 의존) 인덱스가 없거나 다른 프로젝트로 바뀌면 onSnapshot이
// 에러 콜백만 타고 onChange가 아예 호출되지 않아 화면이 조용히 빈 상태로 남는 문제가 실제로
// 두 차례 발생했다. where 단일 조건 쿼리는 인덱스가 필요 없어 이 문제 자체가 생기지 않는다.
export function subscribeToRunLogs(userId: string, onChange: (runLogs: RunLog[]) => void): Unsubscribe {
  const q = query(collection(db, RUN_LOGS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapRunLogDoc).sort((a, b) => b.startedAt - a.startedAt)),
    (error) => console.error('[runLogs] 구독 실패', error),
  );
}
