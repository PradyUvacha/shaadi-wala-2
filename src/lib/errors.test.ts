import { describe, expect, it } from 'vitest'
import { assertNoError } from './errors.ts'

describe('assertNoError', () => {
  it('turns a case-insensitive ritual name clash into a sentence', () => {
    expect(() =>
      assertNoError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "tasks_function_title_ci"',
      }),
    ).toThrow('This function already has a ritual with that name.')
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
