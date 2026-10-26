import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { firstJsonKey, isNewApiKey, resolveEdgeKeys, resolveSupabaseKey, userJwt } from './supabaseKeys.ts'

describe('supabase keys', () => {
  it('accepts a publishable key in the client', () => {
    const key = 'sb_publishable_HVHOVn_lC-5EBEBSFBhLkA_gQgrWLm4'
    expect(resolveSupabaseKey({ anon: '', publishable: key })).toBe(key)
    expect(resolveSupabaseKey({ anon: 'anon-key', publishable: key })).toBe('anon-key')
    expect(() => createClient('https://ujglzkfxgewqupkeqyek.supabase.co', key)).not.toThrow()
  })

  it('reads new-style key maps and ignores an sb_ token as a user', () => {
    const keys = resolveEdgeKeys({
      SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: 'sb_publishable_example' }),
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_example' }),
    })
    expect(keys).toEqual({ publishable: 'sb_publishable_example', secret: 'sb_secret_example' })
    expect(firstJsonKey('legacy-anon')).toBe('legacy-anon')
    expect(isNewApiKey('sb_secret_example')).toBe(true)
    expect(userJwt('Bearer sb_publishable_example')).toBeNull()
    expect(userJwt('Bearer user.jwt.token')).toBe('user.jwt.token')
  })
})
