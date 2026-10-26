export function daysUntil(dateStr: string, today = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}

export function countdownDays(dateStr: string, today = new Date()): number {
  return Math.max(0, daysUntil(dateStr, today))
}

export type WeddingCountdown = {
  days: number
  headline: string
  caption: string
}

/** Future dates count down. Today and past dates do not pretend the wedding is still ahead. */
export function weddingCountdown(dateStr: string, today = new Date()): WeddingCountdown {
  const days = daysUntil(dateStr, today)
  if (!dateStr || Number.isNaN(new Date(`${dateStr}T00:00:00`).getTime())) {
    return { days: 0, headline: '—', caption: 'Add the wedding date.' }
  }
  if (days > 1) return { days, headline: String(days), caption: 'Days until your Big Day!' }
  if (days === 1) return { days, headline: '1', caption: 'Day until your Big Day!' }
  if (days === 0) return { days: 0, headline: 'Today', caption: 'Today is the wedding day.' }
  const ago = Math.abs(days)
  return {
    days,
    headline: ago === 1 ? '1 day ago' : `${ago} days ago`,
    caption: 'The wedding day has passed.',
  }
}

/** Short Indian units for the home ring. 1,102,000 is ₹11.02 lakh, not ₹1102k. */
export function formatInrCompact(amount: number): string {
  const value = Math.abs(Number(amount) || 0)
  if (value >= 10000000) return `₹${trimIndian(value / 10000000)} crore`
  if (value >= 100000) return `₹${trimIndian(value / 100000)} lakh`
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function trimIndian(value: number): string {
  return String(Math.round(value * 100) / 100)
}

export function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function quoteForDay(quotes: readonly string[], now = new Date()): string {
  if (quotes.length === 0) return ''
  const index = Math.floor(now.getTime() / 86400000) % quotes.length
  return quotes[index] ?? quotes[0] ?? ''
}

export function money(amount: number, symbol: string): string {
  return `${symbol}${Math.abs(Number(amount) || 0).toLocaleString('en-IN')}`
}
