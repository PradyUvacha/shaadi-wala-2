import { useCallback, useEffect, useRef, useState } from 'react'
import { scheduleGuestRefresh } from '../../lib/guestSync.ts'
import { subscribeFeedPings } from '../../lib/budgetFeedPing.ts'
import { supabase } from '../../lib/supabase.ts'
import type { FeedPost } from './FeedList.tsx'

function mapPosts(rows: { id: unknown; body: unknown; created_at: unknown; author_id: unknown }[]): FeedPost[] {
  return rows.map((row) => ({
    id: String(row.id),
    body: String(row.body ?? ''),
    createdAt: String(row.created_at ?? ''),
    authorId: String(row.author_id ?? ''),
  }))
}

export function useAnnouncementFeed(weddingId: string | null, enabled: boolean): {
  posts: FeedPost[]
  refresh: () => Promise<void>
} {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const ticket = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled || !weddingId || !supabase) return
    const mine = ++ticket.current
    const { data } = await supabase
      .from('wedding_feed')
      .select('id, body, created_at, author_id')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (mine === ticket.current && data) setPosts(mapPosts(data))
  }, [enabled, weddingId])

  useEffect(() => {
    if (!enabled || !weddingId || !supabase) return
    let cancelled = false
    const client = supabase
    const pull = () => {
      const mine = ++ticket.current
      void client
        .from('wedding_feed')
        .select('id, body, created_at, author_id')
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (!cancelled && mine === ticket.current && data) setPosts(mapPosts(data))
        })
    }
    pull()
    const refresher = scheduleGuestRefresh(pull)
    const stop = subscribeFeedPings(client, weddingId, () => refresher.schedule())
    return () => {
      cancelled = true
      refresher.cancel()
      stop()
    }
  }, [enabled, weddingId])

  return { posts, refresh }
}
