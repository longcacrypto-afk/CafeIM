import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Role = 'owner' | 'manager' | 'cashier' | 'barista'

export interface StaffProfile {
  id: string
  name: string
  role: Role
}

export async function signIn(email: string, password: string): Promise<{ session: Session; profile: StaffProfile }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  if (!data.session || !data.user) throw new Error('No session returned')

  const { data: profile, error: profileError } = await supabase
    .from('staff')
    .select('id, name, role')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) throw profileError

  const metaRole = (data.user.app_metadata as Record<string, string> | null)?.role
  return {
    session: data.session,
    profile:
      profile ??
      { id: data.user.id, name: (data.user.user_metadata as Record<string, string>)?.name ?? data.user.email ?? '?', role: (metaRole as Role) ?? 'cashier' },
  }
}

export async function signOut() {
  await supabase.auth.signOut()
}
