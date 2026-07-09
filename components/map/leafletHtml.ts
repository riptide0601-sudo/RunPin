import type { LatLng } from '@/types';

export function buildLeafletHtml(center: LatLng, zoom: number, dragging = true): string {
  // When dragging is disabled, the map is meant to always keep its center
  // pinned to the "me" position on screen. Anchoring zoom gestures to the
  // map's own center (instead of the pinch/tap point) keeps that true for
  // the whole zoom animation, not just after it ends.
  const zoomAnchor = dragging ? 'true' : "'center'";
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #F5F5F5; overflow: hidden; }
    .leaflet-control-attribution { font-size: 8px; opacity: 0.55; }
    .leaflet-control-zoom { display: none; }
    .me-marker-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .me-marker-dot {
      border-radius: 50%;
      animation: me-pulse 2s ease-in-out infinite;
    }
    @keyframes me-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.85; }
      100% { transform: scale(1); opacity: 1; }
    }
    .runner-dot-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .runner-dot {
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function hexToRgb(hex) {
      var h = hex.replace('#', '');
      if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
      var num = parseInt(h, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function rgbToHex(r, g, b) {
      return '#' + [r, g, b].map(function (v) {
        var s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
        return s.length === 1 ? '0' + s : s;
      }).join('');
    }

    function lighten(hex, amount) {
      var rgb = hexToRgb(hex);
      return rgbToHex(
        rgb.r + (255 - rgb.r) * amount,
        rgb.g + (255 - rgb.g) * amount,
        rgb.b + (255 - rgb.b) * amount
      );
    }

    // A radial highlight centered on the dot, fading evenly outward into
    // the marker's true color, reads as a subtle 3D bead at small dot sizes
    // without shifting the color the eye perceives at a glance. CSS
    // radial-gradient equivalent of the SVG version this replaced.
    function dotGradientCss(color) {
      return 'radial-gradient(circle at 50% 50%, ' + lighten(color, 0.12) + ' 0%, ' + color + ' 100%)';
    }

    // Runner dots used to be drawn with L.circleMarker (SVG). Leaflet's SVG
    // Renderer listens for the map's 'zoom' event — which fires on every
    // animation frame throughout a live pinch gesture, not just at its end —
    // and in response applies a live CSS transform to the whole shared SVG
    // container, visibly scaling every circleMarker's radius up/down for the
    // full duration of the pinch. L.Marker (used for "me" and now for runner
    // dots too, both as L.divIcon) only *repositions* its icon element on
    // 'zoom' — it never scale-transforms it — so a divIcon marker's on-screen
    // size stays fixed throughout the whole gesture instead of ballooning
    // with it. Both marker types are still driven by the SAME diameter curve
    // (rather than each having its own base size) so "me" and the runner
    // dots start out — and stay — the same size as each other.
    //
    // The base/min/max here intentionally match "me"'s original static size
    // (14px, before either marker type scaled with zoom) — a prior pass
    // unified the two marker types onto the runner dot's old, larger range
    // (16-26px) instead, which grew "me" rather than shrinking the runners.
    var MARKER_DIAMETER_MIN = 10;
    var MARKER_DIAMETER_MAX = 18;
    var MARKER_DIAMETER_BASE_ZOOM = 16;
    var MARKER_DIAMETER_BASE = 14;

    function diameterForZoom(zoom) {
      var raw = MARKER_DIAMETER_BASE + (zoom - MARKER_DIAMETER_BASE_ZOOM) * 1;
      var clamped = Math.min(MARKER_DIAMETER_MAX, Math.max(MARKER_DIAMETER_MIN, raw));
      return clamped;
    }

    var map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      dragging: ${dragging},
      touchZoom: ${zoomAnchor},
      doubleClickZoom: ${zoomAnchor},
      scrollWheelZoom: ${zoomAnchor},
    }).setView([${center.latitude}, ${center.longitude}], ${zoom});

    var keepCenterOnZoom = false;
    // Which marker id (if any) the zoom should be pivoted around. When unset,
    // zoom instead re-centers on fixedCenter (the fitBounds/explicit center),
    // same as before. Set to 'me' for screens where zooming should always
    // keep "my" position fixed on screen, independent of where the current
    // view happens to be centered.
    var zoomAnchorMarkerId = null;
    var fixedCenter = null;
    var applyingFitBounds = false;

    // "Run follow" mode (fitBounds + anchored on the 'me' marker, i.e. the
    // running screen) used to re-run map.fitBounds() on every single
    // __setMapData call, including the ones triggered by the zoom-level
    // change itself (zoomend -> notifyZoomChange -> RN state update ->
    // re-send data). That snapped any pinch-zoom the user just did straight
    // back to the fitBounds level, which read as "zoom is blocked". Track
    // whether the user has manually zoomed during this run and, once they
    // have, stop calling fitBounds altogether — only re-center on 'me' at
    // whatever zoom they left it at.
    var runFollowActive = false;
    var userZoomedInRun = false;

    map.on('zoomend', function () {
      if (runFollowActive) {
        if (!applyingFitBounds) {
          userZoomedInRun = true;
        }
      } else if (!applyingFitBounds && keepCenterOnZoom) {
        var anchor = (zoomAnchorMarkerId && markerPositions[zoomAnchorMarkerId]) || fixedCenter;
        if (anchor) map.setView(anchor, map.getZoom(), { animate: false });
      }
      var zoomDiameter = diameterForZoom(map.getZoom());
      Object.keys(markerLayers).forEach(function (id) {
        var layer = markerLayers[id];
        if (markerVariants[id] === 'me') {
          layer.setIcon(meIcon(meMarkerColor, zoomDiameter));
        } else {
          layer.setIcon(dotIcon(markerColors[id], zoomDiameter));
        }
      });
      notifyZoomChange(map.getZoom());
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    var routeLayer = null;
    var markerLayers = {};
    var markerVariants = {};
    var markerPositions = {};
    var markerColors = {};
    var meMarkerColor = null;

    function clearMarkers() {
      Object.keys(markerLayers).forEach(function (id) {
        map.removeLayer(markerLayers[id]);
      });
      markerLayers = {};
      markerVariants = {};
      markerPositions = {};
      markerColors = {};
    }

    function meIcon(color, diameter) {
      return L.divIcon({
        className: '',
        html:
          '<div class="me-marker-wrap" style="width:' + diameter + 'px;height:' + diameter + 'px;">' +
          '<div class="me-marker-dot" style="width:' + diameter + 'px;height:' + diameter + 'px;background:' + color + ';"></div>' +
          '</div>',
        iconSize: [diameter, diameter],
        iconAnchor: [diameter / 2, diameter / 2],
      });
    }

    function dotIcon(color, diameter) {
      return L.divIcon({
        className: '',
        html:
          '<div class="runner-dot-wrap" style="width:' + diameter + 'px;height:' + diameter + 'px;">' +
          '<div class="runner-dot" style="width:' + diameter + 'px;height:' + diameter + 'px;background:' + dotGradientCss(color) + ';"></div>' +
          '</div>',
        iconSize: [diameter, diameter],
        iconAnchor: [diameter / 2, diameter / 2],
      });
    }

    function notifyMarkerPress(id, point) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: id, point: point }));
      }
    }

    function notifyZoomChange(zoom) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'zoomChanged', zoom: zoom }));
      }
    }

    function notifyMapPress() {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress' }));
      }
    }

    map.on('click', function () {
      notifyMapPress();
    });

    // Leaflet caches the container size the first time it's measured and only
    // re-measures on a 'resize' event or an explicit invalidateSize() call.
    // The WebView's own DOM is the one true source of its rendered viewport,
    // so watch it directly instead of trusting any size RN reports about the
    // native view that hosts the WebView.
    var lastFitBounds = null; // { bounds, pad }

    function applyFitBounds(bounds, pad) {
      map.invalidateSize({ pan: false });
      applyingFitBounds = true;
      map.fitBounds(bounds, {
        paddingTopLeft: [pad.left || 32, pad.top || 32],
        paddingBottomRight: [pad.right || 32, pad.bottom || 32],
        animate: false,
      });
      applyingFitBounds = false;
      // Adopt the fitBounds result (padded, route+markers framed) as the
      // center to preserve on any later zoom, instead of the raw route center.
      var fitCenter = map.getCenter();
      fixedCenter = [fitCenter.lat, fitCenter.lng];
    }

    // Builds a bounding box centered exactly on the given center point
    // (rather than on the route's own centroid) but still large enough to
    // contain the given bounds. Used to fitBounds the run route while
    // keeping "me" pinned to the visual center of the screen at all times —
    // trivially satisfying "me is always within the middle third of the
    // screen" since it's dead-center.
    function symmetricBoundsAround(center, bounds) {
      var latDelta = Math.max(
        Math.abs(center.lat - bounds.getNorth()),
        Math.abs(center.lat - bounds.getSouth()),
        0.0001,
      );
      var lngDelta = Math.max(
        Math.abs(center.lng - bounds.getEast()),
        Math.abs(center.lng - bounds.getWest()),
        0.0001,
      );
      return L.latLngBounds(
        [center.lat - latDelta, center.lng - lngDelta],
        [center.lat + latDelta, center.lng + lngDelta],
      );
    }

    if (window.ResizeObserver) {
      var resizeObserver = new ResizeObserver(function () {
        if (lastFitBounds) {
          applyFitBounds(lastFitBounds.bounds, lastFitBounds.pad);
        } else {
          map.invalidateSize({ pan: false });
        }
      });
      resizeObserver.observe(document.getElementById('map'));
    }

    window.__setMapData = function (data) {
      keepCenterOnZoom = !!data.keepCenterOnZoom;
      zoomAnchorMarkerId = data.zoomAnchorMarkerId || null;
      // The running screen is uniquely identified by fitBounds + anchoring
      // zoom on 'me' — reuse that instead of adding a new prop.
      runFollowActive = !!data.fitBounds && zoomAnchorMarkerId === 'me';
      if (!runFollowActive) userZoomedInRun = false;

      if (data.center && !data.fitBounds) {
        fixedCenter = [data.center.latitude, data.center.longitude];
        map.setView(fixedCenter, data.zoom || map.getZoom());
      }

      if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
      }
      if (data.route && data.route.length > 1) {
        var latlngs = data.route.map(function (p) { return [p.latitude, p.longitude]; });
        routeLayer = L.polyline(latlngs, {
          color: data.routeColor || '#1A1A1A',
          weight: 4,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        if (data.fitBounds) {
          var bounds = routeLayer.getBounds();
          (data.markers || []).forEach(function (marker) {
            bounds.extend([marker.position.latitude, marker.position.longitude]);
          });
          var pad = data.fitBoundsPadding || {};
          var meMarkerData = runFollowActive
            ? (data.markers || []).find(function (m) { return m.variant === 'me'; })
            : null;

          if (meMarkerData) {
            var meLatLng = L.latLng(meMarkerData.position.latitude, meMarkerData.position.longitude);
            if (!userZoomedInRun) {
              // Auto mode: keep the whole route + me framed, centered on me
              // (not the route's centroid), re-zooming out as the route grows.
              var symmetric = symmetricBoundsAround(meLatLng, bounds);
              lastFitBounds = { bounds: symmetric, pad: pad };
              applyFitBounds(symmetric, pad);
            } else {
              // Manual mode: the user has pinch-zoomed — never touch zoom
              // again, just keep panning to follow 'me' at their chosen zoom.
              lastFitBounds = null;
              map.panTo(meLatLng, { animate: false });
            }
          } else {
            lastFitBounds = { bounds: bounds, pad: pad };
            applyFitBounds(bounds, pad);
          }
        } else {
          lastFitBounds = null;
        }
      }

      clearMarkers();
      var currentDiameter = diameterForZoom(map.getZoom());
      (data.markers || []).forEach(function (marker) {
        var layer;
        if (marker.variant === 'me') {
          meMarkerColor = marker.color;
          layer = L.marker([marker.position.latitude, marker.position.longitude], {
            icon: meIcon(marker.color, currentDiameter),
            interactive: false,
          });
        } else {
          layer = L.marker([marker.position.latitude, marker.position.longitude], {
            icon: dotIcon(marker.color, currentDiameter),
          });
          layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            var point = map.latLngToContainerPoint(layer.getLatLng());
            notifyMarkerPress(marker.id, { x: point.x, y: point.y });
          });
        }
        layer.addTo(map);
        markerLayers[marker.id] = layer;
        markerVariants[marker.id] = marker.variant;
        markerPositions[marker.id] = [marker.position.latitude, marker.position.longitude];
        markerColors[marker.id] = marker.color;
      });
    };
  </script>
</body>
</html>`;
}
