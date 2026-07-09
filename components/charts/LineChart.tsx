import { Fragment, useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { colors } from '@/constants/colors';

interface LineChartProps {
  label: string;
  unit?: string;
  data: number[];
  distanceKm: number;
  height?: number;
  formatValue?: (value: number) => string;
}

// Conservative pre-measurement chart width so the very first frame (before
// onLayout reports the real container width below) still lays out sensibly.
const FALLBACK_CHART_WIDTH = 320;

// The graph's most informative moments: where it starts, ends, peaks, and
// bottoms out. Marking every local wiggle would clutter a 120px-tall chart,
// so only the global extremes (plus the endpoints, which are informative in
// their own right) get called out with a value label.
function findKeyPoints(data: number[]): number[] {
  if (data.length === 0) return [];
  if (data.length <= 2) return data.map((_, index) => index);
  let maxIndex = 0;
  let minIndex = 0;
  data.forEach((value, index) => {
    if (value > data[maxIndex]) maxIndex = index;
    if (value < data[minIndex]) minIndex = index;
  });
  return Array.from(new Set([0, minIndex, maxIndex, data.length - 1])).sort((a, b) => a - b);
}

const GRID_LINES = 3;
const AXIS_LABEL_HEIGHT = 20;
const AXIS_FONT_SIZE = 12;
const AXIS_LABEL_GAP = 6;

// Used only for the handful of frames before a label's real on-device width
// has been measured (see measureLayer below) — deliberately generous so a
// still-unmeasured label can never be judged to "fit" when it might not.
function fallbackLabelWidth(km: number): number {
  return `${km}km`.length * 10;
}

// A label's real drawn extent depends on its textAnchor: 'start' labels
// (only km 0) extend a full label-width to the right, 'end' labels (the
// last tick, when distanceKm lands it right at the axis edge) extend a
// full label-width to the left, and 'middle' labels split evenly. Treating
// every gap as if both sides were 'middle' (half-width each) under-counts
// the space needed at those two boundary ticks — that mismatch is what
// let the first/last km label collide with its neighbor at long distances.
function labelExtent(
  km: number,
  x: number,
  anchor: 'start' | 'middle' | 'end',
  widthOf: (km: number) => number,
): [left: number, right: number] {
  const w = widthOf(km);
  if (anchor === 'start') return [x, x + w];
  if (anchor === 'end') return [x - w, x];
  return [x - w / 2, x + w / 2];
}

function buildEvenTicks(lastKm: number, step: number): number[] {
  const ticks: number[] = [];
  for (let km = 0; km <= lastKm; km += step) ticks.push(km);
  if (ticks[ticks.length - 1] !== lastKm) ticks.push(lastKm);
  return ticks;
}

function ticksFit(
  ticks: number[],
  xOfKm: (km: number) => number,
  xAnchor: (x: number) => 'start' | 'middle' | 'end',
  widthOf: (km: number) => number,
): boolean {
  for (let i = 1; i < ticks.length; i++) {
    const prevX = xOfKm(ticks[i - 1]);
    const curX = xOfKm(ticks[i]);
    const [, prevRight] = labelExtent(ticks[i - 1], prevX, xAnchor(prevX), widthOf);
    const [curLeft] = labelExtent(ticks[i], curX, xAnchor(curX), widthOf);
    if (curLeft - prevRight < AXIS_LABEL_GAP) return false;
  }
  return true;
}

// Chooses which whole-km ticks to show as an even stride (0, step, 2*step, ...).
// Rather than pre-computing a "safe" step from an assumed label width, this
// tries step=1, 2, 3, ... and keeps the first stride whose ticks actually
// pass an anchor-aware overlap check (ticksFit) against the same xOfKm/
// xAnchor functions used to render them — so correctness comes from
// simulating the real drawn boxes, not a formula that can drift out of
// sync with the render logic.
function pickKmTicks(
  lastKm: number,
  xOfKm: (km: number) => number,
  xAnchor: (x: number) => 'start' | 'middle' | 'end',
  widthOf: (km: number) => number,
): number[] {
  if (lastKm <= 0) return [0];
  for (let step = 1; step <= lastKm; step++) {
    const ticks = buildEvenTicks(lastKm, step);
    if (ticksFit(ticks, xOfKm, xAnchor, widthOf)) return ticks;
  }
  return [0, lastKm];
}

export function LineChart({ label, unit, data, distanceKm, height = 120, formatValue }: LineChartProps) {
  // The SVG used a fixed viewBox width (320) while rendering at width="100%",
  // which silently rescales everything inside it to the container's real
  // width. Label widths are measured in real device pixels via RN onLayout,
  // so feeding them into a viewBox that doesn't equal the real render width
  // made the overlap math correct on paper but wrong on screen (worse the
  // further the device's actual width drifts from 320). Measuring the real
  // width and using that same number for both the viewBox and the Svg's
  // width prop makes 1 viewBox unit == 1 real device pixel, so the two
  // measurements finally agree.
  const [chartWidth, setChartWidth] = useState(FALLBACK_CHART_WIDTH);
  const handleChartLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.width;
      if (measured > 0 && measured !== chartWidth) setChartWidth(measured);
    },
    [chartWidth],
  );

  const width = chartWidth;
  const paddingX = 10;
  const paddingY = 16;
  const chartHeight = height - AXIS_LABEL_HEIGHT;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const resolveLabel = formatValue ?? ((value: number) => `${Math.round(value)}${unit ?? ''}`);

  const xAt = (index: number) => paddingX + (index / (data.length - 1 || 1)) * (width - paddingX * 2);
  const yAt = (value: number) => paddingY + (1 - (value - min) / range) * (chartHeight - paddingY * 2);
  const xAnchor = (x: number): 'start' | 'middle' | 'end' => {
    if (x <= paddingX + 2) return 'start';
    if (x >= width - paddingX - 2) return 'end';
    return 'middle';
  };

  const points = data.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ');
  const keyPointIndices = findKeyPoints(data);

  // km-tick x-positions come directly from the km/distance ratio (not from
  // rounding to the nearest data-sample index), so spacing is exactly even.
  const plotWidth = width - paddingX * 2;
  const lastKm = Math.floor(distanceKm);
  const xOfKm = (km: number) => paddingX + (distanceKm > 0 ? km / distanceKm : 0) * plotWidth;

  // The previous fix computed label width from a guessed "0.63px per
  // character" constant attributed to Arial/Segoe UI — desktop/web fonts
  // that this React Native app never actually renders with (iOS draws with
  // San Francisco, Android with Roboto, both bold here via fontWeight 600,
  // which is wider than the regular weight the guess implicitly assumed).
  // So the overlap-avoidance algorithm below was always sound; it was just
  // fed a made-up number. This measures the real on-device width of every
  // candidate "Nkm" label via an offscreen RN <Text> + onLayout, using the
  // exact fontSize/fontWeight the SVG label renders with.
  const candidateKms = Array.from({ length: lastKm + 1 }, (_, i) => i);
  const [measuredWidths, setMeasuredWidths] = useState<Record<number, number>>({});
  const loggedKeyRef = useRef<string | null>(null);

  const handleLabelMeasured = useCallback((km: number, measuredWidth: number) => {
    setMeasuredWidths((prev) => (prev[km] === measuredWidth ? prev : { ...prev, [km]: measuredWidth }));
  }, []);

  const widthOf = useCallback((km: number) => measuredWidths[km] ?? fallbackLabelWidth(km), [measuredWidths]);

  const kmTicks = pickKmTicks(lastKm, xOfKm, xAnchor, widthOf);

  const allMeasured = candidateKms.every((km) => measuredWidths[km] !== undefined);
  if (allMeasured && __DEV__) {
    const logKey = `${label}:${lastKm}:${candidateKms.map((km) => measuredWidths[km]).join(',')}`;
    if (loggedKeyRef.current !== logKey) {
      loggedKeyRef.current = logKey;
      let prevRight: number | null = null;
      const rows = kmTicks.map((km) => {
        const x = xOfKm(km);
        const anchor = xAnchor(x);
        const [left, right] = labelExtent(km, x, anchor, widthOf);
        const gapFromPrev = prevRight === null ? null : Number((left - prevRight).toFixed(1));
        prevRight = right;
        return {
          km,
          x: Number(x.toFixed(1)),
          measuredWidth: widthOf(km),
          anchor,
          left: Number(left.toFixed(1)),
          right: Number(right.toFixed(1)),
          gapFromPrevTick: gapFromPrev,
        };
      });
      console.log(
        `[LineChart:${label}] chartWidth=${chartWidth} (viewBox now matches real render width) real measured tick placement (gapFromPrevTick must be >= ${AXIS_LABEL_GAP}):`,
        rows,
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {unit ? <Text style={styles.unit}> ({unit})</Text> : null}
      </Text>
      <View style={styles.measureLayer} pointerEvents="none">
        {candidateKms.map((km) => (
          <Text key={km} style={styles.measureText} onLayout={(event) => handleLabelMeasured(km, event.nativeEvent.layout.width)}>
            {km}km
          </Text>
        ))}
      </View>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} onLayout={handleChartLayout}>
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const y = paddingY + (i / (GRID_LINES - 1)) * (chartHeight - paddingY * 2);
          return <Line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={colors.border} strokeWidth={1} />;
        })}
        <Polyline points={points} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {keyPointIndices.map((index) => {
          const x = xAt(index);
          const y = yAt(data[index]);
          const anchor = xAnchor(x);
          const labelBelow = y < chartHeight * 0.35;
          const labelY = labelBelow ? y + 14 : y - 8;
          return (
            <Fragment key={index}>
              <Circle cx={x} cy={y} r={3} fill={colors.ink} />
              <SvgText x={x} y={labelY} fontSize={11} fontWeight="700" fill={colors.text} textAnchor={anchor}>
                {resolveLabel(data[index])}
              </SvgText>
            </Fragment>
          );
        })}
        {kmTicks.map((km) => {
          const x = xOfKm(km);
          return (
            <SvgText key={km} x={x} y={height - 2} fontSize={AXIS_FONT_SIZE} fontWeight="600" fill={colors.textMuted} textAnchor={xAnchor(x)}>
              {km}km
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  measureLayer: {
    position: 'absolute',
    opacity: 0,
  },
  measureText: {
    fontSize: AXIS_FONT_SIZE,
    fontWeight: '600',
  },
});
