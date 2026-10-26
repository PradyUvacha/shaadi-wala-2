import type { MemberRole, Side } from '../types.ts'

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

export function roleLabel(role: MemberRole, side?: Side | null): string {
  if (role === 'bride') return 'Bride'
  if (role === 'groom') return 'Groom'
  if (role === 'planner') return 'Planner'
  const sideName = side === 'groom' ? "Groom's side" : "Bride's side"
  if (role === 'family') return `Parent · ${sideName}`
  return `Friend · ${sideName}`
}
