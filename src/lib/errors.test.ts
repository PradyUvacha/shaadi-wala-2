import { describe, expect, it } from 'vitest'
import { assertNoError, DeletedItemError, OFFLINE_MESSAGE, saveErrorPresentation, STALE_WRITE_MESSAGE, StaleWriteError, throwIfWriteMissed, toErrorMessage } from './errors.ts'

describe('assertNoError', () => {
  it('turns a case-insensitive ritual name clash into a sentence', () => {
    expect(() =>
      assertNoError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "tasks_function_title_ci"',
      }),
    ).toThrow('This function already has a ritual with that name.')
  })

  it('turns a missing row into a deleted-item sentence', () => {
    expect(() =>
      assertNoError({
        code: 'PGRST116',
        message: 'Cannot coerce the result to a single JSON object',
        details: 'The result contains 0 rows',
      }),
    ).toThrow(DeletedItemError)
    expect(toErrorMessage(new TypeError('Failed to fetch'))).toBe(OFFLINE_MESSAGE)
    expect(throwIfWriteMissed.bind(null, null, true)).toThrow(StaleWriteError)
    expect(throwIfWriteMissed.bind(null, null, false)).toThrow(DeletedItemError)
    expect(saveErrorPresentation(new StaleWriteError())).toEqual({ kind: 'stale' })
    expect(STALE_WRITE_MESSAGE).toBe('This was changed by someone else')
  })

  it('keeps a different unique violation as the database message', () => {
    expect(() =>
      assertNoError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "wedding_one_bride"',
      }),
    ).toThrow(/wedding_one_bride/)
  })
})
