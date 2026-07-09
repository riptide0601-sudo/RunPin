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
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .me-marker-dot {
      width: 14px;
      height: 14px;
      border-radius: 7px;
      animation: me-pulse 2s ease-in-out infinite;
    }
    @keyframes me-pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.85; }
      100% { transform: scale(1); opacity: 1; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <svg width="0" height="0" style="position:absolute">
    <defs id="dotGradients"></defs>
  </svg>
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

    var dotGradientCache = {};

    // A radial highlight centered on the dot, fading evenly outward into
    // the marker's true color, reads as a subtle 3D bead at small dot sizes
    // without shifting the color the eye perceives at a glance.
    function dotGradientUrl(color) {
      if (dotGradientCache[color]) return dotGradientCache[color];
      var id = 'dot-grad-' + color.replace(/[^a-zA-Z0-9]/g, '');
      var defs = document.getElementById('dotGradients');
      var gradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
      gradient.setAttribute('id', id);
      gradient.setAttribute('cx', '50%');
      gradient.setAttribute('cy', '50%');
      gradient.setAttribute('r', '65%');
      var stopStart = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopStart.setAttribute('offset', '0%');
      stopStart.setAttribute('stop-color', lighten(color, 0.12));
      var stopEnd = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stopEnd.setAttribute('offset', '100%');
      stopEnd.setAttribute('stop-color', color);
      gradient.appendChild(stopStart);
      gradient.appendChild(stopEnd);
      defs.appendChild(gradient);
      var url = 'url(#' + id + ')';
      dotGradientCache[color] = url;
      return url;
    }

    // Runner dots are drawn with L.circleMarker (pixel radius, not
    // meter radius), so pinch-zoom never scales them geographically.
    // This clamp exists to make that guarantee explicit and keep the
    // on-screen size within a tight, deliberate range regardless of
    // zoom level rather than relying on the implicit default.
    var MARKER_RADIUS_MIN = 8;
    var MARKER_RADIUS_MAX = 13;
    var MARKER_RADIUS_BASE_ZOOM = 16;
    var MARKER_RADIUS_BASE = 10;

    function radiusForZoom(zoom) {
      var raw = MARKER_RADIUS_BASE + (zoom - MARKER_RADIUS_BASE_ZOOM) * 0.5;
      return Math.min(MARKER_RADIUS_MAX, Math.max(MARKER_RADIUS_MIN, raw));
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
    var fixedCenter = null;
    var applyingFitBounds = false;
    map.on('zoomend', function () {
      if (!applyingFitBounds && keepCenterOnZoom && fixedCenter) {
        map.setView(fixedCenter, map.getZoom(), { animate: false });
      }
      var zoomRadius = radiusForZoom(map.getZoom());
      Object.keys(markerLayers).forEach(function (id) {
        var layer = markerLayers[id];
        if (typeof layer.setRadius === 'function') {
          layer.setRadius(zoomRadius);
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

    function clearMarkers() {
      Object.keys(markerLayers).forEach(function (id) {
        map.removeLayer(markerLayers[id]);
      });
      markerLayers = {};
    }

    function meIcon(color) {
      return L.divIcon({
        className: '',
        html: '<div class="me-marker-wrap"><div class="me-marker-dot" style="background:' + color + ';"></div></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
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
          lastFitBounds = { bounds: bounds, pad: pad };
          applyFitBounds(bounds, pad);
        } else {
          lastFitBounds = null;
        }
      }

      clearMarkers();
      (data.markers || []).forEach(function (marker) {
        var layer;
        if (marker.variant === 'me') {
          layer = L.marker([marker.position.latitude, marker.position.longitude], {
            icon: meIcon(marker.color),
            interactive: false,
          });
        } else {
          layer = L.circleMarker([marker.position.latitude, marker.position.longitude], {
            radius: radiusForZoom(map.getZoom()),
            stroke: false,
            fillColor: dotGradientUrl(marker.color),
            fillOpacity: 1,
          });
          layer.on('click', function (e) {
            L.DomEvent.stopPropagation(e);
            var point = map.latLngToContainerPoint(layer.getLatLng());
            notifyMarkerPress(marker.id, { x: point.x, y: point.y });
          });
        }
        layer.addTo(map);
        markerLayers[marker.id] = layer;
      });
    };
  </script>
</body>
</html>`;
}
