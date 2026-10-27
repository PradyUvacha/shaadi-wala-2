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

export function guestMatchesQuery(guest: { name: string; phone: string; email: string }, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  if (guest.name.toLowerCase().includes(text)) return true
  if (guest.email.toLowerCase().includes(text)) return true
  if (guest.phone.toLowerCase().includes(text)) return true
  const digits = text.replace(/\D/g, '')
  return digits.length > 0 && guest.phone.replace(/\D/g, '').includes(digits)
}

const AVATAR_COLORS = ['#7A0A0A', '#5A0606', '#9A3E0E', '#24643F', '#6B3FA0', '#5C2E2E'] as const

export function guestInitials(name: string): string {
  const words = name.trim().split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0]?.[0] ?? '?'
  const second = words.length > 1 ? words[words.length - 1]?.[0] : words[0]?.[1]
  return `${first}${second ?? ''}`.toUpperCase()
}

export function guestAvatarColor(name: string): string {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]
}

export function mealPillLabel(meal: string): string | null {
  const text = meal.trim()
  if (!text) return null
  if (/non/i.test(text)) return 'Non-veg'
  if (/^veg/i.test(text)) return 'Veg'
  return text
}

export function compareGuestNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}
