export function whatsAppInviteText(coupleNames: string, code: string, link: string): string {
  return `${coupleNames} invited you to Shaadi Wala. To join, open ${link} and enter the code ${code}.`
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export async function shareOnWhatsApp(text: string): Promise<void> {
  try {
    const module = await import('@capacitor/share')
    await module.Share.share({ text, dialogTitle: 'Share on WhatsApp' })
  } catch {
    window.open(whatsAppShareUrl(text), '_blank', 'noopener,noreferrer')
  }
}
