import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DifficultyBadge } from '@/components/ui/DifficultyBadge';
import { colors } from '@/constants/colors';
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

export function CourseGroupCarousel({ expanded, members, selectedCourseId, onSelectMember }: CourseGroupCarouselProps) {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const { width } = useWindowDimensions();
  const cardWidth = (width - LIST_HORIZONTAL_PADDING - CARD_GAP * 2) / 3;

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
        {members.map((member) => {
          const isSelected = member.id === selectedCourseId;
          return (
            <Pressable
              key={member.id}
              onPress={() => onSelectMember(member.id)}
              style={[styles.card, { width: cardWidth }, isSelected ? styles.cardSelected : undefined]}
            >
              <Text style={styles.name} numberOfLines={1}>
                {member.name}
              </Text>
              <Text style={styles.distance}>{member.distanceKm}km</Text>
              <View style={styles.metaRow}>
                <DifficultyBadge difficulty={member.difficulty} />
              </View>
              <Text style={styles.uploader} numberOfLines={1}>
                업로드: {member.uploaderName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
  scrollContent: {
    gap: CARD_GAP,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  name: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  distance: {
    fontSize: 11,
    color: colors.textMuted,
  },
  uploader: {
    fontSize: 10,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
