import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

export class AvatarUploadError extends Error {
  constructor() {
    super('프로필 사진을 업로드하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'AvatarUploadError';
  }
}

// storage.rules의 profilePhotos/{uid}.jpg 경로·contentType 조건과 반드시 동일하게 유지할 것.
export async function uploadAvatar(uid: string, fileUri: string): Promise<string> {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const avatarRef = ref(storage, `profilePhotos/${uid}.jpg`);
    await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(avatarRef);
  } catch (error) {
    if (error instanceof FirebaseError) {
      throw new AvatarUploadError();
    }
    throw error;
  }
}
