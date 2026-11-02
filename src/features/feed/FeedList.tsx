import { feedAuthorLabel, type FeedAuthor } from './feedAuthors.ts'

export type FeedPost = {
  id: string
  body: string
  createdAt: string
  authorId: string
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
      {posts.length === 0 ? <p>No announcements yet.</p> : null}
      <ul>
        {posts.map((post) => {
          const author = byUser.get(post.authorId)
          const mine = currentUserId != null && post.authorId === currentUserId
          return (
            <li key={post.id}>
              <p>{post.body}</p>
              <p>{feedAuthorLabel(author)}{author?.displayName ? ` · ${author.displayName}` : ''}</p>
              <time dateTime={post.createdAt}>{post.createdAt}</time>
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
      <label>
        Announcement
        <textarea name="body" aria-label="Announcement" />
      </label>
      <button type="submit">Post</button>
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
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const next = String(data.get('body') ?? '')
        if (!next.trim()) return
        onUpdate(next.trim())
      }}
    >
      <textarea name="body" aria-label="Edit announcement" defaultValue={body} />
      <button type="submit">Save</button>
      <button type="button" onClick={onDelete}>Delete</button>
    </form>
  )
}
