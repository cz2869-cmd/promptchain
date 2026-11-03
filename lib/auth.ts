import { supabaseEnv } from '@/lib/env'
import { createClient } from '@/lib/server'

export type Access =
  | { ok: true; userId: string; name: string }
  | { ok: false; reason: 'signin' | 'setup' | 'denied' | 'config' }

export async function requireAdmin(): Promise<Access> {
  if (!supabaseEnv()) {
    return { ok: false, reason: 'config' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, reason: 'signin' }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('first_name, last_name, is_superadmin')
    .eq('id', user.id)
    .maybeSingle()

  if (error?.message.toLowerCase().includes('is_superadmin')) {
    return { ok: false, reason: 'setup' }
  }

  if (error || profile?.is_superadmin !== true) {
    return { ok: false, reason: 'denied' }
  }

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return { ok: true, userId: user.id, name: name || 'Superadmin' }
}
