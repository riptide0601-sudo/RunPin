import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { CourseMetaRow } from '@/components/ui/CourseMetaRow';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import type { Course } from '@/types';

interface CourseListItemProps {
  course: Course;
  isSelected?: boolean;
  onPress?: () => void;
}

export function CourseListItem({ course, isSelected, onPress }: CourseListItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={[styles.card, isSelected ? styles.cardSelected : undefined]}>
        <View style={styles.row}>
          <Text style={styles.name}>{course.name}</Text>
          {course.isPopular ? <Pill label="인기" variant="filled" /> : null}
        </View>
        <CourseMetaRow distanceKm={course.distanceKm} difficulty={course.difficulty} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  card: {
    marginBottom: 12,
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
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
