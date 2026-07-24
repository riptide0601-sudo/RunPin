import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuItem } from '@/components/profile/MenuItem';
import { AlertModal } from '@/components/ui/AlertModal';
import { colors } from '@/constants/colors';
import type { MenuItemData } from '@/types';

const SUPPORT_ITEMS: MenuItemData[] = [
  { id: 'faq', label: '자주 묻는 질문', icon: 'help-circle-outline' },
  { id: 'inquiry', label: '1:1 문의하기', icon: 'chatbox-ellipses-outline' },
  { id: 'notice', label: '공지사항', icon: 'megaphone-outline' },
  { id: 'terms', label: '이용약관', icon: 'document-text-outline' },
  { id: 'policy', label: '개인정보 처리방침', icon: 'shield-checkmark-outline' },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>고객센터</Text>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {SUPPORT_ITEMS.map((item) => (
          <MenuItem key={item.id} item={item} onPress={() => setPendingLabel(item.label)} />
        ))}
        <View style={styles.versionRow}>
          <Text style={styles.versionLabel}>앱 버전</Text>
          <Text style={styles.versionValue}>1.0.0</Text>
        </View>
      </ScrollView>

      <AlertModal
        visible={pendingLabel !== null}
        icon="construct-outline"
        title="준비 중이에요"
        message={`${pendingLabel} 기능은 곧 만나보실 수 있어요.`}
        primaryAction={{ label: '확인', onPress: () => setPendingLabel(null) }}
        onRequestClose={() => setPendingLabel(null)}
      />
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
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  versionLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
