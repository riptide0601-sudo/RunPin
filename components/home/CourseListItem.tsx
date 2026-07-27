import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { CourseMetaRow } from '@/components/ui/CourseMetaRow';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import type { Course } from '@/types';

interface CourseListItemProps {
  course: Course;
  isSelected?: boolean;
  hasGroup?: boolean;
  isExpanded?: boolean;
  relatedCount?: number;
  onPress?: () => void;
}

export function CourseListItem({ course, isSelected, hasGroup, isExpanded, relatedCount, onPress }: CourseListItemProps) {
  const { savedCourseIds, toggleSaveCourse } = useAppData();
  const isSaved = savedCourseIds.has(course.id);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.card, isSelected ? styles.cardSelected : undefined]}>
        <View style={styles.row}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{course.name}</Text>
            {hasGroup ? (
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            ) : null}
          </View>
          <View style={styles.rightRow}>
            {course.isPopular ? <Pill label="인기" variant="filled" /> : null}
            <Pressable hitSlop={8} onPress={() => toggleSaveCourse(course.id)}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? colors.ink : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
        <CourseMetaRow distanceKm={course.distanceKm} difficulty={course.difficulty} />
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>업로드: {course.uploaderName}</Text>
          {hasGroup && relatedCount ? <Text style={styles.footerText}>· 관련 코스 {relatedCount}개</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    gap: 8,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.ink,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
