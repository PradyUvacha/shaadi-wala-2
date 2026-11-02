import { describe, expect, it, vi } from 'vitest'
import { inviteLink } from './code.ts'
import { shareOnWhatsApp, whatsAppInviteText, whatsAppShareUrl } from './whatsapp.ts'

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
})