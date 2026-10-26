import { describe, expect, it } from 'vitest'
import { showInviteChoices } from './code.ts'

describe('showInviteChoices', () => {
  it('opens the role picker after a corrected code on a bad link', () => {
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '')).toBe(false)
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '12ab')).toBe(false)
    expect(showInviteChoices('This invite code is not valid. Codes are exactly 6 digits.', '123456')).toBe(true)
    expect(showInviteChoices(null, '')).toBe(true)
  })
})
