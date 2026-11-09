import { describe, expect, it } from 'vitest'
import { mapGuest } from './mappers.ts'

describe('mapGuest', () => {
  it('reads phone and phone_number', () => {
    expect(mapGuest({ id: '1', name: 'A', phone_number: '+91 98765 43210' }).phone).toBe('+91 98765 43210')
    expect(mapGuest({ id: '2', name: 'B', phone: '9876543210', phone_number: '000' }).phone).toBe('9876543210')
  })
})