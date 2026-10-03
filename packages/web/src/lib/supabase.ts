/**
 * Supabase is NO LONGER USED in GuitarMind.
 * This file is kept as a stub to prevent TypeScript errors during migration.
 *
 * The app now uses PocketBase (free, self-hosted) — see lib/pocketbase.ts
 * Backend: run `py scripts/server.py` to start PocketBase on :8090
 */

// Minimal stub to avoid import errors in pages not yet migrated
export const supabase = {
  auth: {
    signInWithOAuth: async () => ({ error: new Error('Supabase removed — use the Bypass login') }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (_table: string) => ({
    select: () => ({ eq: () => ({ single: async () => ({ data: null, error: new Error('Supabase removed') }) }) }),
    insert: async () => ({ error: new Error('Supabase removed') }),
    upsert: async () => ({ error: new Error('Supabase removed') }),
    update: () => ({ eq: async () => ({ error: new Error('Supabase removed') }) }),
    delete: () => ({ eq: async () => ({ error: new Error('Supabase removed') }) }),
  }),
} as any;

export default supabase;
