import type { ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { gradeColors } from '@/constants/colors';
import type { GradeLevel } from '@/types';

interface GradeBadgeProps {
  level: GradeLevel;
  size?: number;
  style?: ViewStyle;
}

const ASPECT_RATIO = 66 / 100;

export function GradeBadge({ level, size = 20, style }: GradeBadgeProps) {
  const color = gradeColors[level];

  return (
    <Svg width={size * ASPECT_RATIO} height={size} viewBox="0 0 66 100" style={style}>
      <Circle cx={33} cy={33} r={29} fill={color} />
      <Path d="M33,36 C47.8,41.4 44.9,66.9 33,96 C21.2,66.9 18.3,41.4 33,36 Z" fill={color} />
    </Svg>
  );
}
