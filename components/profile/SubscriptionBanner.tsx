import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { colors } from '@/constants/colors';

interface SubscriptionBannerProps {
  isSubscribed: boolean;
  remaining: number;
  limit: number;
  onPress: () => void;
}

export function SubscriptionBanner({ isSubscribed, remaining, limit, onPress }: SubscriptionBannerProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.card, isSubscribed && styles.cardSubscribed]}>
        <View style={styles.left}>
          <View style={[styles.iconWrap, isSubscribed && styles.iconWrapSubscribed]}>
            <Ionicons
              name={isSubscribed ? 'star' : 'star-outline'}
              size={18}
              color={isSubscribed ? colors.textInverse : colors.textMuted}
            />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, isSubscribed && styles.titleSubscribed]}>
              {isSubscribed ? '구독 중' : '구독하고 무제한으로 제안해보세요'}
            </Text>
            <Text style={styles.subtitle}>
              {isSubscribed ? '제안 무제한 이용 중' : `무료 제안 ${remaining}/${limit}회 남음`}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardSubscribed: {
    borderWidth: 1,
    borderColor: colors.accentSubscribe,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSubscribed: {
    backgroundColor: colors.accentSubscribe,
  },
  textCol: {
    gap: 2,
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  titleSubscribed: {
    color: colors.accentSubscribe,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
