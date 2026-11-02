import { useState } from 'react'
import { COLORS, TYPE } from '../../styles/tokens.ts'
import { inputStyle, labelStyle, primaryButton } from '../../styles/ui.ts'
import { formatWhen } from '../../lib/when.ts'
import { feedAuthorLabel, type FeedAuthor } from './feedAuthors.ts'

export type FeedPost = {
  id: string
  body: string
  createdAt: string
  authorId: string
}

const outlineButton = {
  ...primaryButton('transparent'),
  width: 'auto' as const,
  color: COLORS.crimson,
  border: `1px solid ${COLORS.border}`,
}

const dangerButton = {
  ...outlineButton,
  color: COLORS.danger,
  border: `1px solid ${COLORS.dangerBorder}`,
}

const noteStyle = {
  ...inputStyle,
  height: 'auto',
  maxHeight: 'none',
  minHeight: 96,
  padding: '12px 14px',
  resize: 'vertical' as const,
}

export function FeedList({
  posts,
  authors,
  canPost,
  currentUserId,
  onCreate,
  onUpdate,
  onDelete,
}: {
  posts: readonly FeedPost[]
  authors: readonly FeedAuthor[]
  canPost: boolean
  currentUserId: string | null
  onCreate: (body: string) => void
  onUpdate: (id: string, body: string) => void
  onDelete: (id: string) => void
}) {
  const byUser = new Map(authors.map((author) => [author.userId, author]))
  return (
    <div>
      {canPost ? <Composer onSubmit={onCreate} /> : null}
      {posts.length === 0 ? <p style={{ fontSize: TYPE.body, color: COLORS.muted }}>No announcements yet.</p> : null}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {posts.map((post) => {
          const author = byUser.get(post.authorId)
          const mine = currentUserId != null && post.authorId === currentUserId
          return (
            <li key={post.id} style={{ marginTop: 16 }}>
              <p style={{ margin: 0, fontSize: TYPE.body, color: COLORS.ink }}>{post.body}</p>
              <p style={{ margin: '4px 0 0', fontSize: TYPE.small, color: COLORS.muted }}>{feedAuthorLabel(author)}{author?.displayName ? ` · ${author.displayName}` : ''}</p>
              <time dateTime={post.createdAt} style={{ fontSize: TYPE.small, color: COLORS.muted }}>{formatWhen(post.createdAt)}</time>
              {mine ? (
                <PostActions
                  body={post.body}
                  onUpdate={(body) => onUpdate(post.id, body)}
                  onDelete={() => onDelete(post.id)}
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Composer({ onSubmit }: { onSubmit: (body: string) => void }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const body = String(data.get('body') ?? '')
        if (!body.trim()) return
        onSubmit(body.trim())
        event.currentTarget.reset()
      }}
    >
      <label style={labelStyle}>
        Announcement
        <textarea name="body" aria-label="Announcement" style={{ ...noteStyle, marginTop: 6 }} />
      </label>
      <button type="submit" style={{ ...primaryButton(), marginTop: 12 }}>Post</button>
    </form>
  )
}

function PostActions({
  body,
  onUpdate,
  onDelete,
}: {
  body: string
  onUpdate: (body: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(body)
  if (!editing) {
    return (
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          type="button"
          style={outlineButton}
          onClick={() => {
            setDraft(body)
            setEditing(true)
          }}
        >
          Edit
        </button>
        <button
          type="button"
          style={dangerButton}
          onClick={() => {
            if (window.confirm('Delete this announcement?')) onDelete()
          }}
        >
          Delete
        </button>
      </div>
    )
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const next = draft.trim()
        if (!next) return
        onUpdate(next)
        setEditing(false)
      }}
    >
      <textarea
        aria-label="Edit announcement"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        style={{ ...noteStyle, marginTop: 8 }}
      />
      <button type="submit" style={{ ...primaryButton(), marginTop: 12 }}>Save</button>
    </form>
  )
}
