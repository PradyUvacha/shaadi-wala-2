import { describe, expect, it } from 'vitest'
import { DUPLICATE_CATEGORY_MESSAGE, categoryNameKey, duplicateCategoryName } from './budgetCategories.ts'

describe('category names', () => {
  const venue = { id: 'venue', category: 'Venue' }
  const hall = { id: 'hall', category: 'Hall' }

  it('treats trimmed case-insensitive names as the same category', () => {
    expect(categoryNameKey(' Venue ')).toBe('venue')
    expect(duplicateCategoryName([venue, hall], ' venue ')).toBe(true)
    expect(duplicateCategoryName([venue], 'VENUE')).toBe(true)
    expect(duplicateCategoryName([venue], 'Venue', 'venue')).toBe(false)
    expect(duplicateCategoryName([hall], 'Venue')).toBe(false)
    expect(duplicateCategoryName([], 'Venue')).toBe(false)
    expect(DUPLICATE_CATEGORY_MESSAGE).toBe('A category with this name already exists.')
  })
})
