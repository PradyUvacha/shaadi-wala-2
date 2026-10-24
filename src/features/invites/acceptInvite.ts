/** Later PR: redeem a wedding_invites token and insert a wedding_members row. */
export async function acceptInvite(token: string): Promise<never> {
  if (!token.trim()) throw new Error('Missing invite token.')
  throw new Error('Invite links are not available yet.')
}
