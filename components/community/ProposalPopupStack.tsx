import { useMemo } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ProposalBanner } from '@/components/community/ProposalBanner';

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
// 화면 아래로 완전히 내려보내는 목표 거리 — 어떤 화면 높이에서도 배너가 확실히
// 벗어나도록 넉넉히 잡는다.
const EXIT_TRANSLATE_Y = 600;

const KIND_TEXT: Record<ProposalPopup['kind'], (name: string) => string> = {
  sent: (name) => `${name}님에게 함께 뛰자고 제안했어요`,
  accepted: (name) => `${name}님이 제안을 수락했어요`,
  declined: (name) => `${name}님이 제안을 거절했어요`,
};

// 내가 보낸 제안(handlePropose)과 제안에 대한 응답 결과 알림을 한 곳에서 관리한다.
// 화면 하단에 이미 떠 있는 제안 배너(MatchProposalCard)와 같은 껍데기(ProposalBanner)를
// 써서 폭/패딩/모서리/그림자/텍스트가 동일하고, 수락·거절 버튼만 없다.
// community.tsx의 bottomOverlay 안에서 기존 배너보다 앞에 렌더되므로 배너 위로 쌓인다.
// 각 알림은 개별적으로 아래로 스와이프해서 지울 수 있다.
export function ProposalPopupStack({ popups, onDismiss }: ProposalPopupStackProps) {
  if (popups.length === 0) return null;

  return (
    <View pointerEvents="box-none">
      {popups.map((popup) => (
        <PopupBanner key={popup.id} popup={popup} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

interface PopupBannerProps {
  popup: ProposalPopup;
  onDismiss: (id: string) => void;
}

function PopupBanner({ popup, onDismiss }: PopupBannerProps) {
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

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={animatedStyle}>
        <ProposalBanner text={KIND_TEXT[popup.kind](popup.runnerNickname)} />
      </Animated.View>
    </GestureDetector>
  );
}
