/**
 * Parked PostHog provider. Nothing in the app imports this file.
 * Mixpanel will implement AnalyticsProvider when that account is approved.
 */
import type { AnalyticsProps, AnalyticsProvider } from './provider.ts'

type PostHog = {
  __loaded?: boolean
  init: (apiKey: string, options: Record<string, unknown>) => void
  capture: (event: string, properties?: AnalyticsProps) => void
  identify: (id: string) => void
  reset: () => void
}

export function createPostHogProvider(key: string, host: string): AnalyticsProvider {
  let client: PostHog | null = null
  let loading: Promise<void> | null = null
  const queue: Array<{ event: string; props?: AnalyticsProps }> = []
  let identified: string | null = null

  const load = () => {
    loading ??= import('posthog-js').then((mod) => {
      const posthog = mod.default as PostHog
      if (!posthog.__loaded) {
        posthog.init(key, {
          api_host: host,
          capture_pageview: false,
          autocapture: false,
          persistence: 'localStorage',
          person_profiles: 'identified_only',
        })
      }
      client = posthog
      if (identified) posthog.identify(identified)
      for (const item of queue.splice(0)) posthog.capture(item.event, item.props)
    })
  }

  return {
    identify(userId) {
      identified = userId
      if (!client) {
        load()
        return
      }
      if (userId) client.identify(userId)
      else client.reset()
    },
    track(event, props) {
      if (!client) {
        queue.push({ event, props })
        load()
        return
      }
      client.capture(event, props)
    },
  }
}
