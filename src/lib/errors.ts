export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function assertNoError(error: { message: string; code?: string } | null): void {
  if (!error) return
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
