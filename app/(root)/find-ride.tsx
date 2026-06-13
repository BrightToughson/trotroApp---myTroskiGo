import { ms } from '../../lib/metrics';
import { WebIcon } from "../../components/WebIcon";
import { Location } from "../../constants/types";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import React, { memo, useEffect, useRef, useMemo, useCallback } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Dimensions, Platform, Alert } from "react-native"; 

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import JourneyDetails from "../../components/JourneyDetails";
import { LocationSearchModal } from "../../components/LocationSearchModal";
import MapView, {
    Marker,
    PointAnnotation,
    Polyline,
    PROVIDER_GOOGLE,
} from "../../components/MapViewWrapper";
import { useTheme } from "../../context/ThemeContext";
import { useRideLogic } from "../../hooks/useRideLogic";
import { calculateDistance } from
"../../lib/LocationService";
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence, 
  withSpring,
  Easing,
  FadeInDown,
  FadeInUp,
  FadeInRight,
} from "react-native-reanimated";

const { width } = Dimensions.get('window');

const LEG_COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

const LocationPill = memo(function LocationPill({ location, title, colors, type, draggable, onDragEnd }: { location: any, title: string, colors: any, type: 'origin' | 'destination', draggable?: boolean, onDragEnd?: (coord: any) => void }) {
  if (!location?.coordinate?.latitude || !location?.coordinate?.longitude) return null;
  const pinColor = type === 'origin' ? '#10b981' : '#ef4444'; // Emerald green for start, Red for end

  return (
    <Marker 
      identifier={type} 
      coordinate={location.coordinate} 
      zIndex={20} 
      draggable={draggable}
      onDragEnd={(e: any) => {
          if (!onDragEnd) return;
          const coord = e?.nativeEvent?.coordinate || e?.coordinate;
          if (coord) onDragEnd(coord);
      }}
      anchor={{ x: 0.5, y: 0.5 }}
      {...({
        color: pinColor
      } as any)}
    >
      {type === 'origin' ? (
        // Premium Start Circle: White ring, emerald core, shadow
        <View style={{ alignItems: 'center', width: ms(120) }}>
          <View style={styles.premiumStartMarker}>
            <View style={[styles.premiumStartInner, { backgroundColor: pinColor }]} />
          </View>
          {title ? (
            <View style={{ marginTop: ms(4), backgroundColor: colors.background, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(6), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: ms(2), elevation: 3 }}>
              <Text style={{ fontSize: ms(11), fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{title}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        // Premium Destination Circle (Red Dot): White ring, red core, shadow
        <View style={{ alignItems: 'center', width: ms(120) }}>
          <View style={styles.premiumStartMarker}>
            <View style={[styles.premiumStartInner, { backgroundColor: pinColor }]} />
          </View>
          {title ? (
            <View style={{ marginTop: ms(4), backgroundColor: colors.background, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(6), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: ms(2), elevation: 3 }}>
              <Text style={{ fontSize: ms(11), fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{title}</Text>
            </View>
          ) : null}
        </View>
      )}
    </Marker>
  );
});

const TransferMarker = memo(function TransferMarker({ coordinate, name, color, colors }: { coordinate: any, name: string, color: string, colors: any }) {
  return (
    <Marker 
      coordinate={coordinate} 
      zIndex={15} 
      anchor={{ x: 0.5, y: 0.5 }}
      {...({
        identifier: 'transfer',
        color: color
      } as any)}
    >
      <View style={{ alignItems: 'center', width: ms(100) }}>
        <View style={[styles.transferMarkerContainer, { borderColor: color, backgroundColor: '#ffffff' }]}>
          <View style={[styles.transferMarkerInner, { backgroundColor: color }]} />
        </View>
        {name ? (
          <View style={{ marginTop: ms(4), backgroundColor: colors.background, paddingHorizontal: ms(6), paddingVertical: ms(2), borderRadius: ms(6), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: ms(2), elevation: 3 }}>
            <Text style={{ fontSize: ms(10), fontWeight: '700', color: colors.text, textAlign: 'center' }} numberOfLines={2}>{name}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
});

const HubMarker = memo(function HubMarker({ coordinate, name, colors, onSelect }: { coordinate: any, name: string, colors: any, onSelect: () => void }) {
  return (
    <Marker 
      coordinate={coordinate} 
      zIndex={1} 
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onSelect}
    >
      <View style={[styles.hubMarkerContainer, { backgroundColor: '#ffffff', borderColor: colors.primary }]}>
        <View style={[styles.hubMarkerInner, { backgroundColor: colors.primary }]} />
      </View>
    </Marker>
  );
});

// Web-safe UserLocationMarker container to prevent Reanimated hooks crash on Web/PWA
const UserLocationMarker = memo(function UserLocationMarker({ location, colors }: { location: any, colors: any }) {
  if (!location?.coordinate) return null;
  
  if (Platform.OS === 'web') {
    return (
      <Marker 
        coordinate={location.coordinate} 
        identifier="user"
        flat={true}
        anchor={{ x: 0.5, y: 0.5 }}
        zIndex={100}
        {...({
          isUserLocation: true
        } as any)}
      />
    );
  }

  // --- Smooth Heading Animation ---
  const headingShared = useSharedValue(location.heading || 0);

  useEffect(() => {
    const current = headingShared.value % 360;
    let target = (location.heading || 0) % 360;
    
    // Convert negative angles to positive
    if (target < 0) target += 360;
    
    // Find shortest rotation path
    let diff = target - current;
    if (diff > 180) diff -= 360;
    else if (diff < -180) diff += 360;
    
    headingShared.value = withTiming(headingShared.value + diff, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });
  }, [location.heading]);

  const animatedHeadingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${headingShared.value}deg` }]
  }));

  return (
    <Marker
      coordinate={location.coordinate}
      identifier="user"
      zIndex={100}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', width: ms(50), height: ms(50) }}>
        {/* Heading Cone */}
        <Animated.View style={[
          {
            position: 'absolute',
            width: ms(46), height: ms(46), alignItems: 'center', justifyContent: 'center',
          },
          animatedHeadingStyle
        ]}>
          <View style={{
            width: 0, height: 0,
            borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 22,
            borderLeftColor: 'transparent', borderRightColor: 'transparent',
            borderBottomColor: 'rgba(59, 130, 246, 0.4)',
            transform: [{ translateY: -11 }]
          }} />
        </Animated.View>
        
        {/* Core Dot */}
        <View style={{
          position: 'absolute',
          width: ms(16), height: ms(16), backgroundColor: '#3b82f6',
          borderWidth: ms(2.5), borderColor: 'white', borderRadius: ms(8),
          shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: ms(3), elevation: 5
        }} />
      </View>
    </Marker>
  );
});

const IntermediateStopMarker = memo(function IntermediateStopMarker({ coordinate, color, colors }: { coordinate: any, color: string, colors: any }) {
  return (
    <Marker 
      coordinate={coordinate} 
      zIndex={12} 
      anchor={{ x: 0.5, y: 0.5 }}
      {...({
        identifier: 'stop',
        color: color
      } as any)}
    >
      <View style={[styles.intermediateStopDot, { backgroundColor: '#ffffff', borderColor: color }]}>
        <View style={styles.intermediateStopInner} />
      </View>
    </Marker>
  );
});

// Native-only Reanimated Top Navigation Header to prevent React 18 Web Reanimated Worklet crashes
const NativeNavHeader = memo(function NativeNavHeader({ 
  insets, 
  isNavigationMode, 
  currentInstruction, 
  tripDetails,
  t 
}: { 
  insets: any, 
  isNavigationMode: boolean, 
  currentInstruction: any, 
  tripDetails: any,
  t: any 
}) {
  const navHeaderPos = useSharedValue(-100);
  
  useEffect(() => {
    if (isNavigationMode && currentInstruction) {
      navHeaderPos.value = withSpring(0, { damping: 15 });
    } else {
      navHeaderPos.value = withTiming(-150);
    }
  }, [isNavigationMode, currentInstruction]);

  const animatedNavHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navHeaderPos.value }],
    opacity: withTiming(isNavigationMode ? 1 : 0),
  }));

  return (
    <Animated.View 
      style={[styles.topNavHeader, { paddingTop: insets.top + 10 }, animatedNavHeaderStyle]}
    >
      {currentInstruction && (
         <View style={styles.navHeaderContent}>
            <WebIcon name={currentInstruction.icon as any} size= {40} color="#fff" />
            <View style={{ flex: 1, marginLeft: ms(18), marginRight: ms(10) }}>
               <Text style={styles.navHeaderText}>{currentInstruction.text}</Text>
               <Text style={styles.navHeaderSubText}>{currentInstruction.tip || t('follow_highlighted')}</Text>
            </View>
            {tripDetails && (
               <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: ms(12), paddingVertical: ms(6), borderRadius: ms(16), alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: ms(18) }}>
                     {tripDetails.travelMins + tripDetails.walkMins1 + tripDetails.walkMins2 + (tripDetails.trafficMins || 0) + (tripDetails.waitTimeMins || 0)}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: ms(12), marginTop: ms(-2) }}>
                     {t('min')}
                  </Text>
               </View>
            )}
         </View>
      )}
    </Animated.View>
  );
});

export default function FindRide() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams() || {};
  const { origin: pO, destination: pD, originCoords: pOC, destCoords: pDC } = searchParams;

  const [mapBearing, setMapBearing] = React.useState(0);
  const [isFollowingUser, setIsFollowingUser] = React.useState(true);
  const [stopsExpanded, setStopsExpanded] = React.useState(false);
  const expandTimeout = useRef<any>(null);

  const {
    mapRef, origin = "", destination = "", originLocation, destinationLocation, priceEstimate, isManualFare,
    modalVisible = false, setModalVisible, activeField, activeLegs = [], walkingCoordinates = [],
    walkingCoordinates2 = [], transferWalkingCoordinates = [], liveLocation, tripDetails, loading = false, isNavigationMode = false,
    handleStartTrip, openSearch, handleSelectLocation, handleEndJourney, intermediateStops = [],
    snapToCurrentLocation, verifiedStations = [], resetRide, pickupPoint, preTripWalkCoords = []
  } = useRideLogic(
    (pO as string) || t('choose_start') || "Choose starting point",
    (pD as string) || t('destination_label') || "Destination",
    pOC as string,
    pDC as string
  );

  useEffect(() => {
    if (isNavigationMode) {
      setIsFollowingUser(true);
    }
  }, [isNavigationMode]);

  const resetMapRotation = () => {
    if (mapRef.current) {
      if (liveLocation?.coordinate) {
        mapRef.current.animateCamera({
          center: liveLocation.coordinate,
          heading: 0,
          pitch: 0,
          zoom: Platform.OS === 'web' ? 18 : 16.5,
        }, { duration: 800 });
      } else {
        mapRef.current.animateCamera({
          heading: 0,
          pitch: 0
        }, { duration: 500 });
      }
    }
    setMapBearing(0);
  };

  // Auto-center map on load or route update
  useEffect(() => {
    if (!isNavigationMode && (activeLegs.length > 0 || walkingCoordinates.length > 0) && mapRef.current) {
      const allCoords = [
        ...activeLegs.flatMap(l => l.coordinates), 
        ...walkingCoordinates, 
        ...walkingCoordinates2,
        ...transferWalkingCoordinates.flat()
      ];
      if (originLocation?.coordinate) allCoords.push(originLocation.coordinate);
      if (destinationLocation?.coordinate) allCoords.push(destinationLocation.coordinate);
      if (allCoords.length > 0) {
        mapRef.current.fitToCoordinates(allCoords, { 
          edgePadding: { top: insets.top + 80, right: ms(60), bottom: ms(350), left: ms(60) }, 
          animated: true 
        });
      }
    }
  }, [activeLegs, walkingCoordinates, walkingCoordinates2, transferWalkingCoordinates, originLocation, destinationLocation, isNavigationMode, insets.top, mapRef]);

  // Auto-center on startup GPS detection
  const hasCenteredOnUser = useRef(false);

  useEffect(() => {
    if (liveLocation?.coordinate && !hasCenteredOnUser.current && !pO && !pD) {
      hasCenteredOnUser.current = true;
      if (mapRef.current) {
        mapRef.current.animateCamera({
          center: liveLocation.coordinate,
          pitch: 60,
          heading: liveLocation.heading || 0,
          zoom: Platform.OS === 'web' ? 18 : 16.5,
          altitude: 1000
        }, { duration: 1500 });
      }
    }
  }, [liveLocation?.coordinate, pO, pD]);

  // FOLLOW USER MODE: Cinematic 3D zoom effect with throttling to prevent phone heating & lag
  const isFirstNavUpdate = useRef(true);
  const lastAnimatedCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastAnimatedHeading = useRef<number>(0);
  const lastAnimationTime = useRef<number>(0);

  useEffect(() => {
    if (!isNavigationMode) {
      isFirstNavUpdate.current = true;
      lastAnimatedCoords.current = null;
      lastAnimatedHeading.current = 0;
      lastAnimationTime.current = 0;
      return;
    }

    if (mapRef.current && liveLocation?.coordinate) {
        const now = Date.now();
        const heading = liveLocation.heading || 0;
        let shouldAnimate = false;

        if (isFirstNavUpdate.current) {
          shouldAnimate = true;
        } else {
          const timeElapsed = now - lastAnimationTime.current;
          
          let distMoved = 0;
          if (lastAnimatedCoords.current) {
            distMoved = calculateDistance(lastAnimatedCoords.current, liveLocation.coordinate);
          } else {
            distMoved = 1;
          }

          const headingDiff = Math.abs(heading - lastAnimatedHeading.current);

          // Only trigger WebGL camera easing if moved >= 5 meters, rotated >= 10 degrees, or >= 4 seconds elapsed
          if (distMoved >= 0.005 || (headingDiff >= 10 && timeElapsed > 1500) || timeElapsed > 4000) {
            shouldAnimate = true;
          }
        }

        if (shouldAnimate && isFollowingUser) {
            const duration = isFirstNavUpdate.current ? 2500 : 1200;
            lastAnimatedCoords.current = liveLocation.coordinate;
            lastAnimatedHeading.current = heading;
            lastAnimationTime.current = now;
            isFirstNavUpdate.current = false;

            mapRef.current.animateCamera({ 
              center: liveLocation.coordinate, 
              pitch: 60,
              heading: heading,
              zoom: Platform.OS === 'web' ? 19.5 : 18.5,
              altitude: 600, 
            }, { duration });
        }
    }
  }, [isNavigationMode, liveLocation]);

  const currentInstruction = useMemo(() => {
    if (!isNavigationMode || !tripDetails) return null;
    if (tripDetails.walkMins1 > 0) return { text: `${t('walk_to')} ${activeLegs[0]?.startStop.name || t('boarding')}`, icon: 'walk', tip: t('tip_follow_path', 'Follow the highlighted green path on the map.') };
    if (activeLegs.length > 0) return { text: `${t('board')} ${activeLegs[0].lineName.split(':')[0]}`, icon: 'bus', tip: t('tip_board_bus', 'The trotro icon shows your exact boarding location.') };
    return { text: t('follow_path'), icon: 'navigate', tip: t('tip_general', 'Your live location is the blue pulsing dot.') };
  }, [isNavigationMode, tripDetails, activeLegs, t]);

  const centerOnLocation = () => {
    if (liveLocation?.coordinate && mapRef.current) {
      mapRef.current.animateToRegion({
        ...liveLocation.coordinate,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 800);
    }
  };

  const handleStepPress = (coords: any[]) => {
    if (mapRef.current && coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: insets.top + 40, right: ms(20), bottom: ms(150), left: ms(20) },
        animated: true
      });
    }
  };

  const mapZoom = useRef<number>(Platform.OS === 'web' ? 18 : 16.5);

  const getPitchForZoom = (zoom: number) => {
    if (zoom <= 13) return 0;
    if (zoom >= 18.5) return 60;
    return Math.round(((zoom - 13) / 5.5) * 60);
  };

  const zoomIn = async () => {
    if (mapRef.current) {
      try {
        if (Platform.OS === 'web') {
          mapZoom.current = Math.min(mapZoom.current + 1, 21);
          const targetPitch = getPitchForZoom(mapZoom.current);
          mapRef.current.animateCamera({
            zoom: mapZoom.current,
            pitch: targetPitch
          }, { duration: 300 });
        } else {
          // @ts-ignore
          const camera = await mapRef.current.getCamera();
          if (camera) {
            const newZoom = Math.min((camera.zoom || 15) + 1, 20);
            const targetPitch = getPitchForZoom(newZoom);
            mapRef.current.animateCamera({
              zoom: newZoom,
              pitch: targetPitch
            }, { duration: 300 });
          }
        }
      } catch (e) {
        console.error("Zoom in failed:", e);
      }
    }
  };

  const zoomOut = async () => {
    if (mapRef.current) {
      try {
        if (Platform.OS === 'web') {
          mapZoom.current = Math.max(mapZoom.current - 1, 3);
          const targetPitch = getPitchForZoom(mapZoom.current);
          mapRef.current.animateCamera({
            zoom: mapZoom.current,
            pitch: targetPitch
          }, { duration: 300 });
        } else {
          // @ts-ignore
          const camera = await mapRef.current.getCamera();
          if (camera) {
            const newZoom = Math.max((camera.zoom || 15) - 1, 2);
            const targetPitch = getPitchForZoom(newZoom);
            mapRef.current.animateCamera({
              zoom: newZoom,
              pitch: targetPitch
            }, { duration: 300 });
          }
        }
      } catch (e) {
        console.error("Zoom out failed:", e);
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={StyleSheet.absoluteFill}>
          <MapView
            ref={mapRef}
            onPanDrag={() => {
              if (isNavigationMode && isFollowingUser) {
                setIsFollowingUser(false);
              }
            }}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            showsUserLocation={Platform.OS !== 'web'}
            showsMyLocationButton={true}
            showsCompass={true}
            pitchEnabled={true}
            showsBuildings={true}
            hubs={verifiedStations}
            hubsVisible={false}
            onBearingChange={setMapBearing}
            onHubPress={(hub: any) => {
               if (Platform.OS === 'web') {
                  const setPickup = window.confirm(`Set ${hub.name} as your Pickup Point?\n(Click Cancel to set it as your Destination instead)`);
                  if (setPickup) {
                     handleSelectLocation(hub, "origin");
                  } else {
                     handleSelectLocation(hub, "destination");
                  }
               } else {
                 Alert.alert(
                   hub.name,
                   "What would you like to do?",
                   [
                     { text: "Set as Pickup", onPress: () => handleSelectLocation(hub, "origin") },
                     { text: "Set as Destination", onPress: () => handleSelectLocation(hub, "destination") },
                     { text: "Cancel", style: "cancel" }
                   ]
                 );
               }
            }}
            initialCamera={{
              center: { latitude: 5.574558, longitude: -0.214656 },
              pitch: 60, // Maximum tilt for cinematic feel
              heading: 0,
              altitude: 1000,
              zoom: Platform.OS === 'web' ? 18 : 12
            }}
            onMapReady={() => {
              if (Platform.OS === 'web' && mapRef.current) {
                // Force a secondary animation on web to ensure the JS API acknowledges the pitch
                mapRef.current.animateCamera({
                  pitch: 60,
                  zoom: 18,
                }, { duration: 1500 });
              }
            }}
          >



            {activeLegs.map((leg: any, index: number) => {
              if (leg.coordinates && leg.coordinates.length > 0) {
                return (
                  <React.Fragment key={`transit-leg-${index}`}>
                    {/* Transit Route Casing */}
                    <Polyline 
                      coordinates={leg.coordinates} 
                      strokeColor={isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.9)"} 
                      strokeWidth={10} 
                      lineCap="round"
                      lineJoin="round"
                      zIndex={9} 
                    />
                    {/* Transit Route Line */}
                    <Polyline 
                      coordinates={leg.coordinates} 
                      strokeColor="#3b82f6" 
                      strokeWidth={6} 
                      lineCap="round"
                      lineJoin="round"
                      zIndex={10} 
                    />
                    
                    {/* Drop-off Point Marker (Hide for final leg as Destination Marker covers it) */}
                    {index !== activeLegs.length - 1 && (
                      <TransferMarker 
                        coordinate={leg.coordinates[leg.coordinates.length - 1]} 
                        name={leg.endStop?.name || "Drop-off"} 
                        color="#3b82f6" 
                        colors={colors} 
                      />
                    )}
                  </React.Fragment>
                );
              }
              return null;
            })}

            {walkingCoordinates.length > 1 && (
              <>
                {/* Walking Casing */}
                <Polyline 
                  coordinates={walkingCoordinates} 
                  strokeColor={isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.7)"} 
                  strokeWidth={8} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={4} 
                />
                {/* Walking Dotted Path */}
                <Polyline 
                  coordinates={walkingCoordinates} 
                  strokeColor="#14b8a6" // Premium high-visibility vibrant mint teal
                  strokeWidth={4.5} 
                  lineDashPattern={Platform.OS === 'android' ? [1, 12] : [0.1, 10]} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={5} 
                />
              </>
            )}

            {/* 3. Final Drop-off Walk to Destination */}
            {walkingCoordinates2.length > 1 && (
              <>
                <Polyline 
                  coordinates={walkingCoordinates2} 
                  strokeColor={isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.7)"} 
                  strokeWidth={8} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={4} 
                />
                <Polyline 
                  coordinates={walkingCoordinates2} 
                  strokeColor="#14b8a6" 
                  strokeWidth={4.5} 
                  lineDashPattern={Platform.OS === 'android' ? [1, 12] : [0.1, 10]} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={5} 
                />
              </>
            )}
            {transferWalkingCoordinates.map((transferCoords, index) => (
               transferCoords.length > 1 && (
                 <React.Fragment key={`transfer-${index}`}>
                   {/* Transfer Walking Casing */}
                   <Polyline 
                     coordinates={transferCoords} 
                     strokeColor={isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.7)"} 
                     strokeWidth={8} 
                     lineCap="round"
                     lineJoin="round"
                     zIndex={4} 
                   />
                   {/* Transfer Walking Dotted Path */}
                   <Polyline 
                     coordinates={transferCoords} 
                     strokeColor="#14b8a6" 
                     strokeWidth={4.5} 
                     lineDashPattern={Platform.OS === 'android' ? [1, 12] : [0.1, 10]} 
                     lineCap="round"
                     lineJoin="round"
                     zIndex={5} 
                   />
                 </React.Fragment>
               )
            ))}
            
            {/* Visual connection (Blue Dot -> Green Dot) to pickup point */}
            {liveLocation && originLocation && (
              (liveLocation.coordinate.latitude !== originLocation.coordinate.latitude || 
               liveLocation.coordinate.longitude !== originLocation.coordinate.longitude)
            ) && (
              <>
                {/* Visual Connection Casing */}
                <Polyline 
                  coordinates={preTripWalkCoords?.length > 0 ? preTripWalkCoords : [liveLocation.coordinate, originLocation.coordinate]} 
                  strokeColor={isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.7)"} 
                  strokeWidth={8} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={4} 
                />
                {/* Visual Connection Dotted Path */}
                <Polyline 
                  coordinates={preTripWalkCoords?.length > 0 ? preTripWalkCoords : [liveLocation.coordinate, originLocation.coordinate]} 
                  strokeColor="#14b8a6" 
                  strokeWidth={4.5} 
                  lineDashPattern={Platform.OS === 'android' ? [1, 12] : [0.1, 10]} 
                  lineCap="round"
                  lineJoin="round"
                  zIndex={5} 
                />
              </>
            )}

            {Platform.OS === 'web' && <UserLocationMarker location={liveLocation} colors={colors} />}
            
            <LocationPill 
              type="origin" 
              location={originLocation} 
              title={origin || originLocation?.name || "Pickup Point"} 
              colors={colors} 
              draggable={true}
              onDragEnd={(coord) => {
                 const newLoc = {
                   name: "Custom Pickup",
                   coordinate: coord,
                   type: "custom" as any
                 };
                 handleSelectLocation(newLoc, "origin");
              }}
            />

            <LocationPill 
              type="destination" 
              location={destinationLocation} 
              title={destination || destinationLocation?.name || "Destination"} 
              colors={colors} 
            />
            
          </MapView>

          {/* Re-center Button */}
          {isNavigationMode && !isFollowingUser && (
            <TouchableOpacity 
              style={{
                position: 'absolute',
                bottom: ms(160),
                left: ms(20),
                backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff",
                paddingVertical: ms(10),
                paddingHorizontal: ms(16),
                borderRadius: ms(24),
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: ms(2) },
                shadowOpacity: 0.15,
                shadowRadius: ms(8),
                elevation: 4,
                zIndex: 90
              }}
              onPress={() => {
                setIsFollowingUser(true);
                if (mapRef.current && liveLocation?.coordinate) {
                  mapRef.current.animateCamera({
                    center: liveLocation.coordinate,
                    pitch: 60,
                    heading: liveLocation.heading || 0,
                    zoom: Platform.OS === 'web' ? 19.5 : 18.5,
                    altitude: 600,
                  }, { duration: 1000 });
                }
              }}
            >
              <WebIcon name="navigate" size= {20} color={colors.primary} />
              <Text style={{ marginLeft: ms(6), color: colors.primary, fontWeight: '700', fontSize: ms(15) }}>Re-center</Text>
            </TouchableOpacity>
          )}

          {/* Custom Map Controls */}
          <View 
            style={[
              styles.mapControls, 
              { bottom: ms(320) }
            ]}
          >
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border }]} onPress={zoomIn}>
              <WebIcon name="add" size= {22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border }]} onPress={zoomOut}>
              <WebIcon name="remove" size= {22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapBtn, { backgroundColor: isDark ? "rgba(31, 41, 55, 0.95)" : "#fff", borderColor: colors.border }]} onPress={resetMapRotation}>
              <View 
                style={{
                  width: ms(24), height: ms(24),
                  alignItems: 'center', justifyContent: 'center',
                  transform: [{ rotate: `${-mapBearing}deg` }]
                }}
              >
                <View style={{ flexDirection: 'row' }}>
                  <View style={{
                    width: 0, height: 0,
                    borderBottomWidth: 11, borderLeftWidth: 5,
                    borderBottomColor: '#ff3b30', borderLeftColor: 'transparent'
                  }} />
                  <View style={{
                    width: 0, height: 0,
                    borderBottomWidth: 11, borderRightWidth: 5,
                    borderBottomColor: '#d32f2f', borderRightColor: 'transparent'
                  }} />
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{
                    width: 0, height: 0,
                    borderTopWidth: 11, borderLeftWidth: 5,
                    borderTopColor: '#e5e5ea', borderLeftColor: 'transparent'
                  }} />
                  <View style={{
                    width: 0, height: 0,
                    borderTopWidth: 11, borderRightWidth: 5,
                    borderTopColor: '#8e8e93', borderRightColor: 'transparent'
                  }} />
                </View>
                <View style={{
                  position: 'absolute',
                  width: ms(3), height: ms(3), borderRadius: ms(1.5),
                  backgroundColor: '#fff',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 1
                }} />
              </View>
            </TouchableOpacity>
          </View>
          
          {Platform.OS === 'web' ? (
            <View 
              style={[
                styles.topNavHeader, 
                { 
                  paddingTop: insets.top + 10,
                  transform: [{ translateY: isNavigationMode && currentInstruction ? 0 : -150 }],
                  opacity: isNavigationMode ? 1 : 0,
                  ...({
                    transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                  } as any)
                }
              ]}
            >
              {currentInstruction && (
                 <View style={styles.navHeaderContent}>
                    <WebIcon name={currentInstruction.icon as any} size= {40} color="#fff" />
                    <View style={{ flex: 1, marginLeft: ms(18), marginRight: ms(10) }}>
                       <Text style={styles.navHeaderText}>{currentInstruction.text}</Text>
                       <Text style={styles.navHeaderSubText}>{currentInstruction.tip || t('follow_highlighted')}</Text>
                    </View>
                    {tripDetails && (
                       <View style={{ backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: ms(12), paddingVertical: ms(6), borderRadius: ms(16), alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: ms(18) }}>
                             {tripDetails.travelMins + tripDetails.walkMins1 + tripDetails.walkMins2 + (tripDetails.trafficMins || 0) + (tripDetails.waitTimeMins || 0)}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: ms(12), marginTop: ms(-2) }}>
                             {t('min')}
                          </Text>
                       </View>
                    )}
                 </View>
              )}
            </View>
          ) : (
            <NativeNavHeader 
              insets={insets} 
              isNavigationMode={isNavigationMode} 
              currentInstruction={currentInstruction} 
              tripDetails={tripDetails}
              t={t}
            />
          )}
        </View>
        
        <View pointerEvents="box-none" style={styles.overlayContainer}>
          {!isNavigationMode && (
            <View 
              style={[styles.topBar, { paddingTop: insets.top + 10 }]}
            >
              <TouchableOpacity 
                style={[styles.backButton, { backgroundColor: colors.surface }]} 
                onPress={() => {
                  resetRide();
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.push("/(root)/(tabs)/home");
                  }
                }}
              >
                <WebIcon name="arrow-back" size= {24} color={colors.text} />
              </TouchableOpacity>
              
              {/* Premium Route Summary Overlay Card */}
              {activeLegs.length > 0 && priceEstimate !== "No Route Found" && (
                <Animated.View
                  entering={FadeInDown.springify().damping(15).delay(100)}
                  style={{
                    position: 'absolute',
                    top: insets.top + 10,
                    alignSelf: 'center',
                    width: '84%',
                    maxWidth: ms(320),
                    paddingHorizontal: ms(12),
                  }}
                >
                  <View style={{
                    backgroundColor: isDark ? "rgba(20, 29, 43, 0.85)" : "rgba(255, 255, 255, 0.95)",
                    borderRadius: ms(18),
                    padding: ms(13),
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: ms(4) },
                    shadowOpacity: 0.1,
                    shadowRadius: ms(10),
                    elevation: 6,
                    // @ts-ignore
                    backdropFilter: "blur(20px)",
                  }}>
                    <TouchableOpacity 
                      activeOpacity={0.7} 
                      onPress={() => {
                        setStopsExpanded(true);
                        if (expandTimeout.current) clearTimeout(expandTimeout.current);
                        expandTimeout.current = setTimeout(() => {
                          setStopsExpanded(false);
                        }, 4000);
                      }} 
                      style={{ paddingVertical: ms(5), alignItems: 'center' }}
                    >
                       <View style={{ flexDirection: stopsExpanded ? 'column' : 'row', flexWrap: stopsExpanded ? 'nowrap' : 'wrap', alignItems: stopsExpanded ? 'flex-start' : 'center', justifyContent: stopsExpanded ? 'flex-start' : 'center', rowGap: stopsExpanded ? 0 : 8 }}>
                         {(() => {
                           const stops = [
                             { name: origin || originLocation?.name || "Pickup Point", color: '#10b981' },
                             ...(activeLegs.length > 1 ? activeLegs.slice(0, -1).map(leg => ({ name: leg.endStop?.name || "Intermediate Stop", color: '#3b82f6' })) : []),
                             { name: destination || destinationLocation?.name || "Destination", color: '#ef4444' }
                           ];
                           
                           if (stopsExpanded) {
                             return stops.map((stop, i) => (
                               <View key={`stop-${i}`} style={{ flexDirection: 'row', alignItems: 'center', height: ms(32) }}>
                                  <View style={{ width: ms(16), height: '100%', alignItems: 'center', justifyContent: 'center', marginRight: ms(12) }}>
                                     {i < stops.length - 1 && (
                                        <View style={{ position: 'absolute', top: '50%', bottom: '-50%', width: ms(2), backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', borderRadius: 1, zIndex: 1 }} />
                                     )}
                                     <View style={{ width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: stop.color, borderWidth: ms(1.5), borderColor: isDark ? '#1e293b' : '#fff', shadowColor: stop.color, shadowOpacity: 0.4, shadowRadius: ms(2), shadowOffset: { width: 0, height: 1 }, zIndex: 2 }} />
                                  </View>
                                  <View style={{ flexShrink: 1 }}>
                                    <Text style={{ fontSize: ms(16), fontWeight: '800', color: colors.text, letterSpacing: -0.2 }} numberOfLines={2}>
                                      {stop.name}
                                    </Text>
                                  </View>
                               </View>
                             ));
                           } else {
                             return stops.map((stop, i) => (
                               <View key={`stop-${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={{ width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: stop.color, borderWidth: ms(1.5), borderColor: isDark ? '#1e293b' : '#fff', shadowColor: stop.color, shadowOpacity: 0.4, shadowRadius: ms(2), shadowOffset: { width: 0, height: 1 }, marginRight: ms(6) }} />
                                  <Text style={{ fontSize: ms(13), fontWeight: '800', color: colors.text, letterSpacing: -0.2 }} numberOfLines={1}>
                                    {stop.name.length > 4 ? stop.name.substring(0, 4) + '...' : stop.name}
                                  </Text>
                                  {i < stops.length - 1 && (
                                     <View style={{ marginHorizontal: ms(6), opacity: 0.6 }}>
                                        <WebIcon name="chevron-forward" size= {14} color={colors.textSecondary} />
                                     </View>
                                  )}
                               </View>
                             ));
                           }
                         })()}
                       </View>
                     </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
          
          <JourneyDetails
            origin={origin} 
            originLocation={originLocation}
            destination={destination} 
            destinationLocation={destinationLocation}
            priceEstimate={priceEstimate}
            isManualFare={isManualFare} tripDetails={tripDetails} activeLegs={activeLegs}
            loading={loading} isNavigationMode={isNavigationMode} openSearch={openSearch}
            handleStartTrip={handleStartTrip} handleEndJourney={handleEndJourney}
            resetRide={resetRide}
            onSelectShortcut={(loc) => {
              // If origin is not set (or is just GPS), set the shortcut as the origin. Otherwise, set as destination.
              const isOriginEmpty = !originLocation || originLocation.type === 'gps' || origin === "Locating...";
              if (isOriginEmpty) {
                 handleSelectLocation(loc, "origin");
              } else {
                 handleSelectLocation(loc, "destination");
              }
            }}
            onSnapToCurrentLocation={snapToCurrentLocation}
            onStepPress={handleStepPress}
            walkingCoords1={walkingCoordinates}
            walkingCoords2={walkingCoordinates2}
            transferWalkingCoords={transferWalkingCoordinates}
          />
        </View>

        <LocationSearchModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSelectLocation={handleSelectLocation}
          title={activeField === "origin" ? t('start_point') : t('destination_label')}
          origin={origin}
          destination={destination}
          activeField={activeField}
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlayContainer: { flex: 1, justifyContent: "space-between", pointerEvents: "box-none" },
  topBar: { paddingHorizontal: ms(20), pointerEvents: "box-none", zIndex: 110 },
  topNavHeader: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#0f9d58', paddingHorizontal: ms(20), paddingBottom: ms(20), borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 8 },
  navHeaderContent: { flexDirection: 'row', alignItems: 'center' },
  navHeaderText: { color: '#fff', fontSize: ms(28), fontWeight: '900', lineHeight: ms(28) },
  navHeaderSubText: { color: 'rgba(255,255,255,0.9)', fontSize: ms(16), fontWeight: '700', marginTop: ms(2) },
  backButton: { width: ms(44), height: ms(44), borderRadius: ms(22), justifyContent: "center", alignItems: "center", elevation: 4 },
  navPinContainer: { alignItems: 'center', justifyContent: 'center', width: ms(60), height: ms(60) },
  navPinCircle: { width: ms(32), height: ms(32), borderRadius: ms(16), borderWidth: ms(3.5), borderColor: '#fff', elevation: 8, justifyContent: 'center', alignItems: 'center' },
  navPinInnerDot: { width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: '#fff' },
  navPinArrow: { position: 'absolute', top: ms(-14), width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#fff' },
  navPinBeaming: { position: 'absolute', width: ms(44), height: ms(44), borderRadius: ms(22) },
  pillContainer: { flexDirection: "row", alignItems: "center", paddingVertical: ms(10), paddingHorizontal: ms(16), borderRadius: ms(24), borderWidth: ms(2), elevation: 10, maxWidth: ms(240) },
  pillIconWrapper: { width: ms(24), height: ms(24), borderRadius: ms(12), alignItems: "center", justifyContent: "center", marginRight: ms(12) },
  pillText: { fontSize: ms(16), fontWeight: "900" },
  mapControls: { position: 'absolute', right: ms(16), gap: ms(10) },
  mapBtn: { width: ms(44), height: ms(44), borderRadius: ms(12), justifyContent: 'center', alignItems: 'center', borderWidth: 1, elevation: 4 },
  transferMarkerContainer: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: ms(4),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.2,
    shadowRadius: ms(2),
  },
  transferMarkerInner: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
  },
  userMarkerWrapper: { alignItems: 'center', justifyContent: 'center', width: ms(80), height: ms(80) },
  userPulseRing: {
    position: 'absolute',
    width: ms(24),
    height: ms(24),
    borderRadius: ms(12),
  },
  userDot: {
    width: ms(22),
    height: ms(22),
    borderRadius: ms(11),
    borderWidth: ms(3),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.3,
    shadowRadius: ms(3),
  },
  userDotCore: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: '#fff',
  },
  mapInstructionBox: {
    position: 'absolute',
    top: ms(54), // Below back button
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ms(10),
    paddingHorizontal: ms(18),
    borderRadius: ms(20),
    borderWidth: ms(1.5),
    gap: ms(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(4) },
    shadowOpacity: 0.1,
    shadowRadius: ms(8),
    elevation: 5,
  },
  mapInstructionText: {
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hubMarkerContainer: {
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    borderWidth: ms(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(1.5) },
    shadowOpacity: 0.15,
    shadowRadius: ms(2),
  },
  hubMarkerInner: {
    width: ms(3),
    height: ms(3),
    borderRadius: ms(1.5),
  },

  intermediateStopDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    borderWidth: ms(2),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: ms(1.5),
  },
  intermediateStopInner: {
    width: ms(4),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: '#ffffff',
  },
  premiumStartMarker: {
    width: ms(26),
    height: ms(26),
    borderRadius: ms(13),
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: ms(2),
    borderColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.25,
    shadowRadius: ms(4),
  },
  premiumStartInner: {
    width: ms(14),
    height: ms(14),
    borderRadius: ms(7),
  },
  premiumDestMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumDestCircle: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: ms(2),
    borderColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: ms(2) },
    shadowOpacity: 0.25,
    shadowRadius: ms(4),
  },
  premiumDestArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
