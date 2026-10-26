import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { MemberRole, Side } from '../types.ts'

export const LEFT_WEDDING_MESSAGE = 'You are no longer in this wedding.'

export type OwnMembershipEvent =
  | { type: 'removed' }
  | { type: 'updated'; role: MemberRole; side: Side | null }

const ROLES: readonly MemberRole[] = ['bride', 'groom', 'family', 'friend', 'planner']

export function membershipChannelFilter(userId: string) {
  return {
    event: '*' as const,
    schema: 'public' as const,
    table: 'wedding_members' as const,
    filter: `user_id=eq.${userId}`,
  }
}

export function membershipSide(value: unknown): Side | null {
  return value === 'bride' || value === 'groom' ? value : null
}

export function ownMembershipEvent(
  payload: Pick<RealtimePostgresChangesPayload<Record<string, unknown>>, 'eventType' | 'new' | 'old'>,
): OwnMembershipEvent | null {
  if (payload.eventType === 'DELETE') return { type: 'removed' }
  if (payload.eventType !== 'UPDATE') return null
  const row = payload.new
  if (!row || typeof row !== 'object' || !('role' in row)) return null
  const role = String(row.role)
  if (!ROLES.includes(role as MemberRole)) return null
  return { type: 'updated', role: role as MemberRole, side: membershipSide(row.side) }
}

export function membershipAccessChanged(
  current: { role: MemberRole; side: Side | null },
  next: { role: MemberRole; side: Side | null },
): boolean {
  return current.role !== next.role || current.side !== next.side
}

export function subscribeOwnMembership(
  client: SupabaseClient,
  userId: string,
  onChange: (event: OwnMembershipEvent) => void,
): () => void {
  const filter = membershipChannelFilter(userId)
  const channel = client.channel(`membership:${userId}`)
  channel.on('postgres_changes', filter, (payload) => {
    const event = ownMembershipEvent(payload)
    if (event) onChange(event)
  })
  channel.subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}
