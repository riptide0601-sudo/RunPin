import { memo, useEffect } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { CourseGroupCarouselCard } from '@/components/home/CourseGroupCarouselCard';
import type { Course } from '@/types';

interface CourseGroupCarouselProps {
  expanded: boolean;
  members: Course[];
  selectedCourseId?: string;
  onSelectMember: (courseId: string) => void;
}

const CONTAINER_HEIGHT = 114;
const CARD_GAP = 10;
const LIST_HORIZONTAL_PADDING = 40; // components/home/RecommendedCourseList.tsx의 좌우 paddingHorizontal 합

export const CourseGroupCarousel = memo(function CourseGroupCarousel({
  expanded,
  members,
  selectedCourseId,
  onSelectMember,
}: CourseGroupCarouselProps) {
  const progress = useSharedValue(expanded ? 1 : 0);
  const { width } = useWindowDimensions();
  const cardWidth = (width - LIST_HORIZONTAL_PADDING - CARD_GAP * 2) / 3;

  useEffect(() => {
    progress.value = withTiming(expanded ? 1 : 0, { duration: 220 });
  }, [expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [0, CONTAINER_HEIGHT]),
    opacity: progress.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + CARD_GAP}
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
      >
        {members.map((member) => (
          <CourseGroupCarouselCard
            key={member.id}
            member={member}
            width={cardWidth}
            isSelected={member.id === selectedCourseId}
            onSelect={onSelectMember}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  scrollContent: {
    gap: CARD_GAP,
    paddingBottom: 4,
  },
});
