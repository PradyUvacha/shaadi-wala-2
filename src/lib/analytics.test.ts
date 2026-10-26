import { describe, expect, it } from 'vitest'
import { ANALYTICS_EVENTS, analyticsEnabled, setAnalyticsProvider, track } from './analytics.ts'
import { noopAnalytics, type AnalyticsProvider } from './analytics/provider.ts'

describe('analytics', () => {
  it('uses a no-op provider until Mixpanel is connected', () => {
    expect(import.meta.env.VITE_POSTHOG_KEY ?? '').toBe('')
    expect(analyticsEnabled()).toBe(false)
    expect(ANALYTICS_EVENTS).toContain('sign_up')
    expect(ANALYTICS_EVENTS).toContain('app_open')
    const seen: string[] = []
    const recording: AnalyticsProvider = {
      identify() {},
      track(event) {
        seen.push(event)
      },
    }
    track('wedding_created')
    expect(seen).toEqual([])
    setAnalyticsProvider(recording)
    expect(analyticsEnabled()).toBe(true)
    track('invite_sent')
    expect(seen).toEqual(['invite_sent'])
    setAnalyticsProvider(noopAnalytics)
    expect(analyticsEnabled()).toBe(false)
  })
})
