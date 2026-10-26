import { supabase } from '../../lib/supabase.ts'

const SCREENSHOT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024
export const FEEDBACK_SCREENSHOT_BUCKET = 'feedback-screenshots'

export function validateFeedback(message: string, rating: number | null): string | null {
  if (!message.trim()) return 'Write a message first.'
  if (rating != null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return 'Choose a rating from 1 to 5, or leave it blank.'
  return null
}

export function validateScreenshot(file: { type: string; size: number } | null | undefined): string | null {
  if (!file) return null
  if (!SCREENSHOT_TYPES.has(file.type)) return 'Use a JPEG, PNG, or WebP screenshot.'
  if (file.size <= 0) return 'That screenshot is empty.'
  if (file.size > MAX_SCREENSHOT_BYTES) return 'Keep the screenshot under 5 MB.'
  return null
}

function screenshotExtension(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

/** Stores text feedback and an optional private screenshot for the signed-in person. */
export async function submitFeedback(
  message: string,
  rating: number | null,
  weddingId?: string,
  screenshot?: File | null,
): Promise<void> {
  const validation = validateFeedback(message, rating)
  if (validation) throw new Error(validation)
  const shotError = validateScreenshot(screenshot)
  if (shotError) throw new Error(shotError)
  if (!supabase) throw new Error('Feedback needs Supabase to be configured.')
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!data.user) throw new Error('Sign in before sending feedback.')

  let screenshotPath: string | null = null
  if (screenshot) {
    screenshotPath = `${data.user.id}/${crypto.randomUUID()}.${screenshotExtension(screenshot.type)}`
    const uploaded = await supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).upload(screenshotPath, screenshot, {
      contentType: screenshot.type,
      upsert: false,
    })
    if (uploaded.error) throw new Error(uploaded.error.message)
  }

  const { error } = await supabase.from('feedback').insert({
    user_id: data.user.id,
    wedding_id: weddingId ?? null,
    message: message.trim(),
    rating,
    screenshot_path: screenshotPath,
  })
  if (error) {
    if (screenshotPath) await supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).remove([screenshotPath])
    throw new Error(error.message)
  }
}
