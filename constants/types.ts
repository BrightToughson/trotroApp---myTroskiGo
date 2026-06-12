/**
 * Transit Rule Type Definitions
 * Shared interfaces to break circular dependencies.
 */

export interface ManualRouteRule {
  routeTitle: string;
  route: {
    origin: string;
    destination: string;
  };
  line?: string;
}

export interface RegionalTransferRule {
  routeTitle: string;
  firstRoute: {
    origin: string;
    endStop: string;
  };
  secondRoute: {
    origin: string;
    endStop: string;
  };
  thirdRoute?: {
    origin: string;
    endStop: string;
  };
  firstLine?: string;
  secondLine?: string;
  thirdLine?: string;
  transferStop: string;
  secondTransferStop?: string;
  region?: string;
}

// --- Geographic and Transit Core Types ---

export type StopType = "bus_stop" | "pick_up_station" | "bus_station" | "station" | "stop" | "gps";

export interface Location {
  name: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  address?: string;
  type?: StopType;
  lines?: string[];
  isVerified?: boolean;
  heading?: number;
  region?: string;
}

/**
 * TransitLeg represents a segment of a transit journey (e.g. one vehicle ride)
 */
export interface TransitLeg {
  startStop: Location;
  endStop: Location;
  lineName: string;
  routeWaypoints?: Location[];
}

export interface TripDetails {
  walkMins1: number;
  walkLabel1?: string;
  walkMins2: number;
  walkLabel2?: string;
  travelMins: number;
  trafficMins?: number;
  waitTimeMins?: number;
  transferWalks?: {
    duration: number;
    distance: number;
    coordinates: { latitude: number; longitude: number }[];
  }[];
}

export interface ActiveLeg extends TransitLeg {
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  duration: number;
  passedStops: Location[];
  fare?: string;
}
