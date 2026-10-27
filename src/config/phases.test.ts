import { describe, expect, it } from 'vitest'
import { asFunctionPhase, defaultPhaseForFunction } from './phases.ts'

describe('function phases', () => {
  it('places template names and the spec aliases, and leaves a cleared phase empty', () => {
    expect(defaultPhaseForFunction('Mehendi')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Wedding')).toBe('wedding_day')
    expect(defaultPhaseForFunction('Saat Phere')).toBe('wedding_day')
    expect(defaultPhaseForFunction('Griha Pravesh')).toBe('post_wedding')
    expect(defaultPhaseForFunction('Tilak')).toBe('pre_wedding')
    expect(asFunctionPhase(null)).toBeNull()
    expect(asFunctionPhase('')).toBeNull()
    expect(asFunctionPhase('wedding_day')).toBe('wedding_day')
  })
})