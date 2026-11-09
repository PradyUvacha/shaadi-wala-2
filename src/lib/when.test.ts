import { describe, expect, it } from 'vitest'
import { formatWhen } from './when.ts'

describe('formatWhen', () => {
  const now = Date.parse('2026-11-02T12:00:00.000Z')

  it('uses a relative time for a recent moment and IST for an older one', () => {
    expect(formatWhen('2026-11-02T11:30:00.000Z', now)).toBe('30 minutes ago')
    expect(formatWhen('2026-11-02T10:00:00.000Z', now)).toBe('2 hours ago')
    expect(formatWhen('2026-11-01T12:00:00.000Z', now)).toBe('Yesterday')
    const older = formatWhen('2026-10-01T10:00:00.000Z', now)
    expect(older).not.toMatch(/T\d{2}:/)
    expect(older).toContain('2026')
    expect(older.toLowerCase()).toContain('pm')
  })
})
