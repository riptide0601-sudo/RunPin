import { FirebaseError } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
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

// "이 유저가 이미 만든 러닝 기록의 코스 이름 목록"을 1회성으로 확인할 때 쓴다 —
// lib/seedMockAccountData.ts가 파클로즈 계정 시드 중 이미 만들어진 러닝 기록은 건너뛰고
// 빠진 것만 이어서 채우는 데 쓴다.
export async function getUploadedRunLogCourseNames(userId: string): Promise<Set<string>> {
  const snapshot = await getDocs(query(collection(db, RUN_LOGS_COLLECTION), where('userId', '==', userId)));
  return new Set(snapshot.docs.map((doc) => doc.data().courseName as string));
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
export function subscribeToRunLogs(userId: string, onChange: (runLogs: RunLog[]) => void): Unsubscribe {
  const q = query(collection(db, RUN_LOGS_COLLECTION), where('userId', '==', userId), orderBy('startedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => onChange(snapshot.docs.map(mapRunLogDoc)),
    (error) => console.error('[runLogs] 구독 실패', error),
  );
}
