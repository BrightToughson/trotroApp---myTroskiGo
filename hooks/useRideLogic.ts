import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Mapbox from "../components/MapViewWrapper";
import { HistoryService } from "../lib/HistoryService";
import { FareService } from "../lib/FareService";
import { RouteCacheService } from "../lib/RouteCacheService";
import {
    FARE_CONSTANTS,
    Location,
    TransitLeg,
    calculateDistance,
    findNearestStop,
    findStopsAlongRoute,
    findTransitPathViaAnchors as findTransitPath,
    getCurrentUserLocation,
    getRoute,
    getMultiPointRoute,
    watchUserLocation,
    ROUTING_CONFIG,
    STOP_MAP,
    resolveLocation,
    ActiveLeg,
    TripDetails,
} from "../lib/LocationService";
import { WalkingService, WALKING_CONFIG } from "../constants/WalkingService";
import { LOCAL_STOPS } from "../lib/LocationService";



export const useRideLogic = (
  initialOrigin: string = "Current Location",
  initialDestination: string = "Select Destination",
  originCoordsParam?: string | string[],
  destCoordsParam?: string | string[],
) => {
  const mapRef = useRef<any>(null);

  // State
  const [origin, setOrigin] = useState<string>(initialOrigin);
  const [destination, setDestination] = useState<string>(initialDestination);
  const [originLocation, setOriginLocation] = useState<Location | null>(null);
  const [destinationLocation, setDestinationLocation] =
    useState<Location | null>(null);
  const [priceEstimate, setPriceEstimate] = useState<string | null>(null);
  const [isManualFare, setIsManualFare] = useState<boolean>(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState<"origin" | "destination">(
    "origin",
  );

  // Route Data
  const [activeLegs, setActiveLegs] = useState<ActiveLeg[]>([]);
  const [intermediateStops, setIntermediateStops] = useState<Location[]>([]);
  const [walkingCoordinates, setWalkingCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [walkingCoordinates2, setWalkingCoordinates2] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [transferWalkingCoordinates, setTransferWalkingCoordinates] = useState<
    { latitude: number; longitude: number }[][]
  >([]);
  const [preTripWalkCoords, setPreTripWalkCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [pickupPoint, setPickupPoint] = useState<Location | null>(null);
  const [dropoffPoint, setDropoffPoint] = useState<Location | null>(null);
  const [liveLocation, setLiveLocation] = useState<Location | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [nearbyHubs, setNearbyHubs] = useState<Location[]>([]);

  const initialMount = useRef(true);
  const isMounted = useRef(true);
  const lastRequestTime = useRef(0);
  const currentRequestId = useRef(0);
  const isMapAnimating = useRef(false);
  const lastWalkFetchCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastWalkFetchOriginCoords = useRef<{ latitude: number; longitude: number } | null>(null);

  const verifiedStations = React.useMemo(() => 
    LOCAL_STOPS.filter(s => s.isVerified), 
  []);

  // Update nearby verified hubs for shortcuts - with distance threshold optimization
  const lastNearbyUpdatePos = useRef<Location | null>(null);

  useEffect(() => {
    if (liveLocation?.coordinate) {
        // Only recalculate if we've moved more than 0.5km from the last update point
        if (lastNearbyUpdatePos.current) {
            const moveDist = calculateDistance(liveLocation.coordinate, lastNearbyUpdatePos.current.coordinate);
            if (moveDist < 0.5) return; 
        }

        lastNearbyUpdatePos.current = liveLocation;

        const sorted = verifiedStations
            .map(s => ({
                ...s,
                // @ts-ignore
                dist: calculateDistance(liveLocation.coordinate, s.coordinate)
            }))
            .filter(s => s.dist < 50) // Only hubs within 50km
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 8);
        
        setNearbyHubs(sorted);
    }
  }, [liveLocation?.coordinate, verifiedStations]);

  // Initialize locations from params
  useEffect(() => {
    isMounted.current = true;
    
    // Check for database version changes to clear stale caches
    RouteCacheService.checkVersion();

    let startLoc: Location | null = null;
    let endLoc: Location | null = null;

    const parseCoords = (
      param: string | string[] | undefined,
      name: string,
    ): Location | null => {
      if (!param) return null;
      try {
        const coordsStr = Array.isArray(param) ? param[0] : param;
        // WEB FIX: Sometimes params on web are already objects or encoded differently
        if (typeof coordsStr === 'object') {
           const obj = coordsStr as any;
           if (obj.latitude && obj.longitude) return { name, coordinate: obj };
        }
        
        const coords = JSON.parse(coordsStr);
        if (coords && typeof coords.latitude === "number") {
          return { name, coordinate: coords };
        }
      } catch (e) {
        // Fallback for comma-separated string: "lat,lng"
        const str = Array.isArray(param) ? param[0] : param;
        if (str && str.includes(",")) {
            const [lat, lng] = str.split(",").map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
                return { name, coordinate: { latitude: lat, longitude: lng } };
            }
        }
        console.error("Error parsing coords", e);
      }
      return null;
    };

    startLoc = parseCoords(originCoordsParam, initialOrigin);
    if (startLoc) {
      startLoc = resolveLocation(startLoc);
      if (isMounted.current) {
        setOriginLocation(startLoc);
        setOrigin(initialOrigin);
      }
    }

    endLoc = parseCoords(destCoordsParam, initialDestination);
    if (endLoc) {
      endLoc = resolveLocation(endLoc);
      if (isMounted.current) {
        setDestinationLocation(endLoc);
        setDestination(initialDestination);
      }
    } else if (isMounted.current) {
      setDestinationLocation(null);
      setDestination(initialDestination);
    }

    if (endLoc && !startLoc && mapRef.current) {
      // Focus on dest if only dest is known
      // WEB STABILITY: Ensure animation call is safe or handled
      if (Platform.OS !== 'web') {
        requestAnimationFrame(() => {
          try {
              if (mapRef.current && endLoc) {
                mapRef.current.setCamera({
                  centerCoordinate: [endLoc.coordinate.longitude, endLoc.coordinate.latitude],
                  zoomLevel: 14,
                  animationDuration: 1000,
                });
              }
          } catch (e) {
            console.error("AnimateToRegion failed in init", e);
          }
        });
      }
    }

    const initGPS = async () => {
      // If we don't have an origin coordinate from params, we auto-detect
      if (!startLoc) {
        if (isMounted.current) setOrigin("Locating...");
        const loc = await getCurrentUserLocation();
        
        if (loc && isMounted.current) {
          setLiveLocation(loc); // Render current location dot instantly
          
            // Find nearest verified station to snap the start point like in B
            let nearest: any = null;
            let minDist = Infinity;
            verifiedStations.forEach(s => {
                // Fast rejection (0.02 degrees ~ 2km) to avoid heavy trig
                if (Math.abs(s.coordinate.latitude - loc.coordinate.latitude) > 0.02 || 
                    Math.abs(s.coordinate.longitude - loc.coordinate.longitude) > 0.02) {
                    return;
                }
                const dist = calculateDistance(loc.coordinate, s.coordinate);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = s;
                }
            });

          // Snap if within 2km, otherwise fallback to exact GPS
          if (nearest && minDist < 2.0) {
              setOriginLocation(nearest);
              setOrigin(nearest.name);
          } else {
              setOriginLocation(loc);
              setOrigin(loc.name || "My Location");
          }
        } else if (isMounted.current) {
          setOrigin(initialOrigin);
        }
      }
    };

    initGPS();

    return () => {
      isMounted.current = false;
    };
  }, [originCoordsParam, destCoordsParam, initialOrigin, initialDestination]);

  // Sync Effect: Trigger route calc whenever BOTH locations are available or changed
  useEffect(() => {
    if (originLocation && destinationLocation && !loading) {
      fetchRouteAndPrice(originLocation, destinationLocation);
    }
  }, [originLocation, destinationLocation]);

  const isNavigationModeRef = useRef(isNavigationMode);
  useEffect(() => {
    isNavigationModeRef.current = isNavigationMode;
  }, [isNavigationMode]);

  // Live Location Watcher
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let lastRecalcCoords: { latitude: number; longitude: number } | null = null;

    const startWatching = async () => {
      try {
        let lastLiveUpdate = 0;
        subscription = await watchUserLocation(async (loc) => {
          if (!isMounted.current) return;
          
          const now = Date.now();
          const throttleInterval = isNavigationModeRef.current ? 1200 : 3000;
          if (now - lastLiveUpdate > throttleInterval) {
            setLiveLocation(loc);
            lastLiveUpdate = now;
          }

          // AUTO-SNAP LOGIC: Only update if the user hasn't manually picked a fixed location yet
          const isOriginDefault = !originLocation || originLocation.type === 'gps' || origin === "Locating...";
          
          if (isOriginDefault && (now - lastRequestTime.current > 10000)) {
            // Find nearest verified station to snap the start point like in B
            let nearest: any = null;
            let minDist = Infinity;
            verifiedStations.forEach(s => {
                // Fast rejection (0.02 degrees ~ 2km) to avoid heavy trig
                if (Math.abs(s.coordinate.latitude - loc.coordinate.latitude) > 0.02 || 
                    Math.abs(s.coordinate.longitude - loc.coordinate.longitude) > 0.02) {
                    return;
                }
                const dist = calculateDistance(loc.coordinate, s.coordinate);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = s;
                }
            });

            if (nearest && minDist < 2.0 && isMounted.current) {
              const stopLoc: Location = {
                ...nearest,
                type: "gps", // marked as GPS/default so it can update if they move
              };

              // Only update if the stop has changed to avoid UI flickering
              if (stopLoc.name !== origin) {
                setOrigin(stopLoc.name);
                setOriginLocation(stopLoc);
                
                // If we already have a destination, trigger a re-route
                if (destinationLocation) {
                  fetchRouteAndPrice(stopLoc, destinationLocation);
                }
              } else if (destinationLocation) {
                // If the stop hasn't changed but we moved significantly, re-route from new GPS point
                const dist = lastRecalcCoords
                  ? calculateDistance(loc.coordinate, lastRecalcCoords)
                  : 1;
                if (dist > 0.4) {
                  lastRecalcCoords = loc.coordinate;
                  fetchRouteAndPrice(stopLoc, destinationLocation);
                }
              }
            }
          }
        });
      } catch (e) {
        console.error("WatchLocation Error", e);
      }
    };

    startWatching();
    return () => {
      if (subscription && typeof subscription.remove === "function") {
        try {
          subscription.remove();
        } catch (e) {}
      }
    };
  }, [origin, destinationLocation]);

  const fetchWalkPath = async (start: Location, end: Location) => {
    try {
      const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_KEY;
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.coordinate.longitude},${start.coordinate.latitude};${end.coordinate.longitude},${end.coordinate.latitude}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const coordsArray = data.routes[0].geometry.coordinates;
        return coordsArray.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0]
        }));
      }
      return null;
    } catch (e) {
      console.error("Mapbox Walk path fetch exception:", e);
      return null;
    }
  };

  // Fetch walk path from live location to pickup point
  useEffect(() => {
    if (liveLocation && originLocation) {
      const distToLastFetch = lastWalkFetchCoords.current 
        ? calculateDistance(liveLocation.coordinate, lastWalkFetchCoords.current) 
        : 1;
      const originDistToLastFetch = lastWalkFetchOriginCoords.current
        ? calculateDistance(originLocation.coordinate, lastWalkFetchOriginCoords.current)
        : Infinity;
        
      // Fetch if user moved > 50m OR if the origin location moved AT ALL (> 2 meters)
      if ((distToLastFetch > 0.05 || originDistToLastFetch > 0.002) && calculateDistance(liveLocation.coordinate, originLocation.coordinate) > 0.01) {
        lastWalkFetchCoords.current = liveLocation.coordinate;
        lastWalkFetchOriginCoords.current = originLocation.coordinate;
        
        if (originLocation.coordinate?.latitude && originLocation.coordinate?.longitude) {
          fetchWalkPath(liveLocation, originLocation).then(coords => {
            if (isMounted.current && coords && coords.length > 0) {
              setPreTripWalkCoords(coords);
            } else if (isMounted.current) {
              setPreTripWalkCoords([]);
            }
          });
        }
      } else if (calculateDistance(liveLocation.coordinate, originLocation.coordinate) <= 0.01) {
        setPreTripWalkCoords([]);
      }
    } else {
      setPreTripWalkCoords([]);
    }
  }, [liveLocation, originLocation]);

  const fetchRouteAndPrice = async (
    start: Location | null,
    end: Location | null,
  ) => {
    if (!start || !end) return;
    
    const requestId = ++currentRequestId.current;
    lastRequestTime.current = Date.now();
    
    if (isMounted.current) {
        setActiveLegs([]);
        setIntermediateStops([]);
        setWalkingCoordinates([]);
        setWalkingCoordinates2([]);
        setTransferWalkingCoordinates([]);
        setPriceEstimate(null);
        setTripDetails(null);
        setPickupPoint(null);
        setDropoffPoint(null);
    }
    
    setLoading(true);

    try {
        // 1. Identify Pickup & Dropoff
        // We no longer snap to nearest registered stations because the user can board the Trotro anywhere along the route!
        let rawHub1 = start;
        let rawHub2 = end;

        let walkStartCoord = start.coordinate;
        
        // 2. Find Transit Path via Anchors (using exact coordinates)
        const transitLegs = await findTransitPath(rawHub1, rawHub2);
        const newActiveLegs: ActiveLeg[] = [];

        let actualPickupPoint = rawHub1;
        let actualDropoffPoint = rawHub2;

        if (transitLegs && transitLegs.length > 0) {
            const firstLeg = transitLegs[0];
            const lastLeg = transitLegs[transitLegs.length - 1];

            // The exact boarding point on the road is slicedWaypoints[0], which is now routeWaypoints[0]
            if (firstLeg.routeWaypoints && firstLeg.routeWaypoints.length > 0) {
                actualPickupPoint = firstLeg.routeWaypoints[0];
            }
            if (lastLeg.routeWaypoints && lastLeg.routeWaypoints.length > 0) {
                actualDropoffPoint = lastLeg.routeWaypoints[lastLeg.routeWaypoints.length - 1];
            }
        } else {
            // Fallback to findNearestStop only if no transit path found
            if (start.type !== 'station') {
               const nearest = await findNearestStop(start.coordinate.latitude, start.coordinate.longitude);
               if (nearest) actualPickupPoint = nearest;
            }
            if (end.type !== 'station') {
               const nearest = await findNearestStop(end.coordinate.latitude, end.coordinate.longitude);
               if (nearest) actualDropoffPoint = nearest;
            }
        }

        setPickupPoint(actualPickupPoint);
        setDropoffPoint(actualDropoffPoint);

        // 3. Generate Walk to actual Pickup Point
        let walkRoute1 = await WalkingService.getWalkToHub(walkStartCoord, actualPickupPoint.coordinate);
        
        if (requestId !== currentRequestId.current || !isMounted.current) return;
        
        let finalWalkCoords = walkRoute1?.coordinates || [walkStartCoord, actualPickupPoint.coordinate];
        setWalkingCoordinates(finalWalkCoords);

        let totalWalkMins1 = walkRoute1?.duration || ((calculateDistance(walkStartCoord, actualPickupPoint.coordinate) / FARE_CONSTANTS.WALKING_SPEED_KMPH) * 60);
        let totalWalkMins2 = 0;
        let totalTravelMins = 0;
        let totalTrafficMins = 0;
        let totalWaitMins = 0;
        let totalMinFare = 0;
        let totalMaxFare = 0;
        let isAnyManualFare = false;

        if (transitLegs && transitLegs.length > 0) {
            const newIntermediateStops: Location[] = [];
            const transferWalks: { latitude: number; longitude: number }[][] = [];

            for (let i = 0; i < transitLegs.length; i++) {
                const leg = transitLegs[i];
                
                // We already have beautifully stitched geometry from anchorRoutes!
                // Do NOT pass this to OSRM Driving API, as it will cause zig-zags trying to visit every point.
                const waypoints = leg.routeWaypoints || [];
                const legCoords = waypoints.map(w => w.coordinate);
                
                // Calculate total path distance
                let polylineDistance = 0;
                for (let j = 0; j < legCoords.length - 1; j++) {
                    polylineDistance += calculateDistance(legCoords[j], legCoords[j+1]);
                }
                
                const routeInfo = {
                    coordinates: legCoords,
                    distance: polylineDistance,
                    // Estimate trotro speed at ~20km/h (3 mins per km) in traffic
                    duration: polylineDistance * 3 * ROUTING_CONFIG.TRAFFIC_MULTIPLIER
                };
                
                // Fetch fare for this specific leg
                const manualFare = FareService.getRawManualFare(leg.startStop.name, leg.endStop.name);
                
                let minFare = 0, maxFare = 0;
                let priceRange = "TBD";
                
                if (manualFare) {
                    minFare = manualFare.min;
                    maxFare = manualFare.max;
                    priceRange = `GHS ${minFare.toFixed(2)} - ${maxFare.toFixed(2)}`;
                    isAnyManualFare = true;
                } else {
                    // DYNAMIC FALLBACK: If fare is missing in database, compute on-the-fly based on leg distance
                    const legDistance = routeInfo?.distance || calculateDistance(leg.startStop.coordinate, leg.endStop.coordinate);
                    minFare = Math.round((3.0 + legDistance * 0.5) * 2) / 2;
                    maxFare = Math.round((minFare * 1.15) * 2) / 2;
                    priceRange = `GHS ${minFare.toFixed(2)} - ${maxFare.toFixed(2)} (Est.)`;
                }

                const baseTravelDuration = polylineDistance * 3;
                const trafficDelay = (polylineDistance * 3 * ROUTING_CONFIG.TRAFFIC_MULTIPLIER) - baseTravelDuration;

                totalWaitMins += ROUTING_CONFIG.BOARDING_PENALTY_MINS;
                totalMinFare += minFare;
                totalMaxFare += maxFare;
                totalTravelMins += baseTravelDuration;
                totalTrafficMins += trafficDelay;

                newActiveLegs.push({
                    startStop: leg.startStop,
                    endStop: leg.endStop,
                    lineName: leg.lineName,
                    coordinates: legCoords,
                    distance: routeInfo?.distance || 0,
                    duration: Math.round(routeInfo?.duration || 0),
                    passedStops: waypoints,
                    fare: priceRange,
                });

                newIntermediateStops.push(leg.endStop);

                // If there's a next leg, calculate transfer walk
                if (i < transitLegs.length - 1) {
                    const nextLeg = transitLegs[i+1];
                    const tWalk = await WalkingService.getWalkToHub(leg.endStop.coordinate, nextLeg.startStop.coordinate);
                    transferWalks.push(tWalk?.coordinates || [leg.endStop.coordinate, nextLeg.startStop.coordinate]);
                    totalTravelMins += tWalk?.duration || 0;
                }
            }

            // 4. Generate Walk from Final Dropoff Point
            let walkRoute2 = await WalkingService.getWalkToHub(actualDropoffPoint.coordinate, end.coordinate);
            let finalWalkCoords2 = walkRoute2?.coordinates || [actualDropoffPoint.coordinate, end.coordinate];
            setWalkingCoordinates2(finalWalkCoords2);

            totalWalkMins2 = walkRoute2?.duration || ((calculateDistance(actualDropoffPoint.coordinate, end.coordinate) / FARE_CONSTANTS.WALKING_SPEED_KMPH) * 60);

            setActiveLegs(newActiveLegs);
            setIntermediateStops(newIntermediateStops);
            setTransferWalkingCoordinates(transferWalks);
            
            // Set Aggregate Pricing
            let finalPrice = "TBD";
            if (totalMinFare > 0) {
               finalPrice = `GHS ${totalMinFare.toFixed(2)} - ${totalMaxFare.toFixed(2)}`;
            }
            // Removed '(Manual)' suffix from finalPrice based on user feedback
            
            setPriceEstimate(finalPrice);

            setIsManualFare(isAnyManualFare);
        } else {
            // No transit route found
            setPriceEstimate("No Route Found");
            setIsManualFare(false);
        }

        setTripDetails({
            walkMins1: totalWalkMins1 > 0.1 ? Math.max(1, Math.round(totalWalkMins1)) : 0,
            walkMins2: totalWalkMins2 > 0.1 ? Math.max(1, Math.round(totalWalkMins2)) : 0,
            travelMins: Math.round(totalTravelMins),
            trafficMins: Math.round(totalTrafficMins),
            waitTimeMins: Math.round(totalWaitMins),
        });

        // Fit map to show the entire route
        const allPoints = [
           ...finalWalkCoords,
           ...(newActiveLegs || []).flatMap(l => l.coordinates),
           end.coordinate
        ].filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude));

        if (allPoints.length > 0 && mapRef.current && Platform.OS !== 'web' && !isMapAnimating.current) {
            try {
                isMapAnimating.current = true;
                let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
                for (const p of allPoints) {
                    if (p.latitude < minLat) minLat = p.latitude;
                    if (p.latitude > maxLat) maxLat = p.latitude;
                    if (p.longitude < minLon) minLon = p.longitude;
                    if (p.longitude > maxLon) maxLon = p.longitude;
                }
                const minDelta = 0.005;
                if (maxLat - minLat < minDelta) { maxLat += minDelta/2; minLat -= minDelta/2; }
                if (maxLon - minLon < minDelta) { maxLon += minDelta/2; minLon -= minDelta/2; }
                
                mapRef.current.fitBounds(
                    [maxLon, maxLat],
                    [minLon, minLat],
                    [100, 50, 300, 50],
                    1000
                );
                setTimeout(() => { isMapAnimating.current = false; }, 1000);
            } catch (e) {
               isMapAnimating.current = false;
            }
        }

        setLoading(false);
    } catch (err) {
      console.error("Routing Error", err);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };
  const handleSelectLocation = (location: Location, fieldOverride?: "origin" | "destination" | "stop" | "transfer") => {
    const targetField = fieldOverride || activeField || "destination";
    console.log(`[Location Selection] Updating ${targetField} with location:`, location.name);
    
    if (targetField === "origin") {
      setOrigin(location.name);
      setOriginLocation(location);
    } else {
      setDestination(location.name);
      setDestinationLocation(location);
    }
  };

  const openSearch = (field: "origin" | "destination") => {
    console.log(`[Search Open] Opening search for:`, field);
    setActiveField(field);
    setModalVisible(true);
  };

  const saveRide = async (): Promise<boolean> => {
    if (!originLocation || !destinationLocation || !priceEstimate || loading)
      return false;

    try {
      await HistoryService.addRide({
        origin: origin,
        destination: destination,
        originCoords: JSON.stringify(originLocation.coordinate),
        destCoords: JSON.stringify(destinationLocation.coordinate),
        price: priceEstimate,
        status: "completed",
        duration: tripDetails?.travelMins || 0,
      });
      return true;
    } catch (e) {
      console.error("Failed to save ride", e);
      return false;
    }
  };

  const handleStartTrip = () => {
    setIsNavigationMode(true);
  };

  const resetRide = () => {
    setDestination(initialDestination);
    setDestinationLocation(null);
    setActiveLegs([]);
    setIntermediateStops([]);
    setWalkingCoordinates([]);
    setWalkingCoordinates2([]);
    setTransferWalkingCoordinates([]);
    setPriceEstimate(null);
    setTripDetails(null);
    setIsNavigationMode(false);
  };

  const handleEndJourney = async () => {
    await saveRide();
    resetRide();
  };

  const snapToCurrentLocation = async () => {
    const loc = await getCurrentUserLocation();
    if (loc && isMounted.current) {
        // Find nearest verified station to snap the start point like in B
        let nearest: any = null;
        let minDist = Infinity;
        verifiedStations.forEach(s => {
            // Fast rejection (0.02 degrees ~ 2km) to avoid heavy trig
            if (Math.abs(s.coordinate.latitude - loc.coordinate.latitude) > 0.02 || 
                Math.abs(s.coordinate.longitude - loc.coordinate.longitude) > 0.02) {
                return;
            }
            const dist = calculateDistance(loc.coordinate, s.coordinate);
            if (dist < minDist) {
                minDist = dist;
                nearest = s;
            }
        });

        const finalLoc = (nearest && minDist < 2.0) ? nearest : loc;
        const finalName = finalLoc.name || "My Location";

        setOrigin(finalName);
        setOriginLocation(finalLoc);
        if (destinationLocation) {
            fetchRouteAndPrice(finalLoc, destinationLocation);
        }
    }
  };

  return {
    mapRef,
    origin,
    destination,
    originLocation,
    destinationLocation,
    priceEstimate,
    isManualFare,
    modalVisible,
    setModalVisible,
    activeField,
    resetRide,

    activeLegs,
    walkingCoordinates,
    walkingCoordinates2,
    transferWalkingCoordinates,
    pickupPoint,
    dropoffPoint,
    liveLocation,
    tripDetails,
    loading,
    isNavigationMode,
    handleStartTrip,
    openSearch,
    handleSelectLocation,
    handleEndJourney,
    snapToCurrentLocation,
    nearbyHubs,
    intermediateStops,
    verifiedStations,
    preTripWalkCoords,
  };
};
