import { describe, expect, it } from 'vitest'
import { inviteLink } from './code.ts'
import { whatsAppInviteText, whatsAppShareUrl } from './whatsapp.ts'

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
})