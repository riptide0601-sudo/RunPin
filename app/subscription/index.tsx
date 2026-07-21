import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';

const BENEFITS = [
  '함께 뛰자고 제안하기 무제한',
  '무료 5회 제한 없이 자유롭게 매칭 시도',
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSubscribed, subscribe } = useAppData();

  const handleSubscribe = () => {
    subscribe();
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>구독</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>RunPin 구독</Text>
          {BENEFITS.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.accentSubscribe} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </Card>

        {isSubscribed ? (
          <View style={styles.subscribedRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.accentSubscribe} />
            <Text style={styles.subscribedText}>이미 구독 중이에요</Text>
          </View>
        ) : (
          <Pill
            label="구독하기"
            variant="filled"
            size="lg"
            onPress={handleSubscribe}
            style={styles.subscribeButton}
            labelStyle={styles.subscribeButtonLabel}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  card: {
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
  },
  subscribeButton: {
    backgroundColor: colors.accentSubscribe,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  subscribeButtonLabel: {
    textAlign: 'center',
    flex: 1,
  },
  subscribedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subscribedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
