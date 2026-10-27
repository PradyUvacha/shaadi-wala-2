/** Guest counts for the four tiles. Maybe sits in Pending, so the three status tiles add up to Total. Attending is confirmed people, including plus-ones. */
export type GuestStats = {
  total: number
  confirmed: number
  pending: number
  declined: number
  attending: number
}

function heads(plusOnes: number): number {
  return 1 + Math.max(0, Number(plusOnes) || 0)
}

export function guestStatCounts(guests: readonly { status: string; plusOnes: number }[]): GuestStats {
  const totals: GuestStats = { total: 0, confirmed: 0, pending: 0, declined: 0, attending: 0 }
  for (const guest of guests) {
    totals.total += 1
    if (guest.status === 'Confirmed') {
      totals.confirmed += 1
      totals.attending += heads(guest.plusOnes)
    } else if (guest.status === 'Declined') {
      totals.declined += 1
    } else {
      totals.pending += 1
    }
  }
  return totals
}

export function compareGuestNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}
