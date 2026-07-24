import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RunChartMotif } from '@/components/ui/RunChartMotif';
import { colors } from '@/constants/colors';

interface SubscriptionBannerProps {
  isSubscribed: boolean;
  remaining: number;
  limit: number;
  onPress: () => void;
}

export function SubscriptionBanner({ isSubscribed, remaining, limit, onPress }: SubscriptionBannerProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      <View style={styles.card}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>RunPin</Text>
          {isSubscribed ? <Text style={styles.wordmarkPro}> PRO</Text> : null}
        </View>

        <RunChartMotif />

        <View>
          <Text style={[styles.bottomLabel, isSubscribed && styles.hidden]}>FREE PROPOSAL</Text>
          <Text style={[styles.bottomValue, isSubscribed && styles.bottomValueSubscribed]}>
            {isSubscribed ? 'UNLIMITED PROPOSAL' : `${remaining}/${limit}`}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    aspectRatio: 2.4,
    borderRadius: 20,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmark: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textInverse,
  },
  wordmarkPro: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#F0C878',
  },
  hidden: {
    opacity: 0,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.45)',
  },
  bottomValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
    color: colors.textInverse,
    marginTop: 2,
  },
  bottomValueSubscribed: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
  },
});
