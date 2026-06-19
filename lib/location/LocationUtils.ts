import { Location } from "../../constants/types";
import { STOP_MAP, OSM_STOPS } from "./LocationDataService";

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

/**
 * Calculate the distance between two coordinates using the Haversine formula.
 */
export const calculateDistance = (
  coord1: { latitude: number; longitude: number },
  coord2: { latitude: number; longitude: number }
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.latitude - coord1.latitude) * (Math.PI / 180);
  const dLon = (coord2.longitude - coord1.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.latitude * (Math.PI / 180)) *
    Math.cos(coord2.latitude * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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