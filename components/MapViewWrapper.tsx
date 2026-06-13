import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useTheme } from '../context/ThemeContext';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_KEY || '';
MapboxGL.setAccessToken(MAPBOX_TOKEN);

export const PROVIDER_GOOGLE = "google"; // Mock so existing imports don't crash
export const UrlTile = (props: any) => null;

export type MapViewProps = any;
export type MarkerProps = any;
export type PolylineProps = any;
export type UrlTileProps = any;

const osmStopsGeoJSON = require('../osrm routes/allStops.json');

export const OSMStopsLayer = React.memo((props: any) => {
  const { colors, visible } = props;
  if (!visible) return null;

  return (
    <MapboxGL.ShapeSource id="osm-stops-source" shape={osmStopsGeoJSON}>
      <MapboxGL.CircleLayer
        id="osm-stops-layer"
        style={{
          circleColor: colors?.primary || '#3b82f6',
          circleRadius: [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 3,
            10, 4,
            14, 6,
            16, 8
          ],
          circleOpacity: [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 0.6,
            12, 0.8,
            14, 1
          ],
          circleStrokeWidth: 1.5,
          circleStrokeColor: '#ffffff',
          circleStrokeOpacity: 1
        }}
      />
    </MapboxGL.ShapeSource>
  );
});
OSMStopsLayer.displayName = "OSMStopsLayer";

export const HubsLayer = React.memo((props: any) => {
  const { hubs, visible, colors, onHubPress } = props;
  if (!hubs || hubs.length === 0 || !visible) return null;

  const geoJSON: any = {
    type: 'FeatureCollection',
    features: hubs.map((h: any, index: number) => ({
      type: 'Feature',
      id: index,
      properties: { name: h.name, hubIndex: index },
      geometry: {
        type: 'Point',
        coordinates: [h.coordinate.longitude, h.coordinate.latitude],
      },
    })),
  };

  const onPress = (event: any) => {
    const feature = event.features?.[0];
    if (feature) {
      const hubIndex = feature.properties?.hubIndex ?? feature.id;
      const hub = hubs[hubIndex];
      if (hub && onHubPress) {
        onHubPress(hub);
      }
    }
  };

  const primaryColor = colors?.primary || '#3b82f6';

  return (
    <MapboxGL.ShapeSource 
      id="hubs-source" 
      shape={geoJSON} 
      onPress={onPress}
    >
      <MapboxGL.CircleLayer
        id="hubs-layer-outer"
        style={{
          circleColor: '#ffffff',
          circleRadius: 6,
          circleStrokeColor: primaryColor,
          circleStrokeWidth: 2.5,
        }}
      />
      <MapboxGL.CircleLayer
        id="hubs-layer-inner"
        style={{
          circleColor: primaryColor,
          circleRadius: 2,
        }}
      />
    </MapboxGL.ShapeSource>
  );
});
HubsLayer.displayName = "HubsLayer";

const MapView = forwardRef((props: any, ref: any) => {
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const { colors } = useTheme();
  
  useImperativeHandle(ref, () => ({
    animateToRegion: (region: any, duration = 1000) => {
      cameraRef.current?.setCamera({
        centerCoordinate: [region.longitude, region.latitude],
        animationDuration: duration,
      });
    },
    fitToCoordinates: (coordinates: any[], options?: any) => {
      if (coordinates.length === 0) return;
      const coords = coordinates.map(c => [c.longitude, c.latitude]);
      
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      coords.forEach(([lng, lat]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });
      
      const padding= options?.edgePadding || { top: 50, right: 50, bottom: 50, left: 50 };
      cameraRef.current?.fitBounds(
        [minLng, minLat],
        [maxLng, maxLat],
        [padding.top, padding.right, padding.bottom, padding.left],
        options?.animated ? 1000 : 0
      );
    },
    animateCamera: (camera: any, options?: { duration?: number }) => {
      const duration = options?.duration || 1000;
      const camParams: any = { animationDuration: duration };
      
      if (camera.center) camParams.centerCoordinate = [camera.center.longitude, camera.center.latitude];
      if (camera.zoom !== undefined) camParams.zoomLevel = camera.zoom;
      if (camera.pitch !== undefined) camParams.pitch = camera.pitch;
      if (camera.heading !== undefined) camParams.heading = camera.heading;
      
      cameraRef.current?.setCamera(camParams);
    },
    getCamera: async () => {
       return { zoom: 15 }; 
    }
  }));

  return (
    <View style={props.style || styles.container}>
      <MapboxGL.MapView 
        style={styles.map} 
        styleURL={MapboxGL.StyleURL.Street}
        pitchEnabled={props.pitchEnabled}
        compassEnabled={props.showsCompass}
        onCameraChanged={(event: any) => {
          if (props.onBearingChange) {
            props.onBearingChange(event.properties.heading || 0);
          }
          if (props.onPanDrag && event.gestures?.isGestureActive) {
            props.onPanDrag();
          }
          if (props.onCameraChanged) {
            props.onCameraChanged(event);
          }
        }}
        onPress={(event: any) => {
          if (props.onPress && event.geometry && event.geometry.coordinates) {
             props.onPress({
               nativeEvent: {
                 coordinate: {
                   longitude: event.geometry.coordinates[0],
                   latitude: event.geometry.coordinates[1]
                 }
               }
             });
          }
        }}
      >
        <MapboxGL.Camera 
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: props.initialCamera?.center 
                ? [props.initialCamera.center.longitude, props.initialCamera.center.latitude] 
                : [-0.1870, 5.6037],
            zoomLevel: props.initialCamera?.zoom || 13,
            pitch: props.initialCamera?.pitch || 0,
            heading: props.initialCamera?.heading || 0,
          }}
        />
        {props.showsUserLocation && (
          <MapboxGL.LocationPuck 
            puckBearingEnabled 
            puckBearing="heading" 
            pulsing={{ isEnabled: true, color: '#3b82f6' }} 
          />
        )}
        {props.hubs && props.hubsVisible && (
          <HubsLayer 
            hubs={props.hubs} 
            visible={props.hubsVisible} 
            colors={colors}
            onHubPress={props.onHubPress}
          />
        )}
        {props.children}
      </MapboxGL.MapView>
    </View>
  );
});

export const Marker = React.memo((props: any) => {
  if (!props.coordinate) return null;
  const id = props.identifier || props.key || Math.random().toString();
  
  return (
    <MapboxGL.MarkerView
      id={`marker-${id}`}
      coordinate={[props.coordinate.longitude, props.coordinate.latitude]}
      anchor={{ x: props.anchor?.x || 0.5, y: props.anchor?.y || 0.5 }}
    >
      <View style={{ zIndex: props.zIndex || 1 }}>
        {props.children}
      </View>
    </MapboxGL.MarkerView>
  );
});

export const PointAnnotation = React.memo((props: any) => {
  if (!props.coordinate) return null;
  const id = props.id || props.identifier || props.key || Math.random().toString();
  
  const coord = Array.isArray(props.coordinate) 
    ? props.coordinate 
    : [props.coordinate.longitude, props.coordinate.latitude];

  return (
    <MapboxGL.PointAnnotation
      id={`point-${id}`}
      coordinate={coord}
      anchor={{ x: props.anchor?.x || 0.5, y: props.anchor?.y || 0.5 }}
    >
      <View style={{ zIndex: props.zIndex || 1 }}>
        {props.children}
      </View>
    </MapboxGL.PointAnnotation>
  );
});

export const Polyline = React.memo((props: any) => {
  const id = React.useId();
  if (!props.coordinates || props.coordinates.length < 2) return null;
  
  const geoJSON: any = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: props.coordinates.map((c: any) => [c.longitude, c.latitude]),
    },
  };

  return (
    <MapboxGL.ShapeSource id={`source-${id}`} shape={geoJSON}>
      <MapboxGL.LineLayer
        id={`layer-${id}`}
        style={{
          lineColor: props.strokeColor || '#000',
          lineWidth: props.strokeWidth || 3,
          lineCap: props.lineCap || 'round',
          lineJoin: props.lineJoin || 'round',
          lineDasharray: props.lineDashPattern ? props.lineDashPattern : undefined,
        }}
      />
    </MapboxGL.ShapeSource>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});

MapView.displayName = "MapView";
Marker.displayName = "Marker";
Polyline.displayName = "Polyline";

export default MapView;