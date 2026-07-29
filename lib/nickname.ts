import { FirebaseError } from 'firebase/app';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/lib/firebase';

const USERNAMES_COLLECTION = 'usernames';
const MIN_NICKNAME_LENGTH = 2;
const MAX_NICKNAME_LENGTH = 20;

export class NicknameTakenError extends Error {
  constructor() {
    super('이미 사용 중인 닉네임이에요');
    this.name = 'NicknameTakenError';
  }
}

export class NicknameInvalidError extends Error {}

// 앞뒤 공백만 제거하고 대소문자는 그대로 유지한다("Kim"과 "kim"은 서로 다른 닉네임).
// 이 값이 그대로 Firestore 문서 ID로 쓰인다.
function normalizeNickname(raw: string): string {
  return raw.trim();
}

// firestore.rules의 create 조건(길이 등)과 반드시 동일하게 유지할 것 — 어긋나면 규칙
// 위반이 "닉네임 중복"으로 잘못 표시된다 (claimNickname의 permission-denied 처리 참고).
export function validateNickname(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length < MIN_NICKNAME_LENGTH || trimmed.length > MAX_NICKNAME_LENGTH) {
    throw new NicknameInvalidError(
      `닉네임은 ${MIN_NICKNAME_LENGTH}자 이상 ${MAX_NICKNAME_LENGTH}자 이하로 입력해주세요`,
    );
  }
  if (trimmed.includes('/')) {
    throw new NicknameInvalidError('닉네임에 "/" 문자는 사용할 수 없어요');
  }
  return trimmed;
}

// 회원가입 폼에서 즉시 피드백을 주기 위한 사전 체크(미인증 상태에서 호출).
// ⚠️ 이것만으로는 동시 가입 경쟁 상태를 막지 못한다(TOCTOU) — 실제 원자성 보장은
// claimNickname()이 서버 규칙에 의해 거부되는 것에 의존한다.
export async function isNicknameAvailable(rawNickname: string): Promise<boolean> {
  const normalized = normalizeNickname(rawNickname);
  if (!normalized) return false;
  const snapshot = await getDoc(doc(db, USERNAMES_COLLECTION, normalized));
  return !snapshot.exists();
}

// 인증된 사용자(uid)로 닉네임 소유권을 원자적으로 등록한다. 이미 존재하는 문서에 대한
// 쓰기는 Firestore 규칙상 'update'로 취급되어 permission-denied로 거부된다 — 이것이
// 경쟁 상태를 막는 실질적 보장이다.
export async function claimNickname(uid: string, rawNickname: string): Promise<string> {
  const trimmed = validateNickname(rawNickname);
  const normalized = normalizeNickname(trimmed);
  try {
    await setDoc(doc(db, USERNAMES_COLLECTION, normalized), {
      uid,
      displayName: trimmed,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'permission-denied') {
      throw new NicknameTakenError();
    }
    throw error;
  }
  return trimmed;
}
