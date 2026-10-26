import type { AchievementType } from '../data/content.ts'
import { ACHIEVEMENTS } from '../data/content.ts'
import type { BudgetItem, Ceremony, Guest, Payer, SplitDraft, Task, TemplateTask } from '../types.ts'

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

export function ritualsForCeremonies(items: TemplateTask[], ceremonies: readonly Ceremony[]): TemplateTask[] {
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
  /** Positive when the groom's family owes the bride's family. */
  groomOwesBride: number
}

function roundRupee(value: number): number {
  return Math.round(value)
}

export function familySettlement(items: Pick<BudgetItem, 'currency' | 'estimated' | 'actual' | 'paid' | 'paidBySide' | 'splits' | 'partPayments'>[]): FamilySettlement {
  let brideShare = 0
  let groomShare = 0
  let bridePaid = 0
  let groomPaid = 0
  for (const item of items) {
    if (item.currency !== 'INR') continue
    const estimated = Number(item.estimated) || 0
    const splits = item.splits.length > 0 ? item.splits : splitsForPayer(item.paidBySide)
    for (const split of splits) {
      const amount = (estimated * (Number(split.pct) || 0)) / 100
      if (split.side === 'bride') brideShare += amount
      if (split.side === 'groom') groomShare += amount
    }
    if (item.partPayments.length > 0) {
      for (const payment of item.partPayments) {
        const amount = Number(payment.amount) || 0
        if (payment.paidBySide === 'bride') bridePaid += amount
        if (payment.paidBySide === 'groom') groomPaid += amount
      }
    } else if (item.paid || Number(item.actual) > 0) {
      const amount = Number(item.actual) || 0
      if (item.paidBySide === 'bride') bridePaid += amount
      else if (item.paidBySide === 'groom') groomPaid += amount
      else if (item.paidBySide === 'both') {
        bridePaid += amount / 2
        groomPaid += amount / 2
      }
    }
  }
  const shareTotal = brideShare + groomShare
  const paidTotal = bridePaid + groomPaid
  let groomOwesBride = 0
  if (shareTotal > 0 && paidTotal > 0) {
    const brideShouldPay = (brideShare / shareTotal) * paidTotal
    groomOwesBride = bridePaid - brideShouldPay
  }
  return {
    brideShare: roundRupee(brideShare),
    groomShare: roundRupee(groomShare),
    bridePaid: roundRupee(bridePaid),
    groomPaid: roundRupee(groomPaid),
    groomOwesBride: roundRupee(groomOwesBride),
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
