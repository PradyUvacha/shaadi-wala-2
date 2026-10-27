import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import { guestIncluded, type GuestListFilter } from './access.ts'
import type { Guest, MemberRole, Side } from '../types.ts'

export type GuestTable = 'guests' | 'guest_functions'

export const GUEST_PING_EVENT = 'guest_ping'
export const GUEST_REFRESH_DEBOUNCE_MS = 300
export const GUEST_LIST_FALLBACK_MS = 4000

const PING_KEYS = new Set(['table', 'wedding_id'])

export function guestPingTopic(weddingId: string): string {
  return `wedding:${weddingId}:guests`
}

/** The only fields a guest ping is allowed to carry. */
export function guestPingPayload(table: GuestTable, weddingId: string): { table: GuestTable; wedding_id: string } {
  return { table, wedding_id: weddingId }
}

export function guestPingLeaksGuest(payload: Record<string, unknown> | null | undefined): boolean {
  if (!payload) return false
  return Object.keys(payload).some((key) => !PING_KEYS.has(key))
}

export function scheduleGuestRefresh(pull: () => void, delay = GUEST_REFRESH_DEBOUNCE_MS): { schedule: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  return {
    schedule() {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        pull()
      }, delay)
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
    },
  }
}

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

/**
 * Private broadcast. The database ping has no guest fields. The handler
 * refetches through RLS and never copies the payload into state.
 * `onStatus(true)` means the channel failed and the Guests screen should poll.
 */
export function subscribeGuestPings(
  client: SupabaseClient,
  weddingId: string,
  onPing: () => void,
  onStatus?: (down: boolean) => void,
): () => void {
  let cancelled = false
  const channel = client.channel(guestPingTopic(weddingId), { config: { private: true } })
  channel.on('broadcast', { event: GUEST_PING_EVENT }, () => {
    onPing()
  })
  channel.subscribe((status) => {
    if (cancelled) return
    if (status === 'SUBSCRIBED') onStatus?.(false)
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus?.(true)
  })
  return () => {
    cancelled = true
    void client.removeChannel(channel)
  }
}
