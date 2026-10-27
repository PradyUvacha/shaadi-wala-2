import { describe, expect, it } from 'vitest'
import { compareGuestNames, guestAvatarColor, guestEmailProblem, guestFunctionLine, guestInitials, guestMatchesQuery, guestNameProblem, guestPhoneProblem, guestStatCounts, mealPillLabel, mealUsesLeaf } from './guestTiles.ts'

describe('guest tiles', () => {
  it('counts guests on the tiles and plus-ones only in attending', () => {
    const tiles = guestStatCounts([
      { status: 'Confirmed', plusOnes: 2 },
      { status: 'Maybe', plusOnes: 1 },
      { status: 'Pending', plusOnes: 0 },
      { status: 'Declined', plusOnes: 3 },
    ])
    expect(tiles).toEqual({ total: 4, confirmed: 1, pending: 1, declined: 1, attending: 3 })
    expect(tiles.confirmed + tiles.pending + tiles.declined).toBe(3)
  })

  it('matches a name, an email, or the digits in a phone', () => {
    const guest = { name: 'Anita Mehta', email: 'anita@email.com', phone: '+91 98765 43210' }
    expect(guestMatchesQuery(guest, 'mehta')).toBe(true)
    expect(guestMatchesQuery(guest, 'ANITA@')).toBe(true)
    expect(guestMatchesQuery(guest, '987654')).toBe(true)
    expect(guestMatchesQuery(guest, '000')).toBe(false)
    expect(guestMatchesQuery(guest, '   ')).toBe(true)
    expect(guestMatchesQuery(guest, '+')).toBe(false)
    expect(guestMatchesQuery(guest, '+91 987')).toBe(true)
  })

  it('builds initials and a stable avatar colour from the name', () => {
    expect(guestInitials('Anita Mehta')).toBe('AM')
    expect(guestInitials('Mr. & Mrs. Sharma')).toBe('MS')
    expect(guestInitials('Vikram')).toBe('VI')
    expect(guestAvatarColor('Anita Mehta')).toBe(guestAvatarColor('Anita Mehta'))
    expect(mealPillLabel('Vegetarian')).toBe('Veg')
    expect(mealPillLabel('Non-Vegetarian')).toBe('Non-veg')
    expect(mealPillLabel('Jain')).toBe('Jain')
    expect(mealPillLabel('')).toBeNull()
    expect(mealUsesLeaf('Vegetarian')).toBe(true)
    expect(mealUsesLeaf('Jain')).toBe(true)
    expect(mealUsesLeaf('Vegan')).toBe(true)
    expect(mealUsesLeaf('Non-Vegetarian')).toBe(false)
    expect(guestFunctionLine(['Mehendi', 'Sangeet', 'Haldi', 'Wedding', 'Reception'])).toBe('Mehendi, Sangeet +3')
    expect(guestNameProblem('  ')).toBe('Add the guest name.')
    expect(guestNameProblem('Asha')).toBeNull()
    expect(guestPhoneProblem('')).toBeNull()
    expect(guestPhoneProblem('abc')).toBe('Check the phone number.')
    expect(guestPhoneProblem('+91 98765 43210')).toBeNull()
    expect(guestEmailProblem('x@')).toBe('Check the email address.')
    expect(guestEmailProblem('a@b.co')).toBeNull()
  })

  it('sorts names without caring about case', () => {
    expect(['mehta', 'Anita', 'anil'].sort(compareGuestNames)).toEqual(['anil', 'Anita', 'mehta'])
  })
})
