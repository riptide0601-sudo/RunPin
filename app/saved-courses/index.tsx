import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable as RNPressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
// 카드와 삭제 버튼이 거의 붙어 보이도록 남기는 최소 간격.
const DELETE_ACTION_GAP = 6;
// 카드가 정지(닫힌) 상태일 때의 좌우 여백. 스와이프 상태와 무관하게 항상 고정값을
// 유지한다 (여백 자체를 늘리거나 접으면 박스 폭이 바뀌어 보이는 문제가 있었음).
// 실제 슬라이드 모션은 Swipeable 내부의 translateX(레이아웃이 아닌 transform)가
// 카드 전체를 삭제 버튼 폭만큼 그대로 밀어내는 것으로만 처리한다.
const SWIPE_CONTAINER_REST_MARGIN = 20;
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
// 실기기 로그(course-57 사례)에서 onPress가 68ms 만에 발동한 뒤 87ms가 더 지나서야
// onSwipeableOpenStartDrag(스와이프 제스처 확정)가 호출된 사례가 확인됐다. 같은
// 터치인데 tap 인식이 pan(스와이프) 인식보다 먼저 JS로 전달되는 레이스라, isSwipingRef
// 값만 그 순간 확인해서는 못 걸러낸다. 그래서 onPress 실행을 짧게 지연시키고, 지연
// 도중 isSwipingRef가 true로 바뀌면 실행을 취소한다. 관측된 지연폭(~150ms)보다
// 여유를 둔 값.
const TAP_CONFIRM_DELAY = 180;
// rightThreshold 미지정 시 라이브러리 기본값은 삭제 버튼 폭의 절반(약 39px)이라,
// friction(1.6)까지 겹치면 60px 넘게 밀어야 "열림"으로 확정되고 그보다 적게 밀고
// 손을 떼면 자동으로 다시 닫혀버린다. 삭제박스가 살짝만 보여도 손을 떼면 그대로
// 열림 상태로 고정되도록(닫기는 반대로 스와이프하거나 화면 다른 곳을 눌러야만)
// 임계값을 아주 낮게 잡는다.
const SWIPE_OPEN_THRESHOLD = 8;
// overshootRight={false}(기본 동작)는 삭제 버튼 폭을 넘어서는 드래그를 완전히 막아버려서,
// 왼쪽으로 과하게 스와이프해도 손가락을 따라가지 않고 그 자리에 딱 멈춰버린다(탄성 없음).
// 요구사항은 "너무 많이 밀어도 살짝 튕기듯 돌아가면서 계속 열려있어야" 하므로, overshootRight를
// 켜서 폭을 넘어가는 구간도 드래그를 따라가게 한 뒤(overshootFriction으로 저항을 줘서 과하게
// 늘어지지 않게) 손을 떼면 SWIPE_ANIMATION_OPTIONS 스프링이 삭제 버튼 폭 지점으로 되돌아오며
// bounce처럼 보이게 한다. release 시점에 "열림"으로 확정되는지는 라이브러리의 handleRelease가
// 이미 담당한다: rowState가 열린 상태에서는 오른쪽으로 rightThreshold 이상 스와이프해서 끝나는
// 경우에만 닫히고, 그 외(왼쪽으로 더 밀거나 그 자리에서 손을 뗀 경우)는 계속 열림을 유지한다.
const SWIPE_OVERSHOOT_FRICTION = 8;

// TODO(swipe-touch-leak, swipe-height-jump): 스와이프 도중 터치가 새는 현상과
// 카드 높이가 흔들리는 현상의 원인을 실기기 로그로 확정하기 위한 임시 계측.
// 원인 확정 후 반드시 제거할 것 (CLAUDE.md 9.1).
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
  // 삭제 버튼 자체에 translateX를 추가로 얹으면, 라이브러리가 이미 처리하는
  // 액션 패널의 우->좌 슬라이드와 겹쳐 "오른쪽으로 갔다가 왼쪽으로 오는" bounce처럼
  // 보인다. 그래서 우리 쪽은 opacity 페이드만 담당하고, 위치 이동은 라이브러리의
  // 단방향 슬라이드 하나만 남긴다.
  const pushStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      DELETE_ACTION_FADE_RANGE,
      [0, 1],
      Extrapolation.CLAMP,
    ),
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

  // onPress가 스와이프 제스처 확정보다 먼저 JS로 전달되는 레이스(TAP_CONFIRM_DELAY
  // 주석 참고)를 막기 위해, onPress 실행을 지연시켰다가 그 사이 isSwipingRef가
  // true가 되면 취소한다. 이 타이머 핸들을 보관해둔다.
  const pressConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pressConfirmTimeoutRef.current) {
        clearTimeout(pressConfirmTimeoutRef.current);
      }
    };
  }, []);

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
    <Animated.View
      style={deletingStyle}
      onLayout={(event) => {
        swipeDebugLog(course.id, `row height=${event.nativeEvent.layout.height.toFixed(1)}`);
      }}
    >
      <Swipeable
        ref={swipeableRef}
        friction={1.6}
        overshootRight
        overshootFriction={SWIPE_OVERSHOOT_FRICTION}
        dragOffsetFromLeftEdge={4}
        dragOffsetFromRightEdge={4}
        rightThreshold={SWIPE_OPEN_THRESHOLD}
        animationOptions={SWIPE_ANIMATION_OPTIONS}
        containerStyle={styles.swipeContainer}
        childrenContainerStyle={styles.swipeContent}
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={handleDelete} />}
        onSwipeableOpenStartDrag={() => {
          swipeDebugLog(course.id, '제스처 인식 확정 (open start drag)');
          isSwipingRef.current = true;
          if (openRowRef.current && openRowRef.current.id !== course.id) {
            openRowRef.current.close();
          }
        }}
        onSwipeableCloseStartDrag={() => {
          swipeDebugLog(course.id, '제스처 인식 확정 (close start drag)');
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
          onPressIn={() => {
            swipeDebugLog(course.id, '터치 시작 (onPressIn)');
            // 다른 행이 열려있는 상태에서 이 행을 누르기 시작하면, 탭인지 스와이프인지
            // 결정되기 전에 즉시 열린 행을 닫는다 (터치 시작 시점은 레이스가 없다).
            if (openRowRef.current && openRowRef.current.id !== course.id) {
              openRowRef.current.close();
            }
          }}
          onPress={() => {
            swipeDebugLog(course.id, `onPress 발동 (isSwipingRef=${isSwipingRef.current})`);
            if (isSwipingRef.current) return;
            // 이 행 자체가 열려있는 상태에서 카드(삭제 버튼이 아닌 부분)를 누르면
            // 코스를 열지 않고 닫기만 한다.
            if (openRowRef.current?.id === course.id) {
              swipeableRef.current?.close();
              return;
            }
            if (pressConfirmTimeoutRef.current) {
              clearTimeout(pressConfirmTimeoutRef.current);
            }
            // TAP_CONFIRM_DELAY 동안 기다렸다가, 그 사이 스와이프 제스처가 확정되지
            // 않았을 때만 실제 탭 동작을 실행한다.
            pressConfirmTimeoutRef.current = setTimeout(() => {
              pressConfirmTimeoutRef.current = null;
              if (isSwipingRef.current) return;
              swipeDebugLog(course.id, 'onPress 통과 -> 실제 실행');
              onPress();
            }, TAP_CONFIRM_DELAY);
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

  // 화면의 다른 부분(헤더, 리스트 여백 등)을 누르면 열려있는 삭제 버튼을 닫는다.
  // 각 행 자체를 누르는 경우는 SavedCourseRow의 onPressIn에서 더 먼저(레이스 없이)
  // 처리하므로, 여기서는 행 바깥 영역을 누른 경우만 걸러진다.
  const closeOpenRow = () => {
    openRowRef.current?.close();
  };

  return (
    <RNPressable style={[styles.container, { paddingTop: insets.top + 8 }]} onPress={closeOpenRow}>
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
    </RNPressable>
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
  // Swipeable 최상위 컨테이너는 overflow:hidden으로 스와이프 가능 영역을 클리핑한다.
  // 여기에 marginLeft를 주면 카드가 아무리 왼쪽으로 밀려도 그 여백 지점에서
  // 잘려버려(clip) "끝까지 스와이프해도 왼쪽 여백이 안 없어지는" 문제가 생긴다.
  // 그래서 왼쪽은 컨테이너가 아니라 실제로 translateX와 함께 움직이는
  // swipeContent(children) 쪽에 여백을 준다. 오른쪽 여백은 삭제 버튼이 항상
  // 이 경계 안에서만 드러나야 하므로 컨테이너에 그대로 유지한다.
  swipeContainer: {
    marginRight: SWIPE_CONTAINER_REST_MARGIN,
  },
  swipeContent: {
    marginLeft: SWIPE_CONTAINER_REST_MARGIN,
  },
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
