import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
const RUBBER_BAND_FACTOR = 0.25;

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
  // undefined until this period has actually been fetched (see visitedPeriods
  // below) — a real backend would fetch per period on demand instead of all
  // four at once, so this slot has to be able to render before its data exists.
  rankings: RankingEntry[] | undefined;
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
      {rankings === undefined ? (
        <ActivityIndicator style={styles.loading} color={colors.textMuted} />
      ) : period === 'daily' && rankings.length === 0 ? (
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

  const periodIndex = PERIOD_ORDER.indexOf(period);
  const periodIndexRef = useRef(periodIndex);
  useEffect(() => {
    periodIndexRef.current = periodIndex;
  }, [periodIndex]);

  // All four periods are mounted at fixed positions (index * width) at all
  // times, so switching periods never swaps a slot's content — only this
  // value's target changes. That removes the need to ever synchronize a
  // transform reset with a content re-render, so the whole track can stay on
  // the native driver for a smooth 60fps swipe.
  const translateX = useRef(new Animated.Value(-periodIndex * windowWidth)).current;

  // Keeps the track aligned on orientation/window-size changes (not during an
  // active gesture, which manages translateX itself).
  useEffect(() => {
    if (isSwipingRef.current) return;
    translateX.setValue(-periodIndexRef.current * windowWidth);
  }, [windowWidth, translateX]);

  const snapToIndex = useCallback(
    (targetIndex: number) => {
      Animated.spring(translateX, {
        toValue: -targetIndex * windowWidth,
        useNativeDriver: true,
        bounciness: 6,
      }).start(({ finished }) => {
        if (finished) setSwiping(false);
      });
    },
    [setSwiping, translateX, windowWidth],
  );

  const handleTabChange = useCallback(
    (value: RankingPeriod) => {
      const targetIndex = PERIOD_ORDER.indexOf(value);
      if (targetIndex === periodIndex) return;
      setPeriod(value);
      translateX.setValue(-targetIndex * windowWidth);
    },
    [periodIndex, translateX, windowWidth],
  );

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-10, 10])
        .onStart(() => {
          setSwiping(true);
        })
        .onUpdate((event) => {
          const { translationX } = event;
          const atFirst = periodIndex === 0;
          const atLast = periodIndex === PERIOD_ORDER.length - 1;
          const base = -periodIndex * windowWidth;
          if ((atFirst && translationX > 0) || (atLast && translationX < 0)) {
            translateX.setValue(base + translationX * RUBBER_BAND_FACTOR);
          } else {
            translateX.setValue(base + translationX);
          }
        })
        .onEnd((event) => {
          const { translationX, velocityX } = event;
          const goNext = translationX <= -SWIPE_DISTANCE_THRESHOLD || velocityX <= -SWIPE_VELOCITY_THRESHOLD;
          const goPrev = translationX >= SWIPE_DISTANCE_THRESHOLD || velocityX >= SWIPE_VELOCITY_THRESHOLD;

          let targetIndex = periodIndex;
          if (goNext && periodIndex < PERIOD_ORDER.length - 1) {
            targetIndex = periodIndex + 1;
          } else if (goPrev && periodIndex > 0) {
            targetIndex = periodIndex - 1;
          }
          if (targetIndex !== periodIndex) {
            setPeriod(PERIOD_ORDER[targetIndex]);
          }
          snapToIndex(targetIndex);
        })
        .onFinalize((_event, success) => {
          // Cancelled before onEnd ever ran (e.g. interrupted by the system) —
          // nothing else will release isSwiping, so do it here. A successful
          // finalize is handled by snapToIndex's completion callback instead.
          if (!success) {
            setSwiping(false);
          }
        }),
    [periodIndex, setSwiping, snapToIndex, translateX, windowWidth],
  );

  // Only periods the user has actually reached (or is one swipe away from)
  // get their data loaded — never all four at once. A real backend would plug
  // into this by making getRankingsForPeriod an async per-period fetch; the
  // set below is what decides which periods to call it for.
  const [visitedPeriods, setVisitedPeriods] = useState<Set<RankingPeriod>>(
    () => new Set([PERIOD_ORDER[0]]),
  );
  useEffect(() => {
    const neededIndexes = [periodIndex - 1, periodIndex, periodIndex + 1];
    setVisitedPeriods((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const index of neededIndexes) {
        const candidate = PERIOD_ORDER[index];
        if (candidate && !next.has(candidate)) {
          next.add(candidate);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [periodIndex]);

  const rankingsCache = useMemo(() => {
    const cache: Partial<Record<RankingPeriod, RankingEntry[]>> = {};
    visitedPeriods.forEach((p) => {
      cache[p] = getRankingsForPeriod(p, courses);
    });
    return cache;
  }, [visitedPeriods, courses]);

  const selectedCourse = useMemo(
    () => (selectedEntry ? courses.find((course) => course.id === selectedEntry.courseId) ?? null : null),
    [courses, selectedEntry],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingTop: insets.top + 8 }]}>랭킹</Text>
      <RankingTabs value={period} onChange={handleTabChange} />
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.viewport}>
          <Animated.View
            style={[
              styles.track,
              {
                width: windowWidth * PERIOD_ORDER.length,
                transform: [{ translateX }],
              },
            ]}
          >
            {PERIOD_ORDER.map((p) => (
              <RankingPage
                key={p}
                period={p}
                rankings={rankingsCache[p]}
                width={windowWidth}
                swiping={isSwiping}
                swipingRef={isSwipingRef}
                onSelectEntry={setSelectedEntry}
              />
            ))}
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
  loading: {
    marginTop: 40,
  },
});
