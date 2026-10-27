/** Headcount is the guest plus their plus-ones. Maybe sits in Pending, so the three status tiles add up to Invited. */
export type GuestTiles = {
  invited: number
  confirmed: number
  pending: number
  declined: number
}

function heads(plusOnes: number): number {
  return 1 + Math.max(0, Number(plusOnes) || 0)
}

export function guestTileCounts(guests: readonly { status: string; plusOnes: number }[]): GuestTiles {
  const totals: GuestTiles = { invited: 0, confirmed: 0, pending: 0, declined: 0 }
  for (const guest of guests) {
    const people = heads(guest.plusOnes)
    totals.invited += people
    if (guest.status === 'Confirmed') totals.confirmed += people
    else if (guest.status === 'Declined') totals.declined += people
    else totals.pending += people
  }
  return totals
}

export function compareGuestNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}
