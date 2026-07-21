import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseBanner } from '@/components/home/CourseBanner';
import { HomeHeader } from '@/components/home/HomeHeader';
import { RecommendedCourseList } from '@/components/home/RecommendedCourseList';
import { getRouteCenter } from '@/components/map/getRouteCenter';
import { LeafletMap } from '@/components/map/LeafletMap';
import { colors } from '@/constants/colors';
import { mockMeLocation } from '@/data/mock';
import { useAppData } from '@/lib/appData';
import { groupCoursesByName } from '@/lib/courseGroups';
import { haversineDistanceMeters } from '@/lib/geo';
import { matchesChosung } from '@/lib/hangul';

// A course can only be "popular" if it's actually near me — a far-away course
// with a high like count shouldn't outrank nearby ones just because it's
// well-liked citywide.
const POPULAR_CANDIDATE_RADIUS_METERS = 3000;
const POPULAR_COURSE_COUNT = 3;

export default function HomeScreen() {
  const { courses } = useAppData();
  const measuredTabBarHeight = useBottomTabBarHeight();
  if (__DEV__) {
    console.log('[TabBar] measured (react-navigation) height =', measuredTabBarHeight);
  }

  // 같은 이름을 가진 코스들을 하나의 그룹으로 묶고, 그룹당 likeCount가 가장 높은
  // 코스(대표 코스)만 추천 리스트/인기 판정/지도 기본 노출 대상으로 삼는다. 나머지
  // 그룹 멤버는 대표 코스를 탭했을 때 펼쳐지는 캐러셀에서만 노출된다.
  const groups = useMemo(() => groupCoursesByName(courses), [courses]);
  const representativeCourses = useMemo(() => groups.map((group) => group.representative), [groups]);
  const groupMembersByRepId = useMemo(
    () => new Map(groups.map((group) => [group.representative.id, group.members])),
    [groups],
  );

  // Popular courses (top-3 by like count among only the representative courses
  // within POPULAR_CANDIDATE_RADIUS_METERS of me) are pinned to the top, sorted
  // by distance among themselves. Everything else — including nearby courses
  // that didn't make the top 3, and anything beyond the radius — follows in
  // plain distance order.
  const sortedCourses = useMemo(() => {
    const distanceOf = (course: (typeof representativeCourses)[number]) =>
      haversineDistanceMeters(mockMeLocation, getRouteCenter(course.coordinates));

    const popularIds = new Set(
      representativeCourses
        .filter((course) => distanceOf(course) <= POPULAR_CANDIDATE_RADIUS_METERS)
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))
        .slice(0, POPULAR_COURSE_COUNT)
        .map((course) => course.id),
    );

    return representativeCourses
      .map((course) => ({ ...course, isPopular: popularIds.has(course.id) }))
      .sort((a, b) => {
        if (a.isPopular !== b.isPopular) return a.isPopular ? -1 : 1;
        return distanceOf(a) - distanceOf(b);
      });
  }, [representativeCourses]);

  const [selectedCourseId, setSelectedCourseId] = useState(sortedCourses[0]?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedCourses = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return sortedCourses;
    const query = trimmed.toLowerCase();
    return sortedCourses.filter(
      (course) => course.name.toLowerCase().includes(query) || matchesChosung(course.name, trimmed),
    );
  }, [sortedCourses, searchQuery]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? sortedCourses[0],
    [courses, sortedCourses, selectedCourseId],
  );

  return (
    <View style={styles.container}>
      <HomeHeader searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <LeafletMap
        style={styles.map}
        center={getRouteCenter(selectedCourse.coordinates)}
        route={selectedCourse.coordinates}
        fitBounds
        fitBoundsPadding={{ top: 90, right: 32, bottom: 32, left: 32 }}
        markers={[{ id: 'me', position: mockMeLocation, variant: 'me' }]}
        dragging={false}
        keepCenterOnZoom
      >
        <CourseBanner title={selectedCourse.name} distanceKm={selectedCourse.distanceKm} />
      </LeafletMap>
      <RecommendedCourseList
        courses={displayedCourses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={setSelectedCourseId}
        groupMembersByRepId={groupMembersByRepId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    marginHorizontal: 16,
    borderRadius: 20,
  },
});
