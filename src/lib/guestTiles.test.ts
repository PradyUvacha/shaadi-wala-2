import { describe, expect, it } from 'vitest'
import { compareGuestNames, guestTileCounts } from './guestTiles.ts'

describe('guest tiles', () => {
  it('counts plus-ones and puts Maybe under Pending so the tiles add up to Invited', () => {
    const tiles = guestTileCounts([
      { status: 'Confirmed', plusOnes: 2 },
      { status: 'Maybe', plusOnes: 1 },
      { status: 'Pending', plusOnes: 0 },
      { status: 'Declined', plusOnes: 3 },
    ])
    expect(tiles).toEqual({ invited: 10, confirmed: 3, pending: 3, declined: 4 })
    expect(tiles.confirmed + tiles.pending + tiles.declined).toBe(tiles.invited)
  })

  it('sorts names without caring about case', () => {
    expect(['mehta', 'Anita', 'anil'].sort(compareGuestNames)).toEqual(['anil', 'Anita', 'mehta'])
  })
})
