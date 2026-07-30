import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { AppDataProvider } from '@/lib/appData';
import { AuthProvider, useAuth } from '@/lib/auth';

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.ink} />
    </View>
  );
}

// 앱 전체를 로그인 필수로 게이트: 비로그인 상태면 /auth 외 어떤 화면도 렌더링하지 않는다.
function AuthGate({ children }: { children: ReactNode }) {
  const { user, initializing, isSigningUp } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === 'auth';

  useEffect(() => {
    // signUp 도중엔 계정이 잠깐 자동 로그인 상태였다가 signOut되므로, 그 구간에는
    // user 값의 변화를 리다이렉트 판단에 반영하지 않는다 (lib/auth.tsx의 isSigningUp 참고).
    if (initializing || isSigningUp) return;
    if (!user && !inAuthGroup) {
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [initializing, isSigningUp, user, inAuthGroup, router]);

  if (initializing) return <LoadingScreen />;
  // redirect useEffect가 실행되기 전 한 프레임 동안 보호된 화면이 보이는 것을 방지.
  if (!user && !inAuthGroup) return <LoadingScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppDataProvider>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="auth/index"
                  options={{
                    // 풀스크린 시작화면 컨셉: presentation/animation은 기본값 사용.
                    // 다만 최상위 강제 게이트 화면이라 스와이프로 닫히면 안 됨
                    // (하드웨어 back 차단은 app/auth/index.tsx의 BackHandler가 담당).
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="avatar-crop"
                  options={{
                    // 탭 네비게이터 밖의 일반 라우트라 기본 'card' presentation만으로도 탭바를
                    // 자연스럽게 덮는다(활성 라우트가 바뀌어 탭 네비게이터 자체가 안 보임).
                    // presentation을 'fullScreenModal'로 줬었는데, 이건 iOS에서
                    // react-native-screens가 RN Modal과 똑같이 별도 프레젠트되는 뷰 컨트롤러로
                    // 화면을 띄우는 옵션이라 — RNGH 제스처가 그 경계를 못 넘는 문제를 다시
                    // 만들었을 가능성이 높다. /run-log, /saved-courses 등 이미 잘 되는 다른
                    // 라우트들도 전부 기본 presentation('card')이라 그대로 맞춘다.
                    // 크롭 중 실수로 스와이프해서 나가면 진행 중이던 조정이 날아가므로 막는다.
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </AuthGate>
            <StatusBar style="auto" />
          </AppDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
