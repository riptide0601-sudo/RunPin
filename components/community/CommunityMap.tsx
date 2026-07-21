import { useEffect, useState } from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';

import { PaceRings } from '@/components/community/PaceRings';
import { getAnchoredPopupPosition, type Point, type Size } from '@/components/community/popupPosition';
import { RunnerDetailCard } from '@/components/community/RunnerDetailCard';
import { RunningBadge } from '@/components/community/RunningBadge';
import { LeafletMap, type MapMarker } from '@/components/map/LeafletMap';
import { colors } from '@/constants/colors';
import { mockMeLocation, mockMyRunningRoute } from '@/data/mock';
import { getVisibleRadiusMeters, haversineDistanceMeters } from '@/lib/geo';
import { isMatchCandidate } from '@/lib/matching';
import type { RunnerMapDot } from '@/types';

interface CommunityMapProps {
  runners: RunnerMapDot[];
  isRunning: boolean;
  onPropose: () => void;
}

const DEFAULT_ZOOM = 16;
const CARD_SIZE: Size = { width: 190, height: 112 };

// Clears the top RunningStatusBar overlay and the bottom notice bar so the
// full run route + current position are never hidden underneath them.
const RUNNING_FIT_BOUNDS_PADDING = { top: 90, right: 32, bottom: 90, left: 32 };

export function CommunityMap({ runners, isRunning, onPropose }: CommunityMapProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [containerSize, setContainerSize] = useState<Size>({ width: 0, height: 0 });
  const [selection, setSelection] = useState<{ runnerId: string; point: Point } | null>(null);

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
          variant: (isMatchCandidate(runner.paceComparison) ? 'match' : 'runner') as MapMarker['variant'],
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
      fitBounds={isRunning}
      fitBoundsPadding={isRunning ? RUNNING_FIT_BOUNDS_PADDING : undefined}
      markers={markers}
      onMarkerPress={(id, point) => setSelection({ runnerId: id, point })}
      onMapPress={() => setSelection(null)}
      dragging={false}
      keepCenterOnZoom
      zoomAnchorMarkerId={isRunning ? 'me' : undefined}
      onZoomChange={setZoom}
      onLayout={handleLayout}
    >
      {isRunning ? <RunningBadge style={styles.runningBadgeWrapper} /> : <PaceRings />}
      {!isRunning && selectedRunner && selection && containerSize.width > 0 ? (
        <RunnerDetailCard
          runner={selectedRunner}
          onPropose={() => {
            onPropose();
            setSelection(null);
          }}
          position={getAnchoredPopupPosition(selection.point, containerSize, CARD_SIZE)}
        />
      ) : null}
    </LeafletMap>
  );
}

const styles = StyleSheet.create({
  map: {},
  runningBadgeWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
