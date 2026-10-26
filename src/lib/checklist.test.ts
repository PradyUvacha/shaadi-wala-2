import { describe, expect, it } from 'vitest'
import { communityLabel, moveByPosition } from './checklist.ts'

describe('checklist order', () => {
  const items = [
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
    { id: 'c', position: 3 },
  ]

  it('moves a row up and rewrites positions', () => {
    const moved = moveByPosition(items, 'b', -1)
    expect(moved.map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(moved.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('leaves the row in place at the end of the list', () => {
    expect(moveByPosition(items, 'a', -1)).toBe(items)
    expect(moveByPosition(items, 'c', 1)).toBe(items)
  })

  it('still swaps rows that share a position', () => {
    const tied = [
      { id: 'a', position: 1 },
      { id: 'b', position: 1 },
    ]
    expect(moveByPosition(tied, 'b', -1).map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('labels the stored community without a picker', () => {
    expect(communityLabel('hindu')).toBe('Hindu')
    expect(communityLabel('')).toBe('Hindu')
  })
})