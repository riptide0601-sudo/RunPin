import { Fragment, useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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

const GRID_LINES = 3;
const AXIS_LABEL_HEIGHT = 20;
const AXIS_FONT_SIZE = 10;
const KEY_POINT_FONT_SIZE = 9;
const DEBUG_FONT_SIZE = 7;
const DEBUG_COLOR = '#e11d48';

// Below this, a chart just renders at the container's own width (no need to
// scroll). Beyond it, every km gets at least this many px so long routes
// stay readable instead of cramming a squished shape into one fixed-width
// screen — the chart becomes wider than its container and scrolls
// horizontally.
const MIN_PX_PER_KM = 40;

// Half of a key-point value label's approximate on-screen footprint (e.g.
// "42m" or "6'40''"), in px. Used to look at how the polyline actually moves
// within the label's horizontal span — not just at the single key-point
// pixel — before deciding whether the label goes above or below.
const KEY_POINT_LABEL_HALF_WIDTH_PX = 22;
// Fixed px distance kept between a key point's dot and its value label, so
// the pairing always reads clearly regardless of how far the line drifts
// from the point within its label's horizontal span. Deliberately a single
// constant (not derived from local line extent) — using the local extent's
// top/bottom to place the label let it drift many px away from the point
// itself whenever a neighboring sample was more extreme than the point
// being labeled.
const KEY_POINT_LABEL_OFFSET = 11;

export function LineChart({ label, unit, data, distanceKm, height = 120, formatValue }: LineChartProps) {
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
  const paddingY = 16;
  const chartHeight = height - AXIS_LABEL_HEIGHT;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  // Key-point labels show the bare number (no unit) — only formatValue
  // overrides (e.g. pace's "6'40''") render anything beyond the digits.
  const resolveLabel = formatValue ?? ((value: number) => `${Math.round(value)}`);

  const xAt = (index: number) => paddingX + (index / (data.length - 1 || 1)) * (width - paddingX * 2);
  const yAt = (value: number) => paddingY + (1 - (value - min) / range) * (chartHeight - paddingY * 2);
  const xAnchor = (x: number): 'start' | 'middle' | 'end' => {
    if (x <= paddingX + 2) return 'start';
    if (x >= width - paddingX - 2) return 'end';
    return 'middle';
  };

  const points = data.map((value, index) => `${xAt(index)},${yAt(value)}`).join(' ');

  const xStep = (width - paddingX * 2) / (data.length - 1 || 1);
  const keyPointIndices = findExtremeIndices(data);

  // A key-point label was placed purely from ITS OWN point's y-value (above
  // if near the top, below otherwise), which ignores that the polyline keeps
  // moving through neighboring samples under/over the label's actual
  // horizontal footprint — a label placed "above" a sharp local peak can
  // still collide with the line's descent a few px to either side. Instead,
  // look at the line's real min/max y across the label's horizontal span and
  // clear *that*, not just the single plotted point.
  const keyLabelIndexSpan = Math.max(1, Math.ceil(KEY_POINT_LABEL_HALF_WIDTH_PX / (xStep || 1)));
  const localYExtent = (index: number) => {
    const from = Math.max(0, index - keyLabelIndexSpan);
    const to = Math.min(data.length - 1, index + keyLabelIndexSpan);
    let top = Infinity;
    let bottom = -Infinity;
    for (let i = from; i <= to; i++) {
      const y = yAt(data[i]);
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
    return { top, bottom };
  };

  // Only two km labels, ever: the start and the actual end distance (not
  // rounded down to a whole km) — pinned to the two edges of the chart,
  // where they textAnchor away from each other and so can never collide
  // regardless of how wide either string renders.
  const plotWidth = width - paddingX * 2;
  const startX = paddingX;
  const endX = paddingX + plotWidth;

  const svg = (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: GRID_LINES }, (_, i) => {
        const y = paddingY + (i / (GRID_LINES - 1)) * (chartHeight - paddingY * 2);
        return <Line key={i} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke={colors.border} strokeWidth={1} />;
      })}
      <Polyline points={points} fill="none" stroke={colors.ink} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {keyPointIndices.map((index) => {
        const x = xAt(index);
        const y = yAt(data[index]);
        const anchor = xAnchor(x);
        // Which side (above/below the point) to place the label on is still
        // decided from the line's local min/max across the label's own
        // footprint — that's what keeps the label clear of a sharp local
        // peak or dip next to the point. But the label's DISTANCE from the
        // point is always the same fixed offset from the point's own y, not
        // from the local top/bottom — otherwise a point whose neighbors are
        // more extreme than it is would get a label placed far away from it.
        const { top, bottom } = localYExtent(index);
        const spaceAbove = top - paddingY;
        const spaceBelow = chartHeight - paddingY - bottom;
        const placedAbove = spaceAbove >= spaceBelow;
        const labelY = placedAbove
          ? Math.max(KEY_POINT_FONT_SIZE, y - KEY_POINT_LABEL_OFFSET)
          : Math.min(chartHeight - 2, y + KEY_POINT_LABEL_OFFSET);
        // Debug marker sits one step further out in the same direction as
        // the real label, so it never itself collides with the label it's
        // annotating — it reuses the exact same x/anchor as the real label,
        // so if two debug markers overlap, the real labels do too.
        const debugY = placedAbove ? labelY - 9 : labelY + 9;
        return (
          <Fragment key={index}>
            <Circle cx={x} cy={y} r={3} fill={colors.ink} />
            <SvgText x={x} y={labelY} fontSize={KEY_POINT_FONT_SIZE} fontWeight="700" fill={colors.textMuted} textAnchor={anchor}>
              {resolveLabel(data[index])}
            </SvgText>
            {__DEV__ ? (
              <SvgText x={x} y={debugY} fontSize={DEBUG_FONT_SIZE} fill={DEBUG_COLOR} textAnchor={anchor}>
                {`x:${Math.round(x)}`}
              </SvgText>
            ) : null}
          </Fragment>
        );
      })}
      <SvgText x={startX} y={height - 2} fontSize={AXIS_FONT_SIZE} fontWeight="600" fill={colors.textMuted} textAnchor="start">
        0km
      </SvgText>
      <SvgText x={endX} y={height - 2} fontSize={AXIS_FONT_SIZE} fontWeight="600" fill={colors.textMuted} textAnchor="end">
        {distanceKm}km
      </SvgText>
      {__DEV__ ? (
        <Fragment>
          <SvgText x={startX} y={height - 12} fontSize={DEBUG_FONT_SIZE} fill={DEBUG_COLOR} textAnchor="start">
            {`x:${Math.round(startX)}`}
          </SvgText>
          <SvgText x={endX} y={height - 12} fontSize={DEBUG_FONT_SIZE} fill={DEBUG_COLOR} textAnchor="end">
            {`x:${Math.round(endX)}`}
          </SvgText>
        </Fragment>
      ) : null}
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
