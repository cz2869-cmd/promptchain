import { supabaseEnv } from '@/lib/env'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const env = supabaseEnv()
  if (!env) {
    throw new Error('Supabase environment variables are missing.')
  }
  return createBrowserClient(env.url, env.key)
}
