import { describe, expect, it } from 'vitest'
import { MAX_SCREENSHOT_BYTES, validateFeedback, validateScreenshot } from './submitFeedback.ts'

describe('feedback', () => {
  it('requires a message and keeps the rating optional', () => {
    expect(validateFeedback('  ', null)).toMatch(/message/)
    expect(validateFeedback('The guest list is hard to scan.', null)).toBeNull()
    expect(validateFeedback('Useful', 5)).toBeNull()
    expect(validateFeedback('Useful', 0)).toMatch(/1 to 5/)
    expect(validateFeedback('Useful', 1.5)).toMatch(/1 to 5/)
  })

  it('allows no screenshot and accepts jpeg, png, or webp under 5 MB', () => {
    expect(validateScreenshot(null)).toBeNull()
    expect(validateScreenshot(undefined)).toBeNull()
    expect(validateScreenshot({ type: 'image/jpeg', size: 1200 })).toBeNull()
    expect(validateScreenshot({ type: 'image/png', size: MAX_SCREENSHOT_BYTES })).toBeNull()
    expect(validateScreenshot({ type: 'image/webp', size: 10 })).toBeNull()
    expect(validateScreenshot({ type: 'image/gif', size: 10 })).toMatch(/JPEG, PNG, or WebP/)
    expect(validateScreenshot({ type: 'image/png', size: 0 })).toMatch(/empty/)
    expect(validateScreenshot({ type: 'image/png', size: MAX_SCREENSHOT_BYTES + 1 })).toMatch(/5 MB/)
  })
})
