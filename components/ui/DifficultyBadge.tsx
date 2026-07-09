import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

interface DifficultyBadgeProps {
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((level) => (
        <View key={level} style={[styles.dot, level <= difficulty ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotFilled: {
    backgroundColor: colors.ink,
  },
  dotEmpty: {
    backgroundColor: colors.border,
  },
});
