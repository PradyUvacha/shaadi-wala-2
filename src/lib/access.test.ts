import { describe, expect, it } from 'vitest'
import { roleLabel } from './access.ts'

describe('role labels', () => {
  it('names the bride, groom, parent, friend, and planner', () => {
    expect(roleLabel('bride', 'bride')).toBe('Bride')
    expect(roleLabel('groom', 'groom')).toBe('Groom')
    expect(roleLabel('family', 'bride')).toBe("Parent · Bride's side")
    expect(roleLabel('friend', 'groom')).toBe("Friend · Groom's side")
    expect(roleLabel('planner', null)).toBe('Planner')
  })
})
