import { Location } from "./types";
import { getRoute, calculateDistance, FARE_CONSTANTS } from "../lib/LocationService";

/**
 * Walking Service
 * Manages walking distance thresholds and path calculations
 */

export const WALKING_CONFIG = {
  MAX_WALK_AUTO: 2.0, // Below this is always a 'Pure Walking' trip
  MAX_WALK_HUB: 1.2, // Max distance from user to a hub to keep it 'Trotro'
  MAX_WALK_EMERGENCY: 10.0, // Absolute max walking fallback if no transport found
  WINDING_FACTOR: 1.25, // Multiplier for straight-line fallbacks to account for city blocks
};

export const WalkingService = {
  /**
   * Translates duration into a human-friendly exertion level
   */
  getWalkingLevel: (durationMins: number): string => {
    if (durationMins < 5) return "Easy Stroll";
    if (durationMins < 12) return "Brisk Walk";
    if (durationMins < 25) return "Significant Walk";
    return "Athletic Trek";
  },

  /**
   * Returns a near-instant straight-line placeholder for walking legs
   */
  getImmediateWalk: (start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) => {
    const dist = calculateDistance(start, end);
    const duration = (dist / FARE_CONSTANTS.WALKING_SPEED_KMPH) * 60;
    return {
      coordinates: [start, end],
      duration,
      distance: dist,
      walkingLevel: WalkingService.getWalkingLevel(duration),
      isPlaceholder: true,
    };
  },

  /**
   * Calculates a full walking journey between two points
   */
  getWalkingJourney: async (origin: Location, destination: Location) => {
    if (!origin?.coordinate || !destination?.coordinate) return null;


    const route = await getRoute(
      origin.coordinate,
      destination.coordinate,
      "walking",
    );

    if (!route) {
      // Improved Fallback with Winding Factor
      const straightDist = calculateDistance(
        origin.coordinate,
        destination.coordinate,
      );
      const estimatedDist = straightDist * WALKING_CONFIG.WINDING_FACTOR;
      const duration = (estimatedDist / 4.5) * 60;

      return {
        coordinates: [origin.coordinate, destination.coordinate],
        duration,
        distance: estimatedDist,
        label: `${WalkingService.getWalkingLevel(duration)} (Free)`,
        isFallback: true,
      };
    }

    return {
      coordinates: route.coordinates,
      duration: route.duration,
      distance: route.distance,
      label: `${WalkingService.getWalkingLevel(route.duration)} (Free)`,
      isFallback: false,
    };
  },

  /**
   * Calculates the walking leg from a point to a transit hub
   */
  getWalkToHub: async (
    startCoords: { latitude: number; longitude: number },
    endCoords: { latitude: number; longitude: number },
  ) => {
    if (!startCoords || !endCoords) return null;


    const route = await getRoute(startCoords, endCoords, "walking");

    if (!route) {
      const straightDist = calculateDistance(startCoords, endCoords);
      const estimatedDist = straightDist * WALKING_CONFIG.WINDING_FACTOR;
      const duration = (estimatedDist / FARE_CONSTANTS.WALKING_SPEED_KMPH) * 60;

      return {
        coordinates: [startCoords, endCoords],
        duration,
        distance: estimatedDist,
        walkingLevel: WalkingService.getWalkingLevel(duration),
        isFallback: true,
      };
    }

    return {
      coordinates: route.coordinates,
      duration: route.duration,
      distance: route.distance,
      walkingLevel: WalkingService.getWalkingLevel(route.duration),
      isFallback: false,
    };
  },
};
