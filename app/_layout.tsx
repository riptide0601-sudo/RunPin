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
  const { user, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const inAuthGroup = segments[0] === 'auth';

  useEffect(() => {
    if (initializing) return;
    if (!user && !inAuthGroup) {
      router.replace('/auth');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [initializing, user, inAuthGroup, router]);

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
              </Stack>
            </AuthGate>
            <StatusBar style="auto" />
          </AppDataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
