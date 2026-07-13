import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PlatformPressable } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';

// @react-navigation/bottom-tabs hardcodes padding:5 + justifyContent:'flex-start'
// on the tab button itself (tabVerticalUiKit style) and only exposes
// tabBarItemStyle to the *outer* wrapper, not the button — so shrinking
// tabBarStyle.height or setting tabBarItemStyle.justifyContent alone cannot
// change the button's internal padding and silently overflows instead of
// shrinking. tabBarButton below replaces that padding with 0 so the content
// height below is the real, full height of the button.
const ICON_HEIGHT = 28; // default wrapperUikit height in TabBarIcon.tsx
const LABEL_LINE_HEIGHT = 12;
const CONTENT_HEIGHT = ICON_HEIGHT + LABEL_LINE_HEIGHT; // 40
const VERTICAL_MARGIN = 2; // equal top/bottom margin around icon+label
const TAB_BAR_CONTENT_HEIGHT = CONTENT_HEIGHT + VERTICAL_MARGIN * 2; // 44, excludes safe-area inset

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          lineHeight: LABEL_LINE_HEIGHT,
        },
        tabBarButton: (props) => (
          <PlatformPressable
            {...props}
            style={[props.style, { padding: 0, justifyContent: 'center' }]}
          />
        ),
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
