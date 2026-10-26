/** Prefer the anon key when it is set. Otherwise use the publishable key. */
export function resolveSupabaseKey(input: { anon?: string; publishable?: string }): string {
  const anon = (input.anon ?? '').trim()
  if (anon) return anon
  return (input.publishable ?? '').trim()
}

export function isNewApiKey(key: string): boolean {
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')
}

/** Supabase injects new keys as a JSON object keyed by name, usually `default`. */
export function firstJsonKey(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed) return ''
  if (!trimmed.startsWith('{')) return trimmed
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (typeof parsed.default === 'string' && parsed.default.trim()) return parsed.default.trim()
    const first = Object.values(parsed).find((value) => typeof value === 'string' && value.trim().length > 0)
    return typeof first === 'string' ? first.trim() : ''
  } catch {
    return ''
  }
}

export function resolveEdgeKeys(env: {
  SUPABASE_PUBLISHABLE_KEYS?: string
  SUPABASE_PUBLISHABLE_KEY?: string
  SUPABASE_ANON_KEY?: string
  SUPABASE_SECRET_KEYS?: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}): { publishable: string; secret: string } {
  const publishable = firstJsonKey(env.SUPABASE_PUBLISHABLE_KEYS)
    || firstJsonKey(env.SUPABASE_PUBLISHABLE_KEY)
    || firstJsonKey(env.SUPABASE_ANON_KEY)
  const secret = firstJsonKey(env.SUPABASE_SECRET_KEYS)
    || firstJsonKey(env.SUPABASE_SECRET_KEY)
    || firstJsonKey(env.SUPABASE_SERVICE_ROLE_KEY)
  return { publishable, secret }
}

/** A user access token. New-style `sb_` keys are not a signed-in user. */
export function userJwt(authorization: string | null): string | null {
  if (!authorization) return null
  const token = authorization.replace(/^Bearer\s+/i, '').trim()
  if (!token || token.startsWith('sb_')) return null
  return token
}
