import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';

interface CourseBannerProps {
  title: string;
  distanceKm: number;
}

export function CourseBanner({ title, distanceKm }: CourseBannerProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>
        {title} · {distanceKm}km
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
