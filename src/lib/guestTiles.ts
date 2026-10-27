/** Guest counts for the four tiles. Maybe counts in Total only. Attending is confirmed people, including plus-ones. */
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
    } else if (guest.status === 'Pending') {
      totals.pending += 1
    } else if (guest.status === 'Declined') {
      totals.declined += 1
    }
  }
  return totals
}

export function guestMatchesQuery(guest: { name: string; phone: string; email: string }, query: string): boolean {
  const text = query.trim().toLowerCase()
  if (!text) return true
  if (guest.name.toLowerCase().includes(text)) return true
  if (guest.email.toLowerCase().includes(text)) return true
  const digits = text.replace(/\D/g, '')
  return digits.length > 0 && guest.phone.replace(/\D/g, '').includes(digits)
}

export function guestNameProblem(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 1 || trimmed.length > 100) return 'Add the guest name.'
  return null
}

export function guestPhoneProblem(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (!/^[0-9 +]+$/.test(trimmed) || digits.length < 7 || digits.length > 15) return 'Check the phone number.'
  return null
}

export function guestEmailProblem(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Check the email address.'
  return null
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

export function mealUsesLeaf(meal: string): boolean {
  const label = mealPillLabel(meal)
  return label === 'Veg' || label === 'Jain' || label === 'Vegan'
}

/** Up to two function names, then +N for the rest. Empty when the guest has no functions. */
export function guestFunctionLine(names: readonly string[]): string {
  if (names.length === 0) return ''
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}

export function compareGuestNames(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}
