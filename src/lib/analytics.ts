/**
 * Product analytics via PostHog.
 * No-op when VITE_POSTHOG_KEY is missing, so local and CI builds send nothing.
 * Events are documented in the README for the privacy policy.
 */
export const ANALYTICS_EVENTS = [
  'sign_up',
  'wedding_created',
  'onboarding_completed',
  'invite_sent',
  'invite_accepted',
  'first_task_added',
  'first_guest_added',
  'first_budget_item_added',
  'app_open',
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

type Props = Record<string, string | number | boolean>

const key = (import.meta.env.VITE_POSTHOG_KEY ?? '').trim()
const host = (import.meta.env.VITE_POSTHOG_HOST ?? '').trim() || 'https://us.i.posthog.com'

type PostHog = {
  __loaded?: boolean
  init: (apiKey: string, options: Record<string, unknown>) => void
  capture: (event: string, properties?: Props) => void
  identify: (id: string) => void
  reset: () => void
}

let loading: Promise<PostHog> | null = null
let client: PostHog | null = null
const queue: Array<{ event: AnalyticsEvent; props?: Props }> = []
let identified: string | null = null

export function analyticsEnabled(): boolean {
  return key.length > 0
}

function load(): Promise<PostHog> | null {
  if (!analyticsEnabled()) return null
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
    return posthog
  })
  return loading
}

export function initAnalytics(): void {
  void load()
}

export function identifyUser(userId: string | null): void {
  identified = userId
  if (!client) {
    void load()
    return
  }
  if (userId) client.identify(userId)
  else client.reset()
}

let appOpened = false

export function trackAppOpen(): void {
  if (appOpened) return
  appOpened = true
  track('app_open')
}

export function track(event: AnalyticsEvent, props?: Props): void {
  if (!analyticsEnabled()) return
  if (!client) {
    queue.push({ event, props })
    void load()
    return
  }
  client.capture(event, props)
}
