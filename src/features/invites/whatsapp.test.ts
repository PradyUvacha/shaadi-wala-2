import { describe, expect, it, vi } from 'vitest'
import { inviteLink } from './code.ts'
import { guestInviteText, normalizeGuestPhone, shareGuestInvite, shareOnWhatsApp, whatsAppGuestUrl, whatsAppInviteText, whatsAppShareUrl } from './whatsapp.ts'

const share = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/share', () => ({
  Share: {
    share,
  },
}))

describe('WhatsApp invite', () => {
  it('includes the couple, how to join, the invite link, and the 6-digit code', () => {
    const link = inviteLink('https://shaadi-wala.in', '123456', 'friend', 'bride')
    const text = whatsAppInviteText('Priya & Rahul', '123456', link)
    expect(text).toContain('Priya & Rahul')
    expect(text).toContain('To join')
    expect(text).toContain('123456')
    expect(text).toContain('/invite/123456?role=friend&side=bride')
    expect(whatsAppShareUrl(text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`)
  })

  it('does not open WhatsApp when the share sheet is cancelled', async () => {
    const open = vi.fn()
    vi.stubGlobal('window', { open })
    share.mockRejectedValueOnce(Object.assign(new Error('Share canceled'), { name: 'AbortError' }))
    await shareOnWhatsApp('hello')
    expect(open).not.toHaveBeenCalled()
  })

  it('opens WhatsApp when the share API is unavailable', async () => {
    const open = vi.fn()
    vi.stubGlobal('window', { open })
    share.mockRejectedValueOnce(new Error('Share API not available'))
    await shareOnWhatsApp('hello')
    expect(open).toHaveBeenCalledWith(whatsAppShareUrl('hello'), '_blank', 'noopener,noreferrer')
  })

  it('opens wa.me for a valid guest number and the share sheet when the number is missing or invalid', async () => {
    const open = vi.fn()
    vi.stubGlobal('window', { open })
    const text = guestInviteText('Priya & Rahul', 'Asha')
    expect(normalizeGuestPhone('9876543210')).toBe('919876543210')
    expect(normalizeGuestPhone('+91 98765 43210')).toBe('919876543210')
    share.mockResolvedValue(undefined)
    await shareGuestInvite('9876543210', text)
    expect(open).toHaveBeenCalledWith(whatsAppGuestUrl('919876543210', text), '_blank', 'noopener,noreferrer')
    expect(share).not.toHaveBeenCalled()

    open.mockClear()
    expect(normalizeGuestPhone('12345')).toBeNull()
    expect(normalizeGuestPhone('call me')).toBeNull()
    await shareGuestInvite('12345', text)
    expect(open).not.toHaveBeenCalled()
    expect(share).toHaveBeenCalledWith({ text, dialogTitle: 'Share on WhatsApp' })

    open.mockClear()
    share.mockClear()
    expect(normalizeGuestPhone('')).toBeNull()
    expect(normalizeGuestPhone(null)).toBeNull()
    share.mockRejectedValueOnce(Object.assign(new Error('Share canceled'), { name: 'AbortError' }))
    await shareGuestInvite('', text)
    expect(open).not.toHaveBeenCalled()
    expect(share).toHaveBeenCalledWith({ text, dialogTitle: 'Share on WhatsApp' })
  })
})