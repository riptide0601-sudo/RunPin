import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

// Catmull-Rom -> cubic Bezier smoothing, identical to components/charts/LineChart.tsx's
// buildSmoothPath so this motif reads as the same "run chart" language the user already
// sees on the run detail page (elevation/pace/heart-rate graphs).
function buildSmoothPath(points: Point[]): string {
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

const CHART_VIEW_WIDTH = 300;
const CHART_VIEW_HEIGHT = 40;
const CHART_PAD_X = 4;
const CHART_PAD_Y = 6;

// Decorative course-elevation-shaped sample data — asymmetric, uneven spacing so it
// doesn't read as a periodic "wave". Not tied to any real course.
const CHART_MAIN = [14, 20, 40, 34, 46, 26, 32, 18];
const CHART_ECHO = [30, 12, 24, 44, 20, 36, 16, 40];

function buildChartPath(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    x: CHART_PAD_X + (index / (values.length - 1)) * (CHART_VIEW_WIDTH - CHART_PAD_X * 2),
    y: CHART_PAD_Y + (1 - (value - min) / range) * (CHART_VIEW_HEIGHT - CHART_PAD_Y * 2),
  }));
  return buildSmoothPath(points);
}

const CHART_MAIN_PATH = buildChartPath(CHART_MAIN);
const CHART_ECHO_PATH = buildChartPath(CHART_ECHO);

export function RunChartMotif() {
  return (
    <View style={styles.wrapper}>
      <Svg width="100%" height={CHART_VIEW_HEIGHT} viewBox={`0 0 ${CHART_VIEW_WIDTH} ${CHART_VIEW_HEIGHT}`} preserveAspectRatio="none">
        <Path d={CHART_ECHO_PATH} stroke="rgba(255,255,255,0.38)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d={CHART_MAIN_PATH} stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: CHART_VIEW_HEIGHT,
  },
});
