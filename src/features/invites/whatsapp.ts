export function whatsAppInviteText(coupleNames: string, code: string, link: string): string {
  return `${coupleNames} invited you to Shaadi Wala. To join, open ${link} and enter the code ${code}.`
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
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
