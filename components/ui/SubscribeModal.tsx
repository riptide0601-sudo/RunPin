import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { RunChartMotif } from '@/components/ui/RunChartMotif';
import { colors } from '@/constants/colors';

interface SubscribeModalProps {
  visible: boolean;
  title: string;
  onSubscribe: () => void;
  onClose: () => void;
}

// 커뮤니티 제안 횟수 소진, 마이페이지 구독 카드 클릭 시 공통으로 뜨는 구독 유도 팝업.
// 프로필 SubscriptionBanner와 동일한 다크 카드 + 러닝 차트 모티프를 재사용해
// "구독(PRO)"이라는 맥락을 시각적으로 일관되게 전달한다.
export function SubscribeModal({ visible, title, onSubscribe, onClose }: SubscribeModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.wordmarkRow}>
              <Text style={styles.wordmark}>RunPin</Text>
              <Text style={styles.wordmarkPro}> PRO</Text>
            </View>
            <RunChartMotif />
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>러닝 제안 무제한</Text>
            <Text style={styles.price}>월 990원</Text>

            <View style={styles.actions}>
              <Pill label="닫기" variant="outline" onPress={onClose} style={styles.actionButton} />
              <Pill label="구독하기" variant="filled" onPress={onSubscribe} style={styles.actionButton} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hero: {
    padding: 18,
    paddingBottom: 16,
    gap: 14,
    backgroundColor: colors.ink,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.textInverse,
  },
  wordmarkPro: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: 'rgba(255,255,255,0.55)',
  },
  body: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
  },
});
