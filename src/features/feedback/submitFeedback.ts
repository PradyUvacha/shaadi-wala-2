import { supabase } from '../../lib/supabase.ts'

/** Data path for the later in-app feedback screen. There is no feedback UI yet. */
export async function submitFeedback(message: string, weddingId?: string): Promise<void> {
  const trimmed = message.trim()
  if (!trimmed) throw new Error('Write a message first.')
  if (!supabase) throw new Error('Feedback needs Supabase to be configured.')
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!data.user) throw new Error('Sign in before sending feedback.')
  const { error } = await supabase.from('feedback').insert({
    user_id: data.user.id,
    wedding_id: weddingId ?? null,
    message: trimmed,
  })
  if (error) throw new Error(error.message)
}
