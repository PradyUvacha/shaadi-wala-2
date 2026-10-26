import { describe, expect, it } from 'vitest'
import { showBottomNav } from './shellNav.ts'

describe('showBottomNav', () => {
  it('hides the nav on setup, join, and any screen before a wedding exists', () => {
    expect(showBottomNav('/setup', false)).toBe(false)
    expect(showBottomNav('/invite', false)).toBe(false)
    expect(showBottomNav('/invite/123456', false)).toBe(false)
    expect(showBottomNav('/profile', false)).toBe(false)
    expect(showBottomNav('/profile/settings', false)).toBe(false)
    expect(showBottomNav('/', true)).toBe(true)
    expect(showBottomNav('/tasks', true)).toBe(true)
    expect(showBottomNav('/setup', true)).toBe(false)
    expect(showBottomNav('/invite/123456', true)).toBe(false)
  })
})
