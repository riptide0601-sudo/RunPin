import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { CourseMetaRow } from '@/components/ui/CourseMetaRow';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
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
          {course.isPopular ? (
            <View
              onStartShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
            >
              <Pill label="인기" variant="filled" />
            </View>
          ) : null}
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
