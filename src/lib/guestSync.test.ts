import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { guestChannelFilters, guestEventShouldRefresh, guestsInFilter, subscribeWeddingGuests } from './guestSync.ts'

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
})
