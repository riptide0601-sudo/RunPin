import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { PaceRings } from '@/components/community/PaceRings';
import { getAnchoredPopupPosition, type Size } from '@/components/community/popupPosition';
import { RunnerDetailCard } from '@/components/community/RunnerDetailCard';
import { LeafletMap, type MapMarker } from '@/components/map/LeafletMap';
import { colors } from '@/constants/colors';
import { mockMeLocation, mockMyRunningRoute } from '@/data/mock';
import { getVisibleRadiusMeters, haversineDistanceMeters } from '@/lib/geo';
import type { RunnerMapDot } from '@/types';

interface CommunityMapProps {
  runners: RunnerMapDot[];
  isRunning: boolean;
}

const DEFAULT_ZOOM = 16;
const CARD_SIZE: Size = { width: 190, height: 112 };

export function CommunityMap({ runners, isRunning }: CommunityMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [selection, setSelection] = useState<{ runnerId: string; point: { x: number; y: number } } | null>(null);

  useEffect(() => {
    setSelection(null);
  }, [isRunning, zoom]);

  const myRunningPosition = mockMyRunningRoute[mockMyRunningRoute.length - 1];

  const visibleRunners = isRunning
    ? []
    : runners.filter(
        (runner) => haversineDistanceMeters(mockMeLocation, runner.position) <= getVisibleRadiusMeters(zoom),
      );

  const markers: MapMarker[] = isRunning
    ? [{ id: 'me', position: myRunningPosition, variant: 'me' }]
    : [
        { id: 'me', position: mockMeLocation, variant: 'me' },
        ...visibleRunners.map((runner) => ({
          id: runner.id,
          position: runner.position,
          variant: (runner.paceComparison === 'similar' ? 'match' : 'runner') as MapMarker['variant'],
        })),
      ];

  const selectedRunner = selection ? (visibleRunners.find((runner) => runner.id === selection.runnerId) ?? null) : null;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  return (
    <LeafletMap
      style={styles.map}
      zoom={zoom}
      center={isRunning ? myRunningPosition : mockMeLocation}
      route={isRunning ? mockMyRunningRoute : undefined}
      markers={markers}
      onMarkerPress={(id, point) => setSelection({ runnerId: id, point })}
      onMapPress={() => setSelection(null)}
      dragging={false}
      keepCenterOnZoom={!isRunning}
      onZoomChange={setZoom}
      onLayout={handleLayout}
    >
      {isRunning ? (
        <View style={styles.runningBadge} pointerEvents="none">
          <View style={styles.runningDot} />
          <Text style={styles.runningBadgeText}>러닝 중</Text>
        </View>
      ) : (
        <PaceRings />
      )}
      {!isRunning && selectedRunner && selection && containerSize.width > 0 ? (
        <RunnerDetailCard
          runner={selectedRunner}
          onPropose={() => setSelection(null)}
          position={getAnchoredPopupPosition(selection.point, containerSize, CARD_SIZE)}
        />
      ) : null}
    </LeafletMap>
  );
}

const styles = StyleSheet.create({
  map: {},
  runningBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  runningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentMe,
  },
  runningBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentMe,
  },
});
