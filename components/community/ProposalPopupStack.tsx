import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/colors';

export interface ProposalPopup {
  id: string;
  kind: 'sent' | 'accepted' | 'declined';
  runnerNickname: string;
}

interface ProposalPopupStackProps {
  popups: ProposalPopup[];
  onDismiss: (id: string) => void;
}

// 아래로 이만큼(px) 이상 끌거나, 손을 뗄 때 속도가 이 이상이면 놓쳐도 사라진다.
const DISMISS_DISTANCE_THRESHOLD = 80;
const DISMISS_VELOCITY_THRESHOLD = 800;
const EXIT_DURATION = 220;
// 화면 아래로 완전히 내려보내는 목표 거리 — 어떤 화면 높이에서도 카드가 확실히
// 벗어나도록 넉넉히 잡는다.
const EXIT_TRANSLATE_Y = 600;

const KIND_CONTENT: Record<
  ProposalPopup['kind'],
  { icon: keyof typeof Ionicons.glyphMap; title: (name: string) => string; message?: (name: string) => string }
> = {
  sent: {
    icon: 'paper-plane-outline',
    title: () => '제안을 보냈어요',
    message: (name) => `${name}님에게 함께 뛰자고 제안했어요`,
  },
  accepted: {
    icon: 'checkmark-circle',
    title: (name) => `${name}님이 수락했어요`,
  },
  declined: {
    icon: 'close-circle-outline',
    title: (name) => `${name}님이 거절했어요`,
  },
};

// 내가 보낸 제안(handlePropose)과 상대가 보낸 제안을 수락했을 때(handleAccept) 뜨는
// 알림을 한 곳에서 관리한다. RN 기본 Modal은 여러 개를 동시에 띄우면 반투명 배경이
// 중첩돼 스택처럼 보이지 않으므로, Modal 없이 화면 위에 절대 위치로 카드를 쌓아 올린다
// (겹쳐서 쌓이면 화면 중앙부터 아래로 이어지는 단순 세로 목록 — 사용자가 지도를 많이
// 가려도 상관없다고 확정함). 카드는 개별적으로 아래로 스와이프해서 지울 수 있다.
export function ProposalPopupStack({ popups, onDismiss }: ProposalPopupStackProps) {
  if (popups.length === 0) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.column} pointerEvents="box-none">
        {popups.map((popup) => (
          <PopupCard key={popup.id} popup={popup} onDismiss={onDismiss} />
        ))}
      </View>
    </View>
  );
}

interface PopupCardProps {
  popup: ProposalPopup;
  onDismiss: (id: string) => void;
}

function PopupCard({ popup, onDismiss }: PopupCardProps) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // 제스처 객체를 매 렌더마다 새로 만들면 진행 중인 제스처 인식 상태가 리셋될 수 있어
  // (components/profile/AvatarCropScreen.tsx와 동일한 이유) useMemo로 고정한다.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          // 위로는 끌리지 않게 한다 — 아래로 스와이프해서 지우는 인터랙션만 지원.
          if (event.translationY > 0) {
            translateY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > DISMISS_DISTANCE_THRESHOLD || event.velocityY > DISMISS_VELOCITY_THRESHOLD;

          if (shouldDismiss) {
            translateY.value = withTiming(EXIT_TRANSLATE_Y, { duration: EXIT_DURATION });
            opacity.value = withTiming(0, { duration: EXIT_DURATION }, (finished) => {
              if (finished) {
                runOnJS(onDismiss)(popup.id);
              }
            });
          } else {
            translateY.value = withSpring(0);
          }
        }),
    [translateY, opacity, onDismiss, popup.id],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const content = KIND_CONTENT[popup.kind];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.iconWrap}>
          <Ionicons name={content.icon} size={26} color={colors.ink} />
        </View>
        <Text style={styles.title}>{content.title(popup.runnerNickname)}</Text>
        {content.message ? <Text style={styles.message}>{content.message(popup.runnerNickname)}</Text> : null}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  // components/ui/AlertModal.tsx의 card/iconWrap/title/message 스타일 값을 그대로 맞췄다 —
  // 기존에 뜨던 알림과 시각적 톤이 같아야 하기 때문.
  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.ink}1A`,
  },
  title: {
    fontSize: 20,
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
});
