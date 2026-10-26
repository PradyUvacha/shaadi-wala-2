import type { MemberRole } from '../types.ts'

export function canEditWedding(role: MemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor'
}

export function roleLabel(role: MemberRole): string {
  if (role === 'owner') return 'Owner'
  if (role === 'editor') return 'Editor'
  return 'Viewer'
}
