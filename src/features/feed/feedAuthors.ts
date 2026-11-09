import { roleLabel } from '../../lib/access.ts'
import type { MemberRole, Side } from '../../types.ts'

export type FeedAuthor = {
  userId: string
  role: MemberRole
  side: Side | null
  displayName: string
}

export function feedAuthorLabel(author: FeedAuthor | undefined): string {
  if (!author) return 'Member'
  return roleLabel(author.role, author.side)
}
