import type { AchievementType } from '../data/content.ts'
import { ACHIEVEMENTS } from '../data/content.ts'
import { ACTUAL_COUNTS_DONE_TASKS_ONLY, MIGRATED_PAYMENT_NOTE, ODD_RUPEE_SIDE } from '../config/budgetRules.ts'
import type { BudgetItem, Guest, Payer, SplitDraft, Task, TemplateTask } from '../types.ts'

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function plannerLevel(completedTasks: number): number {
  return Math.floor(completedTasks / 5) + 1
}

export function inrBudgetTotals(items: { currency: string; estimated: number; actual: number }[]): {
  estimated: number
  actual: number
} {
  return items
    .filter((item) => item.currency === 'INR')
    .reduce(
      (totals, item) => ({
        estimated: totals.estimated + Number(item.estimated || 0),
        actual: totals.actual + Number(item.actual || 0),
      }),
      { estimated: 0, actual: 0 },
    )
}

/** One line item cannot exceed ₹10 crore. */
export const MAX_BUDGET_AMOUNT = 100_000_000

export function moneyAmountError(value: number, label: string, allowZero = true): string | null {
  if (!Number.isFinite(value)) return `Enter a ${label.toLowerCase()} amount.`
  if (value < 0) return `${label} cannot be negative.`
  if (!allowZero && value <= 0) return `${label} must be greater than zero.`
  if (value > MAX_BUDGET_AMOUNT) return `${label} cannot be more than ₹10 crore.`
  return null
}

export function validateBudgetAmounts(estimated: number, actual: number): string | null {
  return moneyAmountError(Number(estimated), 'Estimated') ?? moneyAmountError(Number(actual), 'Actual')
}

export type BudgetHeadline = {
  currency: string
  estimated: number
  actual: number
}

/**
 * The All view and Home both use Indian rupees only.
 * A foreign-currency filter sums that currency alone and never folds it into rupees.
 */
export function budgetHeadline(
  items: { currency: string; estimated: number; actual: number }[],
  filter: string,
): BudgetHeadline {
  if (filter === 'All' || filter === 'INR') return { currency: 'INR', ...inrBudgetTotals(items) }
  return { currency: filter, ...sumAmounts(items.filter((item) => item.currency === filter)) }
}

/** Currencies other than INR, each summed on its own. Never folded into rupees. */
export function otherCurrencyTotals(
  items: { currency: string; estimated: number; actual: number }[],
): BudgetHeadline[] {
  const codes = [...new Set(items.map((item) => item.currency).filter((currency) => currency !== 'INR'))]
  return codes.map((currency) => ({ currency, ...sumAmounts(items.filter((item) => item.currency === currency)) }))
}

export function sumAmounts(items: { estimated: number; actual: number }[]): { estimated: number; actual: number } {
  return items.reduce(
    (totals, item) => ({
      estimated: totals.estimated + Number(item.estimated || 0),
      actual: totals.actual + Number(item.actual || 0),
    }),
    { estimated: 0, actual: 0 },
  )
}

/** A new line follows the creator's side. A planner, who has no side, starts at 50/50. */
export function defaultPayerForSide(side: 'bride' | 'groom' | null | undefined): Payer {
  if (side === 'bride' || side === 'groom') return side
  return 'both'
}

export const SPLIT_REQUIRED = 'Add at least one family split.'

/** Bride, groom, and both always store their preset rows. Custom must name at least one side. */
export function splitsForSave(draft: { paidBySide: Payer; splits: SplitDraft[] }): SplitDraft[] {
  if (draft.paidBySide !== 'custom') return splitsForPayer(draft.paidBySide)
  const rows = draft.splits.filter(
    (split) => split.name.trim() && Number(split.pct) > 0 && (split.side === 'bride' || split.side === 'groom'),
  )
  if (rows.length === 0) throw new Error(SPLIT_REQUIRED)
  return rows.map((split) => ({ name: split.name.trim(), pct: Number(split.pct), side: split.side }))
}

export function splitsForPayer(payer: Payer, custom: SplitDraft[] = []): SplitDraft[] {
  if (payer === 'bride') return [{ name: "Bride's Family", pct: 100, side: 'bride' }]
  if (payer === 'groom') return [{ name: "Groom's Family", pct: 100, side: 'groom' }]
  if (payer === 'both') {
    return [
      { name: "Bride's Family", pct: 50, side: 'bride' },
      { name: "Groom's Family", pct: 50, side: 'groom' },
    ]
  }
  return custom
}

export function payerLabel(payer: Payer): string {
  if (payer === 'bride') return "Bride's family"
  if (payer === 'groom') return "Groom's family"
  if (payer === 'both') return 'Both families'
  return 'Custom split'
}

export function splitTotal(splits: { pct: number }[]): number {
  return splits.reduce((sum, split) => sum + Number(split.pct || 0), 0)
}

export function canAddSplit(splits: { pct: number }[], pct: number): boolean {
  if (!Number.isFinite(pct) || pct <= 0) return false
  return splitTotal(splits) + pct <= 100 + 1e-9
}

export function sideLabel(side: 'bride' | 'groom'): string {
  return side === 'bride' ? "Bride's side" : "Groom's side"
}

export function missingTemplateTasks(
  existing: Pick<Task, 'title' | 'templateTitle'>[],
  template: TemplateTask[],
): TemplateTask[] {
  const names = new Set<string>()
  for (const task of existing) {
    names.add(task.title)
    if (task.templateTitle) names.add(task.templateTitle)
  }
  return template.filter((item) => !names.has(item.title))
}

export function templateToDrafts(items: TemplateTask[]) {
  return items.map((item) => ({
    title: item.title,
    description: item.description,
    category: item.category,
    priority: item.priority,
    ceremony: item.ceremony,
    status: 'Pending' as const,
    dueDate: '',
    templateTitle: item.title,
  }))
}

export function ritualsForCeremonies(items: TemplateTask[], ceremonies: readonly string[]): TemplateTask[] {
  const chosen = new Set(ceremonies)
  return items.filter((item) => chosen.has(item.ceremony))
}

export type SideHeadcount = {
  confirmed: number
  pending: number
  declined: number
}

export type GuestHeadcount = {
  bride: SideHeadcount
  groom: SideHeadcount
  both: SideHeadcount
  unassigned: SideHeadcount
  confirmedPeople: number
}

function people(guests: Pick<Guest, 'status' | 'plusOnes' | 'side'>[], side: Guest['side'], status: Guest['status']): number {
  return guests
    .filter((guest) => guest.side === side && guest.status === status)
    .reduce((total, guest) => total + 1 + Math.max(0, Number(guest.plusOnes) || 0), 0)
}

export function guestHeadcount(guests: Pick<Guest, 'status' | 'plusOnes' | 'side'>[]): GuestHeadcount {
  const count = (side: Guest['side']): SideHeadcount => ({
    confirmed: people(guests, side, 'Confirmed'),
    pending: people(guests, side, 'Pending'),
    declined: people(guests, side, 'Declined'),
  })
  const bride = count('bride')
  const groom = count('groom')
  const both = count('both')
  const unassigned = count('')
  return {
    bride,
    groom,
    both,
    unassigned,
    confirmedPeople: bride.confirmed + groom.confirmed + both.confirmed + unassigned.confirmed,
  }
}

export type FamilySettlement = {
  brideShare: number
  groomShare: number
  bridePaid: number
  groomPaid: number
  /** Done task costs, payments with no bride or groom payer, and logged actual that no payment covers. Not a family debt. */
  unattributed: number
  /** Positive when the groom's family owes the bride's family. */
  groomOwesBride: number
}

function wholeRupees(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

/** Fixed 50/50. The odd rupee follows OQ-19. */
function splitRupees(total: number): { bride: number; groom: number } {
  const whole = wholeRupees(total)
  const negative = whole < 0
  const abs = Math.abs(whole)
  const bride = Math.floor(abs / 2) + (abs % 2 === 1 && ODD_RUPEE_SIDE === 'bride' ? 1 : 0)
  const groom = abs - bride
  return negative ? { bride: -bride, groom: -groom } : { bride, groom }
}

function countsInActual(task: Pick<Task, 'status' | 'actualCost'>): boolean {
  if (task.actualCost == null) return false
  if (!ACTUAL_COUNTS_DONE_TASKS_ONLY) return true
  return task.status === 'Completed'
}

function paymentTotal(payments: readonly { amount: number }[]): number {
  return payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
}

/** Same rule as the category card: a migrated payment replaces the column; otherwise the column still covers any unpaid gap. */
function loggedAmount(item: Pick<BudgetItem, 'actual' | 'partPayments'>): number {
  const payments = paymentTotal(item.partPayments)
  const migrated = item.partPayments.some((payment) => payment.notes === MIGRATED_PAYMENT_NOTE || payment.paidBy === MIGRATED_PAYMENT_NOTE)
  if (migrated) return payments
  const actual = Number(item.actual) || 0
  return actual > payments ? actual : payments
}

export function familySettlement(
  items: Pick<BudgetItem, 'currency' | 'estimated' | 'actual' | 'paid' | 'paidBySide' | 'splits' | 'partPayments'>[],
  tasks: readonly Pick<Task, 'status' | 'actualCost'>[] = [],
): FamilySettlement {
  let estimated = 0
  let bridePaidRaw = 0
  let groomPaidRaw = 0
  let unattributedRaw = 0
  for (const item of items) {
    if (item.currency !== 'INR') continue
    estimated += Number(item.estimated) || 0
    for (const payment of item.partPayments) {
      const amount = Number(payment.amount) || 0
      if (payment.paidBySide === 'bride') bridePaidRaw += amount
      else if (payment.paidBySide === 'groom') groomPaidRaw += amount
      else unattributedRaw += amount
    }
    const gap = loggedAmount(item) - paymentTotal(item.partPayments)
    if (gap > 0) unattributedRaw += gap
  }
  for (const task of tasks) {
    if (!countsInActual(task)) continue
    unattributedRaw += Number(task.actualCost) || 0
  }
  const shares = splitRupees(estimated)
  const bridePaid = wholeRupees(bridePaidRaw)
  const groomPaid = wholeRupees(groomPaidRaw)
  const paidShares = splitRupees(bridePaid + groomPaid)
  return {
    brideShare: shares.bride,
    groomShare: shares.groom,
    bridePaid,
    groomPaid,
    unattributed: wholeRupees(unattributedRaw),
    groomOwesBride: bridePaid + groomPaid === 0 ? 0 : bridePaid - paidShares.bride,
  }
}

export function settlementSummary(settlement: FamilySettlement): string {
  if (settlement.brideShare === 0 && settlement.groomShare === 0) {
    return 'Add INR items with a family split to see who covers what.'
  }
  if (settlement.bridePaid === 0 && settlement.groomPaid === 0) {
    return "Shares are set. Record a payment to see who should settle with whom."
  }
  const amount = Math.abs(settlement.groomOwesBride).toLocaleString('en-IN')
  if (settlement.groomOwesBride > 0) return `Groom's family owes bride's family ₹${amount}.`
  if (settlement.groomOwesBride < 0) return `Bride's family owes groom's family ₹${amount}.`
  return 'The two families are settled for what has been paid so far.'
}

export function unlockedAchievementIds(input: {
  completedTasks: number
  budgetCount: number
  guestCount: number
}): string[] {
  return ACHIEVEMENTS.filter((achievement) => {
    const value = valueForAchievement(achievement.type, input)
    return value >= achievement.threshold
  }).map((achievement) => achievement.id)
}

function valueForAchievement(
  type: AchievementType,
  input: { completedTasks: number; budgetCount: number; guestCount: number },
): number {
  if (type === 'tasks_completed') return input.completedTasks
  if (type === 'budget_items') return input.budgetCount
  return input.guestCount
}

export function validateWeddingSetup(input: {
  coupleNames: string
  weddingDate: string
  city: string
  side: string
  displayName: string
}): string | null {
  if (!input.displayName.trim()) return 'Add your name.'
  if (!input.coupleNames.trim()) return "Add the couple's names."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weddingDate)) return 'Choose the wedding date.'
  if (!input.city.trim()) return 'Add the city.'
  if (input.side !== 'bride' && input.side !== 'groom') return "Choose the bride's side or the groom's side."
  return null
}

export function validateAuth(input: {
  mode: 'sign-in' | 'sign-up'
  email: string
  password: string
  displayName: string
}): string | null {
  if (input.mode === 'sign-up' && !input.displayName.trim()) return 'Add your name.'
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return 'Enter a valid email address.'
  if (input.password.length < 6) return 'Use at least 6 characters for the password.'
  return null
}
