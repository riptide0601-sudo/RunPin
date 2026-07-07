import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';
import type { ProfileStats } from '@/types';

interface StatsRowProps {
  stats: ProfileStats;
}

export function StatsRow({ stats }: StatsRowProps) {
  const items = [
    { label: '총거리', value: `${stats.totalDistanceKm}km` },
    { label: '업로드 코스', value: String(stats.uploadedCourseCount) },
    { label: '함께 뛴 러너', value: String(stats.runMatesCount) },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Card key={item.label} style={styles.card}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 16,
    backgroundColor: colors.surfaceAlt,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
