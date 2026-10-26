import { describe, expect, it } from 'vitest'
import { isExactDeleteConfirmation } from './deleteAccount.ts'

describe('delete confirmation', () => {
  it('accepts only the exact word DELETE', () => {
    expect(isExactDeleteConfirmation('DELETE')).toBe(true)
    expect(isExactDeleteConfirmation('delete')).toBe(false)
    expect(isExactDeleteConfirmation('Delete')).toBe(false)
    expect(isExactDeleteConfirmation(' DELETE')).toBe(false)
    expect(isExactDeleteConfirmation('DELETE ')).toBe(false)
  })
})
