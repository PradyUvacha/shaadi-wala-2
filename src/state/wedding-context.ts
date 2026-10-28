import { createContext, useContext } from 'react'
import type { FunctionPhase } from '../config/phases.ts'
import type { RowGuard } from '../lib/errors.ts'
import type {
  BudgetDraft,
  CreateWeddingInput,
  GuestDraft,
  InviteRole,
  Milestone,
  MilestoneDraft,
  PartPaymentDraft,
  Side,
  Guest,
  Task,
  TaskDraft,
  WeddingBundle,
  WeddingInvite,
  WeddingSettings,
} from '../types.ts'

export type WeddingMode = 'remote' | 'preview' | null

export type WeddingContextValue = {
  ready: boolean
  mode: WeddingMode
  bundle: WeddingBundle | null
  canEdit: boolean
  notice: string | null
  error: string | null
  clearNotice: () => void
  clearError: () => void
  reload: () => void
  refreshWedding: () => Promise<WeddingBundle | null>
  refreshGuests: () => Promise<Guest[]>
  guestPingDown: boolean
  startPreview: () => void
  leavePreview: () => void
  createWedding: (input: CreateWeddingInput) => Promise<void>
  updateSettings: (settings: WeddingSettings) => Promise<void>
  saveTask: (draft: TaskDraft, id?: string, guard?: RowGuard) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTask: (task: Task) => Promise<void>
  saveFunction: (name: string, id?: string, guard?: RowGuard, phase?: FunctionPhase | null) => Promise<void>
  deleteFunction: (id: string) => Promise<void>
  moveFunction: (id: string, direction: -1 | 1) => Promise<void>
  moveTask: (id: string, direction: -1 | 1) => Promise<void>
  saveBudgetItem: (draft: BudgetDraft, id?: string) => Promise<void>
  deleteBudgetItem: (id: string) => Promise<void>
  addPayment: (budgetItemId: string, payment: PartPaymentDraft) => Promise<void>
  saveGuest: (draft: GuestDraft, id?: string) => Promise<void>
  deleteGuest: (id: string) => Promise<void>
  saveMilestone: (draft: MilestoneDraft, id?: string) => Promise<void>
  deleteMilestone: (id: string) => Promise<void>
  toggleMilestone: (milestone: Milestone) => Promise<void>
  createInvite: (role: InviteRole, side: Side | null) => Promise<WeddingInvite>
  listInvites: () => Promise<WeddingInvite[]>
  acceptInvite: (code: string, role: InviteRole, side: Side | null) => Promise<void>
  leaveWedding: () => Promise<void>
  removeMember: (memberId: string) => Promise<void>
}

export const WeddingContext = createContext<WeddingContextValue | null>(null)

export function useWedding(): WeddingContextValue {
  const value = useContext(WeddingContext)
  if (!value) throw new Error('useWedding must be used within WeddingProvider')
  return value
}
