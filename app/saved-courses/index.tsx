import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseListItem } from '@/components/home/CourseListItem';
import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import type { Course } from '@/types';

export default function SavedCoursesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, savedCourseIds, toggleSaveCourse } = useAppData();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const savedCourses = useMemo(
    () => courses.filter((course) => savedCourseIds.includes(course.id)),
    [courses, savedCourseIds],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>저장한 코스</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {savedCourses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="bookmark-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>아직 저장한 코스가 없어요</Text>
          </View>
        ) : (
          savedCourses.map((course) => (
            <Swipeable
              key={course.id}
              renderRightActions={() => (
                <Pressable
                  style={styles.deleteAction}
                  onPress={() => toggleSaveCourse(course.id)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
                </Pressable>
              )}
            >
              <CourseListItem course={course} onPress={() => setSelectedCourse(course)} />
            </Swipeable>
          ))
        )}
      </ScrollView>
      <CourseRouteModal
        visible={selectedCourse !== null}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
        showSaveButton={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  deleteAction: {
    width: 64,
    borderRadius: 16,
    backgroundColor: colors.like,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
