import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { RankingListItem } from '@/components/ranking/RankingListItem';
import { RankingTabs, type RankingPeriod } from '@/components/ranking/RankingTabs';
import { colors } from '@/constants/colors';
import { mockRankingsByPeriod } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import type { Course, RankingEntry } from '@/types';

const PERIOD_ORDER: RankingPeriod[] = ['daily', 'monthly', 'yearly', 'all'];
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 600;
const SNAP_DURATION_MS = 220;
const RUBBER_BAND_FACTOR = 0.25;

// 실기기 실측용 임시 로그. 원인 확정 후 제거할 것.
function swipeLog(...args: unknown[]) {
  if (__DEV__) {
    console.log(`[RANK-SWIPE ${Date.now()}]`, ...args);
  }
}

function getRankingsForPeriod(period: RankingPeriod, courses: Course[]): RankingEntry[] {
  if (period === 'daily') {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return [...courses]
      .filter((course) => course.createdAt >= dayAgo)
      .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
      .map((course, index) => ({
        id: `daily-${course.id}`,
        rank: index + 1,
        courseId: course.id,
        courseName: course.name,
        uploaderName: course.uploaderName,
        likeCount: course.likeCount ?? 0,
      }));
  }
  return mockRankingsByPeriod[period];
}

function RankingPage({
  period,
  rankings,
  width,
  swiping,
  swipingRef,
  onSelectEntry,
}: {
  period: RankingPeriod;
  rankings: RankingEntry[];
  width: number;
  swiping: boolean;
  swipingRef: RefObject<boolean>;
  onSelectEntry: (entry: RankingEntry) => void;
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {period === 'daily' && rankings.length === 0 ? (
        <Text style={styles.emptyText}>오늘 업로드된 코스가 없어요</Text>
      ) : (
        rankings.map((entry) => (
          <RankingListItem
            key={entry.id}
            entry={entry}
            swiping={swiping}
            swipingRef={swipingRef}
            onPress={() => onSelectEntry(entry)}
          />
        ))
      )}
    </ScrollView>
  );
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { courses } = useAppData();
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  // Mirrors `isSwiping` but updates synchronously (no render/commit delay), so
  // press handlers racing against gesture arbitration always see the latest value.
  const isSwipingRef = useRef(false);
  const setSwiping = useCallback((value: boolean) => {
    isSwipingRef.current = value;
    setIsSwiping(value);
  }, []);

  const translateX = useRef(new Animated.Value(0)).current;
  // Set right before an adjacent-period snap animation finishes; consumed by the
  // layout effect below once `period`'s content has actually re-rendered.
  const pendingSnapResetRef = useRef(false);
  const periodIndex = PERIOD_ORDER.indexOf(period);
  const prevPeriod = periodIndex > 0 ? PERIOD_ORDER[periodIndex - 1] : null;
  const nextPeriod = periodIndex < PERIOD_ORDER.length - 1 ? PERIOD_ORDER[periodIndex + 1] : null;

  const goToAdjacentPeriod = useCallback((direction: 1 | -1) => {
    setPeriod((current) => {
      const currentIndex = PERIOD_ORDER.indexOf(current);
      const nextIndex = currentIndex + direction;
      if (nextIndex < 0 || nextIndex >= PERIOD_ORDER.length) {
        return current;
      }
      return PERIOD_ORDER[nextIndex];
    });
  }, []);

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onStart(() => {
          swipeLog('onStart: isSwiping -> true', { period });
          setSwiping(true);
        })
        .onUpdate((event) => {
          const { translationX } = event;
          const atFirst = periodIndex === 0;
          const atLast = periodIndex === PERIOD_ORDER.length - 1;
          if ((atFirst && translationX > 0) || (atLast && translationX < 0)) {
            translateX.setValue(translationX * RUBBER_BAND_FACTOR);
          } else {
            translateX.setValue(translationX);
          }
        })
        .onEnd((event) => {
          const { translationX, velocityX } = event;
          const goNext = translationX <= -SWIPE_DISTANCE_THRESHOLD || velocityX <= -SWIPE_VELOCITY_THRESHOLD;
          const goPrev = translationX >= SWIPE_DISTANCE_THRESHOLD || velocityX >= SWIPE_VELOCITY_THRESHOLD;
          swipeLog('onEnd', { translationX, velocityX, goNext, goPrev, period });

          if (goNext && nextPeriod) {
            swipeLog('onEnd: starting timing -> next', { toValue: -windowWidth });
            Animated.timing(translateX, {
              toValue: -windowWidth,
              duration: SNAP_DURATION_MS,
              useNativeDriver: true,
            }).start(({ finished }) => {
              swipeLog('timing(next) finished callback', { finished, period });
              // Interrupted by a new gesture starting mid-animation — that gesture's
              // own onStart already re-armed isSwiping, so leave everything alone.
              if (!finished) return;
              // Don't reset translateX here: doing it in this same tick would make the
              // view snap back to the "center" slot's position on the native thread
              // before `period`'s state update has re-rendered that slot's content,
              // flashing the old page for a frame. The layout effect below resets it
              // once the new content has actually committed, and also releases
              // isSwiping only once that full transition is truly done.
              pendingSnapResetRef.current = true;
              swipeLog('onEnd: calling goToAdjacentPeriod(1), pendingSnapResetRef -> true');
              goToAdjacentPeriod(1);
            });
          } else if (goPrev && prevPeriod) {
            swipeLog('onEnd: starting timing -> prev', { toValue: windowWidth });
            Animated.timing(translateX, {
              toValue: windowWidth,
              duration: SNAP_DURATION_MS,
              useNativeDriver: true,
            }).start(({ finished }) => {
              swipeLog('timing(prev) finished callback', { finished, period });
              if (!finished) return;
              pendingSnapResetRef.current = true;
              swipeLog('onEnd: calling goToAdjacentPeriod(-1), pendingSnapResetRef -> true');
              goToAdjacentPeriod(-1);
            });
          } else {
            swipeLog('onEnd: snap back to 0 (no period change)');
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start(({ finished }) => {
              swipeLog('spring(back) finished callback', { finished });
              if (finished) {
                swipeLog('spring(back): isSwiping -> false');
                setSwiping(false);
              }
            });
          }
        })
        .onFinalize((_event, success) => {
          // Cancelled before onEnd's animation ever started (e.g. interrupted by the
          // system) — nothing else will release isSwiping, so do it here. A successful
          // finalize is handled by the animation-completion callbacks above / the layout
          // effect below instead, once the transition has actually finished.
          swipeLog('onFinalize', { success });
          if (!success) {
            swipeLog('onFinalize: isSwiping -> false (cancelled)');
            setSwiping(false);
          }
        }),
    [goToAdjacentPeriod, nextPeriod, period, periodIndex, prevPeriod, setSwiping, translateX, windowWidth],
  );

  // Runs synchronously right after `period`'s new content has committed, so the
  // native-thread translateX reset and the re-rendered "center" slot land in the
  // same frame instead of racing (see the comment on pendingSnapResetRef above).
  useLayoutEffect(() => {
    if (!pendingSnapResetRef.current) return;
    swipeLog('layoutEffect: consuming pendingSnapResetRef, resetting translateX and isSwiping -> false', { period });
    pendingSnapResetRef.current = false;
    translateX.setValue(0);
    setIsSwiping(false);
  }, [period, translateX]);

  const currentRankings = useMemo(() => getRankingsForPeriod(period, courses), [courses, period]);
  const prevRankings = useMemo(
    () => (prevPeriod ? getRankingsForPeriod(prevPeriod, courses) : []),
    [courses, prevPeriod],
  );
  const nextRankings = useMemo(
    () => (nextPeriod ? getRankingsForPeriod(nextPeriod, courses) : []),
    [courses, nextPeriod],
  );

  const selectedCourse = useMemo(
    () => (selectedEntry ? courses.find((course) => course.id === selectedEntry.courseId) ?? null : null),
    [courses, selectedEntry],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingTop: insets.top + 8 }]}>랭킹</Text>
      <RankingTabs value={period} onChange={setPeriod} />
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.viewport}>
          <Animated.View
            style={[
              styles.track,
              {
                width: windowWidth * 3,
                transform: [{ translateX: Animated.add(translateX, -windowWidth) }],
              },
            ]}
          >
            <View style={{ width: windowWidth }}>
              {prevPeriod ? (
                <RankingPage
                  period={prevPeriod}
                  rankings={prevRankings}
                  width={windowWidth}
                  swiping={isSwiping}
                  swipingRef={isSwipingRef}
                  onSelectEntry={setSelectedEntry}
                />
              ) : null}
            </View>
            <RankingPage
              period={period}
              rankings={currentRankings}
              width={windowWidth}
              swiping={isSwiping}
              swipingRef={isSwipingRef}
              onSelectEntry={setSelectedEntry}
            />
            <View style={{ width: windowWidth }}>
              {nextPeriod ? (
                <RankingPage
                  period={nextPeriod}
                  rankings={nextRankings}
                  width={windowWidth}
                  swiping={isSwiping}
                  swipingRef={isSwipingRef}
                  onSelectEntry={setSelectedEntry}
                />
              ) : null}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
      <CourseRouteModal
        visible={selectedEntry !== null}
        course={selectedCourse}
        onClose={() => setSelectedEntry(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 20,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
    color: colors.textMuted,
  },
});
