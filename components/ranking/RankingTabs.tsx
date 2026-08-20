import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { PERIOD_META, RANKING_PERIODS } from '@/lib/ranking';
import type { RankingPeriod } from '@/types';

export type { RankingPeriod };

interface RankingTabsProps {
  value: RankingPeriod;
  onChange: (value: RankingPeriod) => void;
}

export function RankingTabs({ value, onChange }: RankingTabsProps) {
  return (
    <View style={styles.row}>
      {RANKING_PERIODS.map((period) => (
        <Pill
          key={period}
          label={PERIOD_META[period].label}
          variant={value === period ? 'filled' : 'outline'}
          onPress={() => onChange(period)}
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
