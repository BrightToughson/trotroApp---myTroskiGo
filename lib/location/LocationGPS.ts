import * as ExpoLocation from "expo-location";
import { Platform } from "react-native";
import { Location } from "../../constants/types";
import { calculateDistance } from "./LocationUtils";
import { OSM_STOPS } from "./LocationDataService";

/**
 * Request location permissions and get current user location.
 */
export const getCurrentUserLocation = async (): Promise<Location | null> => {
  try {
    let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Location permission not granted');
      return null;
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });

    return {
      name: "Current Location",
      coordinate: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      type: "gps",
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    return null;
  }
};

/**
 * Watch user location changes.
 */
export const watchUserLocation = (callback: (location: Location) => void) => {
  let subscription: any = null;

  const startWatching = async () => {
    try {
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted for watching');
        return;
      }

      subscription = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const loc: Location = {
            name: "Current Location",
            coordinate: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            },
            type: "gps",
          };
          callback(loc);
        }
      );
    } catch (error) {
      console.error('Error starting location watch:', error);
    }
  };

  startWatching();

  return () => {
    if (subscription) {
      subscription.remove();
    }
  };
};

/**
 * Find the nearest stop to a given location.
 */
export const findNearestStop = (location: Location, maxDistance: number = 2.0): Location | null => {
  if (!location || !location.coordinate) return null;

  let nearest: Location | null = null;
  let minDistance = Infinity;

  for (const stop of OSM_STOPS) {
    const distance = calculateDistance(location.coordinate, stop.coordinate);
    if (distance < minDistance && distance < maxDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return nearest;
};

/**
 * Find all stops within a certain radius of a location.
 */
export const findStopsWithinRadius = (
  location: Location,
  radius: number = 1.0
): Location[] => {
  if (!location || !location.coordinate) return [];

  return OSM_STOPS.filter(stop => {
    const distance = calculateDistance(location.coordinate, stop.coordinate);
    return distance <= radius;
  }).sort((a, b) => {
    const distA = calculateDistance(location.coordinate, a.coordinate);
    const distB = calculateDistance(location.coordinate, b.coordinate);
    return distA - distB;
  });
};