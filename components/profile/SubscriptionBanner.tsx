import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/colors';

interface SubscriptionBannerProps {
  isSubscribed: boolean;
  remaining: number;
  limit: number;
  memberName: string;
  onPress: () => void;
}

const MASKED_NUMBER = '••••  ••••  ••••  ••••';

export function SubscriptionBanner({ isSubscribed, remaining, limit, memberName, onPress }: SubscriptionBannerProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      <View style={[styles.card, isSubscribed ? styles.cardSubscribed : styles.cardDefault]}>
        {isSubscribed ? (
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            <Defs>
              <LinearGradient id="proGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#D9B36C" />
                <Stop offset="1" stopColor="#8C6A2C" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx={20} fill="url(#proGradient)" />
          </Svg>
        ) : null}

        <View style={styles.topRow}>
          <Text style={styles.brand}>RUNPIN</Text>
          <View style={[styles.badge, isSubscribed && styles.badgeSubscribed]}>
            <Ionicons name={isSubscribed ? 'sparkles' : 'sparkles-outline'} size={16} color={colors.textInverse} />
          </View>
        </View>

        <Text style={styles.wordmark}>RunPin PRO</Text>

        <Text style={[styles.masked, isSubscribed && styles.maskedOnAccent]}>{MASKED_NUMBER}</Text>

        <View style={styles.bottomRow}>
          <View>
            <Text style={[styles.bottomLabel, isSubscribed && styles.bottomLabelOnAccent]}>
              {isSubscribed ? '이용 중' : '무료 제안'}
            </Text>
            <Text style={styles.bottomValue}>{isSubscribed ? '무제한' : `${remaining}/${limit}회 남음`}</Text>
          </View>
          <Text style={[styles.holder, isSubscribed && styles.holderOnAccent]}>{memberName.toUpperCase()}</Text>
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
    aspectRatio: 1.6,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  cardSubscribed: {
    borderWidth: 0,
    shadowColor: '#8C6A2C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.55)',
  },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badgeSubscribed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.textInverse,
  },
  masked: {
    fontSize: 15,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.35)',
  },
  maskedOnAccent: {
    color: 'rgba(255,255,255,0.55)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
  },
  bottomLabelOnAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
  bottomValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 2,
  },
  holder: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
  },
  holderOnAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
});
