import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { canPostFeed } from '../../lib/access.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { supabase } from '../../lib/supabase.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import { FeedList } from './FeedList.tsx'
import { useAnnouncementFeed } from './useAnnouncementFeed.ts'

export function FeedScreen() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { bundle, mode } = useWedding()
  const weddingId = bundle?.wedding.id ?? null
  const canPost = mode === 'preview' || canPostFeed(bundle?.membership.role)
  const { posts, refresh } = useAnnouncementFeed(weddingId, mode === 'remote')
  const [error, setError] = useState<string | null>(null)

  const create = async (body: string) => {
    if (!weddingId || !supabase || !session) return
    const { error: writeError } = await supabase.from('wedding_feed').insert({
      wedding_id: weddingId,
      author_id: session.user.id,
      body,
    })
    if (writeError) setError(toErrorMessage(writeError))
    else await refresh()
  }
  const update = async (id: string, body: string) => {
    if (!supabase) return
    const { error: writeError } = await supabase.from('wedding_feed').update({ body }).eq('id', id)
    if (writeError) setError(toErrorMessage(writeError))
    else await refresh()
  }
  const remove = async (id: string) => {
    if (!supabase) return
    const { error: writeError } = await supabase.from('wedding_feed').delete().eq('id', id)
    if (writeError) setError(toErrorMessage(writeError))
    else await refresh()
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
