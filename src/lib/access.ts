import { PLANNER_CAN_EDIT_TASK_COSTS } from '../config/budgetRules.ts'
import type { GuestSide, InviteRole, MemberRole, Side } from '../types.ts'

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

/** Couple edit any task cost. Family only when the task side is their side. Planner follows PLANNER_CAN_EDIT_TASK_COSTS. Friend never. */
export function canEditTaskCost(
  role: MemberRole | null | undefined,
  task: { side: Side | null },
  viewerSide: Side | null,
): boolean {
  if (role === 'friend') return false
  if (role === 'planner') return PLANNER_CAN_EDIT_TASK_COSTS
  if (isCouple(role)) return true
  if (role === 'family') return viewerSide != null && task.side === viewerSide
  return false
}

export function canLogPayment(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'family'
}

export function canEditGuests(role: MemberRole | null | undefined): boolean {
  return isCouple(role) || role === 'planner' || role === 'family'
}

/** Family may insert and update their own side and Mutual. They cannot change an existing Mutual guest's side. */
export function canEditGuestRow(
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
  guestSide: GuestSide,
): boolean {
  if (!canEditGuests(role)) return false
  if (role !== 'family') return true
  return guestSide === 'both' || (viewerSide != null && guestSide === viewerSide)
}

/** Mutual deletes stay with the couple and planner. Family can delete their own side only. */
export function canDeleteGuestRow(
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
  guestSide: GuestSide,
): boolean {
  if (!canEditGuests(role)) return false
  if (role === 'family') return viewerSide != null && guestSide === viewerSide
  return true
}

export type GuestListFilter = 'all' | Side | 'both'

/** Couple and planner filter every side. Family and friends get All, their own side, and Mutual. */
export function guestListFilters(
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
): { value: GuestListFilter; label: string }[] {
  const own = viewerSide === 'groom' ? 'groom' : 'bride'
  const ownLabel = own === 'groom' ? "Groom's" : "Bride's"
  if (role === 'friend' || role === 'family') {
    return [
      { value: 'all', label: 'All' },
      { value: own, label: ownLabel },
      { value: 'both', label: 'Mutual' },
    ]
  }
  return [
    { value: 'all', label: 'All sides' },
    { value: 'bride', label: "Bride's" },
    { value: 'groom', label: "Groom's" },
    { value: 'both', label: 'Mutual' },
  ]
}

/** Friends and family never match the opposite side. All is their own side plus Mutual. */
export function guestIncluded(
  role: MemberRole | null | undefined,
  viewerSide: Side | null,
  filter: GuestListFilter,
  guestSide: GuestSide,
): boolean {
  const own = viewerSide === 'bride' || viewerSide === 'groom' ? viewerSide : null
  if (role === 'friend' || role === 'family') {
    const onTheirList = guestSide === own || guestSide === 'both'
    if (!onTheirList) return false
    if (filter === 'both') return guestSide === 'both'
    if (filter === 'bride' || filter === 'groom') return guestSide === filter
    return true
  }
  if (filter === 'all') return true
  return guestSide === filter
}

/** Sides a member may choose. Family: own side or Mutual. Planner starts on Mutual and must keep a side. */
export function guestSideChoices(role: MemberRole | null | undefined, viewerSide: Side | null): GuestSide[] {
  if (role === 'planner') return ['both', 'bride', 'groom']
  if (role === 'family') return viewerSide ? [viewerSide, 'both'] : ['both']
  return ['', 'bride', 'groom', 'both']
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
