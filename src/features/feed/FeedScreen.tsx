import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { canPostFeed } from '../../lib/access.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import { FeedList, type FeedPost } from './FeedList.tsx'

export function FeedScreen() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { bundle, mode } = useWedding()
  const weddingId = bundle?.wedding.id ?? null
  const canPost = mode === 'preview' || canPostFeed(bundle?.membership.role)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [error, setError] = useState<string | null>(null)

  const applyRows = useCallback((rows: { id: unknown; body: unknown; created_at: unknown; author_id: unknown }[]) => {
    setPosts(rows.map((row) => ({
      id: String(row.id),
      body: String(row.body ?? ''),
      createdAt: String(row.created_at ?? ''),
      authorId: String(row.author_id ?? ''),
    })))
  }, [])

  const pull = useCallback(async () => {
    if (!weddingId || !supabase || mode !== 'remote') return
    const { data, error: readError } = await supabase
      .from('wedding_feed')
      .select('id, body, created_at, author_id')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    if (readError) {
      setError(toErrorMessage(readError))
      return
    }
    applyRows(data ?? [])
  }, [applyRows, mode, weddingId])

  useEffect(() => {
    if (!weddingId || !supabase || mode !== 'remote') return
    let cancelled = false
    const client = supabase
    void client
      .from('wedding_feed')
      .select('id, body, created_at, author_id')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
      .then(({ data, error: readError }) => {
        if (cancelled) return
        if (readError) {
          setError(toErrorMessage(readError))
          return
        }
        applyRows(data ?? [])
      })
    const channel = client.channel(`feed:${weddingId}`)
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'wedding_feed', filter: `wedding_id=eq.${weddingId}` },
      () => { void pull() },
    )
    channel.subscribe()
    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [applyRows, mode, pull, weddingId])

  const create = async (body: string) => {
    if (!weddingId || !supabase || !session) return
    const { error: writeError } = await supabase.from('wedding_feed').insert({
      wedding_id: weddingId,
      author_id: session.user.id,
      body,
    })
    if (writeError) setError(toErrorMessage(writeError))
    else await load()
  }
  const update = async (id: string, body: string) => {
    if (!supabase) return
    const { error: writeError } = await supabase.from('wedding_feed').update({ body }).eq('id', id)
    if (writeError) setError(toErrorMessage(writeError))
    else await load()
  }
  const remove = async (id: string) => {
    if (!supabase) return
    const { error: writeError } = await supabase.from('wedding_feed').delete().eq('id', id)
    if (writeError) setError(toErrorMessage(writeError))
    else await load()
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <button type="button" onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: COLORS.gold, padding: '0 0 8px', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>Back</button>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#fff', fontWeight: 700, margin: 0 }}>Announcements</h1>
      </div>
      <div style={{ padding: 16 }}>
        {error ? <p>{error}</p> : null}
        <FeedList
          posts={posts}
          authors={(bundle?.members ?? []).map((member) => ({
            userId: member.userId,
            role: member.role,
            side: member.side,
            displayName: member.displayName,
          }))}
          canPost={canPost}
          currentUserId={session?.user.id ?? null}
          onCreate={(body) => { void create(body) }}
          onUpdate={(id, body) => { void update(id, body) }}
          onDelete={(id) => { void remove(id) }}
        />
      </div>
    </div>
  )
}
