import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';
import {
  claimNickname,
  isNicknameAvailable,
  validateNickname,
  NicknameInvalidError,
  NicknameTakenError,
} from '@/lib/nickname';
import type { AuthUser } from '@/types';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요',
  'auth/email-already-in-use': '이미 가입된 이메일이에요',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요',
  'auth/user-not-found': '가입되지 않은 이메일이에요',
};

function toAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? '문제가 발생했어요. 잠시 후 다시 시도해주세요';
  }
  return '문제가 발생했어요. 잠시 후 다시 시도해주세요';
}

function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).getTime() : null,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  // true까지는 AsyncStorage에서 세션을 복원 중인 상태 — 이 동안은 로그아웃 상태로 단정하지 않는다.
  initializing: boolean;
  // signUp 진행 중에는 createUserWithEmailAndPassword가 계정을 잠깐 자동 로그인시킨 뒤
  // 마지막에 signOut하는 구간이 있다. 이 사이 onAuthStateChanged가 로그인됨을 감지해도
  // AuthGate가 홈으로 리다이렉트했다가 다시 튕기지 않도록, 이 구간 동안은 true.
  isSigningUp: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser ? toAuthUser(firebaseUser) : null);
      setInitializing(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      isSigningUp,
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
          throw new Error(toAuthErrorMessage(error));
        }
      },
      signUp: async (email, password, displayName) => {
        // createUserWithEmailAndPassword가 계정을 잠깐 자동 로그인시키고, 이 함수 끝에서
        // signOut할 때까지 onAuthStateChanged가 "로그인됨"을 보게 된다. 그 구간 동안
        // AuthGate가 홈으로 리다이렉트했다가 다시 튕기지 않도록 isSigningUp으로 감싼다.
        setIsSigningUp(true);
        try {
          let trimmedName: string;
          try {
            trimmedName = validateNickname(displayName);
          } catch (error) {
            if (error instanceof NicknameInvalidError) throw error;
            throw new Error(toAuthErrorMessage(error));
          }

          // 1) 사전 체크 — UX 개선용. 진짜 경쟁 상태 방지는 3)의 claimNickname/규칙이 담당.
          try {
            const available = await isNicknameAvailable(trimmedName);
            if (!available) throw new NicknameTakenError();
          } catch (error) {
            if (error instanceof NicknameTakenError) throw error;
            throw new Error(toAuthErrorMessage(error));
          }

          // 2) Auth 계정 생성
          let credential: UserCredential;
          try {
            credential = await createUserWithEmailAndPassword(auth, email, password);
          } catch (error) {
            throw new Error(toAuthErrorMessage(error));
          }

          // 3) 닉네임 원자적 등록. 실패(경쟁 상태로 이미 선점됨) 시 방금 만든 계정을 롤백한다.
          try {
            await claimNickname(credential.user.uid, trimmedName);
          } catch (error) {
            try {
              await credential.user.delete();
            } catch {
              // 롤백(계정 삭제) 자체가 실패하면 고아 Auth 계정이 남을 수 있음.
              // 원래 에러(닉네임 중복 등)를 그대로 사용자에게 보여주는 것을 우선한다.
            }
            if (error instanceof NicknameTakenError) throw error;
            throw new Error(toAuthErrorMessage(error));
          }

          // 4) 닉네임 등록은 이미 성공했으므로, 프로필 동기화 실패는 계정을 롤백하지 않는다.
          try {
            await updateProfile(credential.user, { displayName: trimmedName });
          } catch {
            // Auth 프로필 displayName 동기화만 실패한 상태. usernames 문서는 정상 등록됨.
          }

          await firebaseSignOut(auth);
        } finally {
          setIsSigningUp(false);
        }
      },
      signOut: () => firebaseSignOut(auth),
      resetPassword: async (email) => {
        try {
          await sendPasswordResetEmail(auth, email);
        } catch (error) {
          throw new Error(toAuthErrorMessage(error));
        }
      },
    }),
    [user, initializing, isSigningUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
