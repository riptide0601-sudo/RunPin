import { StyleSheet, Text, View } from 'react-native';

import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { colors } from '@/constants/colors';

interface CourseMetaRowProps {
  distanceKm: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export function CourseMetaRow({ distanceKm, difficulty }: CourseMetaRowProps) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.meta}>{distanceKm}km · 난이도</Text>
      <DifficultyBadge difficulty={difficulty} />
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
