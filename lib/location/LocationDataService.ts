import { Location } from "../../constants/types";

const osmStopsData = require('../../osrm routes/allStops.json');

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

export const LOCAL_STOPS: Location[] = OSM_STOPS;

export const STOP_MAP: Record<string, Location> = OSM_STOPS.reduce(
  (acc, stop) => {
    if (!acc[stop.name] || (stop.isVerified && !acc[stop.name].isVerified)) {
      acc[stop.name] = stop;
    }
    return acc;
  },
  {} as Record<string, Location>,
);

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
    if (totalLegs <= 1) return TRANSFER_ROUTE_COLORS[0];
    if (typeof index !== 'number' || isNaN(index)) return TRANSFER_ROUTE_COLORS[0];
    return TRANSFER_ROUTE_COLORS[index % TRANSFER_ROUTE_COLORS.length];
};