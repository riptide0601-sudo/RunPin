import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseRouteModal } from '@/components/ranking/CourseRouteModal';
import { RankingListItem } from '@/components/ranking/RankingListItem';
import { RankingTabs, type RankingPeriod } from '@/components/ranking/RankingTabs';
import { colors } from '@/constants/colors';
import { useAppData } from '@/lib/appData';
import type { Course } from '@/types';

// 랭킹은 이제 course.likeCount 하나만 진실의 원천으로 삼는다 — 기간별로 별도의 mock
// 수치를 두면(과거 mockRankingsByPeriod처럼) 목록에 보이는 숫자와 상세보기 숫자가
// 서로 다른 값을 가리키게 되는 문제가 반복해서 생겼다. 대신 각 탭은 courses 전체를
// createdAt 기준으로 다른 폭의 "최근 N일" 구간으로 필터링만 하고, 정렬/표시는 항상
// 같은 course.likeCount를 쓴다. 구간은 서로 배타적이지 않고 포함 관계다(예: 최근
// 5일 안에 만든 코스는 일간/월간/연간/전체 탭에 전부 나타날 수 있음) — 실제 좋아요
// 수를 그대로 보여주는 이상 "탭마다 겹치지 않는 숫자 범위"를 인위적으로 만들 이유가 없다.
const PERIOD_WINDOW_MS: Record<RankingPeriod, number | null> = {
  daily: 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
  all: null,
};

const RANKING_LIMIT = 20;

const PERIOD_EMPTY_TEXT: Record<RankingPeriod, string> = {
  daily: '오늘 업로드된 코스가 없어요',
  monthly: '최근 한 달 안에 업로드된 코스가 없어요',
  yearly: '최근 1년 안에 업로드된 코스가 없어요',
  all: '아직 업로드된 코스가 없어요',
};

function getRankingsForPeriod(period: RankingPeriod, courses: Course[]): Course[] {
  const windowMs = PERIOD_WINDOW_MS[period];
  const cutoff = windowMs === null ? null : Date.now() - windowMs;
  return [...courses]
    .filter((course) => cutoff === null || course.createdAt >= cutoff)
    .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
    .slice(0, RANKING_LIMIT);
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const { courses } = useAppData();
  const [period, setPeriod] = useState<RankingPeriod>('daily');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Only periods the user has actually opened get their data loaded — never
  // all four at once. A real backend would plug into this by making
  // getRankingsForPeriod an async per-period fetch.
  const [visitedPeriods, setVisitedPeriods] = useState<Set<RankingPeriod>>(() => new Set([period]));
  useEffect(() => {
    setVisitedPeriods((prev) => (prev.has(period) ? prev : new Set(prev).add(period)));
  }, [period]);

  const rankingsCache = useMemo(() => {
    const cache: Partial<Record<RankingPeriod, Course[]>> = {};
    visitedPeriods.forEach((p) => {
      cache[p] = getRankingsForPeriod(p, courses);
    });
    return cache;
  }, [visitedPeriods, courses]);

  const rankings = rankingsCache[period];

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { paddingTop: insets.top + 8 }]}>랭킹</Text>
      <RankingTabs value={period} onChange={setPeriod} />
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {rankings === undefined ? (
          <ActivityIndicator style={styles.loading} color={colors.textMuted} />
        ) : rankings.length === 0 ? (
          <Text style={styles.emptyText}>{PERIOD_EMPTY_TEXT[period]}</Text>
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
  loading: {
    marginTop: 40,
  },
});
