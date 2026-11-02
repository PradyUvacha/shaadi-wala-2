/** /timeline and the Planning Events tab both land here. */
export const PLANNING_EVENTS_PATH = '/planning?tab=events'

export function isPlanningEvents(params: URLSearchParams): boolean {
  return params.get('tab') === 'events'
}
