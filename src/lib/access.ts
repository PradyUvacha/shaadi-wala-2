import type { InviteRole, MemberRole, Side } from '../types.ts'

export function isCouple(role: MemberRole | null | undefined): boolean {
  return role === 'bride' || role === 'groom'
}

/** Couple details (names, date, city) are bride or groom only. */
export function canEditWedding(role: MemberRole | null | undefined): boolean {
  return isCouple(role)
}

export function canSeeBudget(role: MemberRole | null | undefined): boolean {
  return role === 'bride' || role === 'groom' || role === 'family' || role === 'planner'
}

export function canEditBudget(role: MemberRole | null | undefined): boolean {
  return isCouple(role)
}

export function canLogPayment(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'family'
}

export function canEditGuests(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'planner' || role === 'family'
}

export function canEditTimeline(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'planner'
}

export function canManageTasks(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'planner' || role === 'family'
}

/** Add, rename, reorder, and remove functions. Couple and planner only. */
export function canEditChecklist(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'planner'
}

export function canInvite(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'family'
}

export function canPostFeed(role: MemberRole | null | undefined): boolean {
  return role === 'bride' || role === 'groom' || role === 'family' || role === 'planner'
}

export function inviteRolesFor(role: MemberRole | null | undefined): MemberRole[] {
  if (isCouple(role)) return ['bride', 'groom', 'family', 'friend', 'planner']
  if (role === 'family') return ['family', 'friend']
  return []
}

export function inviteRoleLabel(role: InviteRole, side?: Side | null): string {
  if (role === 'open') {
    if (side === 'bride') return "They choose · Bride's side"
    if (side === 'groom') return "They choose · Groom's side"
    return 'They choose their role'
  }
  return roleLabel(role, side)
}

const UNASSIGNED_SIDE_LABEL = {
  bride: "Unassigned · Bride's side",
  groom: "Unassigned · Groom's side",
} as const

/** Unassigned tasks tagged with a side, for the parent on that side and for the couple or planner. */
export function unassignedSideGroups<T extends { assignedTo: string | null; side: Side | null }>(
  tasks: readonly T[],
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
): { side: 'bride' | 'groom'; label: string; tasks: T[] }[] {
  if (role == null || role === 'friend') return []
  const sides: Array<'bride' | 'groom'> = role === 'family'
    ? viewerSide === 'bride' || viewerSide === 'groom' ? [viewerSide] : []
    : ['bride', 'groom']
  return sides.flatMap((side) => {
    const grouped = tasks.filter((task) => task.assignedTo == null && task.side === side)
    if (grouped.length === 0) return []
    return [{ side, label: UNASSIGNED_SIDE_LABEL[side], tasks: grouped }]
  })
}

/** A parent can assign only people who share their side. Couple and planner can assign anyone. */
export function assignableMembers<T extends { side: Side | null }>(
  members: readonly T[],
  role: MemberRole | null | undefined,
  side: Side | null,
): T[] {
  if (role === 'friend') return []
  if (role === 'family') return members.filter((member) => member.side != null && member.side === side)
  return [...members]
}

export function canLeaveWedding(role: MemberRole | null | undefined, members: readonly { role: MemberRole }[]): boolean {
  if (role === 'bride') return members.some((member) => member.role === 'groom')
  if (role === 'groom') return members.some((member) => member.role === 'bride')
  return role === 'family' || role === 'friend' || role === 'planner'
}

export function rosterDisplayName(
  profileName: string | null | undefined,
  membershipName: string | null | undefined,
  role: MemberRole,
  side: Side | null,
): string {
  const profile = safePublicName(profileName)
  if (profile && profile.toLowerCase() !== 'guest') return profile
  const membership = safePublicName(membershipName)
  if (membership && membership.toLowerCase() !== 'guest') return membership
  return roleLabel(role, side)
}

function safePublicName(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed || trimmed.includes('@')) return ''
  return trimmed
}

export function roleLabel(role: MemberRole, side?: Side | null): string {
  if (role === 'bride') return 'Bride'
  if (role === 'groom') return 'Groom'
  if (role === 'planner') return 'Planner'
  const sideName = side === 'groom' ? "Groom's side" : "Bride's side"
  if (role === 'family') return `Parent · ${sideName}`
  return `Friend · ${sideName}`
}
