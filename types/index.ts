export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  paceHistory: number[];
}

export interface Course {
  id: string;
  name: string;
  coordinates: LatLng[];
  category: string;
  difficulty: 1 | 2 | 3;
  distanceKm: number;
}

export interface RunLog {
  id: string;
  userId: string;
  trajectory: LatLng[];
  startedAt: number;
  durationSec: number;
  paceSecPerKm: number;
}

export interface Match {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  participantIds: string[];
  radiusMeters: number;
}
