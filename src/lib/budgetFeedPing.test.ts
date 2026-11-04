import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  BUDGET_PING_EVENT,
  budgetPingPayload,
  budgetPingTopic,
  FEED_PING_EVENT,
  feedPingPayload,
  feedPingTopic,
  subscribeBudgetPings,
  subscribeFeedPings,
} from './budgetFeedPing.ts'

describe('budget and feed pings', () => {
  it('carries only the table name and the wedding id', () => {
    const budget = budgetPingPayload('part_payments', 'wedding-1')
    const feed = feedPingPayload('wedding-1')
    expect(budget).toEqual({ table: 'part_payments', wedding_id: 'wedding-1' })
    expect(feed).toEqual({ table: 'wedding_feed', wedding_id: 'wedding-1' })
    expect(Object.keys(budget).sort()).toEqual(['table', 'wedding_id'])
    expect(Object.keys(feed).sort()).toEqual(['table', 'wedding_id'])
    expect(budgetPingTopic('wedding-1')).toBe('wedding:wedding-1:budget')
    expect(feedPingTopic('wedding-1')).toBe('wedding:wedding-1:feed')
  })

  it('refetches from the ping and ignores any extra payload fields', () => {
    const seen: string[] = []
    let budgetArgs: unknown[] | null = null
    let feedArgs: unknown[] | null = null
    const channel = {
      on(kind: string, filter: { event: string }, callback: (message: { payload: Record<string, unknown> }) => void) {
        seen.push(`${kind}:${filter.event}`)
        callback({ payload: { table: 'part_payments', wedding_id: 'wedding-1', amount: 701, body: 'secret' } })
        return channel
      },
      subscribe() {
        return channel
      },
    }
    const client = {
      channel: (name: string, opts: { config: { private: boolean } }) => {
        seen.push(`${name}:${opts.config.private}`)
        return channel
      },
      removeChannel: () => {
        seen.push('removed')
      },
    } as unknown as SupabaseClient
    const stopBudget = subscribeBudgetPings(client, 'wedding-1', (...args: unknown[]) => {
      budgetArgs = args
    })
    expect(seen).toContain('wedding:wedding-1:budget:true')
    expect(seen).toContain(`broadcast:${BUDGET_PING_EVENT}`)
    expect(budgetArgs).toEqual([])
    stopBudget()
    const stopFeed = subscribeFeedPings(client, 'wedding-1', (...args: unknown[]) => {
      feedArgs = args
    })
    expect(seen).toContain('wedding:wedding-1:feed:true')
    expect(seen).toContain(`broadcast:${FEED_PING_EVENT}`)
    expect(feedArgs).toEqual([])
    stopFeed()
    expect(seen).toContain('removed')
  })
})
