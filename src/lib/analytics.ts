/**
 * Product analytics. The live provider is a no-op until Mixpanel is approved.
 * PostHog remains in ./analytics/posthog.ts and is not used.
 */
import { noopAnalytics, type AnalyticsProps, type AnalyticsProvider } from './analytics/provider.ts'

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

let provider: AnalyticsProvider = noopAnalytics

export function setAnalyticsProvider(next: AnalyticsProvider): void {
  provider = next
}

export function analyticsEnabled(): boolean {
  return provider !== noopAnalytics
}

export function initAnalytics(): void {}

export function identifyUser(userId: string | null): void {
  provider.identify(userId)
}

let appOpened = false

export function trackAppOpen(): void {
  if (appOpened) return
  appOpened = true
  track('app_open')
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  provider.track(event, props)
}
