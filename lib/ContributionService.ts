import { supabase } from './supabase';

export type ContributionType = 'price' | 'route' | 'stop' | 'general';
export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export interface Contribution {
  id: string;
  created_at: string;
  type: ContributionType;
  status: ContributionStatus;
  payload: any;
  user_id?: string;
}

export const ContributionService = {
  /**
   * Submit a new contribution to the corresponding database table.
   */
  async submitContribution(type: ContributionType, payload: any, userId?: string) {
    const tableMap: Record<ContributionType, string> = {
      price: 'price_contributions',
      route: 'route_contributions',
      stop: 'stop_contributions',
      general: 'general_contributions',
    };

    const tableName = tableMap[type];

    const { data, error } = await supabase
      .from(tableName)
      .insert([
        {
          ...payload,
          status: 'pending',
          user_id: userId || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error(`Error submitting ${type} contribution:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Fetch all contributions from the four tables, merge them, and order by date.
   */
  async fetchContributions(): Promise<Contribution[]> {
    const fetchTable = async (tableName: string, type: ContributionType) => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
      }
      return data.map(item => {
        // Extract common fields
        const { id, created_at, status, user_id, ...payload } = item;
        return {
          id,
          created_at,
          status,
          user_id,
          type,
          payload,
        } as Contribution;
      });
    };

    const [prices, routes, stops, general] = await Promise.all([
      fetchTable('price_contributions', 'price'),
      fetchTable('route_contributions', 'route'),
      fetchTable('stop_contributions', 'stop'),
      fetchTable('general_contributions', 'general'),
    ]);

    const allContributions = [...prices, ...routes, ...stops, ...general];
    
    // Sort by created_at descending (newest first)
    allContributions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allContributions;
  },

  /**
   * Fetch contributions for a specific user.
   */
  async fetchUserContributions(userId: string): Promise<Contribution[]> {
    const fetchTable = async (tableName: string, type: ContributionType) => {
      const { data, error } = await supabase.from(tableName).select('*').eq('user_id', userId);
      if (error) {
        console.error(`Error fetching user ${tableName}:`, error);
        return [];
      }
      return data.map(item => {
        const { id, created_at, status, user_id, ...payload } = item;
        return {
          id,
          created_at,
          status,
          user_id,
          type,
          payload,
        } as Contribution;
      });
    };

    const [prices, routes, stops, general] = await Promise.all([
      fetchTable('price_contributions', 'price'),
      fetchTable('route_contributions', 'route'),
      fetchTable('stop_contributions', 'stop'),
      fetchTable('general_contributions', 'general'),
    ]);

    const allContributions = [...prices, ...routes, ...stops, ...general];
    
    // Sort by created_at descending (newest first)
    allContributions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return allContributions;
  },

  /**
   * Update the status of a specific contribution in its respective table.
   */
  async updateContributionStatus(id: string, status: ContributionStatus, type: ContributionType) {
    const tableMap: Record<ContributionType, string> = {
      price: 'price_contributions',
      route: 'route_contributions',
      stop: 'stop_contributions',
      general: 'general_contributions',
    };

    const tableName = tableMap[type];

    const { data, error } = await supabase
      .from(tableName)
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${type} contribution status:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a contribution permanently from the database.
   */
  async deleteContribution(id: string, type: ContributionType) {
    const tableMap: Record<ContributionType, string> = {
      price: 'price_contributions',
      route: 'route_contributions',
      stop: 'stop_contributions',
      general: 'general_contributions',
    };

    const tableName = tableMap[type];

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting ${type} contribution:`, error);
      throw error;
    }

    return true;
  },

  /**
   * Approves a contribution and ingests its payload into the corresponding live tables.
   */
  async approveAndIngestContribution(id: string, type: ContributionType, payload: any) {
    if (type === 'route') {
      if (payload.trotros && Array.isArray(payload.trotros) && payload.trotros.length > 0) {
        // Multi-leg journey: insert each trotro leg as a separate route
        const insertData = payload.trotros.map((trotro: any) => ({
          origin: trotro.origin,
          destination: trotro.destination,
          fare: trotro.fare ? parseFloat(trotro.fare) : null,
          waypoints: trotro.stops && trotro.stops.length > 0 ? trotro.stops : []
        }));
        const { error } = await supabase.from('routes').insert(insertData);
        if (error) throw new Error("Failed to publish multi-trotro route: " + error.message);
      } else {
        // Single route
        let waypoints = null;
        if (payload.tracked_path) {
          try {
            waypoints = JSON.parse(payload.tracked_path);
          } catch (e) {}
        }
        const { error } = await supabase.from('routes').insert([{
          origin: payload.origin,
          destination: payload.destination,
          fare: payload.fare ? parseFloat(payload.fare) : null,
          waypoints: waypoints || (payload.stops && payload.stops.length > 0 ? payload.stops : [])
        }]);
        if (error) throw new Error("Failed to publish route: " + error.message);
      }
    } else if (type === 'price') {
      const { error } = await supabase.from('fares').insert([{
        origin: payload.origin,
        destination: payload.destination,
        amount: payload.actual_fare
      }]);
      if (error) throw new Error("Failed to publish fare: " + error.message);
      
    } else if (type === 'stop') {
      const { error } = await supabase.from('stops').insert([{
        name: payload.stop_name,
        // Insert other fields if available in the future
      }]);
      if (error) console.warn("Failed to publish stop:", error.message);
    }

    // After successful ingestion, mark the contribution as approved
    return await this.updateContributionStatus(id, 'approved', type);
  },

  /**
   * Update the payload of a specific contribution in its respective table.
   */
  async updateContributionPayload(id: string, type: ContributionType, payload: any) {
    const tableMap: Record<ContributionType, string> = {
      price: 'price_contributions',
      route: 'route_contributions',
      stop: 'stop_contributions',
      general: 'general_contributions',
    };

    const tableName = tableMap[type];

    const { data, error } = await supabase
      .from(tableName)
      .update({ ...payload })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${type} contribution payload:`, error);
      throw error;
    }

    return data;
  },

  /**
   * Delete a specific contribution from its respective table.
   */
  async deleteContribution(id: string, type: ContributionType) {
    const tableMap: Record<ContributionType, string> = {
      price: 'price_contributions',
      route: 'route_contributions',
      stop: 'stop_contributions',
      general: 'general_contributions',
    };

    const tableName = tableMap[type];

    const { data, error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error deleting ${type} contribution:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error("Deletion was blocked. You might not have permission, or the item doesn't exist.");
    }

    return true;
  }
};
