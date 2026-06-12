import * as ExpoLocation from "expo-location";
import { Platform } from "react-native";
import { Location, StopType, TransitLeg, TripDetails, ActiveLeg } from "../constants/types";
import { RouteCacheService } from "./RouteCacheService";
import { supabase } from "./supabase";
// Removed heavy unused ANCHOR_ROUTES payload

const osmStopsData = require('../osrm routes/allStops.json');

export const OSM_STOPS: Location[] = osmStopsData.features.map((f: any) => {
  const isGeneric = !f.properties.name || f.properties.name === "OpenStreetMap Stop";
  return {
    name: isGeneric ? "Unnamed Local Stop" : f.properties.name,
    coordinate: {
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
    },
    address: f.properties.region ? `${f.properties.region} Area` : "Local Transit Hub",
    type: "station",
    isVerified: true,
    region: f.properties.region
  };
});

export { Location, StopType, TransitLeg, TripDetails, ActiveLeg };

// Simple in-memory cache for search results
const searchCache = new Map<string, Location[]>();
const routeCache = new Map<string, RouteInfo[]>();
const stopCache = new Map<string, Location | null>();
const CACHE_LIMIT = 50;

/**
 * Global Fare Constants for the app.
 */
export const FARE_CONSTANTS = {
  BASE_FARE: 3.0, // 2026 Adjusted Base (Min. Fare)
  PRICE_PER_KM: 0.5, // 2026 Average per KM
  WALKING_SPEED_KMPH: 3.2, // Slowed down from 4.5 to account for heat and urban terrain
};

export const ROUTING_CONFIG = {
  TRAFFIC_MULTIPLIER: 1.8, // Accra Trotro traffic multiplier
  WALKING_SAFETY_BUFFER: 1.25, // Extra time for slow walkers/traffic lights
  BOARDING_PENALTY_MINS: 5.0, // Initial wait + frequency at hubs
};

/** Route styling tokens **/
export const WALKING_ROUTE_COLOR = "#0d9488"; // Distinct Teal for walking
const TRANSFER_ROUTE_COLORS = [
    "#3b82f6", // 1st leg: Standard Blue
    "#f59e0b", // 2nd leg: Amber Orange
    "#10b981", // 3rd leg: Emerald Green
    "#8b5cf6", // 4th leg: Violet
    "#ef4444"  // 5th leg: Red
];

export const getRouteColor = (index: number, totalLegs: number): string => {
    // If we only have one leg, use the standard blue
    if (totalLegs <= 1) return TRANSFER_ROUTE_COLORS[0];
    if (typeof index !== 'number' || isNaN(index)) return TRANSFER_ROUTE_COLORS[0];
    return TRANSFER_ROUTE_COLORS[index % TRANSFER_ROUTE_COLORS.length];
};

/**
 * Iteratively simplifies coordinates using the Douglas-Peucker algorithm.
 */
export const simplifyCoordinates = (coords: any[], tolerance = 0.00001): any[] => {
  if (!coords || coords.length <= 2) return coords || [];

  const getDistanceSq = (pt: any, lineStart: any, lineEnd: any): number => {
    if (!pt || !lineStart || !lineEnd) return 0;
    if (typeof pt.latitude !== 'number' || typeof lineStart.latitude !== 'number' || typeof lineEnd.latitude !== 'number') return 0;

    const dx = lineEnd.longitude - lineStart.longitude;
    const dy = lineEnd.latitude - lineStart.latitude;
    const magSq = Math.pow(dy, 2) + Math.pow(dx, 2);
    
    if (magSq < 1e-12) {
        return Math.pow(pt.latitude - lineStart.latitude, 2) + Math.pow(pt.longitude - lineStart.longitude, 2);
    }

    const u = ((pt.latitude - lineStart.latitude) * dy + (pt.longitude - lineStart.longitude) * dx) / magSq;
    const x = lineStart.latitude + u * dy;
    const y = lineStart.longitude + u * dx;

    return Math.pow(pt.latitude - x, 2) + Math.pow(pt.longitude - y, 2);
  };

  const stack: [number, number][] = [[0, coords.length - 1]];
  const kept = new Set<number>([0, coords.length - 1]);
  const tolSq = Math.pow(tolerance, 2);

  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    let maxDistSq = 0;
    let index = 0;

    for (let i = start + 1; i < end; i++) {
        const distSq = getDistanceSq(coords[i], coords[start], coords[end]);
        if (distSq > maxDistSq) {
            maxDistSq = distSq;
            index = i;
        }
    }

    if (maxDistSq > tolSq) {
        kept.add(index);
        stack.push([start, index]);
        stack.push([index, end]);
    }
  }

  return Array.from(kept)
    .sort((a, b) => a - b)
    .map(idx => coords[idx])
    .filter(c => 
        c && 
        typeof c.latitude === 'number' && 
        typeof c.longitude === 'number' && 
        !isNaN(c.latitude) && 
        !isNaN(c.longitude) && 
        isFinite(c.latitude) && 
        isFinite(c.longitude)
    );
};

export const LOCAL_STOPS: Location[] = OSM_STOPS;

export const STOP_MAP: Record<string, Location> = OSM_STOPS.reduce(
  (acc, stop) => {
    // Favor verified stops if there's a name collision
    if (!acc[stop.name] || (stop.isVerified && !acc[stop.name].isVerified)) {
      acc[stop.name] = stop;
    }
    return acc;
  },
  {} as Record<string, Location>,
);

/**
 * Universal Coordinate Resolver:
 * Ensures that if a location (from history, OSM, or GPS) is near an official hub,
 * it "snaps" to the verified coordinates from TransitRegistry.ts.
 */
export const resolveLocation = (loc: Location): Location => {
  if (!loc || !loc.coordinate) return loc;
  
  const lowerName = (loc.name || "").toLowerCase().trim();
  
  // 1. Direct Match Check (Snaps to registry coordinates by name)
  const direct = STOP_MAP[loc.name];
  if (direct) {
      return { ...loc, ...direct };
  }

  // 2. Proximity + Fuzzy Name Check
  // Finds any registry stop within 1.2km that has a similar name
  // Sort by verified status first so we favor verified hubs
  const sortedStops = [...OSM_STOPS].sort((a, b) => (a.isVerified === b.isVerified ? 0 : a.isVerified ? -1 : 1));
  
  const official = sortedStops.find(s => {
    const dist = calculateDistance(loc.coordinate, s.coordinate);
    const sLower = s.name.toLowerCase();
    const nameMatch = sLower.includes(lowerName) || lowerName.includes(sLower);
    
    return (dist < 1.2 && nameMatch);
  });

  if (official) {
    return { ...loc, ...official };
  }

  return loc;
};


// TRANSIT_LINES has been moved to lib/TransitLines.ts


export const getStopsBetween = (
  startStop: Location,
  endStop: Location,
): Location[] => {
  return [startStop, endStop];
};

// ANCHOR ROUTE LOGIC

export const findTransitPathViaAnchors = async (
  startStop: Location,
  endStop: Location,
): Promise<TransitLeg[] | null> => {
  // 1. Check Community Database (Supabase) FIRST
  try {
    const { data: communityRoutes } = await supabase
      .from('routes')
      .select('*')
      .ilike('origin', `%${startStop.name}%`)
      .ilike('destination', `%${endStop.name}%`)
      .limit(1);

    if (communityRoutes && communityRoutes.length > 0) {
       const cRoute = communityRoutes[0];
       let pathCoords: {latitude: number, longitude: number}[] = [];
       
       // If it has GPS waypoints, use them!
       if (cRoute.waypoints && Array.isArray(cRoute.waypoints) && cRoute.waypoints.length > 0) {
           if (typeof cRoute.waypoints[0] === 'object' && cRoute.waypoints[0].latitude) {
               // Live GPS Track
               pathCoords = cRoute.waypoints;
           } else if (typeof cRoute.waypoints[0] === 'object' && cRoute.waypoints[0].coordinate) {
               // Stops with coordinates added via "Choose on Map"
               const stopCoords = cRoute.waypoints.map((w: any) => ({
                 latitude: w.coordinate.latitude,
                 longitude: w.coordinate.longitude
               }));
               // Generate a perfectly matched street route passing through all stops
               const multiRoute = await getMultiPointRoute([startStop.coordinate, ...stopCoords, endStop.coordinate], "driving");
               if (multiRoute) {
                   pathCoords = multiRoute.coordinates;
               }
           }
       }

       // If no GPS waypoints or mapping failed, fetch a direct OSM driving route just to draw the line on the road
       if (pathCoords.length === 0) {
           const osrmRoutes = await getRoutes(startStop.coordinate, endStop.coordinate, "driving");
           if (osrmRoutes && osrmRoutes.length > 0) {
               pathCoords = osrmRoutes[0].coordinates;
           } else {
               // Absolute fallback: straight line
               pathCoords = [startStop.coordinate, endStop.coordinate];
           }
       }

       // Add the actual stops to the routeWaypoints so they appear as dots on the map
       const mappedWaypoints = cRoute.waypoints && Array.isArray(cRoute.waypoints) && typeof cRoute.waypoints[0] === 'object' && cRoute.waypoints[0].coordinate 
           ? cRoute.waypoints.map((w: any) => ({ name: w.name, coordinate: w.coordinate, type: "station", isVerified: false }))
           : pathCoords.map(c => ({ name: "Waypoint", coordinate: c, type: "station", isVerified: false }));

       const leg: TransitLeg = {
           startStop,
           endStop,
           lineName: "Community Route",
           routeWaypoints: mappedWaypoints,
           coordinates: pathCoords, // Store the raw path for rendering if the UI supports it
       } as any; // Cast as any because TransitLeg in this codebase might not have 'coordinates', but standard useRideLogic relies on routeWaypoints

       return [leg];
    }
  } catch (e) {
    console.warn("Error fetching community route:", e);
  }

  // 2. Fallback to existing Anchor Route Logic
  // Fetch a direct OSRM driving route and scan it for any Major Hubs we pass along the way.
  const osrmRoutes = await getRoutes(startStop.coordinate, endStop.coordinate, "driving");
  if (!osrmRoutes || osrmRoutes.length === 0) return null;

  const osrmCoords = osrmRoutes[0].coordinates;

  const verifiedStations = LOCAL_STOPS.filter(s => s.isVerified);
  const majorHubs = verifiedStations;

  // OPTIMIZATION: Bounding box filter to prevent millions of trig calculations on JS thread
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (let i = 0; i < osrmCoords.length; i += 5) { // Sample every 5th point for bbox
      const c = osrmCoords[i];
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
  }
  // Expand by ~3km (approx 0.03 degrees) to catch hubs just outside the route
  minLat -= 0.03;
  maxLat += 0.03;
  minLon -= 0.03;
  maxLon += 0.03;

  const relevantHubs = majorHubs.filter(h => 
      h.coordinate.latitude >= minLat && h.coordinate.latitude <= maxLat &&
      h.coordinate.longitude >= minLon && h.coordinate.longitude <= maxLon
  );

  const hubsOnRoute: { hub: Location, index: number, degree: number }[] = [];

  for (const hub of relevantHubs) {
      let minD = Infinity;
      let bestIdx = -1;
      for (let i = 0; i < osrmCoords.length; i++) {
          const c = osrmCoords[i];
          // Fast BBox rejection before heavy trig (0.015 degrees ~ 1.5km)
          if (Math.abs(hub.coordinate.latitude - c.latitude) > 0.015 || 
              Math.abs(hub.coordinate.longitude - c.longitude) > 0.015) {
              continue;
          }
          const d = calculateDistance(hub.coordinate, c);
          if (d < minD) {
              minD = d;
              bestIdx = i;
          }
      }
      if (minD < 1.0 && bestIdx !== -1) {
          const distFromStart = calculateDistance(startStop.coordinate, hub.coordinate);
          const distFromEnd = calculateDistance(endStop.coordinate, hub.coordinate);
          if (distFromStart > 2.5 && distFromEnd > 2.5) {
              hubsOnRoute.push({
                  hub: { ...hub, name: hub.name.charAt(0).toUpperCase() + hub.name.slice(1), type: "station", isVerified: true },
                  index: bestIdx,
                  degree: 1
              });
          }
      }
  }

  hubsOnRoute.sort((a, b) => b.degree - a.degree);
  const topHubs = hubsOnRoute.slice(0, 2);
  
  let splitIndices: { hub: Location, index: number }[] = [];
  for (const h of topHubs) {
      splitIndices.push({ hub: h.hub, index: h.index });
  }

  splitIndices.sort((a, b) => a.index - b.index);

  const filteredSplits = [];
  let lastIdx = -100;
  for (const split of splitIndices) {
      if (split.index - lastIdx > 50) {
          filteredSplits.push(split);
          lastIdx = split.index;
      }
  }
  splitIndices = filteredSplits;

  // If we found NO hubs, just return a Direct Ride!
  if (splitIndices.length === 0) {
      return [{
          startStop: { ...startStop, type: "station", isVerified: true },
          endStop: { ...endStop, type: "station", isVerified: true },
          lineName: "Direct Ride",
          routeWaypoints: osrmCoords.map(c => ({
              name: "Waypoint", coordinate: c, type: "station", isVerified: true
          }))
      }];
  }

  // Slice the OSRM path dynamically
  const finalRoute: TransitLeg[] = [];
  let currentStart: Location = { ...startStop, type: "station" as StopType, isVerified: true };
  let currentStartIndex = 0;

  for (let i = 0; i < splitIndices.length; i++) {
      const split = splitIndices[i];
      const segmentCoords = osrmCoords.slice(currentStartIndex, split.index + 1);
      finalRoute.push({
          startStop: currentStart,
          endStop: split.hub,
          lineName: i === 0 ? "Initial Ride" : "Connecting Ride",
          routeWaypoints: segmentCoords.map(c => ({
              name: "Waypoint", coordinate: c, type: "station", isVerified: true
          }))
      });
      currentStart = split.hub;
      currentStartIndex = split.index;
  }

  const finalSegmentCoords = osrmCoords.slice(currentStartIndex);
  finalRoute.push({
      startStop: currentStart,
      endStop: { ...endStop, type: "station", isVerified: true },
      lineName: "Final Connecting Ride",
      routeWaypoints: finalSegmentCoords.map(c => ({
          name: "Waypoint", coordinate: c, type: "station", isVerified: true
      }))
  });

  return finalRoute;
};

// GLOBAL ABORT CONTROLLER for search stabilization
let currentSearchController: AbortController | null = null;

/**
 * Reverse geocodes a coordinate into a human-readable address via Nominatim.
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { timeout: 5000, headers: { "User-Agent": "TrotroApp/1.0 (Ghana Transit App)" } }
    );
    if (!response.ok) throw new Error("Reverse geocode failed");
    const data = await response.json();
    return data.display_name || "Unknown Location";
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return "Dropped Pin";
  }
};

/**
 * Searches for locations using OpenStreetMap (OSM) via Nominatim.
 */
export const searchLocations = async (query: string): Promise<Location[]> => {
  if (!query || query.trim().length < 1) return [];

  // STABILITY FIX: Cancel any previous search requests that are still in flight
  if (currentSearchController) {
    currentSearchController.abort();
  }
  currentSearchController = new AbortController();
  const signal = currentSearchController.signal;

  // 1.2 Query Hardening (Aggressive Normalization)
  // This prevents generic OSM searches from returning dozens of non-transit results
  let processedQuery = (query || "").toLowerCase().trim();
  
  // Custom Accra Normalizations
  if (processedQuery === "lapaz") processedQuery = "lapaz bus stop";
  if (processedQuery === "madina") processedQuery = "madina station";
  if (processedQuery === "circle") processedQuery = "kwame nkrumah interchange";
  if (processedQuery === "kaneshie") processedQuery = "kaneshie market bus stop";
  if (processedQuery === "tema") processedQuery = "tema station accra";
  if (processedQuery === "accra") processedQuery = "accra central bus station";
  if (processedQuery === "legon") processedQuery = "university of ghana legon";
  if (processedQuery === "shiashie") processedQuery = "shiashie bus stop";
  if (processedQuery.includes("after six") || processedQuery.includes("after 6")) processedQuery = "oyarifa after six";

  if (searchCache.has(processedQuery)) {
    return searchCache.get(processedQuery)!;
  }

  // 1.5 Persistent Cache Layer
  const persistentCached = await RouteCacheService.getCachedSearch(processedQuery);
  if (persistentCached) {
    searchCache.set(processedQuery, persistentCached);
    return persistentCached;
  }

  if (searchCache.size >= CACHE_LIMIT) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }

  // 1. Instant offline search against the 1,467+ local Trotro stops
  const localMatches = LOCAL_STOPS.filter((stop) =>
    stop?.name?.toLowerCase().includes(processedQuery),
  );

  // 1.5 Query Supabase for community-contributed routes and stops
  let communityMatches: Location[] = [];
  try {
    const { data: routes } = await supabase
      .from('routes')
      .select('origin, destination')
      .or(`origin.ilike.%${processedQuery}%,destination.ilike.%${processedQuery}%`)
      .limit(10);
      
    const { data: stops } = await supabase
      .from('stops')
      .select('name')
      .ilike('name', `%${processedQuery}%`)
      .limit(10);

    const uniqueCommunityNames = new Set<string>();
    
    if (routes) {
      routes.forEach((r: any) => {
        if (r.origin && r.origin.toLowerCase().includes(processedQuery)) uniqueCommunityNames.add(r.origin);
        if (r.destination && r.destination.toLowerCase().includes(processedQuery)) uniqueCommunityNames.add(r.destination);
      });
    }
    if (stops) {
      stops.forEach((s: any) => {
        if (s.name) uniqueCommunityNames.add(s.name);
      });
    }

    communityMatches = Array.from(uniqueCommunityNames).map(name => ({
      name,
      coordinate: { latitude: 5.6037, longitude: -0.1870 }, // Default coordinate as community entries lack coords
      type: "station",
      isVerified: false,
      isCommunityNode: true
    }));
  } catch (e) {
    console.warn("Failed to fetch community locations:", e);
  }

  // Merge local matches and community matches
  const combinedLocalAndCommunity = [...communityMatches, ...localMatches];

  // PERFORMANCE OPTIMIZATION: If we have strong local matches (e.g., exact name),
  // we can return them faster or at least prioritize them in the merge.
  // We'll still fetch Nominatim for addresses but with a shorter timeout.

  // 2. Fetch from Nominatim for generic addresses and places
  const encodedQuery = encodeURIComponent(processedQuery);
  const viewbox = "-0.5367,5.8569,0.1417,5.4374";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&addressdetails=1&countrycodes=gh&viewbox=${viewbox}&bounded=1&limit=25`;

  try {
    const maxRetries = 1; // Reduced retries for faster response
    let attempt = 0;
    let response;
    
    while (attempt < maxRetries) {
      try {
        response = await fetchWithTimeout(url, {
          signal,
          timeout: 4000, // Reduced from 10s to 4s for responsive UI
          headers: {
            "User-Agent": "TrotroApp/1.0 (Ghana Transit App)",
          },
        });
        if (response.ok) break;
        throw new Error(`Nominatim error: ${response.status}`);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') throw err;
        attempt++;
        if (attempt >= maxRetries) throw err;
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }

    if (!response) throw new Error("Search failed after retries");
    const data = await response.json();
    if (!Array.isArray(data)) {
      searchCache.set(processedQuery, localMatches || []);
      return localMatches || [];
    }

    const osmResults = data
      .filter((item: any) => item && item.lat && item.lon)
      .map(
        (item: any): Location => ({
          name: (item.name || (item.display_name?.split?.(",")?.[0])) || "Unknown Location",
          coordinate: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          },
          address: item.display_name || "",
          type: item.type || "location",
        }),
      )
      .filter(
        (loc) =>
          loc &&
          loc.coordinate &&
          typeof loc.coordinate.latitude === 'number' && 
          typeof loc.coordinate.longitude === 'number' &&
          !isNaN(loc.coordinate.latitude) && 
          !isNaN(loc.coordinate.longitude) &&
          Math.abs(loc.coordinate.latitude) > 0.1 && // Valid Accra lat
          Math.abs(loc.coordinate.longitude) >= 0 && // Avoid 0,0
          loc.coordinate.latitude !== 0 &&
          loc.coordinate.longitude !== 0
      );

    // Merge: Put local Trotro stops first, then OSM generic results
    // Deduplicate if OSM finds the same name as a local stop
    const finalOsmResults = osmResults.filter((o) => {
      const oName = o?.name?.toLowerCase() || "";
      // Only keep if NOT already present in local verified stops (strict or partial match)
      return !combinedLocalAndCommunity.some((m) => {
        const mName = m?.name?.toLowerCase() || "";
        return mName.includes(oName) || oName.includes(mName);
      });
    });

    // --- UNIVERSAL HUB SNAPPING ---
    // This ensures any variant (OSM or Database) snaps to the verified registry coordinates
    const normalizedResults = [...combinedLocalAndCommunity, ...finalOsmResults].map(loc => resolveLocation(loc));

    // Sort: Exact name matches first
    const sortedResults = normalizedResults.sort((a, b) => {
      const aName = (a?.name || "").toLowerCase().trim();
      const bName = (b?.name || "").toLowerCase().trim();
      const aExact = aName === processedQuery;
      const bExact = bName === processedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });

    // --- DEDUPLICATION ---
    // Prevent showing multiple identical results (e.g., several 'Lapaz Bus Stop' labels)
    const uniqueResults: Location[] = [];
    const seenNames = new Set<string>();
    
    sortedResults.forEach(loc => {
      const cleanName = (loc?.name || "Unknown").trim();
      if (cleanName && !seenNames.has(cleanName)) {
        seenNames.add(cleanName);
        uniqueResults.push(loc);
      }
    });

    // Final Validation & Verification Filter:
    // Only return locations that are either in our verified registry or successfully snapped to one.
    const validatedResults = uniqueResults.filter(l => 
      l?.name && 
      l?.coordinate?.latitude && 
      l?.coordinate?.longitude &&
      !isNaN(l.coordinate.latitude) &&
      !isNaN(l.coordinate.longitude) &&
      (l.isVerified === true || (l as any).isCommunityNode === true) // HARD FILTER: Only show verified transit data or community routes
    );

    searchCache.set(processedQuery, validatedResults);
    await RouteCacheService.saveSearch(processedQuery, validatedResults);
    return validatedResults;
  } catch (error) {
    console.error("OSM Search Error:", error);
    return [];
  }
};

const TO_RAD = Math.PI / 180;

export const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number },
): number => {
  const R = 6371;
  const dLat = (coord2.latitude - coord1.latitude) * TO_RAD;
  const dLon = (coord2.longitude - coord1.longitude) * TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * TO_RAD) *
      Math.cos(coord2.latitude * TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  // NUMERICAL STABILITY CLAMP
  // Prevents precision errors from causing Math.sqrt( negative )
  const clampedA = Math.max(0, Math.min(1, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(Math.max(0, 1 - clampedA)));
  const distance = R * c;

  if (isNaN(distance) || !isFinite(distance)) return 0;
  return distance;
};

// calculateDistance implementation above is used globally for high precision.

export const calculateBearing = (
  start: { latitude: number; longitude: number },
  dest: { latitude: number; longitude: number }
): number => {
  const startLatRad = start.latitude * TO_RAD;
  const destLatRad = dest.latitude * TO_RAD;
  const dLon = (dest.longitude - start.longitude) * TO_RAD;

  const y = Math.sin(dLon) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
            Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(dLon);

  let brng = Math.atan2(y, x) / TO_RAD;
  return (brng + 360) % 360;
};
/**
 * Custom fetch function with timeout capability.
 */
const fetchWithTimeout = async (
  url: string,
  options: { timeout?: number } & RequestInit = {},
) => {
  const { timeout = 8000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export interface RouteInfo {
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  duration: number;
}




/**
 * Fetches the distance matrix from a source to multiple destinations.
 * Used for identifying the stop with the actual shortest walking path.
 */
export const getDistanceTable = async (
  source: { latitude: number; longitude: number },
  destinations: { latitude: number; longitude: number }[],
  profile: "driving" | "walking" = "walking",
): Promise<number[]> => {
  const maxRetries = 2;
  let attempt = 0;

  const performFetch = async () => {
    const coordsStr = [
      `${source.longitude},${source.latitude}`,
      ...destinations.map(d => `${d.longitude},${d.latitude}`)
    ].join(';');
    
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/table/v1/${profile}/${coordsStr}?sources=0&annotations=distance`,
      { timeout: 10000 } // Increased to 10s for stability
    );
    
    if (!response.ok) throw new Error(`OSRM Table Error: ${response.status}`);
    const data = await response.json();
    
    if (data.distances && data.distances[0]) {
      return data.distances[0].slice(1).map((d: number) => d / 1000);
    }
    throw new Error("Invalid distance data received");
  };

  while (attempt < maxRetries) {
    try {
      return await performFetch();
    } catch (error) {
      attempt++;
      console.warn(`Distance table attempt ${attempt} failed:`, error instanceof Error ? error.message : "Timeout");
      if (attempt >= maxRetries) break;
      // Linear backoff: wait 1s, then 2s
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // --- GRACEFUL FALLBACK ---
  // If the API fails after retries, fallback to high-precision Haversine calculations
  // so the user can still find routes based on straight-line proximity.
  console.warn("Falling back to local Haversine distance for table calculation.");
  return destinations.map(dest => calculateDistance(source, dest));
};

/**
 * Snaps a coordinate to the nearest major road.
 * Used for identifying logical "Roadside Pickup" points when far from terminals.
 */
export const snapToRoad = async (
  lat: number,
  lon: number,
): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/nearest/v1/driving/${lon},${lat}?number=1`,
      { timeout: 4000 }
    );
    const data = await response.json();
    if (data.waypoints && data.waypoints[0]) {
      const { location } = data.waypoints[0];
      return { latitude: location[1], longitude: location[0] };
    }
  } catch (error) {
    console.error("Error snapping to road:", error);
  }
  return null;
};

export const getRoutes = async (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  profile: "driving" | "walking" = "driving",
  alternatives: boolean = false,
): Promise<RouteInfo[]> => {
  try {
    const cacheKey = `${profile}-${start.longitude},${start.latitude};${end.longitude},${end.latitude}-${alternatives}`;
    if (routeCache.has(cacheKey)) {
      return routeCache.get(cacheKey)!;
    }

    const altParam = alternatives ? "&alternatives=true" : "";
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/${profile}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson${altParam}`,
      { timeout: 8000 },
    );

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const results = data.routes.map((route: any) => {
        const osrmCoords = route.geometry.coordinates
          .map((coord: number[]) => {
             if (!coord || coord.length < 2) return null;
             return {
                latitude: coord[1],
                longitude: coord[0],
             };
          })
          .filter((c: any) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude) && isFinite(c.latitude) && isFinite(c.longitude));

        // OPTIMIZATION: Simplify path to prevent rendering lag on mobile devices (~5 meters tolerance)
        const simplifiedCoords = simplifyCoordinates(osrmCoords, 0.00005);

        // 20-meter threshold for road-snapping to prevent visual gaps
        const finalizedCoords = [...simplifiedCoords];
        
        // Safety guard: only calculate snapping if we have valid OSRM points
        if (simplifiedCoords.length > 0) {
            if (calculateDistance(start, simplifiedCoords[0]) > 0.020) { // 20 meters
                finalizedCoords.unshift(start);
            }
            if (calculateDistance(end, simplifiedCoords[simplifiedCoords.length - 1]) > 0.020) {
                finalizedCoords.push(end);
            }
        } else {
            // Fallback: If no road points found, ensure we at least show a straight line
            finalizedCoords.push(start, end);
        }

        // Apply realistic buffers based on the travel profile
        let finalDuration = route.duration / 60; // mins

        if (profile === "driving") {
          finalDuration *= ROUTING_CONFIG.TRAFFIC_MULTIPLIER;
        } else if (profile === "walking") {
          finalDuration *= ROUTING_CONFIG.WALKING_SAFETY_BUFFER;
        }

        return {
          coordinates: finalizedCoords,
          distance: route.distance / 1000, // km
          duration: finalDuration,
        };
      });

      if (routeCache.size >= CACHE_LIMIT) {
        const firstKey = routeCache.keys().next().value;
        if (firstKey) routeCache.delete(firstKey);
      }
      routeCache.set(cacheKey, results);

      return results;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching ${profile} route:`, error);
    return [];
  }
};

export const getRoute = async (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number },
  profile: "driving" | "walking" = "driving",
): Promise<RouteInfo | null> => {
  // We removed the straight-line optimization for walking < 0.8km
  // to ensure we always try to get a professional street-following path from OSRM.
  const routes = await getRoutes(start, end, profile, true);

  if (routes.length > 0) {
    if (profile === "driving") {
      const sortedByDuration = [...routes].sort(
        (a, b) => a.duration - b.duration,
      );
      const bestDuration = sortedByDuration[0].duration;
      const candidates = routes.filter((r) => r.duration <= bestDuration * 1.2);
      candidates.sort((a, b) => b.distance - a.distance);
      return candidates[0];
    }
    return routes[0];
  }

  // Fallback to straight line only if API fails
  const dist = calculateDistance(start, end);
  return {
    coordinates: [start, end],
    distance: dist,
    duration: (dist / FARE_CONSTANTS.WALKING_SPEED_KMPH) * 60,
  };
};

export const getMultiPointRoute = async (
  points: { latitude: number; longitude: number }[],
  profile: "driving" | "walking" = "driving"
): Promise<RouteInfo | null> => {
  if (!points || points.length < 2) return null;
  
  const coordsString = points.map(p => `${p.longitude},${p.latitude}`).join(';');
  const cacheKey = `multipoint-${profile}-${coordsString}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)![0] || null;
  }

  try {
    const response = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/${profile}/${coordsString}?overview=full&geometries=geojson`,
      { timeout: 10000 }
    );
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      const osrmCoords = route.geometry.coordinates
        .map((coord: number[]) => {
           if (!coord || coord.length < 2) return null;
           return {
              latitude: coord[1],
              longitude: coord[0],
           };
        })
        .filter((c: any) => c && typeof c.latitude === 'number' && typeof c.longitude === 'number' && !isNaN(c.latitude) && !isNaN(c.longitude) && isFinite(c.latitude) && isFinite(c.longitude));

      // OPTIMIZATION: Simplify path to prevent rendering lag
      const simplifiedCoords = simplifyCoordinates(osrmCoords, 0.00005);
      
      const finalizedCoords = [...simplifiedCoords];
      const start = points[0];
      const end = points[points.length - 1];

      // 20-meter threshold for road-snapping to prevent visual gaps.
      if (simplifiedCoords.length > 0) {
          if (calculateDistance(start, simplifiedCoords[0]) > 0.020) {
              finalizedCoords.unshift(start);
          }
          if (calculateDistance(end, simplifiedCoords[simplifiedCoords.length - 1]) > 0.020) {
              finalizedCoords.push(end);
          }
      } else {
          finalizedCoords.push(start, end);
      }

      let finalDuration = route.duration / 60;
      if (profile === "driving") {
        finalDuration *= ROUTING_CONFIG.TRAFFIC_MULTIPLIER;
      } else if (profile === "walking") {
        finalDuration *= ROUTING_CONFIG.WALKING_SAFETY_BUFFER;
      }

      const result: RouteInfo = {
        coordinates: finalizedCoords,
        distance: route.distance / 1000,
        duration: finalDuration
      };

      if (routeCache.size >= CACHE_LIMIT) {
        const firstKey = routeCache.keys().next().value;
        if (firstKey) routeCache.delete(firstKey);
      }
      routeCache.set(cacheKey, [result]);

      return result;
    }
  } catch (error) {
    console.error("Error in getMultiPointRoute:", error);
  }
  
  // Fallback to direct routing if multi-point fails
  return getRoute(points[0], points[points.length - 1], profile);
};

export const getNearbyStops = (
  lat: number,
  lon: number,
  limit: number = 4,
): Location[] => {
  // STABILITY PERFORMANCE FIX:
  // Instead of scanning all 1,400+ stops, we pre-filter for stops within a ~5km box.
  const bufferD = 0.05; // ~5km approx at equator
  const nearbyBox = LOCAL_STOPS.filter(s => 
    s.coordinate.latitude >= lat - bufferD &&
    s.coordinate.latitude <= lat + bufferD &&
    s.coordinate.longitude >= lon - bufferD &&
    s.coordinate.longitude <= lon + bufferD
  );

  return nearbyBox
    .map((stop) => ({
      ...stop,
      distance: calculateDistance(
        { latitude: lat, longitude: lon },
        stop.coordinate,
      ),
    }))
    .sort((a, b) => {
      // Tie-breaker: Verified hubs first if distances are similar
      if (Math.abs(a.distance - b.distance) < 0.05) {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
      }
      return a.distance - b.distance;
    })
    .slice(0, limit)
    .map(({ distance, ...stop }) => {
      const distStr =
        distance < 1.0
          ? `${Math.round(distance * 1000)}m away`
          : `${distance.toFixed(1)}km away`;
      return {
        ...stop,
        address: `${distStr} • ${stop.type === "station" ? "Major Hub" : "Local Stop"}`,
      };
    });
};

export const findNearestStop = async (
  lat: number,
  lon: number,
): Promise<Location | null> => {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (stopCache.has(cacheKey)) {
    return stopCache.get(cacheKey)!;
  }

  // 1.5 Persistent Cache Layer
  const persistentStop = await RouteCacheService.getCachedStop(lat, lon);
  if (persistentStop !== undefined) {
      stopCache.set(cacheKey, persistentStop);
      return persistentStop;
  }

  // 1. Check Local Trotro Stops (Top candidates by proximity + hub bias)
  const candidates = LOCAL_STOPS
    .map(stop => {
      const straightDist = calculateDistance(
        { latitude: lat, longitude: lon },
        stop.coordinate,
      );
      // Hub Bias: Major junctions, markets, and terminals get a 150m advantage.
      const isHub = /junction|market|station|terminal|barrier/i.test(stop.name);
      const effectiveDist = isHub ? straightDist - 0.15 : straightDist;
      return { stop, effectiveDist, straightDist };
    })
    .sort((a, b) => a.effectiveDist - b.effectiveDist)
    .slice(0, 5);

  if (candidates.length === 0) return null;

  // 2. Verified Route-Aware Selection: Compare actual walking paths
  let bestLocalStop = candidates[0].stop;
  let finalDistance = candidates[0].straightDist;

  try {
    const realDistances = await getDistanceTable(
      { latitude: lat, longitude: lon },
      candidates.map(c => c.stop.coordinate),
      "walking"
    );

    if (realDistances.length === candidates.length) {
      let minRealDist = Infinity;
      let winnerIdx = 0;
      
      for (let i = 0; i < realDistances.length; i++) {
        // If real road distance exists, use it for the final decision
        const realDist = realDistances[i];
        if (realDist !== null && realDist < minRealDist) {
          minRealDist = realDist;
          winnerIdx = i;
        }
      }
      
      bestLocalStop = candidates[winnerIdx].stop;
      finalDistance = realDistances[winnerIdx];
    }
  } catch (e) {
    console.warn("Table API fallback to straight-line:", e);
  }

  // If a major trotro node is within 300m (real distance), snap to it.
  // A 1.2km threshold is too large and makes users walk too far.
  if (bestLocalStop && finalDistance < 0.3) {
    stopCache.set(cacheKey, bestLocalStop);
    await RouteCacheService.saveStop(lat, lon, bestLocalStop);
    return bestLocalStop;
  }

  // 2. Fallback: Smart Roadside Snap (Find the actual nearest road)
  let roadCoords = { latitude: lat, longitude: lon };
  try {
    const snapped = await snapToRoad(lat, lon);
    if (snapped) roadCoords = snapped;
  } catch (e) {}

  const fallback: Location = {
    name: "Roadside Pickup",
    coordinate: roadCoords,
    type: "bus_stop",
  };
  stopCache.set(cacheKey, fallback);
  await RouteCacheService.saveStop(lat, lon, fallback);
  return fallback;
};

export const getCurrentUserLocation = async (): Promise<Location | null> => {
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const snappedStop = await findNearestStop(lat, lon);
            if (snappedStop) {
              resolve({
                ...snappedStop,
                coordinate: { latitude: lat, longitude: lon },
                type: "gps",
              });
            } else {
              resolve({
                name: "Current Location",
                coordinate: { latitude: lat, longitude: lon },
                type: "gps",
              });
            }
          },
          (error) => {
            console.error("Browser geolocation error", error);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 4000 }
        );
      });
    }

    let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;

    // STABILITY FIX: Use 'High' instead of 'Highest' to prevent 
    // hanging/crashes on some Android devices with weak GPS.
    let location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });

    if (location) {
      // Find the nearest verified stop to name our current location
      const snappedStop = await findNearestStop(
        location.coords.latitude,
        location.coords.longitude,
      );

      if (snappedStop) {
          // If we found a stop (even Roadside Pickup), use its name but keep RAW GPS for max precision
          return {
            ...snappedStop,
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            type: "gps",
          };
      }

      return {
        name: "Current Location",
        coordinate: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        type: "gps",
      };
    }
  } catch (error) {
    console.error("Error getting location", error);
  }
  return null;
};

export const watchUserLocation = async (
  callback: (location: Location) => void,
) => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
    let lastLat = 0;
    let lastLng = 0;
    let lastUpdateTime = 0;
    const SMOOTHING_FACTOR = 0.45; // Weighted filter to reduce drift

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        let lat = position.coords.latitude;
        let lon = position.coords.longitude;
        const accuracy = position.coords.accuracy || 0;

        // Skip highly inaccurate updates
        if (accuracy > 100) return;

        const now = Date.now();
        const timeDiff = now - lastUpdateTime;

        let newHeading = position.coords.heading || 0;

        if (lastLat === 0 && lastLng === 0) {
          lastLat = lat;
          lastLng = lon;
          lastUpdateTime = now;
        } else {
          const dist = calculateDistance(
            { latitude: lastLat, longitude: lastLng },
            { latitude: lat, longitude: lon }
          );

          // Calculate precise manual bearing if moving > 3 meters
          if (dist >= 0.003) {
            newHeading = calculateBearing(
              { latitude: lastLat, longitude: lastLng },
              { latitude: lat, longitude: lon }
            );
          }

          // Dead Band Threshold: ignore movement < 3m unless it's been > 6 seconds
          if (dist < 0.003 && timeDiff < 6000) {
            return;
          }

          // Apply weighted moving average smoothing if user did not move > 50m (teleport check)
          if (dist < 0.050) {
            lat = lastLat + (lat - lastLat) * SMOOTHING_FACTOR;
            lon = lastLng + (lon - lastLng) * SMOOTHING_FACTOR;
          }

          lastLat = lat;
          lastLng = lon;
          lastUpdateTime = now;
        }

        callback({
          name: "Live Location",
          coordinate: { latitude: lat, longitude: lon },
          type: "gps",
          heading: newHeading,
        });
      },
      (error) => {
        console.error("Browser watchPosition error", error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 }
    );

    return {
      remove: () => {
        navigator.geolocation.clearWatch(watchId);
      },
    };
  }

  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  let currentCoords: { latitude: number; longitude: number } | null = null;
  let currentHeading = 0;
  let lastCallbackTime = 0;
  let lastLat = 0;
  let lastLng = 0;

  const positionSubscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.High,
      timeInterval: 3000, // Balanced battery/responsiveness
      distanceInterval: 5,
    },
    (location) => {
      let lat = location.coords.latitude;
      let lon = location.coords.longitude;
      const speed = location.coords.speed || 0;
      const now = Date.now();

      if (lastLat !== 0 && lastLng !== 0) {
        const dist = calculateDistance(
          { latitude: lastLat, longitude: lastLng },
          { latitude: lat, longitude: lon }
        );
        // Ignore tiny movements on native if time since last callback is < 5s
        if (dist < 0.003 && (now - lastCallbackTime < 5000)) {
          return;
        }
        
        // Manual cross-platform bearing calculation for iOS and devices that omit heading
        if (dist >= 0.002) { // Moved at least 2 meters
          const calculatedHeading = calculateBearing(
            { latitude: lastLat, longitude: lastLng },
            { latitude: lat, longitude: lon }
          );
          currentHeading = calculatedHeading;
        } else if (speed > 0.5 && location.coords.heading !== -1 && location.coords.heading !== null) {
          currentHeading = location.coords.heading;
        }
      } else if (location.coords.heading && location.coords.heading !== -1) {
        currentHeading = location.coords.heading;
      }

      currentCoords = { latitude: lat, longitude: lon };
      lastLat = lat;
      lastLng = lon;
      lastCallbackTime = now;

      callback({
        name: "Live Location",
        coordinate: currentCoords,
        type: "gps",
        heading: currentHeading,
      });
    },
  );

  return {
    remove: () => {
      positionSubscription.remove();
    }
  };
};

export const findStopsAlongRoute = (
  routeCoordinates: { latitude: number; longitude: number }[],
  pickupPointName?: string,
  dropoffPointName?: string,
  bufferDistanceKm: number = 0.3, // Tighter 300m snap to ensure only route-adjacent stops
): Location[] => {
  if (!routeCoordinates || routeCoordinates.length === 0) return [];

  const stopsFound = new Set<string>();
  const intermediateStops: Location[] = [];

  // STABILITY PERFORMANCE FIX:
  // Instead of a nested O(N*M) loop, we pre-calculate the route's bounding box to 
  // quickly discard stops that are nowhere near the path.
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const c of routeCoordinates) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  }

  // Add the buffer to the bounding box
  const latBuffer = bufferDistanceKm / 111; // ~111km per degree
  const lonBuffer = bufferDistanceKm / (111 * Math.cos(minLat * (Math.PI / 180)));
  
  const relevantStops = LOCAL_STOPS.filter(stop => 
    stop.coordinate.latitude >= minLat - latBuffer &&
    stop.coordinate.latitude <= maxLat + latBuffer &&
    stop.coordinate.longitude >= minLon - lonBuffer &&
    stop.coordinate.longitude <= maxLon + lonBuffer
  );

  // 1. Iterate over the actual route coordinates from START to FINISH.
  // Step size increased to 10 for better mobile performance.
  for (let i = 0; i < routeCoordinates.length; i += 10) {
    const coord = routeCoordinates[i];

    for (const stop of relevantStops) {
      if (stop.name === pickupPointName || stop.name === dropoffPointName) {
        continue;
      }

      if (!stopsFound.has(stop.name)) {
        const dist = calculateDistance(coord, stop.coordinate);

        if (dist <= bufferDistanceKm) {
          stopsFound.add(stop.name);
          intermediateStops.push(stop);
        }
      }
    }
  }

  return intermediateStops;
};
