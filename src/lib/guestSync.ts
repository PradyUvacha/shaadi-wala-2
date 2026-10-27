import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import { guestIncluded, type GuestListFilter } from './access.ts'
import type { Guest, MemberRole, Side } from '../types.ts'

export type GuestTable = 'guests' | 'guest_functions'

export function guestChannelFilters(weddingId: string) {
  return [
    { event: '*' as const, schema: 'public' as const, table: 'guests' as const, filter: `wedding_id=eq.${weddingId}` },
    { event: '*' as const, schema: 'public' as const, table: 'guest_functions' as const, filter: `wedding_id=eq.${weddingId}` },
  ]
}

/** Any insert, update, or delete is enough to refetch. RLS can hide the old row, so the payload is not the guest list. */
export function guestEventShouldRefresh(
  payload: Pick<RealtimePostgresChangesPayload<Record<string, unknown>>, 'eventType'>,
): boolean {
  return payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE'
}

/** The Guests screen filters again after a refetch, so a side move enters or leaves the open chip. */
export function guestsInFilter(
  guests: readonly Pick<Guest, 'side'>[],
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
  filter: GuestListFilter,
): typeof guests {
  return guests.filter((guest) => guestIncluded(role, viewerSide, filter, guest.side))
}

export function subscribeWeddingGuests(
  client: SupabaseClient,
  weddingId: string,
  onChange: (table: GuestTable) => void,
): () => void {
  const channel = client.channel(`guests:${weddingId}`)
  for (const filter of guestChannelFilters(weddingId)) {
    channel.on('postgres_changes', filter, (payload) => {
      if (guestEventShouldRefresh(payload)) onChange(filter.table)
    })
  }
  channel.subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}
