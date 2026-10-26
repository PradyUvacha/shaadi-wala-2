/** Invite codes are 6 digits, matching the public terms of service. */
export function normalizeInviteCode(value: string): string {
  return value.replace(/\D/g, '').slice(0, 6)
}

/** True only for exactly six digits. Letters in the link are not stripped away. */
export function isInviteCode(value: string): boolean {
  return /^\d{6}$/.test(value)
}

export function inviteCodeProblem(value: string): string | null {
  if (isInviteCode(value)) return null
  if (!value.trim()) return 'Enter the 6-digit invite code.'
  return 'This invite code is not valid. Codes are exactly 6 digits.'
}

export function inviteLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, '')}/invite/${normalizeInviteCode(code)}`
}

/** A bad /invite/:code link stays visible, but a typed 6-digit code opens the join form. */
export function showInviteChoices(linkProblem: string | null, code: string): boolean {
  return isInviteCode(code) || !linkProblem
}
