import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  LinearTransition,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RunFinishModal } from '@/components/community/RunFinishModal';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import { formatDateLabel, formatPaceLabel } from '@/lib/format';
import type { RunLog } from '@/types';

// app/saved-courses/index.tsx의 스와이프 삭제 구현을 그대로 재사용한다 (아래 상수/컴포넌트
// 전부 동일한 이유로 동일한 값). 한 번에 하나의 카드만 열려있도록, 현재 열린 행의 식별자와
// 닫기 함수를 형제 행들이 공유하는 ref.
type OpenRowRef = { id: string; close: () => void } | null;

const DELETE_DURATION = 220;
const DELETE_ACTION_GAP = 6;
const SWIPE_CONTAINER_REST_MARGIN = 20;
const DELETE_ACTION_FADE_RANGE: [number, number] = [0, 0.15];
const SWIPE_ANIMATION_OPTIONS = { mass: 0.6, damping: 14, stiffness: 75, velocity: 0 };
const TAP_CONFIRM_DELAY = 180;
const SWIPE_OPEN_THRESHOLD = 8;
const SWIPE_OVERSHOOT_FRICTION = 8;
const SWIPE_FRICTION = 1;
const SWIPE_DRAG_ACTIVATION_OFFSET = 2;
// app/saved-courses/index.tsx와 동일한 이유(iOS 엣지 스와이프 뒤로가기와의 충돌)로
// 카드의 물리적 왼쪽 가장자리 24px에서 시작하는 터치는 이 pan 제스처의 인식 대상에서
// 제외한다.
const EDGE_BACK_GESTURE_HITSLOP = -24;
const ROW_LAYOUT_DURATION = 400;
const ROW_LAYOUT_TRANSITION = LinearTransition.duration(ROW_LAYOUT_DURATION);
const ROW_EXITING = (): { initialValues: Record<string, unknown>; animations: Record<string, unknown> } => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: DELETE_DURATION }),
      transform: [{ scale: withTiming(0.85, { duration: DELETE_DURATION }) }],
    },
  };
};

const DeleteAction = memo(function DeleteAction({
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
  }));

  return (
    <Animated.View style={[styles.deleteButtonWrap, pushStyle]}>
      <Pressable style={styles.deleteButton} onPress={onPress}>
        <Ionicons name="trash-outline" size={20} color={colors.textInverse} />
      </Pressable>
    </Animated.View>
  );
});

const RunLogRow = memo(function RunLogRowImpl({
  log,
  onSelect,
  onUpload,
  openRowRef,
  onDelete,
}: {
  log: RunLog;
  onSelect: (log: RunLog) => void;
  onUpload: (log: RunLog) => void;
  openRowRef: React.RefObject<OpenRowRef>;
  onDelete: (logId: string) => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isSwipingRef = useRef(false);
  const [isRowLocked, setIsRowLocked] = useState(false);
  const pressConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pressConfirmTimeoutRef.current) {
        clearTimeout(pressConfirmTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = () => {
    onDelete(log.id);
  };

  const registerAsOpenRow = () => {
    openRowRef.current = {
      id: log.id,
      close: () => swipeableRef.current?.close(),
    };
  };

  return (
    <Animated.View layout={ROW_LAYOUT_TRANSITION} exiting={ROW_EXITING}>
      <Swipeable
        ref={swipeableRef}
        friction={SWIPE_FRICTION}
        overshootRight
        overshootFriction={SWIPE_OVERSHOOT_FRICTION}
        dragOffsetFromLeftEdge={SWIPE_DRAG_ACTIVATION_OFFSET}
        dragOffsetFromRightEdge={SWIPE_DRAG_ACTIVATION_OFFSET}
        hitSlop={{ left: EDGE_BACK_GESTURE_HITSLOP }}
        rightThreshold={SWIPE_OPEN_THRESHOLD}
        animationOptions={SWIPE_ANIMATION_OPTIONS}
        containerStyle={styles.swipeContainer}
        childrenContainerStyle={styles.swipeContent}
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={handleDelete} />}
        onSwipeableOpenStartDrag={() => {
          isSwipingRef.current = true;
          if (openRowRef.current && openRowRef.current.id !== log.id) {
            openRowRef.current.close();
          }
          registerAsOpenRow();
        }}
        onSwipeableCloseStartDrag={() => {
          isSwipingRef.current = true;
        }}
        onSwipeableOpen={() => {
          isSwipingRef.current = false;
          registerAsOpenRow();
        }}
        onSwipeableWillClose={() => {
          setIsRowLocked(true);
        }}
        onSwipeableClose={() => {
          isSwipingRef.current = false;
          setIsRowLocked(false);
          if (openRowRef.current?.id === log.id) {
            openRowRef.current = null;
          }
        }}
      >
        <Pressable
          disabled={isRowLocked}
          style={({ pressed }) => pressed && styles.pressed}
          onPressIn={() => {
            if (openRowRef.current && openRowRef.current.id !== log.id) {
              openRowRef.current.close();
            }
          }}
          onPress={() => {
            if (isSwipingRef.current) return;
            if (pressConfirmTimeoutRef.current) {
              clearTimeout(pressConfirmTimeoutRef.current);
            }
            pressConfirmTimeoutRef.current = setTimeout(() => {
              pressConfirmTimeoutRef.current = null;
              if (isSwipingRef.current) return;
              if (openRowRef.current?.id === log.id) {
                swipeableRef.current?.close();
                return;
              }
              onSelect(log);
            }, TAP_CONFIRM_DELAY);
          }}
        >
          <Card style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.courseName}>{log.courseName}</Text>
              <Text style={styles.date}>{formatDateLabel(log.startedAt)}</Text>
            </View>
            <Text style={styles.meta}>
              {log.distanceKm}km · {formatPaceLabel(log.paceSecPerKm)}
            </Text>
            {log.runMateName ? (
              <View style={styles.runMateRow}>
                <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                <Text style={styles.runMateText}>함께 뛴 러너: {log.runMateName}님</Text>
              </View>
            ) : null}
            <View style={styles.statusRow}>
              <Pressable
                hitSlop={4}
                onPress={() => {
                  if (!log.isUploaded) onUpload(log);
                }}
              >
                {log.isUploaded ? (
                  <Pill
                    variant="subtle"
                    label="업로드 완료"
                    size="sm"
                    icon={<Ionicons name="checkmark-circle" size={13} color={colors.textMuted} />}
                    style={styles.uploadPill}
                    labelStyle={styles.uploadPillLabel}
                  />
                ) : (
                  <Pill
                    variant="outline"
                    label="업로드"
                    size="sm"
                    style={styles.uploadPill}
                    labelStyle={styles.uploadPillLabel}
                  />
                )}
              </Pressable>
            </View>
          </Card>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
});

export default function RunLogListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { courses, runLogs, uploadRunLog, deleteRunLog } = useAppData();
  const [uploadTarget, setUploadTarget] = useState<RunLog | null>(null);
  const openRowRef = useRef<OpenRowRef>(null);

  const handleSelect = useCallback(
    (log: RunLog) => {
      router.push({ pathname: '/run-log/[id]', params: { id: log.id } });
    },
    [router],
  );

  const handleUpload = useCallback((log: RunLog) => {
    setUploadTarget(log);
  }, []);

  const handleDelete = useCallback(
    (logId: string) => {
      if (openRowRef.current?.id === logId) {
        openRowRef.current = null;
      }
      deleteRunLog(logId).catch((error) => {
        if (__DEV__) {
          console.error('[run-log/index] 삭제 실패', error);
        }
        Alert.alert('삭제하지 못했어요', '잠시 후 다시 시도해주세요');
      });
    },
    [deleteRunLog],
  );

  const closeOpenRow = () => {
    openRowRef.current?.close();
  };

  return (
    <Pressable style={[styles.container, { paddingTop: insets.top + 8 }]} onPress={closeOpenRow}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>내 러닝 기록</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {runLogs.length === 0 ? <Text style={styles.emptyText}>아직 러닝 기록이 없어요</Text> : null}
        {runLogs.map((log) => (
          <RunLogRow
            key={log.id}
            log={log}
            onSelect={handleSelect}
            onUpload={handleUpload}
            openRowRef={openRowRef}
            onDelete={handleDelete}
          />
        ))}
      </ScrollView>

      <RunFinishModal
        visible={uploadTarget !== null}
        myRoute={uploadTarget?.trajectory ?? []}
        courses={courses}
        onSave={async (result) => {
          const target = uploadTarget;
          setUploadTarget(null);
          if (!target) return;
          try {
            await uploadRunLog(target.id, result.courseName);
          } catch (error) {
            if (__DEV__) {
              console.error('[run-log/index] 업로드 실패', error);
            }
            Alert.alert('업로드하지 못했어요', '잠시 후 다시 시도해주세요');
          }
        }}
        onSkip={() => setUploadTarget(null)}
      />
    </Pressable>
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
  emptyText: {
    paddingTop: 24,
    textAlign: 'center',
    fontSize: 14,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.7,
  },
  card: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  runMateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  runMateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  uploadPill: {
    minHeight: 28,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  uploadPillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  // app/saved-courses/index.tsx와 동일한 이유(overflow:hidden 클리핑 문제)로 왼쪽 여백은
  // 컨테이너가 아니라 swipeContent(children) 쪽에 준다.
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
