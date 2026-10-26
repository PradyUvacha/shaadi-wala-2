import { describe, expect, it } from 'vitest'
import {
  PRICE_CLOSED_QUESTION,
  PRICE_OPEN_QUESTION,
  daysSinceSignup,
  dueSurvey,
  npsAnswerError,
  pathWithSurvey,
  priceOpenError,
  surveyAnswerRow,
  surveyDismissalRow,
  surveyOverride,
} from './surveys.ts'

const signedUp = '2026-10-01T08:30:00.000Z'

describe('survey schedule', () => {
  it('counts whole days after sign-up', () => {
    expect(daysSinceSignup(signedUp, new Date('2026-10-01T22:00:00.000Z'))).toBe(0)
    expect(daysSinceSignup(signedUp, new Date('2026-10-14T00:00:00.000Z'))).toBe(13)
    expect(daysSinceSignup(signedUp, new Date('2026-10-15T00:00:00.000Z'))).toBe(14)
    expect(daysSinceSignup(signedUp, new Date('2026-10-31T00:00:00.000Z'))).toBe(30)
  })

  it('shows NPS on day 14 and day 30 once, and the price survey from day 21 after NPS', () => {
    const on = (iso: string, recorded: Array<'day_14' | 'day_30' | 'price'> = []) =>
      dueSurvey({ signedUpAt: signedUp, recorded, now: new Date(iso) })
    expect(on('2026-10-14T12:00:00.000Z')).toBeNull()
    expect(on('2026-10-15T12:00:00.000Z')).toEqual({ kind: 'nps', prompt: 'day_14' })
    expect(on('2026-10-22T12:00:00.000Z')).toEqual({ kind: 'nps', prompt: 'day_14' })
    expect(on('2026-10-22T12:00:00.000Z', ['day_14'])).toEqual({ kind: 'price', prompt: 'price' })
    expect(on('2026-10-31T12:00:00.000Z')).toEqual({ kind: 'nps', prompt: 'day_30' })
    expect(on('2026-11-02T12:00:00.000Z', ['day_30'])).toEqual({ kind: 'price', prompt: 'price' })
    expect(on('2026-11-02T12:00:00.000Z', ['day_14', 'day_30', 'price'])).toBeNull()
    expect(on('2026-10-15T12:00:00.000Z', ['day_14'])).toBeNull()
  })

  it('lets a tester open either survey immediately', () => {
    expect(surveyOverride('?survey=nps')).toBe('nps')
    expect(surveyOverride('survey=price')).toBe('price')
    expect(surveyOverride('?survey=billing')).toBeNull()
    expect(dueSurvey({ signedUpAt: signedUp, recorded: [], now: new Date('2026-10-02T00:00:00.000Z'), override: 'nps' })).toEqual({
      kind: 'nps',
      prompt: 'day_14',
    })
    expect(dueSurvey({ signedUpAt: null, recorded: ['day_14'], override: 'nps' })).toEqual({ kind: 'nps', prompt: 'day_30' })
    expect(dueSurvey({ signedUpAt: null, recorded: [], override: 'price' })).toEqual({ kind: 'price', prompt: 'price' })
    expect(pathWithSurvey('/auth', '?survey=nps')).toBe('/auth?survey=nps')
    expect(pathWithSurvey('/', '')).toBe('/')
  })

  it('records a 0 to 10 score and the two price answers, and a dismissal without either', () => {
    expect(npsAnswerError(null)).toMatch(/0 to 10/)
    expect(npsAnswerError(-1)).toMatch(/0 to 10/)
    expect(npsAnswerError(11)).toMatch(/0 to 10/)
    expect(npsAnswerError(8.5)).toMatch(/0 to 10/)
    expect(npsAnswerError(0)).toBeNull()
    expect(npsAnswerError(10)).toBeNull()
    expect(priceOpenError('  ')).toMatch(/what you would pay/)
    expect(PRICE_OPEN_QUESTION).not.toMatch(/4,999|4999/)
    expect(PRICE_CLOSED_QUESTION).toContain('₹4,999')
    expect(surveyAnswerRow('user-1', { kind: 'nps', prompt: 'day_14', score: 9, comment: '  ' })).toMatchObject({
      nps_score: 9,
      comment: null,
      dismissed: false,
      price_choice: null,
    })
    expect(surveyAnswerRow('user-1', { kind: 'price', prompt: 'price', willingness: ' about 2000 ', choice: 'maybe' })).toMatchObject({
      willingness: 'about 2000',
      price_choice: 'maybe',
      nps_score: null,
    })
    expect(surveyDismissalRow('user-1', 'day_30')).toMatchObject({
      kind: 'nps',
      prompt: 'day_30',
      dismissed: true,
      nps_score: null,
    })
    expect(() => surveyAnswerRow('user-1', { kind: 'nps', prompt: 'day_30', score: 11, comment: '' })).toThrow(/0 to 10/)
  })
})
