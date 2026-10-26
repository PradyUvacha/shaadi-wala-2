import { supabase } from '../../lib/supabase.ts'

export function validateFeedback(message: string, rating: number | null): string | null {
  if (!message.trim()) return 'Write a message first.'
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return 'Choose a rating from 1 to 5, or leave it blank.'
  return null
}

/** Stores text feedback. There is no screenshot upload. */
export async function submitFeedback(message: string, rating: number | null, weddingId?: string): Promise<void> {
  const validation = validateFeedback(message, rating)
  if (validation) throw new Error(validation)
  if (!supabase) throw new Error('Feedback needs Supabase to be configured.')
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!data.user) throw new Error('Sign in before sending feedback.')
  const { error } = await supabase.from('feedback').insert({
    user_id: data.user.id,
    wedding_id: weddingId ?? null,
    message: message.trim(),
    rating,
  })
  if (error) throw new Error(error.message)
}
