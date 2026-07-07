import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';

interface MatchProposalCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function MatchProposalCard({ onAccept, onDecline }: MatchProposalCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.info}>
        <View style={styles.legendDot} />
        <Text style={styles.text}>매칭 러너가 함께 뛰자고 제안했어요</Text>
      </View>
      <View style={styles.actions}>
        <Pill label="거절" variant="outline" onPress={onDecline} />
        <Pill label="수락" variant="filled" onPress={onAccept} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentMatch,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});
