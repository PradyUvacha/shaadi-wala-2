import type { SupabaseClient } from '@supabase/supabase-js'

export const BUDGET_PING_EVENT = 'budget_ping'
export const FEED_PING_EVENT = 'feed_ping'

export type BudgetPingTable = 'budget_items' | 'part_payments'

export function budgetPingTopic(weddingId: string): string {
  return `wedding:${weddingId}:budget`
}

export function feedPingTopic(weddingId: string): string {
  return `wedding:${weddingId}:feed`
}

/** The only fields a budget ping is allowed to carry. */
export function budgetPingPayload(table: BudgetPingTable, weddingId: string): { table: BudgetPingTable; wedding_id: string } {
  return { table, wedding_id: weddingId }
}

/** The only fields a feed ping is allowed to carry. */
export function feedPingPayload(weddingId: string): { table: 'wedding_feed'; wedding_id: string } {
  return { table: 'wedding_feed', wedding_id: weddingId }
}

/** Private broadcast. The payload has no budget or payment fields. The handler refetches through RLS. */
export function subscribeBudgetPings(
  client: SupabaseClient,
  weddingId: string,
  onPing: () => void,
): () => void {
  return subscribeListPing(client, budgetPingTopic(weddingId), BUDGET_PING_EVENT, onPing)
}

/** Private broadcast. A delete that RLS would hide still pings, and the handler refetches the feed. */
export function subscribeFeedPings(
  client: SupabaseClient,
  weddingId: string,
  onPing: () => void,
): () => void {
  return subscribeListPing(client, feedPingTopic(weddingId), FEED_PING_EVENT, onPing)
}

function subscribeListPing(
  client: SupabaseClient,
  topic: string,
  event: string,
  onPing: () => void,
): () => void {
  let cancelled = false
  const channel = client.channel(topic, { config: { private: true } })
  channel.on('broadcast', { event }, () => {
    if (!cancelled) onPing()
  })
  channel.subscribe()
  return () => {
    cancelled = true
    void client.removeChannel(channel)
  }
}
