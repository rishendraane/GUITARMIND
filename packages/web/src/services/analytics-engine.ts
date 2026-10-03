import { supabase } from '../lib/supabase';

export class AnalyticsEngine {
  static async logEvent(userId: string | null, eventName: string, eventData: Record<string, any> = {}, page = ''): Promise<void> {
    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          user_id: userId || undefined,
          event_name: eventName,
          event_data: eventData,
          page: page || window.location.hash || '#home',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error logging analytics event:', err);
    }
  }

  static async getAdminStats(): Promise<any | null> {
    try {
      // First refresh stats snapshot using RPC function
      await supabase.rpc('refresh_admin_stats');

      // Fetch the latest snapshot
      const { data, error } = await supabase
        .from('admin_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return null;
      return data;
    } catch (err) {
      console.error('Error loading admin stats:', err);
      return null;
    }
  }
}
