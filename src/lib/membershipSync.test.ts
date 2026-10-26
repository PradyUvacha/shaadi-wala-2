import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  LEFT_WEDDING_MESSAGE,
  membershipAccessChanged,
  membershipChannelFilter,
  ownMembershipEvent,
  subscribeOwnMembership,
} from './membershipSync.ts'

describe('own membership realtime', () => {
  it('watches the signed-in user row for updates and deletes', () => {
    expect(membershipChannelFilter('user-1')).toMatchObject({
      event: '*',
      schema: 'public',
      table: 'wedding_members',
      filter: 'user_id=eq.user-1',
    })
    expect(ownMembershipEvent({ eventType: 'DELETE', new: {}, old: { id: 'm1', user_id: 'user-1' } })).toEqual({ type: 'removed' })
    expect(ownMembershipEvent({
      eventType: 'UPDATE',
      new: { id: 'm1', user_id: 'user-1', role: 'friend', side: 'groom' },
      old: { side: 'bride' },
    })).toEqual({ type: 'updated', role: 'friend', side: 'groom' })
    expect(ownMembershipEvent({ eventType: 'INSERT', new: { role: 'friend', side: 'bride' }, old: {} })).toBeNull()
  })

  it('refreshes only when the role or side changed', () => {
    const current = { role: 'friend' as const, side: 'bride' as const }
    expect(membershipAccessChanged(current, { role: 'friend', side: 'groom' })).toBe(true)
    expect(membershipAccessChanged(current, { role: 'family', side: 'bride' })).toBe(true)
    expect(membershipAccessChanged(current, { role: 'friend', side: 'bride' })).toBe(false)
    expect(LEFT_WEDDING_MESSAGE).toMatch(/no longer/)
  })

  it('subscribes and unsubscribes the membership channel', () => {
    const seen: string[] = []
    let removed = false
    const channel = {
      on(_event: string, _filter: unknown, callback: (payload: { eventType: 'DELETE'; new: Record<string, unknown>; old: Record<string, unknown> }) => void) {
        callback({ eventType: 'DELETE', new: {}, old: { id: 'm1' } })
        return channel
      },
      subscribe() {
        seen.push('subscribe')
        return channel
      },
    }
    const stop = subscribeOwnMembership({
      channel: () => channel,
      removeChannel: () => {
        removed = true
      },
    } as unknown as SupabaseClient, 'user-1', (event) => {
      expect(event).toEqual({ type: 'removed' })
    })
    expect(seen).toEqual(['subscribe'])
    stop()
    expect(removed).toBe(true)
  })
})
