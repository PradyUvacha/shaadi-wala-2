export type AnalyticsProps = Record<string, string | number | boolean>

/** Mixpanel can implement this once that account is approved. The app ships a no-op. */
export interface AnalyticsProvider {
  identify(userId: string | null): void
  track(event: string, props?: AnalyticsProps): void
}

export const noopAnalytics: AnalyticsProvider = {
  identify() {},
  track() {},
}
