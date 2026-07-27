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
// 카드가 정지(닫힌) 상태일 때만 좌우 여백을 주는 값. 스와이프 컨테이너 자체에 항상
// marginHorizontal을 고정하면 드래그 중/열린 상태에서도 좌우에 여백이 그대로 남아
// "여백 + 버튼 사이 간격 + 여백"이 겹쳐 보여 부자연스럽다. 그래서 이 값은 고정 스타일이
// 아니라 아래 containerMargin 셰어드 값으로 애니메이션해서, 드래그가 시작되는 즉시
// 0으로 접히고 완전히 닫혀 정지했을 때만 되돌아오게 한다.
const SWIPE_CONTAINER_REST_MARGIN = 20;
const SWIPE_CONTAINER_MARGIN_DURATION = 180;
// 삭제 버튼 opacity를 progress 기준으로 직접 페이드시키는 구간. ReanimatedSwipeable
// 라이브러리가 액션 래퍼 opacity를 progress===0일 때만 0, 그 외엔 무조건 1로 켜는
// "이진(boolean) 스냅" 방식이라, 닫히는 도중에는 끝까지 불투명하게 보이다가 정확히
// 0이 되는 마지막 프레임에 훅 사라지는 것처럼 보인다. 그래서 우리 쪽 버튼을 이 구간
// 안에서 미리 투명하게 만들어두면, 라이브러리의 스냅이 일어날 때는 이미 안 보이는
// 상태라 "잠깐 보였다가 확 사라지는" 현상이 생기지 않는다.
const DELETE_ACTION_FADE_RANGE: [number, number] = [0, 0.15];
// ReanimatedSwipeable의 기본 스프링(mass:2, damping:1000, stiffness:700)은
// 임계감쇠(critical damping, 이 조합에서 약 75)의 13배가 넘는 심한 과감쇠라
// 눈에 보이는 이동은 금방 끝난 것처럼 보여도 "완전히 정지" 판정(그리고 그
// 시점에 삭제 버튼 opacity가 0으로 꺼지는 것)까지는 아주 오래 걸린다. 이게
// "닫아도 삭제 버튼이 한참 안 사라진다"의 원인이라, 임계감쇠에 가까운 값으로
// 덮어써서 닫힘 모션 자체를 빠르고 매끄럽게 만든다.
const SWIPE_ANIMATION_OPTIONS = { mass: 0.5, damping: 30, stiffness: 400 };

// TODO(swipe-touch-leak): 스와이프 도중 터치가 새는 원인을 실기기 로그로 확정하기 위한
// 임시 계측. 원인 확정 후 반드시 제거할 것 (CLAUDE.md 9.1).
function swipeDebugLog(courseId: string, label: string) {
  if (!__DEV__) return;
  console.log(`[swipe-debug] ${Date.now()} course=${courseId} ${label}`);
}

function DeleteAction({
  progress,
  onPress,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
}) {
  const pushStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      DELETE_ACTION_FADE_RANGE,
      [0, 1],
      Extrapolation.CLAMP,
    ),
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
  // 닫힌 채 정지해 있을 때만 좌우 여백을 보여주고, 드래그가 시작되는 순간 0으로 접는다.
  const containerMargin = useSharedValue(SWIPE_CONTAINER_REST_MARGIN);

  const deletingStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const containerMarginStyle = useAnimatedStyle(() => ({
    marginHorizontal: containerMargin.value,
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
        animationOptions={SWIPE_ANIMATION_OPTIONS}
        containerStyle={[styles.swipeContainer, containerMarginStyle]}
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={handleDelete} />}
        onSwipeableOpenStartDrag={() => {
          swipeDebugLog(course.id, '제스처 인식 확정 (open start drag)');
          isSwipingRef.current = true;
          containerMargin.value = withTiming(0, { duration: SWIPE_CONTAINER_MARGIN_DURATION });
          if (openRowRef.current && openRowRef.current.id !== course.id) {
            openRowRef.current.close();
          }
        }}
        onSwipeableCloseStartDrag={() => {
          swipeDebugLog(course.id, '제스처 인식 확정 (close start drag)');
          isSwipingRef.current = true;
          containerMargin.value = withTiming(0, { duration: SWIPE_CONTAINER_MARGIN_DURATION });
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
          containerMargin.value = withTiming(SWIPE_CONTAINER_REST_MARGIN, {
            duration: SWIPE_CONTAINER_MARGIN_DURATION,
          });
          if (openRowRef.current?.id === course.id) {
            openRowRef.current = null;
          }
        }}
      >
        <CourseListItem
          course={course}
          disabled={isRowLocked}
          onPressIn={() => {
            swipeDebugLog(course.id, '터치 시작 (onPressIn)');
          }}
          onPress={() => {
            swipeDebugLog(course.id, `onPress 발동 (isSwipingRef=${isSwipingRef.current})`);
            if (isSwipingRef.current) return;
            swipeDebugLog(course.id, 'onPress 통과 -> 실제 실행');
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
  // 실제 좌우 여백은 SavedCourseRow의 containerMarginStyle(marginHorizontal
  // 애니메이션)이 담당한다. 카드가 정지(닫힌) 상태일 때만 여백을 보여주고 드래그
  // 시작과 동시에 0으로 접어서, 스와이프 중에 여백+버튼 간격이 겹쳐 보이지 않게
  // 한다. 이 style은 향후 비-애니메이션 컨테이너 속성을 위한 자리로 남겨둔다.
  swipeContainer: {},
  deleteButtonWrap: {
    marginLeft: DELETE_ACTION_GAP,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.like,
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 16,
  },
});
