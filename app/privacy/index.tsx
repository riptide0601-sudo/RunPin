import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MenuItem } from '@/components/profile/MenuItem';
import { SettingToggleRow } from '@/components/profile/SettingToggleRow';
import { AlertModal } from '@/components/ui/AlertModal';
import { colors } from '@/constants/colors';
import type { MenuItemData } from '@/types';

interface PrivacyToggle {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  description: string;
}

const PRIVACY_TOGGLES: PrivacyToggle[] = [
  { id: 'location', icon: 'location-outline', label: '위치정보 제공', description: '러닝 기록 및 코스 매칭에 사용돼요' },
  { id: 'profile', icon: 'person-outline', label: '프로필 공개', description: '다른 러너에게 내 프로필을 보여줘요' },
  { id: 'runLog', icon: 'analytics-outline', label: '러닝 기록 공개', description: '내 러닝 기록을 다른 러너에게 공개해요' },
];

const ACTION_ITEMS: MenuItemData[] = [
  { id: 'download', label: '내 데이터 다운로드 요청', icon: 'download-outline' },
  { id: 'delete', label: '계정 삭제', icon: 'trash-outline' },
];

export default function PrivacySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, boolean>>({
    location: true,
    profile: true,
    runLog: false,
  });
  const [alertType, setAlertType] = useState<'download' | 'delete' | null>(null);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>개인정보 설정</Text>
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {PRIVACY_TOGGLES.map((toggle) => (
          <SettingToggleRow
            key={toggle.id}
            icon={toggle.icon}
            label={toggle.label}
            description={toggle.description}
            value={values[toggle.id]}
            onValueChange={(next) => setValues((prev) => ({ ...prev, [toggle.id]: next }))}
          />
        ))}
        {ACTION_ITEMS.map((item) => (
          <MenuItem key={item.id} item={item} onPress={() => setAlertType(item.id as 'download' | 'delete')} />
        ))}
      </ScrollView>

      <AlertModal
        visible={alertType === 'download'}
        icon="download-outline"
        title="데이터 다운로드 요청"
        message="요청이 접수되면 등록된 이메일로 내 데이터 파일을 보내드려요."
        primaryAction={{ label: '요청하기', onPress: () => setAlertType(null) }}
        secondaryAction={{ label: '취소', onPress: () => setAlertType(null) }}
        onRequestClose={() => setAlertType(null)}
      />
      <AlertModal
        visible={alertType === 'delete'}
        icon="trash-outline"
        title="계정을 삭제할까요?"
        message="계정을 삭제하면 러닝 기록, 저장한 코스 등 모든 데이터가 복구할 수 없이 사라져요."
        primaryAction={{ label: '삭제', onPress: () => setAlertType(null) }}
        secondaryAction={{ label: '취소', onPress: () => setAlertType(null) }}
        onRequestClose={() => setAlertType(null)}
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
});
