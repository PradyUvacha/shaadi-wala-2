/** Later PR: send these to a product analytics tool. The call sites are already in place. */
export type AnalyticsEvent =
  | 'auth_sign_in'
  | 'auth_sign_up'
  | 'wedding_created'
  | 'task_completed'
  | 'budget_item_saved'
  | 'guest_saved'
  | 'timeline_event_saved'
  | 'checklist_loaded'

export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean>): void {
  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, props ?? {})
  }
}
