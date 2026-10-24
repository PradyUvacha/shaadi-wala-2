import type { BudgetDraft, GuestDraft, MilestoneDraft, PartPaymentDraft, SplitDraft, TaskDraft } from '../types.ts'

export function taskInsert(weddingId: string, draft: TaskDraft, sortOrder: number) {
  return {
    wedding_id: weddingId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    status: draft.status,
    due_date: draft.dueDate || null,
    template_title: draft.templateTitle ?? null,
    sort_order: sortOrder,
  }
}

export function taskUpdate(draft: TaskDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    status: draft.status,
    due_date: draft.dueDate || null,
  }
}

export function budgetInsert(weddingId: string, draft: BudgetDraft) {
  return {
    wedding_id: weddingId,
    category: draft.category,
    currency: draft.currency,
    estimated: Number(draft.estimated || 0),
    actual: Number(draft.actual || 0),
    paid: draft.paid,
    notes: draft.notes.trim(),
    paid_by_side: draft.paidBySide,
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
