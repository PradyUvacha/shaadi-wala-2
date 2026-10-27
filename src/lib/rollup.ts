import {
  ACTUAL_COUNTS_DONE_TASKS_ONLY,
  MIGRATED_PAYMENT_NOTE,
  ODD_RUPEE_SIDE,
  SPLIT_EDITABLE,
  WHOLE_RUPEE_MESSAGE,
} from '../config/budgetRules.ts'
import { CURRENCIES } from '../styles/tokens.ts'
import type { BudgetItem, PartPayment, Task, TaskStatus } from '../types.ts'
import { MAX_BUDGET_AMOUNT, moneyAmountError } from './planning.ts'

export function toPaise(amount: number | null | undefined): bigint {
  if (amount == null || !Number.isFinite(amount)) return 0n
  const negative = amount < 0
  const [whole = '0', frac = ''] = Math.abs(amount).toFixed(4).split('.')
  const digits = (frac + '0000').slice(0, 4)
  let paise = BigInt(whole) * 100n + BigInt(digits.slice(0, 2))
  if (Number(digits.slice(2)) >= 50) paise += 1n
  return negative ? -paise : paise
}

export function roundHalfUpRupees(paise: bigint): bigint {
  const negative = paise < 0n
  const abs = negative ? -paise : paise
  let rupees = abs / 100n
  if (abs % 100n >= 50n) rupees += 1n
  return negative ? -rupees : rupees
}

export function formatInrGrouped(rupees: bigint): string {
  const negative = rupees < 0n
  const digits = (negative ? -rupees : rupees).toString()
  const grouped = digits.length <= 3
    ? digits
    : `${digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${digits.slice(-3)}`
  return `${negative ? '-' : ''}₹${grouped}`
}

export function formatInrShort(rupees: bigint): string {
  const negative = rupees < 0n
  const abs = negative ? -rupees : rupees
  const prefix = negative ? '-' : ''
  if (abs >= 10_000_000n) return `${prefix}₹${compactUnit(abs, 10_000_000n)}Cr`
  if (abs >= 100_000n) return `${prefix}₹${compactUnit(abs, 100_000n)}L`
  return formatInrGrouped(rupees)
}

function compactUnit(value: bigint, unit: bigint): string {
  const tenths = (value * 10n + unit / 2n) / unit
  const whole = tenths / 10n
  const frac = tenths % 10n
  return frac === 0n ? whole.toString() : `${whole}.${frac}`
}

export function wholeRupeeProblem(raw: string, allowEmpty = false): string | null {
  if (raw !== raw.trim()) return WHOLE_RUPEE_MESSAGE
  const text = raw.trim()
  if (!text) return allowEmpty ? null : WHOLE_RUPEE_MESSAGE
  if (!/^\d+$/.test(text)) return WHOLE_RUPEE_MESSAGE
  const amount = Number(text)
  return moneyAmountError(amount, 'Amount')
}

export function parseWholeRupees(raw: string): number | null {
  if (wholeRupeeProblem(raw, false)) return null
  return Number(raw.trim())
}

export function hasMigratedPayment(payments: readonly Pick<PartPayment, 'notes' | 'paidBy'>[]): boolean {
  return payments.some((payment) => payment.notes === MIGRATED_PAYMENT_NOTE || payment.paidBy === MIGRATED_PAYMENT_NOTE)
}

export function paymentPaise(payments: readonly Pick<PartPayment, 'amount'>[]): bigint {
  return payments.reduce((sum, payment) => sum + toPaise(payment.amount), 0n)
}

/** Before the opening payment exists, the column already includes payments, so the gap stays in actual. After it exists, the ledger is the payments. */
export function loggedPaise(item: Pick<BudgetItem, 'actual' | 'partPayments'>): bigint {
  const payments = paymentPaise(item.partPayments)
  if (hasMigratedPayment(item.partPayments)) return payments
  const actual = toPaise(item.actual)
  return actual > payments ? actual : payments
}

export function countsTowardActual(task: Pick<Task, 'status' | 'actualCost'>): boolean {
  if (task.actualCost == null) return false
  if (!ACTUAL_COUNTS_DONE_TASKS_ONLY) return true
  return task.status === 'Completed'
}

export function isCommitted(task: Pick<Task, 'status' | 'actualCost'>): boolean {
  return task.actualCost != null && !countsTowardActual(task)
}

export type BreakdownRow = {
  taskId: string
  event: string
  title: string
  label: string
  amount: number | null
  status: TaskStatus
  planned: boolean
}

export type CategoryCard = {
  key: string
  name: string
  itemIds: string[]
  primaryItemId: string | null
  auto: boolean
  budgetRupees: bigint
  loggedPaise: bigint
  taskActualPaise: bigint
  actualPaise: bigint
  committedPaise: bigint
  rows: BreakdownRow[]
  foreignNotes: string[]
}

export type WeddingRollup = {
  budgetRupees: bigint
  actualRupees: bigint
  committedRupees: bigint
  remainingRupees: bigint
  categories: CategoryCard[]
  uncategorised: CategoryCard | null
  foreignNotes: string[]
}

export function displaySplit(totalRupees: bigint): { bride: bigint; groom: bigint } {
  if (SPLIT_EDITABLE) {
    // Stored per-category percents stay on the settlement card. This flag is the switch for a later editor.
  }
  const negative = totalRupees < 0n
  const abs = negative ? -totalRupees : totalRupees
  const half = abs / 2n
  const odd = abs % 2n
  const bride = half + (odd === 1n && ODD_RUPEE_SIDE === 'bride' ? 1n : 0n)
  const groom = abs - bride
  return negative ? { bride: -bride, groom: -groom } : { bride, groom }
}

/** 50/50 of the card's Budget and Actual. A zero budget omits the Budget figure. The odd rupee stays with the bride. */
export function splitShareLabel(budgetRupees: bigint, actualRupees: bigint): string {
  const budget = displaySplit(budgetRupees)
  const actual = displaySplit(actualRupees)
  const actualText = (side: 'bride' | 'groom') => formatInrGrouped(actual[side])
  if (budgetRupees === 0n) {
    if (actual.bride === actual.groom) return `Split 50/50 · Each side: Actual ${actualText('bride')}`
    return `Split 50/50 · Bride: Actual ${actualText('bride')} · Groom: Actual ${actualText('groom')}`
  }
  const budgetText = (side: 'bride' | 'groom') => formatInrGrouped(budget[side])
  const same = budget.bride === budget.groom && actual.bride === actual.groom
  if (same) {
    return `Split 50/50 · Each side: Budget ${budgetText('bride')} · Actual ${actualText('bride')}`
  }
  return `Split 50/50 · Bride: Budget ${budgetText('bride')} · Actual ${actualText('bride')} · Groom: Budget ${budgetText('groom')} · Actual ${actualText('groom')}`
}

export function percentOf(actualRupees: bigint, budgetRupees: bigint): { label: string; over: boolean; fill: number } {
  if (budgetRupees === 0n && actualRupees === 0n) return { label: '0%', over: false, fill: 0 }
  if (budgetRupees <= 0n && actualRupees > 0n) return { label: 'Over budget', over: true, fill: 100 }
  if (budgetRupees <= 0n) return { label: '0%', over: false, fill: 0 }
  const pct = (actualRupees * 100n + budgetRupees / 2n) / budgetRupees
  const over = pct > 100n
  return { label: `${pct}%`, over, fill: over ? 100 : Number(pct) }
}

export function remainingLabel(remainingRupees: bigint): { text: string; over: boolean } {
  if (remainingRupees < 0n) return { text: `Over by ${formatInrGrouped(-remainingRupees)}`, over: true }
  return { text: formatInrGrouped(remainingRupees), over: false }
}

export function chipRupees(cost: number | null): bigint | null {
  if (cost == null || !(cost > 0)) return null
  const rupees = roundHalfUpRupees(toPaise(cost))
  return rupees >= 1n ? rupees : null
}

function taskRows(tasks: readonly Task[]): BreakdownRow[] {
  return tasks
    .map((task) => ({
      taskId: task.id,
      event: task.ceremony || 'Event',
      title: task.title,
      label: `${task.ceremony || 'Event'} > ${task.title}`,
      amount: task.actualCost,
      status: task.status,
      planned: isCommitted(task),
    }))
    .sort((left, right) => {
      if (left.amount == null && right.amount == null) return left.label.localeCompare(right.label)
      if (left.amount == null) return 1
      if (right.amount == null) return -1
      const diff = toPaise(right.amount) - toPaise(left.amount)
      if (diff > 0n) return 1
      if (diff < 0n) return -1
      return left.label.localeCompare(right.label)
    })
}

function sumTaskPaise(tasks: readonly Task[], wantActual: boolean): bigint {
  return tasks.reduce((sum, task) => {
    if (task.actualCost == null) return sum
    const counts = countsTowardActual(task)
    if (wantActual ? !counts : !isCommitted(task)) return sum
    return sum + toPaise(task.actualCost)
  }, 0n)
}

function foreignNote(item: BudgetItem): string | null {
  if (item.currency === 'INR') return null
  const symbol = CURRENCIES[item.currency]?.symbol ?? ''
  const amount = Number(item.estimated || 0)
  const grouped = amount.toLocaleString('en-IN')
  return `Not in total: ${symbol}${grouped} (${item.currency})`
}

export function rollupWedding(budget: readonly BudgetItem[], tasks: readonly Task[]): WeddingRollup {
  const itemIds = new Set(budget.map((item) => item.id))
  const categories: CategoryCard[] = budget.map((item) => {
    const name = item.category.trim() || 'Other'
    const linked = tasks.filter((task) => task.budgetCategoryId === item.id)
    const inr = item.currency === 'INR' ? [item] : []
    const budgetPaise = inr.reduce((sum, entry) => sum + toPaise(entry.estimated), 0n)
    const logged = inr.reduce((sum, entry) => sum + loggedPaise(entry), 0n)
    const taskActual = sumTaskPaise(linked, true)
    const committed = sumTaskPaise(linked, false)
    const note = foreignNote(item)
    return {
      key: item.id,
      name,
      itemIds: [item.id],
      primaryItemId: item.id,
      auto: linked.length > 0,
      budgetRupees: roundHalfUpRupees(budgetPaise),
      loggedPaise: logged,
      taskActualPaise: taskActual,
      actualPaise: logged + taskActual,
      committedPaise: committed,
      rows: taskRows(linked),
      foreignNotes: note ? [note] : [],
    }
  })
  categories.sort((left, right) => left.name.localeCompare(right.name))

  const loose = tasks.filter((task) => task.actualCost !== null && (task.budgetCategoryId == null || !itemIds.has(task.budgetCategoryId)))
  const uncategorised = loose.length === 0
    ? null
    : {
        key: 'uncategorised',
        name: 'Uncategorised',
        itemIds: [],
        primaryItemId: null,
        auto: true,
        budgetRupees: 0n,
        loggedPaise: 0n,
        taskActualPaise: sumTaskPaise(loose, true),
        actualPaise: sumTaskPaise(loose, true),
        committedPaise: sumTaskPaise(loose, false),
        rows: taskRows(loose),
        foreignNotes: [],
      }

  const budgetRupees = categories.reduce((sum, card) => sum + card.budgetRupees, 0n)
  const actualPaise = categories.reduce((sum, card) => sum + card.actualPaise, 0n) + (uncategorised?.actualPaise ?? 0n)
  const actualRupees = roundHalfUpRupees(actualPaise)
  const committedRupees = roundHalfUpRupees(
    categories.reduce((sum, card) => sum + card.committedPaise, 0n) + (uncategorised?.committedPaise ?? 0n),
  )
  return {
    budgetRupees,
    actualRupees,
    committedRupees,
    remainingRupees: budgetRupees - actualRupees,
    categories,
    uncategorised,
    foreignNotes: budget.map(foreignNote).filter((note): note is string => Boolean(note)),
  }
}

export function overCap(amount: number): boolean {
  return amount > MAX_BUDGET_AMOUNT
}
