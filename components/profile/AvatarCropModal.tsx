import * as ImageManipulator from 'expo-image-manipulator';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';

interface AvatarCropModalProps {
  visible: boolean;
  imageUri: string | null;
  imageWidth: number;
  imageHeight: number;
  onCancel: () => void;
  // Firebase Storage 대신 Firestore 문서에 base64로 직접 저장하므로(Spark 무료 플랜은
  // Storage를 못 씀 — CLAUDE.md 11번 체크리스트 참고) 파일 uri가 아니라 base64 문자열을 넘긴다.
  onCropped: (base64: string) => void;
}

// 원형 미리보기 지름(화면 px). 크롭 계산과 화면 렌더링 모두 이 상수 하나만 기준으로 삼는다 —
// 둘이 다른 값을 쓰면 "보이는 원"과 "실제로 잘리는 영역"이 어긋난다.
const CIRCLE_SIZE = 260;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Firestore 문서 크기 제한(1MiB)에 여유를 두고 base64로 저장할 것이므로 출력 자체를 작게 유지한다.
const OUTPUT_SIZE = 300;
const INITIAL_COMPRESS = 0.6;
const FALLBACK_COMPRESS = 0.35;
// base64 문자열 1글자 = 1바이트(ASCII)이므로 이 값이 곧 대략적인 바이트 수 상한이다.
// firestore.rules의 users/{uid}.photoBase64 크기 제한과 반드시 동일하게 유지할 것.
const MAX_BASE64_LENGTH = 900_000;

function clampValue(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

// 확대된 이미지가 원 밖으로 빈 공간을 남기지 않도록 허용 가능한 최대 이동 거리를 구한다.
function maxOffset(naturalSizePx: number, effectiveScale: number) {
  'worklet';
  return Math.max(0, (naturalSizePx * effectiveScale - CIRCLE_SIZE) / 2);
}

export function AvatarCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  onCancel,
  onCropped,
}: AvatarCropModalProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const circleCenterX = screenWidth / 2;
  const circleCenterY = screenHeight / 2;

  // 원을 완전히 덮는 초기 배율 (이미지의 짧은 변 기준 cover fit).
  const baseScale = imageWidth > 0 && imageHeight > 0 ? CIRCLE_SIZE / Math.min(imageWidth, imageHeight) : 1;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (visible) {
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
    }
  }, [visible, imageUri, translateX, translateY, scale]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const effectiveScale = baseScale * scale.value;
      const boundX = maxOffset(imageWidth, effectiveScale);
      const boundY = maxOffset(imageHeight, effectiveScale);
      translateX.value = clampValue(startX.value + event.translationX, -boundX, boundX);
      translateY.value = clampValue(startY.value + event.translationY, -boundY, boundY);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const nextScale = clampValue(startScale.value * event.scale, MIN_ZOOM, MAX_ZOOM);
      scale.value = nextScale;
      const effectiveScale = baseScale * nextScale;
      const boundX = maxOffset(imageWidth, effectiveScale);
      const boundY = maxOffset(imageHeight, effectiveScale);
      translateX.value = clampValue(translateX.value, -boundX, boundX);
      translateY.value = clampValue(translateY.value, -boundY, boundY);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    width: imageWidth * baseScale,
    height: imageHeight * baseScale,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const handleApply = async () => {
    if (!imageUri || isProcessing) return;
    setIsProcessing(true);
    try {
      const effectiveScale = baseScale * scale.value;
      const displayWidth = imageWidth * effectiveScale;
      const displayHeight = imageHeight * effectiveScale;
      const imageLeft = circleCenterX + translateX.value - displayWidth / 2;
      const imageTop = circleCenterY + translateY.value - displayHeight / 2;
      const circleLeft = circleCenterX - CIRCLE_SIZE / 2;
      const circleTop = circleCenterY - CIRCLE_SIZE / 2;

      const cropSize = CIRCLE_SIZE / effectiveScale;
      const originX = Math.max(0, Math.min((circleLeft - imageLeft) / effectiveScale, imageWidth - cropSize));
      const originY = Math.max(0, Math.min((circleTop - imageTop) / effectiveScale, imageHeight - cropSize));
      const cropAction = {
        crop: {
          originX: Math.round(originX),
          originY: Math.round(originY),
          width: Math.round(cropSize),
          height: Math.round(cropSize),
        },
      };

      if (__DEV__) {
        console.log('[AvatarCropModal] crop rect', {
          originX,
          originY,
          cropSize,
          effectiveScale,
          imageWidth,
          imageHeight,
        });
      }

      const encode = (compress: number) =>
        ImageManipulator.manipulateAsync(
          imageUri,
          [cropAction, { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } }],
          { compress, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );

      let result = await encode(INITIAL_COMPRESS);
      if ((result.base64?.length ?? 0) > MAX_BASE64_LENGTH) {
        if (__DEV__) {
          console.log('[AvatarCropModal] base64 too large, re-encoding with lower quality', result.base64?.length);
        }
        result = await encode(FALLBACK_COMPRESS);
      }

      if (!result.base64) {
        throw new Error('이미지 인코딩에 실패했어요');
      }
      if (__DEV__) {
        console.log('[AvatarCropModal] final base64 length', result.base64.length);
      }

      onCropped(result.base64);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <GestureHandlerRootView style={styles.container}>
        <GestureDetector gesture={composedGesture}>
          <View style={StyleSheet.absoluteFillObject}>
            {imageUri ? (
              <Animated.Image
                source={{ uri: imageUri }}
                style={[
                  styles.image,
                  {
                    left: circleCenterX - (imageWidth * baseScale) / 2,
                    top: circleCenterY - (imageHeight * baseScale) / 2,
                  },
                  animatedImageStyle,
                ]}
              />
            ) : null}
          </View>
        </GestureDetector>

        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Defs>
            <Mask id="avatarCropMask">
              <Rect x={0} y={0} width={screenWidth} height={screenHeight} fill="#FFFFFF" />
              <Circle cx={circleCenterX} cy={circleCenterY} r={CIRCLE_SIZE / 2} fill="#000000" />
            </Mask>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            fill="rgba(0,0,0,0.65)"
            mask="url(#avatarCropMask)"
          />
          <Circle
            cx={circleCenterX}
            cy={circleCenterY}
            r={CIRCLE_SIZE / 2}
            stroke="rgba(255,255,255,0.9)"
            strokeWidth={1.5}
            fill="none"
          />
        </Svg>

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          <Pressable hitSlop={12} onPress={onCancel}>
            <Text style={styles.cancelText}>취소</Text>
          </Pressable>
          <Text style={styles.titleText}>사진 위치 조정</Text>
          <View style={styles.cancelPlaceholder} />
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">
          <Pill
            label={isProcessing ? '처리 중...' : '적용'}
            variant="filled"
            size="lg"
            disabled={isProcessing}
            onPress={handleApply}
            style={styles.applyButton}
          />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  image: {
    position: 'absolute',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textInverse,
  },
  cancelPlaceholder: {
    width: 32,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  applyButton: {
    minWidth: 160,
    justifyContent: 'center',
  },
});
