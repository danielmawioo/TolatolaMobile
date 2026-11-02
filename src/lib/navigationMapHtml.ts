import type { NavigationPoint, NavigationTarget } from '@/src/schemas/navigation';

export interface NavigationMapMarker extends NavigationPoint {
  name: string;
  address?: string | null;
}

export interface NavigationMapState {
  route?: NavigationPoint[];
  driver?: (NavigationPoint & { heading?: number | null }) | null;
  pickup?: NavigationMapMarker | null;
  dropoff?: NavigationMapMarker | null;
  activeTarget?: NavigationTarget;
  productWithDriver?: boolean;
  follow?: boolean;
  recenter?: boolean;
  fit?: boolean;
}

export interface NavigationMapConfig extends NavigationMapState {
  accessToken?: string | null;
  styleUrl: string;
}

/**
 * Renders the in-app navigation map inside a WebView.
 *
 * With a Mapbox public token this is Mapbox GL JS (navigation-day style,
 * pitched camera, route casing + turn geometry). Without one it falls back to
 * Leaflet + OpenStreetMap so local development and a token-less build still
 * get a usable, in-app route instead of an error or an external Google Maps
 * hand-off.
 *
 * The page exposes `window.__tolaSetState(partialState)` so React Native can
 * stream GPS updates without rebuilding the WebView.
 */
export function buildNavigationMapHtml(config: NavigationMapConfig): string {
  const safeConfig = JSON.stringify(config).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>TOLA Navigation</title>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #e8eef5; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .mapboxgl-ctrl-attrib, .leaflet-control-attribution {
      font-size: 9px; background: rgba(255,255,255,0.7); border-radius: 4px;
    }
    .tola-marker { background: transparent; border: none; }
    .pin {
      position: relative; display: flex; flex-direction: column; align-items: center;
      transform: translateY(-4px); filter: drop-shadow(0 3px 6px rgba(15,23,42,0.28));
    }
    .pin-disc {
      width: 36px; height: 36px; border-radius: 18px; border: 3px solid #fff;
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .pin-stem {
      width: 3px; height: 9px; border-radius: 2px; margin-top: -1px;
    }
    .pin-pickup .pin-disc, .pin-pickup .pin-stem { background: #0284c7; }
    .pin-dropoff .pin-disc, .pin-dropoff .pin-stem { background: #7c3aed; }
    .pin-label {
      margin-top: 3px; max-width: 130px; padding: 3px 7px; border-radius: 7px;
      background: rgba(15,23,42,0.86); color: #fff; font-size: 10px; font-weight: 700;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .driver-marker { background: transparent; border: none; }
    .driver-disc {
      width: 42px; height: 42px; border-radius: 21px; background: #1a56db;
      border: 3px solid #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(15,23,42,0.35);
    }
    .driver-arrow {
      width: 20px; height: 20px; transition: transform 240ms linear;
      transform: rotate(0deg); transform-origin: 50% 50%;
    }
    .driver-package {
      position: absolute; right: -5px; top: -5px; width: 17px; height: 17px;
      border-radius: 9px; background: #16a34a; border: 2px solid #fff;
      display: flex; align-items: center; justify-content: center;
    }
    #error-overlay {
      position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
      padding: 28px; background: #f8fafc; z-index: 50; text-align: center;
    }
    #error-overlay.visible { display: flex; }
    #error-overlay .box { max-width: 300px; }
    #error-overlay h2 { font-size: 16px; color: #0f172a; margin: 0 0 8px; }
    #error-overlay p { font-size: 12px; line-height: 18px; color: #64748b; margin: 0; }
    .tola-route-casing { filter: drop-shadow(0 1px 2px rgba(15,23,42,0.25)); }
  </style>
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.9.0/mapbox-gl.js"></script>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
</head>
<body>
  <div id="map"></div>
  <div id="error-overlay">
    <div class="box">
      <h2>Map unavailable</h2>
      <p id="error-message">The map could not start. Check your connection and try again.</p>
    </div>
  </div>
  <script>
    (function () {
      var CONFIG = ${safeConfig};
      var state = {
        route: CONFIG.route || [],
        driver: CONFIG.driver || null,
        pickup: CONFIG.pickup || null,
        dropoff: CONFIG.dropoff || null,
        activeTarget: CONFIG.activeTarget || 'pickup',
        productWithDriver: !!CONFIG.productWithDriver,
        follow: CONFIG.follow !== false
      };
      var map = null;
      var mode = null;
      var routeSource = null;
      var routeLayersReady = false;
      var markers = {};
      var driverMarker = null;
      var driverElement = null;
      var leafletRoute = null;
      var leafletCasing = null;
      var styleLoaded = false;
      var fatalSent = false;
      var startupTimer = null;

      function post(type, payload) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
          } else if (window.parent && window.parent !== window) {
            window.parent.postMessage({ source: 'tola-navigation', type: type, payload: payload }, '*');
          }
        } catch (e) {}
      }

      function escapeHtml(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function showError(message) {
        var overlay = document.getElementById('error-overlay');
        var text = document.getElementById('error-message');
        if (text) text.textContent = message || 'The map could not start.';
        if (overlay) overlay.className = 'visible';
      }

      function fatal(message) {
        if (!fatalSent) {
          fatalSent = true;
          post('fatalError', message || 'Map failed to start');
        }
        showError(message);
      }

      function coordinates() {
        return (state.route || []).map(function (p) { return [Number(p.longitude), Number(p.latitude)]; });
      }

      function routeColor() {
        return state.activeTarget === 'dropoff' ? '#7c3aed' : '#0284c7';
      }

      function markerHtml(kind, label) {
        var icon = kind === 'pickup'
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>';
        return '<div class="pin pin-' + kind + '">' +
          '<div class="pin-disc">' + icon + '</div>' +
          '<div class="pin-stem"></div>' +
          '<div class="pin-label">' + escapeHtml(label || (kind === 'pickup' ? 'Pickup' : 'Drop-off')) + '</div>' +
        '</div>';
      }

      function driverHtml() {
        var packageBadge = state.productWithDriver
          ? '<div class="driver-package"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/></svg></div>'
          : '';
        return '<div class="driver-disc">' +
          '<svg class="driver-arrow" viewBox="0 0 24 24" fill="#fff"><path d="M12 2 4.5 21l7.5-3 7.5 3z"/></svg>' +
          packageBadge +
        '</div>';
      }

      function applyDriverRotation() {
        if (!state.driver || !driverElement) return;
        var heading = Number(state.driver.heading || 0);
        var arrow = driverElement.querySelector('.driver-arrow');
        if (!arrow) return;
        var rotation = heading;
        if (mode === 'mapbox' && map && state.follow) {
          rotation = heading - map.getBearing();
        }
        arrow.style.transform = 'rotate(' + rotation + 'deg)';
      }

      function applyMarker(kind, point) {
        if (!point || !Number.isFinite(Number(point.latitude)) || !Number.isFinite(Number(point.longitude))) {
          if (markers[kind]) {
            if (mode === 'mapbox') markers[kind].remove();
            if (mode === 'leaflet' && map) map.removeLayer(markers[kind]);
            delete markers[kind];
          }
          return;
        }

        var label = point.name || (kind === 'pickup' ? 'Pickup' : 'Drop-off');
        if (mode === 'mapbox') {
          if (!markers[kind]) {
            var element = document.createElement('div');
            element.className = 'tola-marker';
            element.innerHTML = markerHtml(kind, label);
            markers[kind] = new mapboxgl.Marker({ element: element, anchor: 'bottom' })
              .setLngLat([Number(point.longitude), Number(point.latitude)])
              .addTo(map);
          } else {
            markers[kind].setLngLat([Number(point.longitude), Number(point.latitude)]);
            var el = markers[kind].getElement();
            if (el) el.innerHTML = markerHtml(kind, label);
          }
        } else if (mode === 'leaflet' && map) {
          if (!markers[kind]) {
            markers[kind] = L.marker([Number(point.latitude), Number(point.longitude)], {
              icon: L.divIcon({
                className: 'tola-marker',
                html: markerHtml(kind, label),
                iconSize: [130, 62],
                iconAnchor: [65, 58]
              }),
              keyboard: false
            }).addTo(map);
          } else {
            markers[kind].setLatLng([Number(point.latitude), Number(point.longitude)]);
            var markerEl = markers[kind].getElement();
            if (markerEl) {
              var iconEl = markerEl.querySelector('.pin');
              if (iconEl) iconEl.outerHTML = markerHtml(kind, label);
            }
          }
        }
      }

      function applyDriver() {
        if (!state.driver) {
          if (mode === 'mapbox' && driverMarker) driverMarker.remove();
          if (mode === 'leaflet' && driverMarker && map) map.removeLayer(driverMarker);
          driverMarker = null;
          driverElement = null;
          return;
        }

        var lat = Number(state.driver.latitude);
        var lng = Number(state.driver.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        if (mode === 'mapbox') {
          if (!driverMarker) {
            driverElement = document.createElement('div');
            driverElement.className = 'driver-marker';
            driverElement.innerHTML = driverHtml();
            driverMarker = new mapboxgl.Marker({
              element: driverElement,
              anchor: 'center',
              rotationAlignment: 'viewport'
            }).setLngLat([lng, lat]).addTo(map);
          } else {
            driverMarker.setLngLat([lng, lat]);
          }
          applyDriverRotation();
        } else if (mode === 'leaflet' && map) {
          if (!driverMarker) {
            driverMarker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'driver-marker',
                html: driverHtml(),
                iconSize: [42, 42],
                iconAnchor: [21, 21]
              }),
              zIndexOffset: 1000,
              keyboard: false
            }).addTo(map);
          } else {
            driverMarker.setLatLng([lat, lng]);
          }
          driverElement = driverMarker.getElement();
          var leafletIcon = driverElement ? driverElement.querySelector('.driver-disc') : null;
          if (leafletIcon && state.productWithDriver && !leafletIcon.querySelector('.driver-package')) {
            leafletIcon.insertAdjacentHTML('beforeend', '<div class="driver-package"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/></svg></div>');
          }
          applyDriverRotation();
        }
      }

      function applyRoute() {
        var coords = coordinates();
        if (mode === 'mapbox') {
          if (!routeSource) return;
          routeSource.setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords }
          });
          if (routeLayersReady) {
            map.setPaintProperty('tola-route-casing', 'line-color', routeColor());
            map.setPaintProperty('tola-route-line', 'line-color', routeColor());
          }
        } else if (mode === 'leaflet' && map) {
          if (leafletCasing) map.removeLayer(leafletCasing);
          if (leafletRoute) map.removeLayer(leafletRoute);
          var latLngs = coords.map(function (c) { return [c[1], c[0]]; });
          leafletCasing = L.polyline(latLngs, { color: '#0f172a', weight: 10, opacity: 0.28, lineJoin: 'round', lineCap: 'round' }).addTo(map);
          leafletRoute = L.polyline(latLngs, { color: routeColor(), weight: 6, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }).addTo(map);
        }
      }

      function fitRoute() {
        var coords = state.route || [];
        if (coords.length < 2) {
          if (state.driver && map) {
            if (mode === 'mapbox') map.easeTo({ center: [state.driver.longitude, state.driver.latitude], zoom: 15, duration: 500 });
            else map.setView([state.driver.latitude, state.driver.longitude], 15, { animate: true });
          }
          return;
        }

        if (mode === 'mapbox') {
          var bounds = new mapboxgl.LngLatBounds();
          coords.forEach(function (point) { bounds.extend([point.longitude, point.latitude]); });
          if (state.driver) bounds.extend([state.driver.longitude, state.driver.latitude]);
          map.fitBounds(bounds, {
            padding: { top: 150, right: 52, bottom: 330, left: 52 },
            duration: 700,
            maxZoom: 16
          });
        } else if (mode === 'leaflet' && map) {
          var latLngs = coords.map(function (p) { return [p.latitude, p.longitude]; });
          if (state.driver) latLngs.push([state.driver.latitude, state.driver.longitude]);
          map.fitBounds(L.latLngBounds(latLngs), { paddingTopLeft: [42, 150], paddingBottomRight: [42, 330], maxZoom: 16 });
        }
        state.follow = false;
        post('followChanged', false);
      }

      function recenter() {
        if (!state.driver || !map) {
          fitRoute();
          return;
        }
        state.follow = true;
        if (mode === 'mapbox') {
          map.easeTo({
            center: [state.driver.longitude, state.driver.latitude],
            bearing: Number(state.driver.heading || 0),
            pitch: 50,
            zoom: 16.5,
            duration: 800
          });
        } else {
          map.setView([state.driver.latitude, state.driver.longitude], 16, { animate: true });
        }
        post('followChanged', true);
      }

      function followDriver() {
        if (!state.follow || !state.driver || !map) return;
        if (mode === 'mapbox') {
          map.easeTo({
            center: [state.driver.longitude, state.driver.latitude],
            bearing: Number(state.driver.heading || 0),
            pitch: 50,
            zoom: 16.5,
            duration: 900
          });
        } else {
          map.panTo([state.driver.latitude, state.driver.longitude], { animate: true, duration: 0.9 });
        }
      }

      function applyState(patch) {
        var previousRouteLength = (state.route || []).length;
        if (patch.route !== undefined) state.route = patch.route || [];
        if (patch.driver !== undefined) state.driver = patch.driver || null;
        if (patch.pickup !== undefined) state.pickup = patch.pickup || null;
        if (patch.dropoff !== undefined) state.dropoff = patch.dropoff || null;
        if (patch.activeTarget !== undefined) state.activeTarget = patch.activeTarget;
        if (patch.productWithDriver !== undefined) state.productWithDriver = !!patch.productWithDriver;
        if (patch.follow !== undefined) state.follow = !!patch.follow;

        applyRoute();
        applyMarker('pickup', state.pickup);
        applyMarker('dropoff', state.dropoff);
        applyDriver();

        if (patch.fit) {
          fitRoute();
        } else if (patch.recenter) {
          recenter();
        } else if (patch.follow === true) {
          followDriver();
        } else if (previousRouteLength === 0 && state.route.length > 1) {
          fitRoute();
        }
      }

      window.__tolaSetState = function (patch) {
        try { applyState(patch || {}); } catch (e) {}
      };

      function initMapbox() {
        if (!window.mapboxgl) {
          fatal('The Mapbox library could not be loaded. Check your connection.');
          return;
        }
        try {
          mapboxgl.accessToken = CONFIG.accessToken;
          mode = 'mapbox';
          map = new mapboxgl.Map({
            container: 'map',
            style: CONFIG.styleUrl || 'mapbox://styles/mapbox/navigation-day-v1',
            center: state.driver
              ? [state.driver.longitude, state.driver.latitude]
              : state.pickup
                ? [state.pickup.longitude, state.pickup.latitude]
                : [39.2083, -6.7924],
            zoom: 14,
            pitch: 0,
            attributionControl: false,
            logoPosition: 'bottom-left'
          });

          map.on('style.load', function () {
            styleLoaded = true;
            if (startupTimer) clearTimeout(startupTimer);
            map.addSource('tola-route', {
              type: 'geojson',
              data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            });
            map.addLayer({
              id: 'tola-route-casing',
              type: 'line',
              source: 'tola-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': routeColor(), 'line-width': 11, 'line-opacity': 0.32 }
            });
            map.addLayer({
              id: 'tola-route-line',
              type: 'line',
              source: 'tola-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: { 'line-color': routeColor(), 'line-width': 6, 'line-opacity': 0.96 }
            });
            routeSource = map.getSource('tola-route');
            routeLayersReady = true;
            applyState({});
            fitRoute();
            post('ready', { mode: 'mapbox' });
          });

          map.on('dragstart', function () {
            state.follow = false;
            post('followChanged', false);
          });

          map.on('error', function (event) {
            var message = event && event.error ? String(event.error.message || event.error) : 'Map error';
            if (!styleLoaded) {
              fatal(message);
            }
          });

          startupTimer = setTimeout(function () {
            if (!styleLoaded) {
              fatal('The map style did not load. Check your Mapbox token and connection.');
            }
          }, 12000);
        } catch (e) {
          fatal(e && e.message ? e.message : 'The map could not start.');
        }
      }

      function initLeaflet() {
        if (!window.L) {
          fatal('The map library could not be loaded. Check your connection.');
          return;
        }
        try {
          mode = 'leaflet';
          map = L.map('map', { zoomControl: false, attributionControl: true }).setView(
            state.driver
              ? [state.driver.latitude, state.driver.longitude]
              : state.pickup
                ? [state.pickup.latitude, state.pickup.longitude]
                : [-6.7924, 39.2083],
            14
          );
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          applyState({});
          fitRoute();
          post('ready', { mode: 'leaflet' });
        } catch (e) {
          fatal(e && e.message ? e.message : 'The map could not start.');
        }
      }

      window.__tolaHandleMessage = function (event) {
        try {
          var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'state') window.__tolaSetState(data.payload || {});
        } catch (e) {}
      };

      window.addEventListener('message', window.__tolaHandleMessage);

      window.addEventListener('load', function () {
        if (CONFIG.accessToken) initMapbox();
        else initLeaflet();
      });

      window.addEventListener('error', function (event) {
        if (!styleLoaded) {
          var message = event && event.message ? event.message : 'Navigation map error';
          fatal(message);
        }
      });
    })();
  </script>
</body>
</html>`;
}
