import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import {
  PanGestureHandler,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';

import { colors } from '@/constants/colors';

interface DifficultySliderProps {
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void;
}

const MIN = 1;
const MAX = 5;
const THUMB_SIZE = 24;
const LEVEL_LABELS = ['매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];

// Conservative pre-measurement width so the label doesn't visibly jump once
// the real, on-device measured width (below) lands a frame later.
const FALLBACK_LABEL_WIDTH = 80;

export function DifficultySlider({ value, onChange }: DifficultySliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);

  // The header's "박스가 커진다" bug came from guessing a fixed px width for
  // the value label (72px, then a minWidth) without ever checking what the
  // labels actually render at on-device. Instead of guessing again, render
  // every candidate label off-screen once, let RN's onLayout report its
  // real measured width for the current platform/font, and size the visible
  // label to the widest of those — so it's provably wide enough for all 5.
  const [labelWidths, setLabelWidths] = useState<number[]>(() => LEVEL_LABELS.map(() => 0));
  const loggedRef = useRef(false);

  const handleLabelMeasured = useCallback((index: number, width: number) => {
    setLabelWidths((prev) => {
      if (prev[index] === width) return prev;
      const next = [...prev];
      next[index] = width;
      return next;
    });
  }, []);

  const allLabelsMeasured = labelWidths.every((width) => width > 0);
  const labelBoxWidth = allLabelsMeasured ? Math.ceil(Math.max(...labelWidths)) + 2 : FALLBACK_LABEL_WIDTH;

  if (allLabelsMeasured && !loggedRef.current && __DEV__) {
    loggedRef.current = true;
    console.log(
      '[DifficultySlider] measured label widths:',
      LEVEL_LABELS.map((label, index) => `${label}=${labelWidths[index]}px`).join(', '),
      '-> box width:',
      labelBoxWidth,
    );
  }

  const handleLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const updateFromX = useCallback(
    (x: number, width: number) => {
      if (width <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / width));
      const nextValue = (Math.round(ratio * (MAX - MIN)) + MIN) as 1 | 2 | 3 | 4 | 5;
      onChange(nextValue);
    },
    [onChange],
  );

  const handleGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    updateFromX(event.nativeEvent.x, trackWidth);
  };

  const handleStateChange = (event: PanGestureHandlerStateChangeEvent) => {
    updateFromX(event.nativeEvent.x, trackWidth);
  };

  const ratio = (value - MIN) / (MAX - MIN);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>난이도</Text>
        <Text style={[styles.valueLabel, { width: labelBoxWidth }]} numberOfLines={1}>
          {LEVEL_LABELS[value - MIN]}
        </Text>
      </View>
      <View style={styles.measureLayer} pointerEvents="none">
        {LEVEL_LABELS.map((label, index) => (
          <Text
            key={label}
            style={styles.measureText}
            onLayout={(event) => handleLabelMeasured(index, event.nativeEvent.layout.width)}
          >
            {label}
          </Text>
        ))}
      </View>
      <PanGestureHandler onGestureEvent={handleGestureEvent} onHandlerStateChange={handleStateChange}>
        <View style={styles.track} onLayout={handleLayout}>
          <View style={styles.baseLine} />
          <View style={[styles.fillLine, { width: `${ratio * 100}%` }]} />
          <View style={styles.ticksRow} pointerEvents="none">
            {[1, 2, 3, 4, 5].map((level) => (
              <View key={level} style={[styles.tick, level <= value ? styles.tickActive : undefined]} />
            ))}
          </View>
          {trackWidth > 0 ? (
            <View style={[styles.thumb, { left: ratio * (trackWidth - THUMB_SIZE) }]} pointerEvents="none">
              <Text style={styles.thumbText}>{value}</Text>
            </View>
          ) : null}
        </View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 0,
  },
  valueLabel: {
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 0,
    textAlign: 'right',
  },
  measureLayer: {
    position: 'absolute',
    opacity: 0,
  },
  measureText: {
    fontSize: 13,
  },
  track: {
    height: 32,
    justifyContent: 'center',
  },
  baseLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  fillLine: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink,
  },
  ticksRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tick: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  tickActive: {
    backgroundColor: colors.ink,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
});
