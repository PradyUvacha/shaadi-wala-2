import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function clean(value: string | undefined): string {
  return (value ?? '').trim()
}

export const supabaseUrl = clean(import.meta.env.VITE_SUPABASE_URL)
export const supabaseAnonKey = clean(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const isSupabaseConfigured = supabaseUrl.startsWith('http') && supabaseAnonKey.length > 0

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null
