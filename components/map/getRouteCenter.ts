import type { LatLng } from '@/types';

export function getRouteCenter(coordinates: LatLng[]): LatLng {
  const total = coordinates.reduce(
    (acc, point) => ({ latitude: acc.latitude + point.latitude, longitude: acc.longitude + point.longitude }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: total.latitude / coordinates.length, longitude: total.longitude / coordinates.length };
}
