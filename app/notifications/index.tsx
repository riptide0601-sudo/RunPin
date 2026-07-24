import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingToggleRow } from '@/components/profile/SettingToggleRow';
import { colors } from '@/constants/colors';

interface NotificationSetting {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
}

const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  { id: 'propose', icon: 'people-outline', label: '러닝 제안 알림', description: '함께 뛰자는 제안이 오면 알려드려요' },
  { id: 'course', icon: 'map-outline', label: '코스 업데이트 알림', description: '저장한 코스에 새 소식이 있을 때' },
  { id: 'community', icon: 'chatbubble-ellipses-outline', label: '커뮤니티 알림', description: '좋아요, 댓글 등 커뮤니티 활동' },
  { id: 'marketing', icon: 'megaphone-outline', label: '마케팅 정보 수신', description: '이벤트, 혜택 소식 받기' },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, boolean>>({
    propose: true,
    course: true,
    community: true,
    marketing: false,
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>알림 설정</Text>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {NOTIFICATION_SETTINGS.map((setting) => (
          <SettingToggleRow
            key={setting.id}
            icon={setting.icon}
            label={setting.label}
            description={setting.description}
            value={values[setting.id]}
            onValueChange={(next) => setValues((prev) => ({ ...prev, [setting.id]: next }))}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
});
