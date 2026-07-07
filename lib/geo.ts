import type { LatLng } from '@/types';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

const VISIBLE_RADIUS_BASE_ZOOM = 16;
const VISIBLE_RADIUS_BASE_METERS = 500;
const VISIBLE_RADIUS_MIN_METERS = 150;
const VISIBLE_RADIUS_MAX_METERS = 3000;

export function getVisibleRadiusMeters(zoom: number): number {
  const radius = VISIBLE_RADIUS_BASE_METERS * 2 ** (VISIBLE_RADIUS_BASE_ZOOM - zoom);
  return Math.min(VISIBLE_RADIUS_MAX_METERS, Math.max(VISIBLE_RADIUS_MIN_METERS, radius));
}
