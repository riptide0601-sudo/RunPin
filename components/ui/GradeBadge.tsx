import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, gradeColors } from '@/constants/colors';
import type { GradeLevel } from '@/types';

interface GradeBadgeProps {
  level: GradeLevel;
  size?: number;
  style?: ViewStyle;
}

export function GradeBadge({ level, size = 20, style }: GradeBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: gradeColors[level] },
        style,
      ]}
    >
      <Text style={[styles.label, { fontSize: size * 0.55 }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    color: colors.textInverse,
  },
});
