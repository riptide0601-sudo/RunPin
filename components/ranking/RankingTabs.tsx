import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import type { RankingPeriod } from '@/types';

export type { RankingPeriod };

interface RankingTabsProps {
  value: RankingPeriod;
  onChange: (value: RankingPeriod) => void;
}

const OPTIONS: { value: RankingPeriod; label: string }[] = [
  { value: 'monthly', label: '월간' },
  { value: 'yearly', label: '연간' },
  { value: 'all', label: '전체' },
];

export function RankingTabs({ value, onChange }: RankingTabsProps) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => (
        <Pill
          key={option.value}
          label={option.label}
          variant={value === option.value ? 'filled' : 'outline'}
          onPress={() => onChange(option.value)}
          style={styles.pill}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
});
