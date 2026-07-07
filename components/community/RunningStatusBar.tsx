import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';

interface RunningStatusBarProps {
  onEndRun: () => void;
}

const PACE_SEC_PER_KM = 340;
const PACE_LABEL = "5'40\"/km";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function RunningStatusBar({ onEndRun }: RunningStatusBarProps) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const distanceKm = (elapsedSec / PACE_SEC_PER_KM).toFixed(2);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {formatElapsed(elapsedSec)} · {distanceKm}km · {PACE_LABEL}
      </Text>
      <Pill label="러닝 종료" variant="outline" onPress={onEndRun} />
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
