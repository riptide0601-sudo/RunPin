import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { RankingListItem } from '@/components/ranking/RankingListItem';
import { RankingTabs, type RankingPeriod } from '@/components/ranking/RankingTabs';
import { colors } from '@/constants/colors';
import { mockRankingsByPeriod } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import type { RankingEntry } from '@/types';

const PERIOD_ORDER: RankingPeriod[] = ['daily', 'monthly', 'yearly', 'all'];
const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 600;

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);

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
        .onEnd((event) => {
          const { translationX, velocityX } = event;
          if (translationX <= -SWIPE_DISTANCE_THRESHOLD || velocityX <= -SWIPE_VELOCITY_THRESHOLD) {
            goToAdjacentPeriod(1);
          } else if (translationX >= SWIPE_DISTANCE_THRESHOLD || velocityX >= SWIPE_VELOCITY_THRESHOLD) {
            goToAdjacentPeriod(-1);
          }
        }),
    [goToAdjacentPeriod],
  );

  const rankings = useMemo<RankingEntry[]>(() => {
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
  }, [courses, period]);

  const selectedCourse = useMemo(
    () => (selectedEntry ? courses.find((course) => course.id === selectedEntry.courseId) ?? null : null),
    [courses, selectedEntry],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingTop: insets.top + 8 }]}>랭킹</Text>
      <RankingTabs value={period} onChange={setPeriod} />
      <GestureDetector gesture={swipeGesture}>
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {period === 'daily' && rankings.length === 0 ? (
            <Text style={styles.emptyText}>오늘 업로드된 코스가 없어요</Text>
          ) : (
            rankings.map((entry) => (
              <RankingListItem key={entry.id} entry={entry} onPress={() => setSelectedEntry(entry)} />
            ))
          )}
        </ScrollView>
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
