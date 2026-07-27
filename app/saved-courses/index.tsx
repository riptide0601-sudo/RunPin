import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { CourseListItem } from '@/components/home/CourseListItem';
import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import type { Course } from '@/types';

// 한 번에 하나의 카드만 열려있도록, 현재 열린 행의 식별자와 닫기 함수를
// 형제 행들이 공유하는 ref. 리렌더를 유발할 필요가 없는 순수 조정용 값이라
// state가 아닌 ref로 부모(SavedCoursesScreen)가 들고 각 행에 내려준다.
type OpenRowRef = { id: string; close: () => void } | null;

const DELETE_DURATION = 220;

function SavedCourseRow({
  course,
  onPress,
  openRowRef,
  onDelete,
}: {
  course: Course;
  onPress: () => void;
  openRowRef: React.RefObject<OpenRowRef>;
  onDelete: (courseId: string) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  // 스와이프 제스처가 실제로 인식(활성화)된 구간에서만 true가 되어야
  // 순수 탭까지 막지 않는다. react-native-gesture-handler/ReanimatedSwipeable가
  // 드래그 시작 시점에 정확히 호출해주는 콜백을 그대로 신호로 사용한다.
  const isSwipingRef = useRef(false);

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const deletingStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleDelete = () => {
    opacity.value = withTiming(0, { duration: DELETE_DURATION });
    scale.value = withTiming(0.85, { duration: DELETE_DURATION }, (finished) => {
      if (finished) {
        scheduleOnRN(onDelete, course.id);
      }
    });
  };

  return (
    <Animated.View style={deletingStyle}>
      <View style={styles.rowWrapper}>
        <Swipeable
          ref={swipeableRef}
          friction={1.6}
          overshootFriction={8}
          renderRightActions={() => (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
            </Pressable>
          )}
          onSwipeableOpenStartDrag={() => {
            isSwipingRef.current = true;
            if (openRowRef.current && openRowRef.current.id !== course.id) {
              openRowRef.current.close();
            }
          }}
          onSwipeableCloseStartDrag={() => {
            isSwipingRef.current = true;
          }}
          onSwipeableOpen={() => {
            isSwipingRef.current = false;
            openRowRef.current = {
              id: course.id,
              close: () => swipeableRef.current?.close(),
            };
          }}
          onSwipeableClose={() => {
            isSwipingRef.current = false;
            if (openRowRef.current?.id === course.id) {
              openRowRef.current = null;
            }
          }}
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
    </Animated.View>
  );
}

export default function SavedCoursesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, savedCourseIds, toggleSaveCourse } = useAppData();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const openRowRef = useRef<OpenRowRef>(null);

  const savedCourses = useMemo(
    () => courses.filter((course) => savedCourseIds.has(course.id)),
    [courses, savedCourseIds],
  );

  const handleDelete = (courseId: string) => {
    if (openRowRef.current?.id === courseId) {
      openRowRef.current = null;
    }
    toggleSaveCourse(courseId);
  };

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
            <SavedCourseRow
              key={course.id}
              course={course}
              onPress={() => setSelectedCourse(course)}
              openRowRef={openRowRef}
              onDelete={handleDelete}
            />
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
  // 둥근 모서리로 overflow를 클리핑하는 경계. Swipeable 자체도 overflow:hidden을
  // 쓰지만 각지게 잘리므로, 이 래퍼가 바깥에서 둥글게 한 번 더 감싼다.
  rowWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteButton: {
    backgroundColor: colors.like,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
  },
});
