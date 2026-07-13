import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import type { Point } from '@/components/community/popupPosition';
import { Card } from '@/components/ui/Card';
import { GradeBadge } from '@/components/ui/GradeBadge';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { isMatchCandidate } from '@/lib/matching';
import type { RunnerMapDot } from '@/types';

interface RunnerDetailCardProps {
  runner: RunnerMapDot;
  onPropose: () => void;
  position: Point;
}

const COMPARISON_LABEL: Record<RunnerMapDot['paceComparison'], string> = {
  faster: '나보다 빨라요',
  similar: '나와 페이스가 비슷해요',
  slower: '나보다 느려요',
};

export function RunnerDetailCard({ runner, onPropose, position }: RunnerDetailCardProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [runner.id, progress]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          left: position.x,
          top: position.y,
          opacity: progress,
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        },
      ]}
    >
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <GradeBadge level={runner.gradeLevel ?? 1} size={19} />
          <Text style={styles.title}>
            {runner.nickname}
            {isMatchCandidate(runner.paceComparison) ? ' · 매칭 러너' : ''}
          </Text>
        </View>
        <Text style={styles.meta}>
          {runner.paceLabel} · {runner.distanceLabel}
        </Text>
        <Text style={styles.comparison}>{COMPARISON_LABEL[runner.paceComparison]}</Text>
        <Pill label="함께 뛰자고 제안" variant="filled" onPress={onPropose} style={styles.button} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    minWidth: 190,
  },
  card: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  comparison: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
