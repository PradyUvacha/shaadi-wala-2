import { describe, expect, it } from 'vitest'
import { asFunctionPhase, defaultPhaseForFunction } from './phases.ts'

describe('function phases', () => {
  it('places the eight Hindu events and starts a custom function in pre-wedding', () => {
    expect(defaultPhaseForFunction('Roka')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Sagai')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Haldi')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Mehendi')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Sangeet')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Wedding')).toBe('wedding_day')
    expect(defaultPhaseForFunction('Vidaai')).toBe('wedding_day')
    expect(defaultPhaseForFunction('Reception')).toBe('post_wedding')
    expect(defaultPhaseForFunction('Tilak')).toBe('pre_wedding')
    expect(defaultPhaseForFunction('Kanyadaan')).toBe('pre_wedding')
    expect(asFunctionPhase(null)).toBeNull()
    expect(asFunctionPhase('')).toBeNull()
    expect(asFunctionPhase('wedding_day')).toBe('wedding_day')
  })
})