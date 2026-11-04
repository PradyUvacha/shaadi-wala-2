export function whatsAppInviteText(coupleNames: string, code: string, link: string): string {
  return `${coupleNames} invited you to Shaadi Wala. To join, open ${link} and enter the code ${code}.`
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function guestInviteText(coupleNames: string, guestName: string): string {
  const couple = coupleNames.trim() || 'The couple'
  const guest = guestName.trim()
  return guest ? `${couple} invited ${guest} to their wedding.` : `${couple} invited you to their wedding.`
}

/** Digits only, with 91 added to a 10-digit Indian number. Anything else is not a sendable number. */
export function normalizeGuestPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length === 10) digits = `91${digits}`
  if (digits.length < 11 || digits.length > 15 || digits.startsWith('0')) return null
  return digits
}

export function whatsAppGuestUrl(digits: string, text: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

/** A real number opens WhatsApp with the text filled in. The person still has to press send. */
export async function shareGuestInvite(phone: string | null | undefined, text: string): Promise<void> {
  const digits = normalizeGuestPhone(phone)
  if (!digits) {
    await shareOnWhatsApp(text)
    return
  }
  window.open(whatsAppGuestUrl(digits, text), '_blank', 'noopener,noreferrer')
}

function shareCancelled(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : typeof error === 'string' ? error : ''
  return /abort/i.test(text) || /cancell?ed/i.test(text)
}

async function loadShare(): Promise<((options: { text: string; dialogTitle: string }) => Promise<unknown>) | null> {
  try {
    const module = await import('@capacitor/share')
    return typeof module.Share?.share === 'function' ? module.Share.share.bind(module.Share) : null
  } catch {
    return null
  }
}

/** Open WhatsApp only when the device has no share sheet. A dismissed sheet stays closed. */
export async function shareOnWhatsApp(text: string): Promise<void> {
  const share = await loadShare()
  if (!share) {
    window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer')
    return
  }
  try {
    await share({ text, dialogTitle: 'Share on WhatsApp' })
  } catch (error) {
    if (shareCancelled(error)) return
    const detail = error instanceof Error ? `${error.name} ${error.message}` : typeof error === 'string' ? error : ''
    if (/not implemented|unavailable|not available/i.test(detail)) {
      window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer')
    }
  }
}
