import { useCallback, useMemo, useRef, useState } from 'react';
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
  onSelectEntry,
}: {
  period: RankingPeriod;
  rankings: RankingEntry[];
  width: number;
  swiping: boolean;
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
          <RankingListItem key={entry.id} entry={entry} swiping={swiping} onPress={() => onSelectEntry(entry)} />
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

  const translateX = useRef(new Animated.Value(0)).current;
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
          setIsSwiping(true);
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

          if (goNext && nextPeriod) {
            Animated.timing(translateX, {
              toValue: -windowWidth,
              duration: SNAP_DURATION_MS,
              useNativeDriver: true,
            }).start(() => {
              goToAdjacentPeriod(1);
              translateX.setValue(0);
            });
          } else if (goPrev && prevPeriod) {
            Animated.timing(translateX, {
              toValue: windowWidth,
              duration: SNAP_DURATION_MS,
              useNativeDriver: true,
            }).start(() => {
              goToAdjacentPeriod(-1);
              translateX.setValue(0);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          }
        })
        .onFinalize(() => {
          // Pressable#onPress on web fires from the trailing native `click` event,
          // which is dispatched right after this gesture's pointerup handling. Resetting
          // isSwiping synchronously here loses the race and lets that click slip through,
          // so defer the reset by one tick until after the trailing click has been handled.
          setTimeout(() => setIsSwiping(false), 0);
        }),
    [goToAdjacentPeriod, nextPeriod, periodIndex, prevPeriod, translateX, windowWidth],
  );

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
                  onSelectEntry={setSelectedEntry}
                />
              ) : null}
            </View>
            <RankingPage
              period={period}
              rankings={currentRankings}
              width={windowWidth}
              swiping={isSwiping}
              onSelectEntry={setSelectedEntry}
            />
            <View style={{ width: windowWidth }}>
              {nextPeriod ? (
                <RankingPage
                  period={nextPeriod}
                  rankings={nextRankings}
                  width={windowWidth}
                  swiping={isSwiping}
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
