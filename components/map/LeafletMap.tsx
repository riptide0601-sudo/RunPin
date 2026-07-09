import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import WebView from 'react-native-webview';

import { buildLeafletHtml } from '@/components/map/leafletHtml';
import { colors } from '@/constants/colors';
import type { LatLng } from '@/types';

export type MapMarkerVariant = 'me' | 'runner' | 'match';

export interface MapMarker {
  id: string;
  position: LatLng;
  variant: MapMarkerVariant;
}

interface LeafletMapProps {
  center: LatLng;
  zoom?: number;
  route?: LatLng[];
  routeColor?: string;
  markers?: MapMarker[];
  fitBounds?: boolean;
  fitBoundsPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  onMarkerPress?: (id: string, point: { x: number; y: number }) => void;
  onMapPress?: () => void;
  style?: ViewStyle;
  height?: number;
  children?: ReactNode;
  dragging?: boolean;
  keepCenterOnZoom?: boolean;
  zoomAnchorMarkerId?: string;
  onZoomChange?: (zoom: number) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const VARIANT_COLORS: Record<MapMarkerVariant, string> = {
  me: colors.accentMe,
  runner: colors.textMuted,
  match: colors.accentMatch,
};

export function LeafletMap({
  center,
  zoom = 15,
  route,
  routeColor = colors.ink,
  markers = [],
  fitBounds = false,
  fitBoundsPadding,
  onMarkerPress,
  onMapPress,
  style,
  height,
  children,
  dragging = true,
  keepCenterOnZoom = false,
  zoomAnchorMarkerId,
  onZoomChange,
  onLayout,
}: LeafletMapProps) {
  const webviewRef = useRef<WebView>(null);
  const initialHtml = useRef(buildLeafletHtml(center, zoom, dragging)).current;

  const payload = useMemo(
    () => ({
      center,
      zoom,
      route,
      routeColor,
      fitBounds,
      fitBoundsPadding,
      keepCenterOnZoom,
      zoomAnchorMarkerId,
      markers: markers.map((marker) => ({
        id: marker.id,
        position: marker.position,
        variant: marker.variant,
        color: VARIANT_COLORS[marker.variant],
      })),
    }),
    [center, zoom, route, routeColor, fitBounds, fitBoundsPadding, keepCenterOnZoom, zoomAnchorMarkerId, markers],
  );

  const sendData = useCallback(() => {
    webviewRef.current?.injectJavaScript(`window.__setMapData(${JSON.stringify(payload)}); true;`);
  }, [payload]);

  useEffect(() => {
    sendData();
  }, [sendData]);

  return (
    <View style={[styles.container, height ? { height } : styles.fill, style]} onLayout={onLayout}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: initialHtml }}
        style={styles.webview}
        onLoadEnd={sendData}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'markerPress') {
              onMarkerPress?.(message.id, message.point);
            } else if (message.type === 'zoomChanged') {
              onZoomChange?.(message.zoom);
            } else if (message.type === 'mapPress') {
              onMapPress?.();
            }
          } catch {
            // ignore malformed messages
          }
        }}
        scrollEnabled={false}
        bounces={false}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
