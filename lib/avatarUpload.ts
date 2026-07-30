import { FirebaseError } from 'firebase/app';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '@/lib/firebase';

export class AvatarUploadError extends Error {
  constructor() {
    super('프로필 사진을 업로드하지 못했어요. 잠시 후 다시 시도해주세요');
    this.name = 'AvatarUploadError';
  }
}

// RN(Hermes)에서 fetch(uri).blob()으로 로컬 file:// URI를 읽으면 Firebase Storage 업로드가
// 간헐적으로 실패하는 문제가 알려져 있다 — Firebase 공식 RN 가이드가 권장하는 XHR 기반
// 방식을 쓴다 (https://firebase.google.com/docs/storage/web/upload-files 의 RN 예제와 동일).
function readLocalFileAsBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('로컬 파일을 읽지 못했어요'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

// storage.rules의 profilePhotos/{uid}.jpg 경로·contentType 조건과 반드시 동일하게 유지할 것.
export async function uploadAvatar(uid: string, fileUri: string): Promise<string> {
  let blob: Blob | null = null;
  try {
    blob = await readLocalFileAsBlob(fileUri);
    const avatarRef = ref(storage, `profilePhotos/${uid}.jpg`);
    await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(avatarRef);
  } catch (error) {
    if (__DEV__) {
      console.error('[avatarUpload] 업로드 실패', {
        name: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof FirebaseError ? error.code : undefined,
      });
    }
    if (error instanceof FirebaseError) {
      throw new AvatarUploadError();
    }
    throw error;
  } finally {
    // RN의 Blob 구현은 네이티브 쪽에 데이터를 들고 있어 명시적으로 닫아줘야 누수가 없다.
    (blob as (Blob & { close?: () => void }) | null)?.close?.();
  }
}
