import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, View } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHOW_DURATION = 300;
const HIDE_DURATION = 240;
// RN Modal의 animationType="slide"는 뒷배경 dim과 시트를 같은 콘텐츠로 묶어서
// 통째로 밀어 올리기 때문에, 어두워지는 효과 자체가 팝업과 함께 아래에서
// 올라오는 것처럼 보인다. 그래서 Modal은 animationType="none"으로 두고
// dim(opacity)과 시트(translateY)를 여기서 독립된 Animated 값으로 따로
// 애니메이션한다: 시트는 밑에서 올라오고, dim은 그 시간 동안 서서히 어두워진다.
const BACKDROP_DIM_OPACITY = 0.25;

interface SlideUpModalProps {
  visible: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
}

export function SlideUpModal({ visible, onRequestClose, children }: SlideUpModalProps) {
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: BACKDROP_DIM_OPACITY,
          duration: SHOW_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: SHOW_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: HIDE_DURATION,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: HIDE_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
        }
      });
    }
  }, [visible, backdropOpacity, translateY]);

  if (!mounted) {
    return null;
  }

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onRequestClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[styles.dim, { opacity: backdropOpacity }]} />
        <Animated.View style={[styles.column, { transform: [{ translateY }] }]}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  column: {
    flex: 1,
  },
});
