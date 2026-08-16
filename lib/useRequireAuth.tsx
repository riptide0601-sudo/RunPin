import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { AlertModal } from '@/components/ui/AlertModal';
import { useAuth } from '@/lib/auth';

interface RequireAuthContextValue {
  requireAuth: (action: () => void, message?: string) => void;
}

const RequireAuthContext = createContext<RequireAuthContextValue | null>(null);

const DEFAULT_MESSAGE = '이 기능을 사용하려면 먼저 로그인해주세요';

// 좋아요처럼 로그인이 필요한 액션이 여러 화면(홈 카드/랭킹 아이템/코스 상세 모달 등)에
// 흩어져 있을 때, 화면마다 로그인 안내 모달 상태를 따로 만들지 않고 이 Provider 하나가
// app/_layout.tsx에서 한 번만 렌더링한다 — app/(tabs)/community.tsx의 기존 "로그인이
// 필요해요" AlertModal 패턴을 재사용 가능한 형태로 뽑은 것.
export function RequireAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<{ action: () => void; message: string } | null>(null);

  const requireAuth = useCallback(
    (action: () => void, message: string = DEFAULT_MESSAGE) => {
      if (user) {
        action();
        return;
      }
      setPending({ action, message });
    },
    [user],
  );

  const value = useMemo<RequireAuthContextValue>(() => ({ requireAuth }), [requireAuth]);

  return (
    <RequireAuthContext.Provider value={value}>
      {children}
      <AlertModal
        visible={pending !== null}
        icon="log-in-outline"
        title="로그인이 필요해요"
        message={pending?.message ?? DEFAULT_MESSAGE}
        primaryAction={{
          label: '로그인하기',
          onPress: () => {
            setPending(null);
            router.push('/auth');
          },
        }}
        secondaryAction={{ label: '취소', onPress: () => setPending(null) }}
        onRequestClose={() => setPending(null)}
      />
    </RequireAuthContext.Provider>
  );
}

export function useRequireAuth(): RequireAuthContextValue {
  const context = useContext(RequireAuthContext);
  if (!context) {
    throw new Error('useRequireAuth must be used within a RequireAuthProvider');
  }
  return context;
}
