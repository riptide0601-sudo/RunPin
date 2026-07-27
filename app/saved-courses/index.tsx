import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseListItem } from '@/components/home/CourseListItem';
import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import type { Course } from '@/types';

function SavedCourseRow({ course, onPress }: { course: Course; onPress: () => void }) {
  const { toggleSaveCourse } = useAppData();
  // 스와이프 제스처(PanGestureHandler)와 카드의 onPress(Pressable)는 서로 다른
  // 터치 인식 시스템이라, 드래그가 시작된 순간부터 정착될 때까지는 onPress를
  // 무시해야 스와이프 도중 상세보기가 같이 열리는 오발동을 막을 수 있다.
  // ref로 두는 이유는 ranking.tsx의 isSwipingRef와 동일 — 리렌더를 기다리지 않고
  // 항상 최신 값을 동기적으로 읽기 위함.
  const isSwipingRef = useRef(false);

  return (
    <View style={styles.rowWrapper}>
      <Swipeable
        containerStyle={styles.swipeableContainer}
        overshootFriction={8}
        onSwipeableOpenStartDrag={() => {
          isSwipingRef.current = true;
        }}
        onSwipeableCloseStartDrag={() => {
          isSwipingRef.current = true;
        }}
        onSwipeableOpen={() => {
          isSwipingRef.current = false;
        }}
        onSwipeableClose={() => {
          isSwipingRef.current = false;
        }}
        renderRightActions={() => (
          <Pressable style={styles.deleteButton} onPress={() => toggleSaveCourse(course.id)}>
            <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
          </Pressable>
        )}
      >
        <CourseListItem
          course={course}
          onPress={() => {
            if (isSwipingRef.current) return;
            onPress();
          }}
        />
      </Swipeable>
    </View>
  );
}

export default function SavedCoursesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, savedCourseIds } = useAppData();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const savedCourses = useMemo(
    () => courses.filter((course) => savedCourseIds.has(course.id)),
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
            <SavedCourseRow key={course.id} course={course} onPress={() => setSelectedCourse(course)} />
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
  // 둥근 모서리로 overflow를 클리핑하는 경계를 이 래퍼로 옮겨서, 스와이프로
  // 카드가 밀릴 때 드러나는 영역이 각진 사각형이 아니라 둥근 프레임 안에서
  // 보이도록 한다. Swipeable 자체의 클리핑은 swipeableContainer에서 해제한다.
  rowWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  swipeableContainer: {
    overflow: 'visible',
  },
  deleteButton: {
    backgroundColor: colors.like,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
});
