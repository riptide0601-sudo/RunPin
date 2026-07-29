import { useRouter } from 'expo-router';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { AlertModal } from '@/components/ui/AlertModal';
import { useAuth } from '@/lib/auth';

const DEFAULT_MESSAGE = '이 기능을 사용하려면 먼저 로그인해주세요';

type RequireAuth = (action: () => void, message?: string) => void;

const RequireAuthContext = createContext<RequireAuth | null>(null);

// 로그인 필요 액션을 앱 전체에서 같은 방식(AlertModal + "로그인하기" → /auth)으로
// 처리하기 위한 provider. 모달 인스턴스를 여기서 하나만 렌더링해서, 카드/리스트
// 아이템처럼 화면에 수십~수백 개 마운트되는 컴포넌트가 각자 모달을 만들지 않게 한다.
export function RequireAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const requireAuth = useMemo<RequireAuth>(
    () => (action, customMessage) => {
      if (user) {
        action();
        return;
      }
      setMessage(customMessage ?? DEFAULT_MESSAGE);
      setVisible(true);
    },
    [user],
  );

  return (
    <RequireAuthContext.Provider value={requireAuth}>
      {children}
      <AlertModal
        visible={visible}
        icon="log-in-outline"
        title="로그인이 필요해요"
        message={message}
        primaryAction={{
          label: '로그인하기',
          onPress: () => {
            setVisible(false);
            router.push('/auth');
          },
        }}
        secondaryAction={{ label: '취소', onPress: () => setVisible(false) }}
        onRequestClose={() => setVisible(false)}
      />
    </RequireAuthContext.Provider>
  );
}

// 로그인 상태면 action을 바로 실행하고, 아니면 로그인 유도 모달을 띄운다.
export function useRequireAuth(): RequireAuth {
  const context = useContext(RequireAuthContext);
  if (!context) {
    throw new Error('useRequireAuth must be used within a RequireAuthProvider');
  }
  return context;
}
