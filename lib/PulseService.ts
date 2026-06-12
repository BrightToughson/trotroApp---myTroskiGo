import { supabase } from './supabase';

export interface CityPulse {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  image_url: string;
  color: string;
  url: string;
  created_at?: string;
}

export const PulseService = {
  async getPulses(): Promise<CityPulse[]> {
    try {
      const { data, error } = await supabase
        .from('city_pulses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching city pulses:', error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.error('Exception fetching city pulses:', e);
      return [];
    }
  },

  async addPulse(pulse: Omit<CityPulse, 'id' | 'created_at'>): Promise<CityPulse | null> {
    try {
      const { data, error } = await supabase
        .from('city_pulses')
        .insert([pulse])
        .select()
        .single();

      if (error) {
        console.error('Error adding city pulse:', error);
        return null;
      }
      return data;
    } catch (e) {
      console.error('Exception adding city pulse:', e);
      return null;
    }
  },

  async updatePulse(id: string, pulse: Partial<Omit<CityPulse, 'id' | 'created_at'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('city_pulses')
        .update(pulse)
        .eq('id', id);

      if (error) {
        console.error('Error updating city pulse:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception updating city pulse:', e);
      return false;
    }
  },

  async deletePulse(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('city_pulses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting city pulse:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception deleting city pulse:', e);
      return false;
    }
  },

  async uploadImage(imageUri: string, fileExtension: string = 'jpeg'): Promise<string | null> {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
      
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from('pulses')
        .upload(fileName, blob, {
          contentType: `image/${fileExtension}`,
        });

      if (error) {
        console.error('Error uploading image to Supabase:', error);
        return null;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('pulses')
        .getPublicUrl(fileName);

      return publicUrlData.publicUrl;
    } catch (e) {
      console.error('Exception uploading image:', e);
      return null;
    }
  }
};
