import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradeBadge } from '@/components/ui/GradeBadge';
import { colors } from '@/constants/colors';
import { formatDateLabel } from '@/lib/format';
import type { AuthUser, GradeLevel } from '@/types';

interface ProfileHeaderProps {
  user: AuthUser | null;
  initializing: boolean;
  gradeLevel: GradeLevel;
  onPress: () => void;
}

export function ProfileHeader({ user, initializing, gradeLevel, onPress }: ProfileHeaderProps) {
  const insets = useSafeAreaInsets();

  if (!user) {
    return (
      <Pressable
        onPress={onPress}
        disabled={initializing}
        style={({ pressed }) => [styles.row, { paddingTop: insets.top + 8 }, pressed && styles.pressed]}
      >
        <View style={styles.avatar}>
          <Ionicons name="person-circle-outline" size={32} color={colors.textMuted} />
        </View>
        <View style={styles.info}>
          <Text style={styles.guestText}>{initializing ? '불러오는 중...' : '로그인이 필요해요'}</Text>
        </View>
        {initializing ? null : (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
        )}
      </Pressable>
    );
  }

  const name = user.displayName ?? user.email ?? '이름 없음';
  const initial = name.charAt(0).toUpperCase();
  const joinedLabel = user.createdAt ? `가입일 ${formatDateLabel(user.createdAt)}` : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { paddingTop: insets.top + 8 }, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{name}</Text>
          <GradeBadge level={gradeLevel} size={25} />
        </View>
        {joinedLabel ? <Text style={styles.meta}>{joinedLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  guestText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chevron: {
    marginLeft: 'auto',
  },
});
