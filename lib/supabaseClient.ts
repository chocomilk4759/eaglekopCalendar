import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Singleton instance to prevent multiple GoTrueClient instances
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel dashboard.'
    );
  }

  supabaseInstance = createSupabaseClient(url, anon);
  return supabaseInstance;
}

// Export singleton instance directly for components that don't need lazy initialization
export const supabase = createClient();
