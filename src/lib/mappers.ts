import type { BudgetItem, Guest, MemberRole, Milestone, PartPayment, Split, Task, WeddingFunction } from '../types.ts'
import { CATEGORIES, CURRENCY_CODES, MEMBER_ROLES, PAYERS, PRIORITIES, RSVP_STATUSES, TASK_STATUSES, MILESTONE_STATUSES } from '../types.ts'

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function mapTask(row: Record<string, unknown>): Task {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    category: asOneOf(row.category, CATEGORIES, 'Other'),
    priority: asOneOf(row.priority, PRIORITIES, 'Medium'),
    ceremony: row.ceremony == null || row.ceremony === '' ? 'Wedding' : String(row.ceremony),
    status: asOneOf(row.status, TASK_STATUSES, 'Pending'),
    dueDate: row.due_date ? String(row.due_date) : '',
    templateTitle: row.template_title ? String(row.template_title) : null,
    sortOrder: Number(row.sort_order ?? 0),
    functionId: row.function_id ? String(row.function_id) : null,
    position: row.position == null ? Number(row.sort_order ?? 0) : Number(row.position),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    side: row.side === 'bride' || row.side === 'groom' ? row.side : null,
  }
}

export function mapFunction(row: Record<string, unknown>): WeddingFunction {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    position: Number(row.position ?? 0),
  }
}

export function mapBudgetItem(row: Record<string, unknown>): BudgetItem {
  const splits = Array.isArray(row.budget_splits) ? row.budget_splits.map((split) => mapSplit(asRecord(split))) : []
  const payments = Array.isArray(row.part_payments)
    ? row.part_payments.map((payment) => mapPayment(asRecord(payment)))
    : []
  return {
    id: String(row.id),
    category: asOneOf(row.category, CATEGORIES, 'Other'),
    currency: asOneOf(row.currency, CURRENCY_CODES, 'INR'),
    estimated: Number(row.estimated ?? 0),
    actual: Number(row.actual ?? 0),
    paid: Boolean(row.paid),
    notes: String(row.notes ?? ''),
    paidBySide: asOneOf(row.paid_by_side, PAYERS, 'custom'),
    splits,
    partPayments: payments.sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export function mapGuest(row: Record<string, unknown>): Guest {
  const side = row.side == null ? '' : String(row.side)
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    status: asOneOf(row.rsvp_status, RSVP_STATUSES, 'Pending'),
    meal: String(row.meal ?? ''),
    plusOnes: Number(row.plus_ones ?? 0),
    side: side === 'bride' || side === 'groom' || side === 'both' ? side : '',
  }
}

export function mapMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    date: row.event_date ? String(row.event_date) : '',
    status: asOneOf(row.status, MILESTONE_STATUSES, 'Upcoming'),
    description: String(row.description ?? ''),
  }
}

export function mapSplit(row: Record<string, unknown>): Split {
  const side = row.side == null ? '' : String(row.side)
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    pct: Number(row.pct ?? 0),
    side: side === 'bride' || side === 'groom' || side === 'other' ? side : '',
  }
}

export function mapPayment(row: Record<string, unknown>): PartPayment {
  const side = row.paid_by_side == null ? '' : String(row.paid_by_side)
  return {
    id: String(row.id),
    amount: Number(row.amount ?? 0),
    paidBy: String(row.paid_by ?? ''),
    paidBySide: side === 'bride' || side === 'groom' || side === 'other' ? side : '',
    date: row.paid_on ? String(row.paid_on) : '',
    notes: String(row.notes ?? ''),
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

export function mapMemberRole(value: unknown): MemberRole {
  if (value === 'owner') return 'bride'
  if (value === 'partner' || value === 'editor') return 'planner'
  if (value === 'viewer') return 'friend'
  return asOneOf(value, MEMBER_ROLES, 'family')
}

function asOneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = String(value ?? '')
  return (allowed as readonly string[]).includes(text) ? (text as T) : fallback
}
