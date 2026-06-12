import { FARE_CONSTANTS } from "./LocationService";
import { supabase } from "./supabase";
import localFaresBackup from "../constants/fares.json";

export interface ManualFareRule {
  origin?: string;      // Optional: Specific starting point name
  destination: string;  // Required: Destination name
  minPrice?: number;    // Optional: Min price for a range (e.g., 10.5)
  maxPrice?: number;    // Optional: Max price for a range (e.g., 12.0)
  price?: string;       // Optional: Fixed price or text (e.g., "GHS 10.00")
  region: string;       // Required: Region/Corridor (e.g., "CENTRAL", "NORTH")
  town: string;         // Required: Specific town or area (e.g., "Madina", "Circle")
  isFlatRate?: boolean; // Whether this is a fixed price or a range
}

// Local cache for Supabase fares (initially seeded with offline fallback)
let supabaseFares: ManualFareRule[] = localFaresBackup as ManualFareRule[];
let isInitialized = true; // Set to true since we have complete fallback data ready immediately

export const FareService = {
  /**
   * Initializes the FareService by fetching latest fares from Supabase.
   * If it fails, it falls back to the bundled local data.
   */
  init: async () => {
    try {
      console.log("Fetching fares from master table...");
      
      const { data, error } = await supabase
        .from('fares')
        .select('*');

      if (error) {
        console.warn("Error fetching master fares, keeping local fallback:", error);
      } else if (data && data.length > 0) {
        supabaseFares = data.map(item => ({
          origin: item.origin || undefined,
          destination: item.destination,
          minPrice: item.min_price ? Number(item.min_price) : undefined,
          maxPrice: item.max_price ? Number(item.max_price) : undefined,
          region: item.region,
          town: item.town,
          isFlatRate: item.is_flat_rate
        }));
        
        console.log(`FareService initialized with ${supabaseFares.length} rules from master table.`);
      } else {
        console.log("No fares found in Supabase master table, keeping local fallback.");
      }
      
      isInitialized = true;
      FareService._averagesCache = null; // Reset cache
      FareService._ensureCache();
    } catch (err) {
      console.error("Failed to initialize fares from Supabase, keeping local fallback:", err);
      isInitialized = true;
    }
  },

  /**
   * Internal helper to find a manual rule.
   */
  findRule: (origin: string | undefined, destination: string): ManualFareRule | null => {
    if (!destination || typeof destination !== 'string') return null;
    
    const activeFares = supabaseFares;

    // Helper to check for fuzzy matching (e.g. "Lapaz" matches "Lapaz Station")
    const isFuzzyMatch = (name1: string | undefined, name2: string | undefined): boolean => {
      if (!name1 || !name2) return false;
      const n1 = name1.toLowerCase().trim();
      const n2 = name2.toLowerCase().trim();
      return n1 === n2 || n1.includes(n2) || n2.includes(n1);
    };

    // 1. Try exact origin and destination match (Forward)
    if (origin && typeof origin === 'string') {
      const forwardMatch = activeFares.find(
        (rule) =>
          rule?.origin?.toLowerCase() === origin.toLowerCase() &&
          rule?.destination?.toLowerCase() === destination.toLowerCase()
      );
      if (forwardMatch) return forwardMatch;

      // 1b. Try exact reverse match (Return route)
      const reverseMatch = activeFares.find(
        (rule) =>
          rule?.origin?.toLowerCase() === destination.toLowerCase() &&
          rule?.destination?.toLowerCase() === origin.toLowerCase()
      );
      if (reverseMatch) {
        // Return a virtual rule where origin/dest are swapped to match the search query
        return { ...reverseMatch, origin: reverseMatch.destination, destination: reverseMatch.origin! };
      }
    }

    // 2. Try exact destination-only match
    const destMatch = activeFares.find(
      (rule) =>
        !rule?.origin &&
        rule?.destination?.toLowerCase() === destination.toLowerCase()
    );
    if (destMatch) return destMatch;

    // 3. Fallback: Try fuzzy matching if exact match was not found
    if (origin && typeof origin === 'string') {
      const fuzzyForward = activeFares.find(
        (rule) =>
          rule?.origin &&
          isFuzzyMatch(rule.origin, origin) &&
          isFuzzyMatch(rule.destination, destination)
      );
      if (fuzzyForward) return fuzzyForward;

      const fuzzyReverse = activeFares.find(
        (rule) =>
          rule?.origin &&
          isFuzzyMatch(rule.origin, destination) &&
          isFuzzyMatch(rule.destination, origin)
      );
      if (fuzzyReverse) {
        return { ...fuzzyReverse, origin: fuzzyReverse.destination, destination: fuzzyReverse.origin! };
      }
    }

    // 4. Fallback: Try fuzzy destination-only match
    const fuzzyDest = activeFares.find(
      (rule) =>
        !rule?.origin &&
        isFuzzyMatch(rule.destination, destination)
    );

    return fuzzyDest || null;
  },

  // PERFORMANCE CACHE: Pre-calculate averages
  _averagesCache: null as Record<string, { min: number; max: number }> | null,

  _ensureCache: () => {
    if (FareService._averagesCache) return;
    
    const activeFares = supabaseFares;
    const cache: Record<string, { min: number; max: number; count: number; totalMin: number; totalMax: number }> = {};
    
    activeFares.forEach(rule => {
      if (rule.minPrice !== undefined && rule.maxPrice !== undefined) {
        // Index by both origin and destination so a location's average includes all relevant routes
        const keys = new Set([
          rule.destination.toLowerCase().trim(),
          rule.origin?.toLowerCase().trim()
        ].filter(Boolean) as string[]);

        keys.forEach(key => {
          if (!cache[key]) {
            cache[key] = { min: 0, max: 0, count: 0, totalMin: 0, totalMax: 0 };
          }
          cache[key].totalMin += rule.minPrice!;
          cache[key].totalMax += rule.maxPrice!;
          cache[key].count++;
        });
      }
    });

    const finalCache: Record<string, { min: number; max: number }> = {};
    Object.keys(cache).forEach(key => {
      const count = cache[key].count;
      if (count > 0) {
        finalCache[key] = {
          min: cache[key].totalMin / count,
          max: cache[key].totalMax / count
        };
      }
    });

    FareService._averagesCache = finalCache;
  },

  getAverageFareForDestination: (destination: string): { min: number; max: number } | null => {
    if (!destination || typeof destination !== 'string') return null;
    FareService._ensureCache();
    return FareService._averagesCache![destination.toLowerCase().trim()] || null;
  },

  getRawManualFare: (origin: string | undefined, destination: string): { min: number; max: number } | null => {
    const rule = FareService.findRule(origin, destination);
    if (rule && rule.minPrice !== undefined && rule.maxPrice !== undefined) {
      return { min: rule.minPrice, max: rule.maxPrice };
    }
    return null;
  },

  getManualFare: (origin: string | undefined, destination: string): string | null => {
    const rule = FareService.findRule(origin, destination);
    if (!rule) return null;

    if (rule.minPrice !== undefined && rule.maxPrice !== undefined) {
      return `GHS ${rule.minPrice.toFixed(2)} - ${rule.maxPrice.toFixed(2)}`;
    }
    return rule.price || null;
  },

  calculateEstimatedFare: (distance: number): string => {
    const min = Math.round((3.0 + distance * 0.5) * 2) / 2;
    const max = Math.round((min * 1.15) * 2) / 2;
    return `GHS ${min.toFixed(2)} - ${max.toFixed(2)} (Est.)`;
  },

  formatCalculatedFare: (min: number, max: number): string => {
    return `GHS ${min.toFixed(2)} - ${max.toFixed(2)}`;
  },

  /**
   * Returns all active fare rules. 
   * Useful for UI components that need to browse the full list (like Regional Explorer).
   */
  getAllFares: (): ManualFareRule[] => {
    return supabaseFares;
  },
};

