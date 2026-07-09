import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/constants/colors';

interface RunningBadgeProps {
  style?: StyleProp<ViewStyle>;
}

export function RunningBadge({ style }: RunningBadgeProps) {
  return (
    <View style={[styles.row, style]} pointerEvents="none">
      <View style={styles.dot} />
      <Text style={styles.text}>러닝 중</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMe,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentMe,
  },
});
