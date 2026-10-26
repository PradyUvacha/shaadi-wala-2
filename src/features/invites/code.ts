/** Invite codes are 6 digits, matching the public terms of service. */
export function normalizeInviteCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

export function isInviteCode(value: string): boolean {
  return /^\d{6}$/.test(normalizeInviteCode(value))
}

export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${normalizeInviteCode(code)}`
}
