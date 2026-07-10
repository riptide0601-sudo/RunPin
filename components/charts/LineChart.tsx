import { Fragment, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

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

// Only the two most informative moments get a value label: the global peak
// and the global trough. Every previous attempt at picking more candidates
// (endpoints, local wiggles, width-measured overlap checks) still ended up
// colliding somewhere, so this drops back to the simplest possible rule —
// exactly one high point and one low point, nothing else to reason about.
function findExtremeIndices(data: number[]): number[] {
  if (data.length === 0) return [];
  let maxIndex = 0;
  let minIndex = 0;
  data.forEach((value, index) => {
    if (value > data[maxIndex]) maxIndex = index;
    if (value < data[minIndex]) minIndex = index;
  });
  return Array.from(new Set([minIndex, maxIndex])).sort((a, b) => a - b);
}

// Builds a smooth SVG path through every point using a Catmull-Rom spline
// converted to cubic bezier segments. The curve passes exactly through each
// input point (only the control points between them are interpolated), so
// data values and their positions are unchanged — just the connecting line
// stops being made of hard angles.
function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

const GRID_LINES = 3;
const AXIS_LABEL_HEIGHT = 20;
const AXIS_FONT_SIZE = 10;
const KEY_POINT_FONT_SIZE = 9;

// Below this, a chart just renders at the container's own width (no need to
// scroll). Beyond it, every km gets at least this many px so long routes
// stay readable instead of cramming a squished shape into one fixed-width
// screen — the chart becomes wider than its container and scrolls
// horizontally.
const MIN_PX_PER_KM = 40;

// Dedicated vertical strip reserved at the very top and bottom of the plot
// area, exclusively for the peak/trough value labels. yAt() below never
// places the line inside this band, so a label drawn there is guaranteed to
// never touch the line — no per-point overlap math needed.
const KEY_POINT_LABEL_BAND = 20;
// Gap kept between a label's baseline and the boundary where the line's
// plotting area begins, so the label doesn't hug the line's topmost/
// bottommost possible point.
const KEY_POINT_LABEL_INSET = 6;

// Adaptive km-axis ticks: try the smallest step first (0km, 1km, 2km, ...)
// and only fall back to a coarser one once labels at that spacing would be
// tight enough to overlap on the current chart width — a wide chart gets
// dense 1km ticks, a narrow one automatically thins out.
const KM_STEP_CANDIDATES_KM = [1, 2, 5, 10, 20, 25, 50, 100];
const KM_LABEL_CHAR_WIDTH_PX = AXIS_FONT_SIZE * 0.62;
const KM_LABEL_MIN_GAP_PX = 6;

function pickKmStep(distanceKm: number, plotWidth: number): number {
  if (distanceKm <= 0) return KM_STEP_CANDIDATES_KM[0];
  for (const step of KM_STEP_CANDIDATES_KM) {
    const tickCount = Math.floor(distanceKm / step) + 1;
    if (tickCount <= 1) return step;
    const spacingPx = (step / distanceKm) * plotWidth;
    const widestLabelChars = `${Math.floor(distanceKm / step) * step}km`.length;
    if (spacingPx >= widestLabelChars * KM_LABEL_CHAR_WIDTH_PX + KM_LABEL_MIN_GAP_PX) return step;
  }
  return KM_STEP_CANDIDATES_KM[KM_STEP_CANDIDATES_KM.length - 1];
}

function buildKmTicks(distanceKm: number, step: number): number[] {
  if (distanceKm <= 0) return [0];
  const ticks: number[] = [];
  for (let i = 0; i * step <= distanceKm + 1e-9; i++) ticks.push(i * step);
  return ticks;
}

export function LineChart({ label, unit, data, distanceKm, height = 140, formatValue }: LineChartProps) {
  // Measuring the Svg element's own onLayout was self-referential: its width
  // prop was already set to the state we were trying to derive, so it just
  // reported back whatever we'd already guessed (FALLBACK_CHART_WIDTH on the
  // first frame) instead of the parent's real available width. A plain,
  // unsized wrapper View always stretches to the parent's actual width
  // (default flex `alignItems: 'stretch'`), so measuring that instead gives
  // the real number regardless of what the Svg inside it later renders at.
  const [containerWidth, setContainerWidth] = useState(FALLBACK_CHART_WIDTH);
  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const measured = event.nativeEvent.layout.width;
      if (measured > 0 && measured !== containerWidth) setContainerWidth(measured);
    },
    [containerWidth],
  );

  // Long routes get at least MIN_PX_PER_KM of chart width per km instead of
  // being squeezed into the container's fixed width — once that exceeds the
  // container, the chart renders wider than the screen and scrolls
  // horizontally (see `scrollable` below) rather than cramming every km-tick
  // into the same space.
  const width = Math.max(containerWidth, Math.ceil(distanceKm * MIN_PX_PER_KM));
  const scrollable = width > containerWidth + 1;
  const paddingX = 10;
  const paddingY = 10;
  const chartHeight = height - AXIS_LABEL_HEIGHT;
  // The line is only ever drawn inside this inner span — the label bands
  // above and below it are reserved space the line can never enter.
  const plotAreaHeight = Math.max(20, chartHeight - paddingY * 2 - KEY_POINT_LABEL_BAND * 2);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  // Key-point labels show the bare number (no unit) — only formatValue
  // overrides (e.g. pace's "6'40''") render anything beyond the digits.
  const resolveLabel = formatValue ?? ((value: number) => `${Math.round(value)}`);

  const xAt = (index: number) => paddingX + (index / (data.length - 1 || 1)) * (width - paddingX * 2);
  const yAt = (value: number) => paddingY + KEY_POINT_LABEL_BAND + (1 - (value - min) / range) * plotAreaHeight;
  const xAnchor = (x: number): 'start' | 'middle' | 'end' => {
    if (x <= paddingX + 2) return 'start';
    if (x >= width - paddingX - 2) return 'end';
    return 'middle';
  };

  const linePoints = data.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
  const pathD = buildSmoothPath(linePoints);

  const keyPointIndices = findExtremeIndices(data);
  const plotTop = paddingY + KEY_POINT_LABEL_BAND;
  const plotBottom = plotTop + plotAreaHeight;

  const plotWidth = width - paddingX * 2;
  const kmStep = pickKmStep(distanceKm, plotWidth);
  const kmTicks = buildKmTicks(distanceKm, kmStep);

  const svg = (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: GRID_LINES }, (_, i) => {
        const y = plotTop + (i / (GRID_LINES - 1)) * plotAreaHeight;
        return <Line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={colors.border} strokeWidth={1} />;
      })}
      <Path d={pathD} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {keyPointIndices.map((index) => {
        const x = xAt(index);
        const y = yAt(data[index]);
        const anchor = xAnchor(x);
        // The peak's label always goes in the top band, the trough's always
        // in the bottom band — correct by construction, since the peak is
        // by definition the highest point on the whole line (nothing can be
        // above it to collide with a label placed above it), and likewise
        // for the trough below.
        const isPeak = data[index] === max;
        const labelY = isPeak ? plotTop - KEY_POINT_LABEL_INSET : plotBottom + KEY_POINT_FONT_SIZE + KEY_POINT_LABEL_INSET;
        return (
          <Fragment key={index}>
            <Circle cx={x} cy={y} r={3} fill={colors.ink} />
            <SvgText x={x} y={labelY} fontSize={KEY_POINT_FONT_SIZE} fontWeight="700" fill={colors.textMuted} textAnchor={anchor}>
              {resolveLabel(data[index])}
            </SvgText>
          </Fragment>
        );
      })}
      {kmTicks.map((km) => {
        const x = distanceKm > 0 ? paddingX + (km / distanceKm) * plotWidth : paddingX;
        return (
          <SvgText key={km} x={x} y={height - 2} fontSize={AXIS_FONT_SIZE} fontWeight="600" fill={colors.textMuted} textAnchor={xAnchor(x)}>
            {`${km}km`}
          </SvgText>
        );
      })}
    </Svg>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {unit ? <Text style={styles.unit}> ({unit})</Text> : null}
      </Text>
      <View onLayout={handleContainerLayout}>
        {scrollable ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {svg}
          </ScrollView>
        ) : (
          svg
        )}
      </View>
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
});
