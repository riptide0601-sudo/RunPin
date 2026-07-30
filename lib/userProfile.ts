import { FirebaseError } from 'firebase/app';
import { doc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';

import { db } from '@/lib/firebase';

const USERS_COLLECTION = 'users';

export class UserPhotoSaveError extends Error {
  constructor() {
    super('프로필 사진을 저장하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'UserPhotoSaveError';
  }
}

// firestore.rules의 users/{uid} 규칙(허용 필드·photoBase64 크기 제한)과
// components/profile/AvatarCropScreen.tsx의 MAX_BASE64_LENGTH와 반드시 동일하게 유지할 것.
export async function saveUserPhoto(uid: string, photoBase64: string): Promise<void> {
  try {
    await setDoc(doc(db, USERS_COLLECTION, uid), { photoBase64, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new UserPhotoSaveError();
    }
    throw error;
  }
}

// 본인 프로필 문서만 실시간 구독한다(다른 유저 사진을 보여주는 화면이 아직 없어 규칙도 본인만 read 허용).
export function subscribeToUserPhoto(uid: string, onChange: (photoBase64: string | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (snapshot) => onChange((snapshot.data()?.photoBase64 as string | undefined) ?? null),
    (error) => console.error('[userProfile] 구독 실패', error),
  );
}
