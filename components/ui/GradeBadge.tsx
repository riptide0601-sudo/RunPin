import type { ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { gradeColors } from '@/constants/colors';
import type { GradeLevel } from '@/types';

interface GradeBadgeProps {
  level: GradeLevel;
  size?: number;
  style?: ViewStyle;
}

// 도형(원+path)의 실제 bounding box: x:[36,64], y:[10,54.3]
const BBOX = { minX: 36, minY: 10, width: 28, height: 44.3 };
const ASPECT_RATIO = BBOX.width / BBOX.height;

export function GradeBadge({ level, size = 20, style }: GradeBadgeProps) {
  const color = gradeColors[level];

  return (
    <Svg
      width={size * ASPECT_RATIO}
      height={size}
      viewBox={`${BBOX.minX} ${BBOX.minY} ${BBOX.width} ${BBOX.height}`}
      style={style}
    >
      <Circle cx={50} cy={24} r={14} fill={color} />
      <Path d="M50,25.4 C57.1,28 55.7,40.3 50,54.3 C44.3,40.3 42.9,28 50,25.4 Z" fill={color} />
    </Svg>
  );
}
