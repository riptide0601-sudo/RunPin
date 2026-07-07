import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CourseBanner } from '@/components/home/CourseBanner';
import { HomeHeader } from '@/components/home/HomeHeader';
import { RecommendedCourseList } from '@/components/home/RecommendedCourseList';
import { getRouteCenter } from '@/components/map/getRouteCenter';
import { LeafletMap } from '@/components/map/LeafletMap';
import { colors } from '@/constants/colors';
import { featuredCourse, mockCourses, mockMeLocation } from '@/data/mock';
import { haversineDistanceMeters } from '@/lib/geo';

const RECOMMEND_RADIUS_METERS = 3000;

export default function HomeScreen() {
  const [selectedCourseId, setSelectedCourseId] = useState(featuredCourse.id);

  const nearbyCourses = useMemo(() => {
    const filtered = mockCourses.filter(
      (course) => haversineDistanceMeters(mockMeLocation, getRouteCenter(course.coordinates)) <= RECOMMEND_RADIUS_METERS,
    );
    return filtered.length > 0 ? filtered : mockCourses;
  }, []);

  const selectedCourse = useMemo(
    () => mockCourses.find((course) => course.id === selectedCourseId) ?? featuredCourse,
    [selectedCourseId],
  );

  return (
    <View style={styles.container}>
      <HomeHeader />
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
        courses={nearbyCourses}
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
