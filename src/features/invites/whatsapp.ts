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

/** Digits only. A 10-digit Indian mobile, with or without a trunk 0, becomes 91 plus those digits. */
export function normalizeGuestPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const text = String(raw).trim()
  if (!text) return null
  let digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  digits = digits.replace(/^00+/, '')
  if (digits.startsWith('91') && digits.length === 13 && digits[2] === '0') digits = `91${digits.slice(3)}`
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '')
  if (digits.length === 10) digits = `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
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
