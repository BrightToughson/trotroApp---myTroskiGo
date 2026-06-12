import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActiveLeg, TripDetails, Location } from "./LocationService";
const TRANSIT_DATA_VERSION = "2.0.1";

const CACHE_KEY_PREFIX = "@trotro_cache_v2_";
const MANIFEST_KEY = "@trotro_cache_manifest";
const VERSION_KEY = "@trotro_data_version";

// TTL Constants
const TTL_ROUTE = 24 * 60 * 60 * 1000;      // 24 Hours
const TTL_SEARCH = 7 * 24 * 60 * 60 * 1000; // 7 Days
const TTL_STOP = 30 * 24 * 60 * 60 * 1000;  // 30 Days

export type CacheEntryType = 'route' | 'search' | 'stop';

export interface CachedRoute {
  activeLegs: ActiveLeg[];
  tripDetails: TripDetails;
  priceEstimate: string | null;
  isManualFare: boolean;
  timestamp: number;
}

export interface CachedSearch {
    query: string;
    results: Location[];
    timestamp: number;
}

export interface CachedStop {
    key: string; // lat,lon rounded
    stop: Location | null;
    timestamp: number;
}

export const RouteCacheService = {
  /**
   * Generates a stable key based on type and identifiers.
   */
  generateKey: (type: CacheEntryType, id: string) => {
    return `${CACHE_KEY_PREFIX}${type}_${id}`;
  },

  /**
   * Initialize and check version
   */
  checkVersion: async () => {
    try {
        const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
        if (storedVersion !== TRANSIT_DATA_VERSION) {
            console.log(`[Cache] Database version changed from ${storedVersion} to ${TRANSIT_DATA_VERSION}. Invalidating search and stop caches.`);
            
            // Clear search and stop results as coordinates might have changed
            const manifestStr = await AsyncStorage.getItem(MANIFEST_KEY);
            if (manifestStr) {
                const manifest: string[] = JSON.parse(manifestStr);
                const toRemove = manifest.filter(k => k.includes('_search_') || k.includes('_stop_') || k.includes('_route_'));
                await Promise.all(toRemove.map(k => AsyncStorage.removeItem(k)));
                
                // Update manifest
                const remaining = manifest.filter(k => !toRemove.includes(k));
                await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(remaining));
            }
            
            await AsyncStorage.setItem(VERSION_KEY, TRANSIT_DATA_VERSION);
        }
    } catch (e) {
        console.error("Version check error:", e);
    }
  },

  /**
   * Generic save method
   */
  save: async (type: CacheEntryType, id: string, data: any) => {
    try {
        const key = RouteCacheService.generateKey(type, id);
        const entry = {
            ...data,
            timestamp: Date.now(),
            entryType: type
        };
        await AsyncStorage.setItem(key, JSON.stringify(entry));
        
        // Manifest management
        const manifestStr = await AsyncStorage.getItem(MANIFEST_KEY);
        let manifest: string[] = manifestStr ? JSON.parse(manifestStr) : [];
        if (!manifest.includes(key)) {
            manifest.push(key);
            // Limit total cached items to 150 to prevent excessive storage use
            if (manifest.length > 150) {
                const oldKey = manifest.shift();
                if (oldKey) await AsyncStorage.removeItem(oldKey);
            }
            await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
        }
    } catch (e) {
        console.error(`Cache Save Error [${type}]:`, e);
    }
  },

  /**
   * Generic retrieval with TTL check
   */
  get: async (type: CacheEntryType, id: string): Promise<any | null> => {
    try {
        const key = RouteCacheService.generateKey(type, id);
        const json = await AsyncStorage.getItem(key);
        if (!json) return null;

        let data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            await AsyncStorage.removeItem(key);
            return null;
        }

        const now = Date.now();
        let ttl = TTL_ROUTE;
        if (type === 'search') ttl = TTL_SEARCH;
        if (type === 'stop') ttl = TTL_STOP;

        if (now - data.timestamp > ttl) {
            await AsyncStorage.removeItem(key);
            return null;
        }
        return data;
    } catch (e) {
        console.error(`Cache Retrieval Error [${type}]:`, e);
        return null;
    }
  },

  // --- SPECIALIZED HELPERS ---

  saveRoute: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }, data: Omit<CachedRoute, 'timestamp'>) => {
    const id = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}_to_${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
    await RouteCacheService.save('route', id, data);
  },

  getCachedRoute: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }): Promise<CachedRoute | null> => {
    const id = `${origin.latitude.toFixed(3)},${origin.longitude.toFixed(3)}_to_${destination.latitude.toFixed(3)},${destination.longitude.toFixed(3)}`;
    return await RouteCacheService.get('route', id);
  },

  saveSearch: async (query: string, results: Location[]) => {
    await RouteCacheService.save('search', query.toLowerCase().trim(), { query, results });
  },

  getCachedSearch: async (query: string): Promise<Location[] | null> => {
    const data = await RouteCacheService.get('search', query.toLowerCase().trim());
    return data ? data.results : null;
  },

  saveStop: async (lat: number, lon: number, stop: Location | null) => {
    const id = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    await RouteCacheService.save('stop', id, { stop });
  },

  getCachedStop: async (lat: number, lon: number): Promise<Location | null | undefined> => {
    const id = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const data = await RouteCacheService.get('stop', id);
    return data === null ? undefined : data.stop;
  },

  clearAll: async () => {
    try {
        const manifestStr = await AsyncStorage.getItem(MANIFEST_KEY);
        if (manifestStr) {
            const manifest: string[] = JSON.parse(manifestStr);
            await Promise.all(manifest.map(k => AsyncStorage.removeItem(k)));
        }
        await AsyncStorage.removeItem(MANIFEST_KEY);
    } catch (e) {
        console.error("Cache Clear Error:", e);
    }
  }
};
