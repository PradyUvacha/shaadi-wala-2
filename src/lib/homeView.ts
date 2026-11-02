import type { MemberRole, Side } from '../types.ts'

export type HomeTask = {
  id: string
  title: string
  priority: 'High' | 'Medium' | 'Low' | string
  status: string
  dueDate: string
  side: Side | null
  assignedTo: string | null
  createdAt?: string
  updatedAt: string
  actualCost?: number | null
}

export type HomeGuest = {
  id: string
  name: string
  side: '' | 'bride' | 'groom' | 'both'
  createdAt?: string
}

export type HomeActivity = {
  id: string
  at: string
  who: string
  text: string
}

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 }

/** Own side, plus shared (no side, or a guest on both sides). Never the other side alone. */
export function homeSideVisible(
  entitySide: Side | '' | 'both' | null,
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
): boolean {
  if (role === 'bride' || role === 'groom' || role === 'planner') return true
  if (role === 'friend') return entitySide === viewerSide
  if (role !== 'family') return false
  if (entitySide == null || entitySide === '' || entitySide === 'both') return true
  return entitySide === viewerSide
}

export function priorityTasks<T extends HomeTask>(
  tasks: readonly T[],
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
): T[] {
  return tasks
    .filter((task) => task.status !== 'Completed' && homeSideVisible(task.side, role, viewerSide))
    .sort((left, right) => {
      const rank = (PRIORITY_RANK[left.priority] ?? 9) - (PRIORITY_RANK[right.priority] ?? 9)
      if (rank !== 0) return rank
      const leftDue = left.dueDate || '9999-99-99'
      const rightDue = right.dueDate || '9999-99-99'
      if (leftDue !== rightDue) return leftDue < rightDue ? -1 : 1
      return left.title.localeCompare(right.title)
    })
}

export function sideGuests<T extends HomeGuest>(
  guests: readonly T[],
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
): T[] {
  return guests
    .filter((guest) => homeSideVisible(guest.side, role, viewerSide))
    .sort((left, right) => left.name.localeCompare(right.name))
}

/** Generated activity never carries a rupee amount. Typed announcements are left unchanged. */
function automaticActivity(text: string): string {
  return text.replace(/₹\s*[\d,]+(?:\.\d+)?/g, '').replace(/\s{2,}/g, ' ').trim()
}

export function recentActivity(input: {
  tasks: readonly HomeTask[]
  guests: readonly HomeGuest[]
  posts: readonly { id: string; body: string; createdAt: string; authorId: string }[]
  authors: readonly { userId: string; role: MemberRole; side: Side | null; displayName: string }[]
  members: readonly { userId: string; displayName: string; side: Side | null; role: MemberRole }[]
  role: MemberRole | null | undefined
  viewerSide: Side | null
}): HomeActivity[] {
  const whoForTask = (task: HomeTask) => {
    const member = input.members.find((item) => item.userId === task.assignedTo)
    return member?.displayName || 'Unassigned'
  }
  const items: HomeActivity[] = []
  for (const task of input.tasks) {
    if (!homeSideVisible(task.side, input.role, input.viewerSide)) continue
    if (task.status === 'Completed') {
      items.push({
        id: `task-done-${task.id}`,
        at: task.updatedAt || task.createdAt || '',
        who: whoForTask(task),
        text: automaticActivity(`${task.title} done`),
      })
    } else {
      items.push({
        id: `task-added-${task.id}`,
        at: task.createdAt || task.updatedAt || '',
        who: whoForTask(task),
        text: automaticActivity(`${task.title} added`),
      })
    }
  }
  for (const guest of input.guests) {
    if (!homeSideVisible(guest.side, input.role, input.viewerSide)) continue
    items.push({
      id: `guest-${guest.id}`,
      at: guest.createdAt || '',
      who: guest.name,
      text: automaticActivity(`${guest.name} added`),
    })
  }
  for (const post of input.posts) {
    const author = input.authors.find((item) => item.userId === post.authorId)
    const authorSide = author?.side ?? null
    const sharedAuthor = author?.role === 'bride' || author?.role === 'groom' || author?.role === 'planner'
    const visible = input.role === 'planner' || input.role === 'bride' || input.role === 'groom'
      ? true
      : sharedAuthor || homeSideVisible(authorSide, input.role, input.viewerSide)
    if (!author || !visible) continue
    items.push({
      id: `post-${post.id}`,
      at: post.createdAt,
      who: author.displayName,
      text: post.body,
    })
  }
  return items
    .filter((item) => item.at)
    .sort((left, right) => (left.at < right.at ? 1 : left.at > right.at ? -1 : left.id.localeCompare(right.id)))
}
