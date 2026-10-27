import { DUPLICATE_FUNCTION_MESSAGE, DUPLICATE_RITUAL_MESSAGE } from './checklist.ts'

export const STALE_WRITE_MESSAGE = 'This was changed by someone else'
export const DELETED_ITEM_MESSAGE = 'This item was deleted by someone else'
export const OFFLINE_MESSAGE = 'You are offline. Check your connection and try again.'

export class StaleWriteError extends Error {
  constructor() {
    super(STALE_WRITE_MESSAGE)
    this.name = 'StaleWriteError'
  }
}

export class DeletedItemError extends Error {
  constructor() {
    super(DELETED_ITEM_MESSAGE)
    this.name = 'DeletedItemError'
  }
}

/** The timestamp loaded when an editor opened. Overwrite skips the equality check. */
export type RowGuard = {
  updatedAt: string
  costUpdatedAt?: string
  overwrite?: boolean
}

export type SaveFailure = { kind: 'stale' } | { kind: 'deleted' } | { kind: 'message'; message: string }

export function isStaleWriteError(error: unknown): error is StaleWriteError {
  return error instanceof StaleWriteError
}

export function isDeletedItemError(error: unknown): error is DeletedItemError {
  return error instanceof DeletedItemError
}

export function isZeroRowError(error: { message?: string; code?: string; details?: string | null }): boolean {
  const details = `${error.message ?? ''} ${error.details ?? ''}`
  if (/multiple \(or no\) rows|multiple rows/i.test(details) && !/0 rows/i.test(details)) return false
  return error.code === 'PGRST116' || /cannot coerce the result to a single json object/i.test(error.message ?? '')
}

export function throwIfWriteMissed(saved: unknown, stillThere: boolean): asserts saved {
  if (saved) return
  if (stillThere) throw new StaleWriteError()
  throw new DeletedItemError()
}

export function saveErrorPresentation(error: unknown): SaveFailure {
  if (isStaleWriteError(error)) return { kind: 'stale' }
  if (isDeletedItemError(error)) return { kind: 'deleted' }
  return { kind: 'message', message: toErrorMessage(error) }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') return error.message
  return ''
}

export function isOfflineFailure(error: unknown): boolean {
  return /failed to fetch|networkerror|network request failed|load failed|offline|internet connection appears to be offline/i.test(errorText(error))
}

export function toErrorMessage(error: unknown): string {
  if (isStaleWriteError(error)) return STALE_WRITE_MESSAGE
  if (isDeletedItemError(error)) return DELETED_ITEM_MESSAGE
  if (isOfflineFailure(error)) return OFFLINE_MESSAGE
  if (error instanceof Error && error.message.trim()) return error.message
  const text = errorText(error)
  if (text.trim()) return text
  return 'Something went wrong. Please try again.'
}

export function assertNoError(error: { message: string; code?: string; details?: string | null } | null): void {
  if (!error) return
  if (isZeroRowError(error)) throw new DeletedItemError()
  const constraint = `${error.message} ${error.details ?? ''}`
  if (error.code === '23505' && /tasks_function_title_ci/i.test(constraint)) {
    throw new Error(DUPLICATE_RITUAL_MESSAGE)
  }
  if (error.code === '23505' && /wedding_functions_name_ci/i.test(constraint)) {
    throw new Error(DUPLICATE_FUNCTION_MESSAGE)
  }
  const missingSchema =
    error.code === 'PGRST202' ||
    error.code === '42P01' ||
    /create_wedding|schema cache|does not exist/i.test(error.message)
  if (missingSchema) {
    throw new Error(
      'The database is missing the Shaadi Wala tables. Apply supabase/migrations to the Supabase project, then try again.',
    )
  }
  throw new Error(error.message)
}
