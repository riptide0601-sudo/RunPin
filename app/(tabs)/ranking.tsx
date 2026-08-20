import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { RankingListItem } from '@/components/ranking/RankingListItem';
import { RankingTabs, type RankingPeriod } from '@/components/ranking/RankingTabs';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import { getRankingsForPeriod, PERIOD_META } from '@/lib/ranking';
import type { Course } from '@/types';

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // 메모리 안의 배열을 거르고 정렬하는 게 전부라, 보고 있는 탭 하나만 그때그때
  // 계산하면 된다. 예전엔 "방문한 기간만 지연 로딩"하는 캐시를 뒀는데, 기간별로
  // 데이터 출처가 다르던 시절의 잔재였다 — 탭을 바꾼 첫 렌더에는 캐시가 아직
  // 새 기간을 모르는 탓에 로딩 인디케이터가 한 프레임 번쩍이기까지 했다.
  const rankings = useMemo(() => getRankingsForPeriod(period, courses), [period, courses]);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingTop: insets.top + 8 }]}>랭킹</Text>
      <RankingTabs value={period} onChange={setPeriod} />
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {rankings.length === 0 ? (
          <Text style={styles.emptyText}>{PERIOD_META[period].emptyText}</Text>
        ) : (
          rankings.map((course, index) => (
            <RankingListItem
              key={course.id}
              rank={index + 1}
              course={course}
              onPress={() => setSelectedCourse(course)}
            />
          ))
        )}
      </ScrollView>
      <CourseRouteModal
        visible={selectedCourse !== null}
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
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
