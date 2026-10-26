import { describe, expect, it } from 'vitest'
import { ANALYTICS_EVENTS, analyticsEnabled } from './analytics.ts'

describe('analytics', () => {
  it('does nothing when the PostHog key is absent', () => {
    expect(import.meta.env.VITE_POSTHOG_KEY ?? '').toBe('')
    expect(analyticsEnabled()).toBe(false)
    expect(ANALYTICS_EVENTS).toContain('sign_up')
    expect(ANALYTICS_EVENTS).toContain('app_open')
  })
})
