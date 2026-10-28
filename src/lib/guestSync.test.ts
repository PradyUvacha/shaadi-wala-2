import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  GUEST_PING_EVENT,
  GUEST_REFRESH_DEBOUNCE_MS,
  guestChannelFilters,
  guestEventShouldRefresh,
  guestPingLeaksGuest,
  guestPingPayload,
  guestPingTopic,
  guestsInFilter,
  scheduleGuestRefresh,
  subscribeGuestPings,
  subscribeWeddingGuests,
} from './guestSync.ts'

describe('guest realtime', () => {
  it('listens to guests and function links, and refetches even when the old row is hidden', () => {
    const filters = guestChannelFilters('wedding-1')
    expect(filters.map((filter) => filter.table)).toEqual(['guests', 'guest_functions'])
    expect(filters.every((filter) => filter.filter === 'wedding_id=eq.wedding-1' && filter.event === '*')).toBe(true)
    expect(guestEventShouldRefresh({ eventType: 'UPDATE' })).toBe(true)
    expect(guestEventShouldRefresh({ eventType: 'DELETE' })).toBe(true)
    expect(guestEventShouldRefresh({ eventType: 'INSERT' })).toBe(true)

    const seen: string[] = []
    let removed = false
    const channel = {
      on(_event: string, filter: { table: string }, callback: (payload: { eventType: 'DELETE' | 'UPDATE'; new: Record<string, unknown>; old: Record<string, unknown> }) => void) {
        seen.push(filter.table)
        if (filter.table === 'guests') callback({ eventType: 'DELETE', new: {}, old: {} })
        if (filter.table === 'guest_functions') callback({ eventType: 'UPDATE', new: { guest_id: 'g1' }, old: {} })
        return channel
      },
      subscribe() {
        return channel
      },
    }
    const stop = subscribeWeddingGuests({
      channel: () => channel,
      removeChannel: () => {
        removed = true
      },
    } as unknown as SupabaseClient, 'wedding-1', (table) => {
      seen.push(`event:${table}`)
    })
    expect(seen).toEqual(['guests', 'event:guests', 'guest_functions', 'event:guest_functions'])
    stop()
    expect(removed).toBe(true)
  })

  it('shows a guest who moves onto the groom filter and drops one who moves off it', () => {
    const mutual = { side: 'both' as const }
    const groom = { side: 'groom' as const }
    const bride = { side: 'bride' as const }
    expect(guestsInFilter([mutual], 'groom', 'groom', 'groom')).toEqual([])
    expect(guestsInFilter([groom], 'groom', 'groom', 'groom')).toEqual([groom])
    expect(guestsInFilter([bride], 'groom', 'groom', 'groom')).toEqual([])
    expect(guestsInFilter([mutual, groom], 'family', 'groom', 'all')).toEqual([mutual, groom])
    expect(guestsInFilter([bride, mutual], 'family', 'groom', 'all')).toEqual([mutual])
  })

  it('debounces two guest refreshes into one pull', () => {
    vi.useFakeTimers()
    try {
      let pulls = 0
      const refresher = scheduleGuestRefresh(() => {
        pulls += 1
      })
      refresher.schedule()
      refresher.schedule()
      vi.advanceTimersByTime(GUEST_REFRESH_DEBOUNCE_MS - 1)
      expect(pulls).toBe(0)
      vi.advanceTimersByTime(1)
      expect(pulls).toBe(1)
      refresher.schedule()
      refresher.cancel()
      vi.advanceTimersByTime(GUEST_REFRESH_DEBOUNCE_MS)
      expect(pulls).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('listens on a private topic and never applies guest fields from the ping', () => {
    const payload = guestPingPayload('guests', 'wedding-1')
    expect(guestPingTopic('wedding-1')).toBe('wedding:wedding-1:guests')
    expect(payload).toEqual({ table: 'guests', wedding_id: 'wedding-1' })
    expect(Object.keys(payload).sort()).toEqual(['table', 'wedding_id'])
    expect(guestPingLeaksGuest(payload)).toBe(false)
    expect(guestPingLeaksGuest({ ...payload, name: 'Secret Guest', side: 'groom', email: 'a@b.c' })).toBe(true)

    const seen: unknown[] = []
    const statuses: boolean[] = []
    let pingArgs: unknown[] | null = null
    let statusCb: ((status: string) => void) | undefined
    const channel = {
      on(event: string, filter: { event: string }, callback: (message: { payload: Record<string, unknown> }) => void) {
        seen.push({ event, filter })
        callback({ payload: { table: 'guests', wedding_id: 'wedding-1', name: 'Secret Guest', phone: '999' } })
        return channel
      },
      subscribe(cb?: (status: string) => void) {
        statusCb = cb
        return channel
      },
    }
    const stop = subscribeGuestPings({
      channel: (name: string, opts: { config: { private: boolean } }) => {
        seen.push({ name, private: opts.config.private })
        return channel
      },
      removeChannel: () => {
        seen.push('removed')
      },
    } as unknown as SupabaseClient, 'wedding-1', (...args: unknown[]) => {
      pingArgs = args
    }, (down) => {
      statuses.push(down)
    })
    expect(seen[0]).toEqual({ name: 'wedding:wedding-1:guests', private: true })
    expect(seen[1]).toEqual({ event: 'broadcast', filter: { event: GUEST_PING_EVENT } })
    expect(pingArgs).toEqual([])
    statusCb?.('SUBSCRIBED')
    statusCb?.('CHANNEL_ERROR')
    statusCb?.('TIMED_OUT')
    expect(statuses).toEqual([false, true, true])
    stop()
    statusCb?.('CLOSED')
    expect(statuses).toEqual([false, true, true])
    expect(seen).toContain('removed')
  })
})
