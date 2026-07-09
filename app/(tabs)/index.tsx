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
import { haversineDistanceMeters } from '@/lib/geo';

export default function HomeScreen() {
  const { courses } = useAppData();

  // isPopular courses are pinned to the top of the list (sorted by distance
  // among themselves), then the rest follow in distance order.
  const sortedCourses = useMemo(() => {
    const distanceOf = (course: (typeof courses)[number]) =>
      haversineDistanceMeters(mockMeLocation, getRouteCenter(course.coordinates));
    return [...courses].sort((a, b) => {
      if (!!a.isPopular !== !!b.isPopular) return a.isPopular ? -1 : 1;
      return distanceOf(a) - distanceOf(b);
    });
  }, [courses]);

  const [selectedCourseId, setSelectedCourseId] = useState(sortedCourses[0]?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const displayedCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sortedCourses;
    return sortedCourses.filter((course) => course.name.toLowerCase().includes(query));
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
