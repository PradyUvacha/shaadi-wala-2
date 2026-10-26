import { describe, expect, it } from 'vitest'
import { inviteLink, showInviteChoices } from './code.ts'

describe('showInviteChoices', () => {
  it('opens the role picker after a corrected code on a bad link', () => {
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '')).toBe(false)
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '12ab')).toBe(false)
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '123456')).toBe(true)
    expect(showInviteChoices(null, '')).toBe(true)
  })

  it('puts a friend invite’s role and side on the link', () => {
    expect(inviteLink('https://shaadi-wala.in', '123456', 'friend', 'bride')).toBe(
      'https://shaadi-wala.in/invite/123456?role=friend&side=bride',
    )
    expect(inviteLink('https://shaadi-wala.in/', '654321', 'family', 'groom')).toBe(
      'https://shaadi-wala.in/invite/654321?role=family&side=groom',
    )
    expect(inviteLink('https://shaadi-wala.in', '123456', 'open', null)).toBe('https://shaadi-wala.in/invite/123456')
  })
})
