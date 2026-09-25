import { createClient } from '@supabase/supabase-js';

let supabase;

export function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }
    if (key.startsWith('sb_publishable_') || key.startsWith('eyJ')) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must contain the server-side secret/service_role key, not the anon/publishable key');
    }

    supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return supabase;
}
