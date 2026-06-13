import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useImperativeHandle } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";

const osmStopsGeoJSON = require('../osrm routes/allStops.json');

const MapContext = createContext<{
  registerItem: (id: string, type: "marker" | "polyline", data: any) => void;
  unregisterItem: (id: string) => void;
} | null>(null);

/**
 * Enhanced Web MapView with robust Mapbox GL JS initialization.
 */
const MapView = React.forwardRef((props: any, ref: any) => {
  const { initialRegion, initialCamera, style, children, pitch, heading } = props;
  const { isDark, colors } = useTheme();
  const [items, setItems] = useState<Record<string, { type: string; data: any }>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Safety fallbacks for coordinates
  const lat = initialCamera?.center?.latitude || initialRegion?.latitude || 5.6037;
  const lng = initialCamera?.center?.longitude || initialRegion?.longitude || -0.1870;
  const initZoom = initialCamera?.zoom || 13;
  const initTilt = initialCamera?.pitch || pitch || 0;
  const initHeading = initialCamera?.heading || heading || 0;

  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any, duration: number = 1000) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'ANIMATE_TO_REGION',
        region,
        duration
      }, '*');
    },
    fitToCoordinates: (coordinates: any[], options?: any) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'FIT_TO_COORDINATES',
        coordinates,
        options
      }, '*');
    },
    animateCamera: (camera: any, options?: { duration?: number }) => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'ANIMATE_CAMERA',
        camera,
        duration: options?.duration || 1000
      }, '*');
    }
  }));

  const itemsRef = useRef<Record<string, { type: string; data: any }>>({});
  const syncScheduled = useRef<boolean>(false);

  const syncToState = React.useCallback(() => {
    setItems({ ...itemsRef.current });
    syncScheduled.current = false;
  }, []);

  const registerItem = React.useCallback((id: string, type: "marker" | "polyline", data: any) => {
    itemsRef.current[id] = { type, data };
    if (!syncScheduled.current) {
      syncScheduled.current = true;
      requestAnimationFrame(syncToState);
    }
  }, [syncToState]);

  const unregisterItem = React.useCallback((id: string) => {
    if (!itemsRef.current[id]) return;
    delete itemsRef.current[id];
    if (!syncScheduled.current) {
      syncScheduled.current = true;
      requestAnimationFrame(syncToState);
    }
  }, [syncToState]);

  const contextValue = useMemo(() => ({ registerItem, unregisterItem }), [registerItem, unregisterItem]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const markers = Object.values(items).filter(i => i.type === 'marker').map(i => i.data);
      const polylines = Object.values(items).filter(i => i.type === 'polyline').map(i => i.data);

      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_DATA',
        markers,
        polylines,
        isDark
      }, '*');
    }
  }, [items, isDark]);

  const initialParamsRef = useRef({
    lat,
    lng,
    zoom: initZoom,
    pitch: initTilt,
    heading: initHeading,
    isDark
  });

  const srcDoc = useMemo(() => {
    const apiKey = process.env.EXPO_PUBLIC_MAPBOX_KEY || "";
    const cfg = initialParamsRef.current;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
        <link rel="preconnect" href="https://api.mapbox.com" crossorigin />
        <link rel="preconnect" href="https://events.mapbox.com" crossorigin />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://events.mapbox.com" />
        <style>
          html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: ${cfg.isDark ? '#111827' : '#ffffff'}; }
          #map { height: 100%; width: 100%; }
          .marker-label {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 4px;
            background-color: ${cfg.isDark ? '#1e293b' : '#ffffff'};
            color: ${cfg.isDark ? '#f8fafc' : '#0f172a'};
            padding: 2px 6px;
            border-radius: 6px;
            font-size: 11px;
            font-family: system-ui, -apple-system, sans-serif;
            font-weight: 700;
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            border: 1px solid ${cfg.isDark ? '#334155' : '#e2e8f0'};
            z-index: 10;
            pointer-events: none;
          }
          .marker-origin { width: 22px; height: 22px; background-color: #10b981; border: 4.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.3); position: relative; }
          .marker-dest { width: 22px; height: 22px; background-color: #ef4444; border: 4.5px solid white; border-radius: 6px; box-shadow: 0 0 10px rgba(0,0,0,0.3); position: relative; }
          .marker-dest-inner { display: none; }
          .marker-transfer { width: 19px; height: 19px; background-color: var(--color); border: 4px solid white; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.2); position: relative; }
          .marker-hub { width: 12px; height: 12px; background-color: var(--color); border: 2.5px solid white; border-radius: 50%; box-shadow: 0 1.5px 5px rgba(0,0,0,0.15); }
          .marker-stop { width: 10px; height: 10px; background-color: white; border: 3px solid var(--color); border-radius: 50%; }
          .marker-user {
            width: 16px;
            height: 16px;
            background-color: #3b82f6;
            border: 2.5px solid white;
            border-radius: 50%;
            box-shadow: 0 0 6px rgba(0,0,0,0.3);
            position: relative;
          }
          .marker-user::after {
            content: '';
            position: absolute;
            top: -2.5px;
            left: -2.5px;
            width: 16px;
            height: 16px;
            border: 2.5px solid #3b82f6;
            border-radius: 50%;
            animation: user-pulse 2s infinite ease-out;
            opacity: 0;
            box-sizing: content-box;
          }
          .marker-user-heading {
            position: absolute;
            top: -15px;
            left: -15px;
            width: 46px;
            height: 46px;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.1s linear;
          }
          .marker-user-cone {
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 22px solid rgba(59, 130, 246, 0.4);
            filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
            transform: translateY(-11px);
          }
          @keyframes user-pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(3); opacity: 0; }
          }
          .mapboxgl-marker:has(.marker-user) { z-index: 100 !important; }
          .mapboxgl-marker:has(.marker-dest) { z-index: 80 !important; }
          .mapboxgl-marker:has(.marker-origin) { z-index: 50 !important; }
          .mapboxgl-marker:has(.marker-transfer) { z-index: 30 !important; }
          .mapboxgl-marker:has(.marker-hub) { z-index: 20 !important; }
          .mapboxgl-marker:has(.marker-stop) { z-index: 10 !important; }
        </style>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet">
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // --- SILENCE MAPBOX TELEMETRY ERRORS ---
          // Prevent adblockers/brave from throwing red ERR_ADDRESS_INVALID console errors
          const originalXhrOpen = XMLHttpRequest.prototype.open;
          XMLHttpRequest.prototype.open = function(method, url) {
             if (typeof url === 'string' && url.includes('events.mapbox.com')) {
                this.isBlockedTelemetry = true;
             }
             return originalXhrOpen.apply(this, arguments);
          };
          const originalXhrSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function() {
             if (this.isBlockedTelemetry) {
                Object.defineProperty(this, 'readyState', { value: 4 });
                Object.defineProperty(this, 'status', { value: 200 });
                Object.defineProperty(this, 'responseText', { value: '{}' });
                if (this.onreadystatechange) this.onreadystatechange();
                if (this.onload) this.onload();
                return;
             }
             return originalXhrSend.apply(this, arguments);
          };
          const originalFetch = window.fetch;
          window.fetch = function() {
             if (typeof arguments[0] === 'string' && arguments[0].includes('events.mapbox.com')) {
                 return Promise.resolve(new Response('{}', { status: 200, headers: new Headers({'Content-Type': 'application/json'}) }));
             }
             return originalFetch.apply(this, arguments);
          };
          // -----------------------------------------

          mapboxgl.accessToken = '${apiKey}';
          let map;
          let mbMarkers = {};
          let mbPolylines = new Set();
          let isMapLoaded = false;
          let messageQueue = [];

          let lastOsmStops = null;
          let lastHubsData = null;
          let lastPolylines = [];

          // Real-time direct device orientation listener inside iframe - throttled to 10Hz and 3 degrees to save major CPU usage!
          let displayHeading = 0;
          let lastHeadingTime = 0;
          function handleDirectOrientation(event) {
            let targetHeading = null;
            if (event.webkitCompassHeading !== undefined) {
              targetHeading = event.webkitCompassHeading;
            } else if (event.alpha !== null) {
              targetHeading = 360 - event.alpha;
            }
            if (targetHeading !== null) {
              const now = Date.now();
              if (now - lastHeadingTime > 100) {
                let diff = targetHeading - (displayHeading % 360);
                if (diff > 180) diff -= 360;
                else if (diff < -180) diff += 360;
                
                if (Math.abs(diff) >= 2) {
                  displayHeading += diff;
                  lastHeadingTime = now;
                  const headingElements = document.querySelectorAll('.marker-user-heading');
                  headingElements.forEach(el => {
                    el.style.transform = 'rotate(' + displayHeading + 'deg)';
                    el.style.display = 'flex';
                  });
                }
              }
            }
          }
          window.addEventListener('deviceorientationabsolute', handleDirectOrientation, true);
          window.addEventListener('deviceorientation', handleDirectOrientation, true);
          
          function applyOsmStops(data) {
            lastOsmStops = data;
            if (!map || !isMapLoaded) return;
            const sourceId = 'osm-stops-source';
            const layerId = 'osm-stops-layer';
            const { geojson, primaryColor } = data;

            try {
              if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData(geojson);
              } else {
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: geojson,
                });
                map.addLayer({
                  id: layerId,
                  type: 'circle',
                  source: sourceId,
                  paint: {
                    'circle-color': primaryColor || '#3b82f6',
                    'circle-radius': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      5, 3,
                      10, 4,
                      14, 6,
                      16, 8
                    ],
                    'circle-opacity': [
                      'interpolate',
                      ['linear'],
                      ['zoom'],
                      5, 0.6,
                      12, 0.8,
                      14, 1
                    ],
                    'circle-stroke-width': 1.5,
                    'circle-stroke-color': '#ffffff',
                    'circle-stroke-opacity': 1
                  }
                }); 
              }
            } catch (e) {
              console.warn("Error applying OSM stops:", e);
            }
          }

          function applyHubs(data) {
            lastHubsData = data;
            if (!map || !isMapLoaded) return;
            const sourceId = 'hubs-source';
            const layerIdOuter = 'hubs-layer-outer';
            const layerIdInner = 'hubs-layer-inner';
            const { hubs, visible, primaryColor } = data;

            const geojson = {
              type: 'FeatureCollection',
              features: hubs.map((h, idx) => ({
                type: 'Feature',
                id: idx,
                properties: { name: h.name, hubIndex: idx },
                geometry: {
                  type: 'Point',
                  coordinates: [h.coordinate.longitude, h.coordinate.latitude]
                }
              }))
            };

            try {
              if (map.getSource(sourceId)) {
                map.getSource(sourceId).setData(geojson);
              } else {
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: geojson,
                  promoteId: 'hubIndex'
                });

                map.addLayer({
                  id: layerIdOuter,
                  type: 'circle',
                  source: sourceId,
                  paint: {
                    'circle-color': '#ffffff',
                    'circle-radius': 6,
                    'circle-stroke-color': primaryColor || '#3b82f6',
                    'circle-stroke-width': 2.5
                  }
                });

                map.addLayer({
                  id: layerIdInner,
                  type: 'circle',
                  source: sourceId,
                  paint: {
                    'circle-color': primaryColor || '#3b82f6',
                    'circle-radius': 2
                  }
                });

                map.on('click', layerIdOuter, (e) => {
                  if (e.features && e.features.length > 0) {
                    const hubIndex = e.features[0].id;
                    window.parent.postMessage({
                      type: 'HUB_PRESSED',
                      hubIndex: hubIndex
                    }, '*');
                  }
                });

                map.on('mouseenter', layerIdOuter, () => {
                  map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', layerIdOuter, () => {
                  map.getCanvas().style.cursor = '';
                });
              }

              const visibility = visible ? 'visible' : 'none';
              map.setLayoutProperty(layerIdOuter, 'visibility', visibility);
              map.setLayoutProperty(layerIdInner, 'visibility', visibility);
            } catch (e) {
              console.warn("Error applying hubs:", e);
            }
          }

          function applyPolylines(polylinesList) {
            lastPolylines = polylinesList;
            if (!map || !isMapLoaded) return;

            const currentPolylineIds = new Set(polylinesList.map(p => p.id));
            
            mbPolylines.forEach(id => {
              if (!currentPolylineIds.has(id)) {
                try {
                  if (map.getLayer(id)) map.removeLayer(id);
                  if (map.getSource(id)) map.removeSource(id);
                } catch(e) {}
                mbPolylines.delete(id);
              }
            });

            polylinesList.forEach(p => {
               const layerId = p.id;
               
               if (!p.points || p.points.length < 2) {
                  try {
                    if (map.getLayer(layerId)) map.removeLayer(layerId);
                    if (map.getSource(layerId)) map.removeSource(layerId);
                  } catch(e) {}
                  mbPolylines.delete(layerId);
                  return;
               }

               const geojson = {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                     type: 'LineString',
                     coordinates: p.points.map(pt => [pt[1], pt[0]])
                  }
               };
               
               try {
                 if (!map.getSource(layerId)) {
                    map.addSource(layerId, { type: 'geojson', data: geojson });
                    
                    const layout = {
                       'line-join': 'round',
                       'line-cap': 'round'
                    };
                    
                    const paint = {
                       'line-color': p.color || '#3b82f6',
                       'line-width': p.weight || 3
                    };
                    
                    if (p.dash) {
                       paint['line-dasharray'] = [0, 2]; 
                    }
                    
                    map.addLayer({
                       id: layerId,
                       type: 'line',
                       source: layerId,
                       layout: layout,
                       paint: paint
                    });
                    mbPolylines.add(layerId);
                 } else {
                    map.getSource(layerId).setData(geojson);
                    map.setPaintProperty(layerId, 'line-color', p.color || '#3b82f6');
                    map.setPaintProperty(layerId, 'line-width', p.weight || 3);
                 }
               } catch (e) {
                 console.warn("Error applying polyline " + layerId + ":", e);
               }
            });
          }
          
          function initMap() {
            try {
              // High performance 2D vector style to prevent phone heating & save CPU/GPU!
              const targetStyle = ${cfg.isDark} ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
              map = new mapboxgl.Map({
                container: 'map',
                style: targetStyle,
                center: [${cfg.lng}, ${cfg.lat}],
                zoom: ${cfg.zoom},
                pitch: ${cfg.pitch},
                bearing: ${cfg.heading}
              });

              // Native Mapbox Zoom controls removed (we use custom unified controls)

              // Disable heavy elements
              map.dragRotate.disable();
              map.touchZoomRotate.disableRotation();

              map.on('load', () => {
                isMapLoaded = true;
                processQueue();
              });

              map.on('rotate', () => {
                window.parent.postMessage({
                  type: 'MAP_ROTATE',
                  bearing: map.getBearing()
                }, '*');
              });
              map.on('dragstart', () => {
                window.parent.postMessage({ type: 'MAP_GESTURE' }, '*');
              });
              map.on('zoomstart', (e) => {
                if (e.originalEvent) {
                  window.parent.postMessage({ type: 'MAP_GESTURE' }, '*');
                }
              });
              map.on('pitchstart', (e) => {
                if (e.originalEvent) {
                  window.parent.postMessage({ type: 'MAP_GESTURE' }, '*');
                }
              });

              map.on('click', (e) => {
                window.parent.postMessage({
                  type: 'MAP_CLICK',
                  coordinate: {
                    latitude: e.lngLat.lat,
                    longitude: e.lngLat.lng
                  }
                }, '*');
              });

              map.on('style.load', () => {
                // Re-apply sources and layers when style changes (e.g. dark/light toggle)
                if (lastOsmStops) applyOsmStops(lastOsmStops);
                if (lastHubsData) applyHubs(lastHubsData);
                if (lastPolylines.length > 0) applyPolylines(lastPolylines);
              });
            } catch (e) {
              console.error("Mapbox initialization error:", e);
            }
          }

          function processQueue() {
            while (messageQueue.length > 0) {
              const data = messageQueue.shift();
              handleMessage(data);
            }
          }

          function handleMessage(data) {
            if (data.type === 'DESTROY') {
              if (map) {
                map.remove();
                map = null;
              }
              return;
            }

            if (!map || !isMapLoaded) return;

            if (data.type === 'ANIMATE_TO_REGION') {
              const r = data.region;
              map.easeTo({
                center: [r.longitude, r.latitude],
                zoom: r.zoom || 15,
                duration: data.duration || 1000
              });
            } else if (data.type === 'FIT_TO_COORDINATES') {
              if (data.coordinates && data.coordinates.length > 0) {
                const bounds = new mapboxgl.LngLatBounds();
                data.coordinates.forEach(c => bounds.extend([c.longitude, c.latitude]));
                map.fitBounds(bounds, {
                  padding: data.options?.edgePadding || 50,
                  duration: 1000
                });
              }
            } else if (data.type === 'ANIMATE_CAMERA') {
              const c = data.camera;
              const opts = { duration: data.duration || 1000 };
              if (c.center) opts.center = [c.center.longitude, c.center.latitude];
              if (c.zoom !== undefined) opts.zoom = c.zoom;
              if (c.pitch !== undefined) opts.pitch = c.pitch;
              if (c.heading !== undefined) opts.bearing = c.heading;
              map.easeTo(opts);
            } else if (data.type === 'UPDATE_DATA') {
              const { markers, polylines, isDark } = data;

              if (isDark !== undefined) {
                try {
                  const targetStyle = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
                  const currentStyle = map.getStyle();
                  if (currentStyle && currentStyle.name !== (isDark ? 'Mapbox Dark' : 'Mapbox Streets')) {
                    // Re-clean our tracking set since new style load will blow away existing layers
                    mbPolylines.clear();
                    map.setStyle(targetStyle);
                  }
                } catch (e) {
                  console.warn("Theme toggle error:", e);
                }
              }

              // 1. Markers Update
              const currentMarkerIds = new Set(markers.map(m => m.id));
              Object.keys(mbMarkers).forEach(id => {
                if (!currentMarkerIds.has(id)) {
                  mbMarkers[id].remove();
                  delete mbMarkers[id];
                }
              });

              markers.forEach(m => {
                if (m.lat === undefined || m.lng === undefined) return;
                if (!mbMarkers[m.id]) {
                  const el = document.createElement('div');
                  if (m.isUserLocation || m.identifier === 'user') {
                    el.className = 'marker-user';
                    
                    const headingContainer = document.createElement('div');
                    headingContainer.className = 'marker-user-heading';
                    headingContainer.id = m.id + '-heading';
                    
                    const cone = document.createElement('div');
                    cone.className = 'marker-user-cone';
                    headingContainer.appendChild(cone);
                    
                    el.appendChild(headingContainer);
                  } else if (m.identifier === 'origin') {
                    el.className = 'marker-origin';
                  } else if (m.identifier === 'destination') {
                    el.className = 'marker-dest';
                    const inner = document.createElement('div');
                    inner.className = 'marker-dest-inner';
                    el.appendChild(inner);
                  } else if (m.identifier === 'transfer') {
                    el.className = 'marker-transfer';
                    el.style.setProperty('--color', m.color || '#3b82f6');
                  } else if (m.identifier === 'hub') {
                    el.className = 'marker-hub';
                    el.style.setProperty('--color', m.color || '#3b82f6');
                  } else if (m.identifier === 'stop') {
                    el.className = 'marker-stop';
                    el.style.setProperty('--color', m.color || '#3b82f6');
                  } else {
                    el.className = 'marker-stop';
                    el.style.setProperty('--color', m.color || '#3b82f6');
                  }

                  if (m.title && m.identifier !== 'user' && m.identifier !== 'stop') {
                    const label = document.createElement('div');
                    label.className = 'marker-label';
                    label.innerText = m.title;
                    el.appendChild(label);
                  }

                  const offset = m.identifier === 'destination' ? [0, -16] : [0, 0];
                  const marker = new mapboxgl.Marker({ element: el, offset: offset })
                    .setLngLat([m.lng, m.lat])
                    .addTo(map);
                  
                  let zIndex = 10;
                  if (m.isUserLocation || m.identifier === 'user') zIndex = 100;
                  else if (m.identifier === 'destination') zIndex = 80;
                  else if (m.identifier === 'origin') zIndex = 50;
                  else if (m.identifier === 'transfer') zIndex = 30;
                  else if (m.identifier === 'hub') zIndex = 20;
                  marker.getElement().style.zIndex = zIndex;
                  
                  mbMarkers[m.id] = marker;
                } else {
                  mbMarkers[m.id].setLngLat([m.lng, m.lat]);
                  
                  // Update title if it changed
                  const el = mbMarkers[m.id].getElement();
                  if (m.title && m.identifier !== 'user' && m.identifier !== 'stop') {
                    let label = el.querySelector('.marker-label');
                    if (!label) {
                      label = document.createElement('div');
                      label.className = 'marker-label';
                      el.appendChild(label);
                    }
                    if (label.innerText !== m.title) {
                      label.innerText = m.title;
                    }
                  } else {
                    const label = el.querySelector('.marker-label');
                    if (label) label.remove();
                  }
                  
                  let zIndex = 10;
                  if (m.isUserLocation || m.identifier === 'user') zIndex = 100;
                  else if (m.identifier === 'destination') zIndex = 80;
                  else if (m.identifier === 'origin') zIndex = 50;
                  else if (m.identifier === 'transfer') zIndex = 30;
                  else if (m.identifier === 'hub') zIndex = 20;
                  el.style.zIndex = zIndex;
                }

                if (m.isUserLocation || m.identifier === 'user') {
                  const headingEl = document.getElementById(m.id + '-heading');
                  if (headingEl) {
                    const headingToUse = typeof displayHeading !== 'undefined' ? displayHeading : (m.heading || 0);
                    headingEl.style.transform = 'rotate(' + headingToUse + 'deg)';
                    headingEl.style.display = 'flex';
                  }
                }
              });

              // 2. Polylines Update
              applyPolylines(polylines);
            } else if (data.type === 'UPDATE_HUBS') {
              applyHubs(data);
            } else if (data.type === 'UPDATE_OSM_STOPS') {
              applyOsmStops(data);
            }
          }

          window.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || typeof data !== 'object') return;
            if (!isMapLoaded && data.type !== 'DESTROY') {
              messageQueue.push(data);
              return;
            }
            handleMessage(data);
          });

          if (typeof mapboxgl !== 'undefined') {
            initMap();
          }
        </script>
      </body>
      </html>
    `;
  }, []);

  const { hubs, hubsVisible, onHubPress } = props;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === 'MAP_ROTATE' && props.onRegionChange) {
         // Optionally handle rotation changes
      } else if (data?.type === 'MAP_CLICK' && props.onPress) {
         props.onPress({
           nativeEvent: {
             coordinate: data.coordinate
           }
         });
      } else if (data && data.type === 'HUB_PRESSED') {
        const hub = hubs?.[data.hubIndex];
        if (hub && onHubPress) {
          onHubPress(hub);
        }
      } else if (data && data.type === 'MAP_ROTATE') {
        if (props.onBearingChange) {
          props.onBearingChange(data.bearing);
        }
      } else if (data && data.type === 'MAP_GESTURE') {
        if (props.onPanDrag) {
          props.onPanDrag();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [hubs, onHubPress, props.onBearingChange, props.onPress]);

  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow && hubs) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_HUBS',
        hubs,
        visible: !!hubsVisible,
        primaryColor: colors.primary
      }, '*');
    }
  }, [hubs, hubsVisible, colors.primary]);


  // Clean up Mapbox memory inside the iframe on component unmount
  useEffect(() => {
    return () => {
      iframeRef.current?.contentWindow?.postMessage({
        type: 'DESTROY'
      }, '*');
    };
  }, []);

  return (
    <MapContext.Provider value={contextValue}>
      <View style={[style, styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.hidden}>{children}</View>
        <iframe
          ref={iframeRef}
          title="Map View"
          width= "100%"
          height= "100%"
          srcDoc={srcDoc}
          frameBorder="0"
        />
      </View>
    </MapContext.Provider>
  );
});

MapView.displayName = "MapView";

export const Marker = React.memo((props: any) => {
  const context = useContext(MapContext);
  const id = React.useId();
  useEffect(() => {
    context?.registerItem(id, "marker", {
      id,
      lat: props.coordinate?.latitude,
      lng: props.coordinate?.longitude,
      title: props.title,
      identifier: props.identifier,
      color: props.color,
      heading: props.heading,
      isUserLocation: props.isUserLocation
    });
    return () => context?.unregisterItem(id);
  }, [
    props.coordinate?.latitude,
    props.coordinate?.longitude,
    props.title,
    props.identifier,
    props.color,
    props.heading,
    props.isUserLocation,
    context,
    id
  ]);
  return null;
});

Marker.displayName = "Marker";

export const Polyline = React.memo((props: any) => {
  const context = useContext(MapContext);
  const id = React.useId();
  const coordsString = JSON.stringify(props.coordinates);
  
  useEffect(() => {
    context?.registerItem(id, "polyline", {
      id,
      points: props.coordinates?.map((c: any) => [c.latitude, c.longitude]) || [],
      color: props.strokeColor,
      weight: props.strokeWidth,
      dash: props.lineDashPattern,
      zIndex: props.zIndex
    });
    return () => context?.unregisterItem(id);
  }, [coordsString, props.strokeColor, props.strokeWidth, props.lineDashPattern, props.zIndex, context, id]);
  return null;
});

Polyline.displayName = "Polyline";

export const UrlTile = (props: any) => null;
export const PROVIDER_GOOGLE = "google";

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", overflow: "hidden" },
  hidden: { display: "none" },
});

export const PointAnnotation = Marker;
export const OSMStopsLayer = React.memo((props: any) => null);

export default MapView;
