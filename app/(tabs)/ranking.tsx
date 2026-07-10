import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { RankingListItem } from '@/components/ranking/RankingListItem';
import { RankingTabs, type RankingPeriod } from '@/components/ranking/RankingTabs';
import { colors } from '@/constants/colors';
import { mockRankingsByPeriod } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import type { RankingEntry } from '@/types';

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const [period, setPeriod] = useState<RankingPeriod>('latest');
  const [selectedEntry, setSelectedEntry] = useState<RankingEntry | null>(null);

  const rankings = useMemo<RankingEntry[]>(() => {
    if (period === 'latest') {
      return [...courses]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 20)
        .map((course, index) => ({
          id: `latest-${course.id}`,
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
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {rankings.map((entry) => (
          <RankingListItem key={entry.id} entry={entry} onPress={() => setSelectedEntry(entry)} />
        ))}
      </ScrollView>
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
});
