import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { MY_PACE_LABEL, MY_PACE_SEC_PER_KM } from '@/constants/pace';

interface RunningStatusBarProps {
  onEndRun: () => void;
}

// 이미 어느 정도 뛰고 있는 상태를 보여주는 예시 화면이므로 0초가 아닌
// 18분(15~20분 사이)부터 시작한다.
const INITIAL_ELAPSED_SEC = 18 * 60;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RunningStatusBar({ onEndRun }: RunningStatusBarProps) {
  const [elapsedSec, setElapsedSec] = useState(INITIAL_ELAPSED_SEC);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const distanceKm = (elapsedSec / MY_PACE_SEC_PER_KM).toFixed(2);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {formatElapsed(elapsedSec)} · {distanceKm}km · {MY_PACE_LABEL}
      </Text>
      <Pill label="러닝 종료" variant="subtle" size="lg" onPress={onEndRun} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
});
