import { Fragment } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/constants/colors';

interface SubscriptionBannerProps {
  isSubscribed: boolean;
  remaining: number;
  limit: number;
  onPress: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface BezierSegment {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

const WAVE_VIEW_WIDTH = 300;
const WAVE_VIEW_HEIGHT = 40;
const WAVE_MARGIN_X = 10;
const WAVE_BASELINE_Y = 20;
const WAVE_AMPLITUDE_PATTERN = [0, -7, 5, -5, 7, 0];

function buildWavePoints(total: number): Point[] {
  const usableWidth = WAVE_VIEW_WIDTH - WAVE_MARGIN_X * 2;
  return Array.from({ length: total + 1 }, (_, index) => ({
    x: WAVE_MARGIN_X + (usableWidth * index) / total,
    y: WAVE_BASELINE_Y + WAVE_AMPLITUDE_PATTERN[index % WAVE_AMPLITUDE_PATTERN.length],
  }));
}

// Catmull-Rom -> cubic Bezier conversion so the route line curves smoothly through every point.
function buildCatmullRomSegments(points: Point[]): BezierSegment[] {
  return points.slice(0, -1).map((from, index) => {
    const to = points[index + 1];
    const prev = points[index - 1] ?? from;
    const next = points[index + 2] ?? to;
    return {
      from,
      to,
      c1: { x: from.x + (to.x - prev.x) / 6, y: from.y + (to.y - prev.y) / 6 },
      c2: { x: to.x - (next.x - from.x) / 6, y: to.y - (next.y - from.y) / 6 },
    };
  });
}

function segmentsToPath(segments: BezierSegment[]): string {
  if (segments.length === 0) return '';
  const start = segments[0].from;
  const curves = segments
    .map((segment) => `C ${segment.c1.x} ${segment.c1.y}, ${segment.c2.x} ${segment.c2.y}, ${segment.to.x} ${segment.to.y}`)
    .join(' ');
  return `M ${start.x} ${start.y} ${curves}`;
}

interface RouteToneColors {
  coreStroke: string;
  glowStroke: string;
  remainingStroke: string;
  markerFill: string;
  markerGlow: string;
  markerRemainingStroke: string;
}

const ROUTE_TONE: Record<'onDark' | 'onGold', RouteToneColors> = {
  onDark: {
    coreStroke: '#F0C878',
    glowStroke: 'rgba(240,200,120,0.35)',
    remainingStroke: 'rgba(255,255,255,0.2)',
    markerFill: '#F0C878',
    markerGlow: 'rgba(240,200,120,0.4)',
    markerRemainingStroke: 'rgba(255,255,255,0.4)',
  },
  onGold: {
    coreStroke: '#FFFBF2',
    glowStroke: 'rgba(255,255,255,0.4)',
    remainingStroke: 'rgba(255,255,255,0.3)',
    markerFill: '#FFFBF2',
    markerGlow: 'rgba(255,255,255,0.45)',
    markerRemainingStroke: 'rgba(255,255,255,0.5)',
  },
};

function RouteProgressLine({ filled, total, tone }: { filled: number; total: number; tone: 'onDark' | 'onGold' }) {
  const colorSet = ROUTE_TONE[tone];
  const points = buildWavePoints(total);
  const segments = buildCatmullRomSegments(points);
  const completedPath = segmentsToPath(segments.slice(0, filled));
  const remainingPath = segmentsToPath(segments.slice(filled));

  return (
    <View style={styles.waveWrapper}>
      <Svg width="100%" height={WAVE_VIEW_HEIGHT} viewBox={`0 0 ${WAVE_VIEW_WIDTH} ${WAVE_VIEW_HEIGHT}`} preserveAspectRatio="none">
        {remainingPath ? (
          <Path
            d={remainingPath}
            stroke={colorSet.remainingStroke}
            strokeWidth={2}
            strokeDasharray="1.5,5"
            strokeLinecap="round"
            fill="none"
          />
        ) : null}
        {completedPath ? (
          <>
            <Path d={completedPath} stroke={colorSet.glowStroke} strokeWidth={7} strokeLinecap="round" fill="none" />
            <Path d={completedPath} stroke={colorSet.coreStroke} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          </>
        ) : null}
        {points.slice(1).map((point, index) => {
          const unitIndex = index + 1;
          const isFilled = unitIndex <= filled;
          if (isFilled) {
            return (
              <Fragment key={unitIndex}>
                <Circle cx={point.x} cy={point.y} r={5} fill={colorSet.markerGlow} />
                <Circle cx={point.x} cy={point.y} r={2.5} fill={colorSet.markerFill} />
              </Fragment>
            );
          }
          return (
            <Circle
              key={unitIndex}
              cx={point.x}
              cy={point.y}
              r={3}
              fill="none"
              stroke={colorSet.markerRemainingStroke}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export function SubscriptionBanner({ isSubscribed, remaining, limit, onPress }: SubscriptionBannerProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      <View style={[styles.card, isSubscribed ? styles.cardSubscribed : styles.cardDefault]}>
        {isSubscribed ? (
          <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
            <Defs>
              <LinearGradient id="proGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#D9B36C" />
                <Stop offset="1" stopColor="#8C6A2C" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" rx={20} fill="url(#proGradient)" />
          </Svg>
        ) : null}

        <Text style={styles.wordmark}>RunPin PRO</Text>

        <RouteProgressLine filled={isSubscribed ? limit : remaining} total={limit} tone={isSubscribed ? 'onGold' : 'onDark'} />

        <View>
          <Text style={[styles.bottomLabel, isSubscribed && styles.bottomLabelOnAccent]}>
            {isSubscribed ? '이용 중' : '무료 제안'}
          </Text>
          <Text style={styles.bottomValue}>{isSubscribed ? '무제한' : `${remaining}/${limit}회 남음`}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    aspectRatio: 1.6,
    borderRadius: 20,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  cardSubscribed: {
    borderWidth: 0,
    shadowColor: '#8C6A2C',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  wordmark: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 3,
    color: colors.textInverse,
  },
  waveWrapper: {
    height: 40,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.55)',
  },
  bottomLabelOnAccent: {
    color: 'rgba(255,255,255,0.75)',
  },
  bottomValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
    marginTop: 2,
  },
});
