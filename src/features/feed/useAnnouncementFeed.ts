import { useCallback, useEffect, useState } from 'react'
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

  const refresh = useCallback(async () => {
    if (!enabled || !weddingId || !supabase) return
    const { data } = await supabase
      .from('wedding_feed')
      .select('id, body, created_at, author_id')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (data) setPosts(mapPosts(data))
  }, [enabled, weddingId])

  useEffect(() => {
    if (!enabled || !weddingId || !supabase) return
    let cancelled = false
    const client = supabase
    void client
      .from('wedding_feed')
      .select('id, body, created_at, author_id')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled && data) setPosts(mapPosts(data))
      })
    const channel = client.channel(`feed:${weddingId}:${Math.random().toString(36).slice(2)}`)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wedding_feed', filter: `wedding_id=eq.${weddingId}` },
      () => {
        void client
          .from('wedding_feed')
          .select('id, body, created_at, author_id')
          .eq('wedding_id', weddingId)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (!cancelled && data) setPosts(mapPosts(data))
          })
      },
    )
    channel.subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [enabled, weddingId])

  return { posts, refresh }
}
