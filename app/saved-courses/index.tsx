import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
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
// 카드가 스와이프로 밀려날 때 삭제 버튼이 반대편에서 "함께 밀려 들어오는" 느낌을 주기 위한
// 시작 오프셋. progress(0~1)에 맞춰 이 값만큼 translateX를 주고 0으로 수렴시킨다.
const DELETE_ACTION_PUSH_OFFSET = 24;
// 카드와 삭제 버튼이 거의 붙어 보이도록 남기는 최소 간격.
const DELETE_ACTION_GAP = 6;

function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const pushStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [DELETE_ACTION_PUSH_OFFSET, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.deleteButtonWrap, pushStyle]}>
      <Pressable style={styles.deleteButton} onPress={onPress}>
        <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
      </Pressable>
    </Animated.View>
  );
}

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
  // 탭으로 닫힐 때는 onSwipeableCloseStartDrag가 호출되지 않으므로,
  // 닫히는 스프링 애니메이션이 완전히 끝날 때까지 카드의 눌림 시각효과와
  // onPress를 별도로 잠가서 삭제 버튼이 사라지기 전에 다음 터치가 겹치지 않게 한다.
  const [isRowLocked, setIsRowLocked] = useState(false);

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
      <Swipeable
        ref={swipeableRef}
        friction={1.6}
        overshootFriction={8}
        containerStyle={styles.swipeContainer}
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={handleDelete} />}
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
        onSwipeableWillClose={() => {
          setIsRowLocked(true);
        }}
        onSwipeableClose={() => {
          isSwipingRef.current = false;
          setIsRowLocked(false);
          if (openRowRef.current?.id === course.id) {
            openRowRef.current = null;
          }
        }}
      >
        <CourseListItem
          course={course}
          disabled={isRowLocked}
          onPress={() => {
            if (isSwipingRef.current) return;
            onPress();
          }}
        />
      </Swipeable>
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
  // Swipeable 컨테이너 자체를 좌우로 인셋해서, 카드가 스와이프로 열렸을 때
  // 삭제 버튼이 이 인셋된 폭 안에서 카드와 거의 붙어 나타나게 한다. (카드 쪽에
  // 별도 marginHorizontal을 주면 스와이프로 열려도 그 여백만큼 카드와 버튼
  // 사이에 항상 간격이 남기 때문에, 인셋을 컨테이너로 옮겨야 간격이 좁아진다.)
  swipeContainer: {
    marginHorizontal: 20,
  },
  deleteButtonWrap: {
    marginLeft: DELETE_ACTION_GAP,
  },
  deleteButton: {
    backgroundColor: colors.like,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 16,
  },
});
