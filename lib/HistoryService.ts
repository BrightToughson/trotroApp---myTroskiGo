import { supabase } from "./supabase";

export interface Ride {
  id: string;
  date: string; // ISO string
  origin: string;
  destination: string;
  originCoords?: string; // JSON string of {latitude, longitude}
  destCoords?: string; // JSON string of {latitude, longitude}
  price: string;
  status: "completed" | "cancelled";
  duration?: number;
}

export const HistoryService = {
  /**
   * Adds a new ride to the history in Supabase.
   * @param ride The ride object to add.
   */
  addRide: async (ride: Omit<Ride, "id" | "date">) => {
    try {
      const { data, error } = await supabase
        .from("user_trips")
        .insert([{
          origin: ride.origin,
          destination: ride.destination,
          origin_coords: ride.originCoords ? JSON.parse(ride.originCoords) : null,
          dest_coords: ride.destCoords ? JSON.parse(ride.destCoords) : null,
          price: ride.price,
          duration: ride.duration || 0,
          status: ride.status
        }])
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        return null;
      }

      return {
        id: data.id,
        date: data.created_at,
        origin: data.origin,
        destination: data.destination,
        originCoords: data.origin_coords ? JSON.stringify(data.origin_coords) : undefined,
        destCoords: data.dest_coords ? JSON.stringify(data.dest_coords) : undefined,
        price: data.price,
        status: data.status,
        duration: data.duration
      };
    } catch (error) {
      console.error("Error adding ride to history:", error);
      throw error;
    }
  },

  /**
   * Retrieves the full ride history from Supabase.
   * @returns Array of Ride objects.
   */
  getHistory: async (): Promise<Ride[]> => {
    try {
      const { data, error } = await supabase
        .from("user_trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) {
        console.error("Supabase fetch error:", error);
        return [];
      }
      
      if (!data) return [];
      
      return data.map(row => ({
        id: row.id,
        date: row.created_at,
        origin: row.origin,
        destination: row.destination,
        originCoords: row.origin_coords ? JSON.stringify(row.origin_coords) : undefined,
        destCoords: row.dest_coords ? JSON.stringify(row.dest_coords) : undefined,
        price: row.price || "TBD",
        status: row.status as "completed" | "cancelled",
        duration: row.duration
      }));
    } catch (error) {
      console.error("Error fetching history from Supabase:", error);
      return [];
    }
  },

  /**
   * Clears all history for the current user.
   */
  clearHistory: async (userId?: string) => {
    try {
      let response;
      if (userId) {
        response = await supabase.from("user_trips").delete().eq("user_id", userId);
      } else {
        // Fallback dummy condition if userId is missing, relying entirely on RLS
        response = await supabase.from("user_trips").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (response.error) {
         console.error("Supabase delete error:", response.error);
         throw response.error;
      }
      console.log("Deleted history successfully:", response);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  },
};
