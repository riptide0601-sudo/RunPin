import type { ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { gradeColors } from '@/constants/colors';
import type { GradeLevel } from '@/types';

interface GradeBadgeProps {
  level: GradeLevel;
  size?: number;
  style?: ViewStyle;
}

export function GradeBadge({ level, size = 20, style }: GradeBadgeProps) {
  const color = gradeColors[level];

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" style={style}>
      <Circle cx={50} cy={24} r={14} fill={color} />
      <Path
        d="M50,25.4 C57.1,28 55.7,40.3 50,54.3 C44.3,40.3 42.9,28 50,25.4 Z"
        fill={color}
      />
    </Svg>
  );
}
