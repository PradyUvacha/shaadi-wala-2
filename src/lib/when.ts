const IST = 'Asia/Kolkata'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Recent moments are relative. Older moments are a clock in India. Never a raw ISO string. */
export function formatWhen(iso: string, now = Date.now()): string {
  const date = new Date(iso)
  const time = date.getTime()
  if (Number.isNaN(time)) return ''
  const elapsed = now - time
  if (elapsed >= 0 && elapsed < MINUTE) return 'Just now'
  if (elapsed >= 0 && elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE)
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
  }
  if (elapsed >= 0 && elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  }
  if (elapsed >= 0 && elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY)
    return days === 1 ? 'Yesterday' : `${days} days ago`
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
