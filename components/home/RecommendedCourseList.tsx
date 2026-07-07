import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CourseListItem } from '@/components/home/CourseListItem';
import { colors } from '@/constants/colors';
import type { Course } from '@/types';

interface RecommendedCourseListProps {
  courses: (Course & { isPopular?: boolean })[];
  selectedCourseId?: string;
  onSelectCourse?: (courseId: string) => void;
}

export function RecommendedCourseList({ courses, selectedCourseId, onSelectCourse }: RecommendedCourseListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 주변 추천 코스</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {courses.map((course) => (
          <CourseListItem
            key={course.id}
            course={course}
            isSelected={course.id === selectedCourseId}
            onPress={onSelectCourse ? () => onSelectCourse(course.id) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
