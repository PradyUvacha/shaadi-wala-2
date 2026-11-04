import { describe, expect, it } from 'vitest'
import { authNextFromSearch, googleAuthEnabled, withAuthNext } from './auth.ts'

describe('Google sign-in', () => {
  it('stays hidden until VITE_ENABLE_GOOGLE_AUTH is true', () => {
    expect(googleAuthEnabled(undefined)).toBe(false)
    expect(googleAuthEnabled('')).toBe(false)
    expect(googleAuthEnabled('false')).toBe(false)
    expect(googleAuthEnabled('true')).toBe(true)
  })

  it('keeps the invite role and side on the auth callback', () => {
    const next = '/invite/123456?role=friend&side=bride'
    expect(authNextFromSearch(`?next=${encodeURIComponent(next)}`)).toBe(next)
    expect(authNextFromSearch('?next=https://evil.example')).toBeNull()
    const redirect = withAuthNext('https://shaadi-wala-2.vercel.app/auth', next)
    const url = new URL(redirect)
    expect(`${url.origin}${url.pathname}`).toBe('https://shaadi-wala-2.vercel.app/auth')
    expect(url.searchParams.get('next')).toBe(next)
    expect(url.searchParams.get('next')).toContain('role=friend')
    expect(url.searchParams.get('next')).toContain('side=bride')
  })
})
