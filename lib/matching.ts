import { getRouteCenter } from '@/components/map/getRouteCenter';
import { haversineDistanceMeters } from '@/lib/geo';
import type { Course, LatLng, PaceComparison } from '@/types';

export function isMatchCandidate(paceComparison: PaceComparison): boolean {
  return paceComparison === 'similar';
}

export function findNearestCourse(route: LatLng[], courses: Course[]): Course | null {
  if (courses.length === 0) return null;
  const routeCenter = getRouteCenter(route);
  return courses.reduce<{ course: Course; distance: number } | null>((closest, course) => {
    const distance = haversineDistanceMeters(routeCenter, getRouteCenter(course.coordinates));
    if (!closest || distance < closest.distance) {
      return { course, distance };
    }
    return closest;
  }, null)!.course;
}

// Unlike findNearestCourse (always returns the closest course, however far),
// this only reports a match when the closest course is actually near the
// route — used for unattended matching (e.g. deferred upload) where there's
// no user in the loop to reject a bad guess.
const MATCH_DISTANCE_THRESHOLD_METERS = 300;

export function findMatchingCourse(route: LatLng[], courses: Course[]): Course | null {
  const nearest = findNearestCourse(route, courses);
  if (!nearest) return null;
  const distance = haversineDistanceMeters(getRouteCenter(route), getRouteCenter(nearest.coordinates));
  return distance <= MATCH_DISTANCE_THRESHOLD_METERS ? nearest : null;
}
