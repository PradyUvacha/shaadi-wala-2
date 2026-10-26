import { describe, expect, it } from 'vitest'
import { joinSelectionError, joinSideFor } from './join.ts'

describe('join selection', () => {
  it('requires a role, and a side for a parent or friend', () => {
    expect(joinSelectionError('', '')).toMatch(/Pick a role/)
    expect(joinSelectionError('family', '')).toMatch(/Bride's side or Groom's side/)
    expect(joinSelectionError('friend', '')).toMatch(/Bride's side or Groom's side/)
    expect(joinSelectionError('family', 'bride')).toBeNull()
    expect(joinSelectionError('friend', 'groom')).toBeNull()
    expect(joinSelectionError('planner', '')).toBeNull()
    expect(joinSelectionError('bride', '')).toBeNull()
    expect(joinSideFor('bride', '')).toBe('bride')
    expect(joinSideFor('planner', 'bride')).toBeNull()
    expect(joinSideFor('family', 'groom')).toBe('groom')
  })
})
