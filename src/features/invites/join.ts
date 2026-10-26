import type { MemberRole, Side } from '../../types.ts'

/** Family and friends cannot finish joining until they pick a side. Bride, groom, and planner do not. */
export function joinSelectionError(role: MemberRole | '', side: Side | ''): string | null {
  if (role !== 'bride' && role !== 'groom' && role !== 'family' && role !== 'friend' && role !== 'planner') {
    return 'Pick a role to join.'
  }
  if ((role === 'family' || role === 'friend') && side !== 'bride' && side !== 'groom') {
    return "Pick Bride's side or Groom's side to finish joining."
  }
  return null
}

export function joinSideFor(role: MemberRole, side: Side | ''): Side | null {
  if (role === 'bride') return 'bride'
  if (role === 'groom') return 'groom'
  if (role === 'planner') return null
  return side === 'bride' || side === 'groom' ? side : null
}
