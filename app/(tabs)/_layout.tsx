import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

const TAB_BAR_CONTENT_HEIGHT = 44; // excludes safe-area inset
// 콘텐츠(아이콘+라벨)가 탭바 맨 위에 바짝 붙어 보이는 것을 완화하기 위한 여백.
// paddingBottom(=insets.bottom)은 그대로 둬 홈 인디케이터와의 거리는 유지하고,
// 콘텐츠 박스만 이만큼 아래로 내린다.
const TAB_BAR_TOP_PADDING = 34;

// react-navigation의 BottomTabItem 내부 정렬(padding/justifyContent 하드코딩)에
// 의존하지 않기 위해, 버튼의 children(아이콘+라벨)을 우리가 직접 만든 height:100%
// View로 한 번 더 감싸서 그 안에서 수동으로 수직 중앙 정렬한다.
const renderTabBarButton = (props: ComponentProps<typeof PlatformPressable>) => (
  <PlatformPressable {...props} style={[props.style, { padding: 0 }]}>
    <View
      style={{ height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center' }}
      onLayout={
        __DEV__ ? (e) => console.log('[TabBar] content box layout =', e.nativeEvent.layout) : undefined
      }
    >
      {props.children}
    </View>
  </PlatformPressable>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  if (__DEV__) {
    console.log('[TabBar] insets =', insets);
    console.log(
      '[TabBar] computed height =',
      TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + insets.bottom
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: TAB_BAR_TOP_PADDING,
        },
        tabBarButton: renderTabBarButton,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: '랭킹',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '마이',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
