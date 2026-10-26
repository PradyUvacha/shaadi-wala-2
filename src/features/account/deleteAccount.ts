import { supabase } from '../../lib/supabase.ts'

/** Deletes the signed-in user through the delete-account edge function. The service role stays on the server. */
export async function deleteAccount(): Promise<void> {
  if (!supabase) throw new Error('Sign in with Supabase configured before deleting an account.')
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: 'DELETE' },
  })
  if (error) throw new Error(error.message || 'Account deletion failed.')
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error))
  }
  await supabase.auth.signOut({ scope: 'local' })
}
