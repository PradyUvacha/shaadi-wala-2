import { describe, expect, it } from 'vitest'
import { compareGuestNames, guestMatchesQuery, guestStatCounts } from './guestTiles.ts'

describe('guest tiles', () => {
  it('counts guests on the tiles and plus-ones only in attending', () => {
    const tiles = guestStatCounts([
      { status: 'Confirmed', plusOnes: 2 },
      { status: 'Maybe', plusOnes: 1 },
      { status: 'Pending', plusOnes: 0 },
      { status: 'Declined', plusOnes: 3 },
    ])
    expect(tiles).toEqual({ total: 4, confirmed: 1, pending: 2, declined: 1, attending: 3 })
    expect(tiles.confirmed + tiles.pending + tiles.declined).toBe(tiles.total)
  })

  it('matches a name, an email, or the digits in a phone', () => {
    const guest = { name: 'Anita Mehta', email: 'anita@email.com', phone: '+91 98765 43210' }
    expect(guestMatchesQuery(guest, 'mehta')).toBe(true)
    expect(guestMatchesQuery(guest, 'ANITA@')).toBe(true)
    expect(guestMatchesQuery(guest, '987654')).toBe(true)
    expect(guestMatchesQuery(guest, '000')).toBe(false)
    expect(guestMatchesQuery(guest, '   ')).toBe(true)
  })

  it('sorts names without caring about case', () => {
    expect(['mehta', 'Anita', 'anil'].sort(compareGuestNames)).toEqual(['anil', 'Anita', 'mehta'])
  })
})
