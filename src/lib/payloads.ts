import { WHOLE_RUPEE_MESSAGE } from '../config/budgetRules.ts'
import type { BudgetDraft, GuestDraft, MilestoneDraft, PartPaymentDraft, SplitDraft, TaskDraft } from '../types.ts'
import { moneyAmountError } from './planning.ts'

function requireWholeRupees(value: number, label: string, allowZero = true): void {
  const invalid = moneyAmountError(value, label, allowZero)
  if (invalid) throw new Error(invalid)
  if (!Number.isInteger(value)) throw new Error(WHOLE_RUPEE_MESSAGE)
}

export function taskInsert(weddingId: string, draft: TaskDraft, sortOrder: number) {
  return {
    wedding_id: weddingId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    ceremony: draft.ceremony,
    status: draft.status,
    due_date: draft.dueDate || null,
    template_title: draft.templateTitle ?? null,
    sort_order: sortOrder,
    function_id: draft.functionId ?? null,
    position: draft.position ?? sortOrder,
    assigned_to: draft.assignedTo || null,
  }
}

export function taskUpdate(draft: TaskDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    ceremony: draft.ceremony,
    status: draft.status,
    due_date: draft.dueDate || null,
    function_id: draft.functionId ?? null,
    position: draft.position ?? 0,
    assigned_to: draft.assignedTo || null,
  }
}

export function budgetInsert(weddingId: string, draft: BudgetDraft) {
  requireWholeRupees(Number(draft.estimated || 0), 'Estimated')
  const invalid = moneyAmountError(Number(draft.actual || 0), 'Actual')
  if (invalid) throw new Error(invalid)
  return {
    wedding_id: weddingId,
    category: draft.category.trim(),
    currency: draft.currency,
    estimated: Number(draft.estimated || 0),
    actual: Number(draft.actual || 0),
    paid: draft.paid,
    notes: draft.notes.trim(),
    paid_by_side: draft.paidBySide,
  }
}

/** Updates keep the stored actual. The ledger, not this column, is the displayed spend. */
export function budgetUpdate(draft: BudgetDraft) {
  const row = budgetInsert('unused', draft)
  return {
    category: row.category,
    currency: row.currency,
    estimated: row.estimated,
    paid: row.paid,
    notes: row.notes,
    paid_by_side: row.paid_by_side,
  }
}

export function splitInsert(budgetItemId: string, draft: SplitDraft) {
  return {
    budget_item_id: budgetItemId,
    name: draft.name.trim(),
    pct: Number(draft.pct || 0),
    side: draft.side || null,
  }
}

export function paymentInsert(budgetItemId: string, draft: PartPaymentDraft) {
  requireWholeRupees(Number(draft.amount), 'Payment', false)
  return {
    budget_item_id: budgetItemId,
    amount: Number(draft.amount || 0),
    paid_by: draft.paidBy.trim(),
    paid_by_side: draft.paidBySide || null,
    paid_on: draft.date || null,
    notes: draft.notes.trim(),
  }
}

export function guestInsert(weddingId: string, draft: GuestDraft) {
  return {
    wedding_id: weddingId,
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    rsvp_status: draft.status,
    meal: draft.meal,
    plus_ones: Math.max(0, Number(draft.plusOnes || 0)),
    side: draft.side || null,
  }
}

export function milestoneInsert(weddingId: string, draft: MilestoneDraft) {
  return {
    wedding_id: weddingId,
    name: draft.name.trim(),
    event_date: draft.date,
    status: draft.status,
    description: draft.description.trim(),
  }
}
