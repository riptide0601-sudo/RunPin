import type { ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { gradeColors } from '@/constants/colors';
import type { GradeLevel } from '@/types';

interface GradeBadgeProps {
  level: GradeLevel;
  size?: number;
  style?: ViewStyle;
}

// 도형(원+path)의 실측 bounding box(getBBox 기준): x:[45,55], y:[79,112], 여백 4~5씩 추가
const BBOX = { minX: 40, minY: 75, width: 20, height: 41 };
const ASPECT_RATIO = BBOX.width / BBOX.height;

export function GradeBadge({ level, size = 20, style }: GradeBadgeProps) {
  const color = gradeColors[level];

  return (
    <Svg
      width={size * ASPECT_RATIO}
      height={size}
      viewBox={`${BBOX.minX} ${BBOX.minY} ${BBOX.width} ${BBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={style}
    >
      <Circle cx={50} cy={84} r={5} fill={color} />
      <Path d="M50,89 C56,92 55,101 50,112 C45,101 44,92 50,89 Z" fill={color} />
    </Svg>
  );
}
