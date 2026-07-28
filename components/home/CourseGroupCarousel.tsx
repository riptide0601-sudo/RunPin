import { memo, useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { CourseGroupCarouselCard } from '@/components/home/CourseGroupCarouselCard';
import { useAppData } from '@/lib/appData';
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
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const { width } = useWindowDimensions();
  const cardWidth = (width - LIST_HORIZONTAL_PADDING - CARD_GAP * 2) / 3;
  const { savedCourseIds, toggleSaveCourse } = useAppData();

  useEffect(() => {
    Animated.timing(progress, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [expanded, progress]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          height: progress.interpolate({ inputRange: [0, 1], outputRange: [0, CONTAINER_HEIGHT] }),
          opacity: progress,
        },
      ]}
    >
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
            isSaved={savedCourseIds.has(member.id)}
            onSelect={onSelectMember}
            onToggleSave={toggleSaveCourse}
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
