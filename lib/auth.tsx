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
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';

import { auth } from '@/lib/firebase';
import type { AuthUser } from '@/types';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않아요',
  'auth/invalid-email': '이메일 형식이 올바르지 않아요',
  'auth/email-already-in-use': '이미 가입된 이메일이에요',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요',
  'auth/too-many-requests': '잠시 후 다시 시도해주세요',
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

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
      signIn: async (email, password) => {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
          throw new Error(toAuthErrorMessage(error));
        }
      },
      signUp: async (email, password, displayName) => {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, password);
          if (displayName.trim()) {
            await updateProfile(credential.user, { displayName: displayName.trim() });
          }
          await firebaseSignOut(auth);
        } catch (error) {
          throw new Error(toAuthErrorMessage(error));
        }
      },
      signOut: () => firebaseSignOut(auth),
    }),
    [user, initializing],
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
