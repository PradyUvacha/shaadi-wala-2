export function daysUntil(dateStr: string, today = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return 0
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - start.getTime()) / 86400000)
}

export function countdownDays(dateStr: string, today = new Date()): number {
  return Math.max(0, daysUntil(dateStr, today))
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
