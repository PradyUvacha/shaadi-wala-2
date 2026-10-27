import { describe, expect, it } from 'vitest'
import { MIGRATED_PAYMENT_NOTE } from '../config/budgetRules.ts'
import { DEMO_BUDGET } from '../data/demoData.ts'
import { createDemoBundle } from './bundle.ts'
import {
  chipRupees,
  displaySplit,
  formatInrGrouped,
  splitShareLabel,
  loggedPaise,
  percentOf,
  remainingLabel,
  rollupWedding,
  roundHalfUpRupees,
  toPaise,
  wholeRupeeProblem,
} from './rollup.ts'
import type { BudgetItem, Task } from '../types.ts'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'status'>): Task {
  return {
    title: partial.title ?? partial.id,
    description: '',
    category: 'Other',
    priority: 'Medium',
    ceremony: partial.ceremony ?? 'Wedding',
    dueDate: '',
    templateTitle: null,
    sortOrder: 1,
    functionId: null,
    position: 1,
    assignedTo: null,
    side: null,
    updatedAt: '',
    actualCost: partial.actualCost ?? null,
    budgetCategoryId: partial.budgetCategoryId ?? null,
    costUpdatedAt: '',
    ...partial,
  }
}

function item(partial: Partial<BudgetItem> & Pick<BudgetItem, 'id' | 'category'>): BudgetItem {
  return {
    currency: 'INR',
    estimated: 0,
    actual: 0,
    paid: false,
    notes: '',
    paidBySide: 'both',
    splits: [],
    partPayments: [],
    ...partial,
  }
}

describe('ledger display', () => {
  it('uses max(actual, payments) until the migrated note exists, then payments only', () => {
    const open = item({
      id: 'catering',
      category: 'Catering',
      actual: 380000,
      partPayments: [{ id: 'p', amount: 100000, paidBy: 'Family', paidBySide: 'bride', date: '2026-01-01', notes: '' }],
    })
    expect(loggedPaise(open)).toBe(38000000n)
    const migrated = {
      ...open,
      partPayments: [
        ...open.partPayments,
        { id: 'm', amount: 280000, paidBy: MIGRATED_PAYMENT_NOTE, paidBySide: '' as const, date: '2026-10-27', notes: MIGRATED_PAYMENT_NOTE },
      ],
    }
    expect(loggedPaise(migrated)).toBe(38000000n)
    const later = {
      ...migrated,
      partPayments: [
        ...migrated.partPayments,
        { id: 'n', amount: 1000, paidBy: 'Family', paidBySide: 'bride' as const, date: '2026-02-01', notes: '' },
      ],
    }
    expect(loggedPaise(later)).toBe(38100000n)
  })

  it('keeps the demo venue gap closed and opens catering, decor, invitations, and other', () => {
    const bundle = createDemoBundle({ side: 'bride', displayName: 'Guest' })
    const venue = bundle.budget.find((entry) => entry.category === 'Venue')
    const catering = bundle.budget.find((entry) => entry.category === 'Catering')
    expect(venue && loggedPaise(venue)).toBe(toPaise(450000))
    expect(catering && loggedPaise(catering)).toBe(toPaise(380000))
    expect(DEMO_BUDGET).toHaveLength(6)
  })
})

describe('task rollup', () => {
  const venue = item({ id: 'venue', category: 'Venue', estimated: 150000, actual: 0 })

  it('adds only done-task costs to actual and keeps pending as committed', () => {
    const rolled = rollupWedding(
      [venue],
      [
        task({ id: 'done', status: 'Completed', actualCost: 40000, budgetCategoryId: 'venue', ceremony: 'Wedding', title: 'Hall' }),
        task({ id: 'wait', status: 'Pending', actualCost: 10000, budgetCategoryId: 'venue', ceremony: 'Wedding', title: 'Lights' }),
        task({ id: 'blank', status: 'Completed', actualCost: null, budgetCategoryId: 'venue' }),
      ],
    )
    const card = rolled.categories.find((entry) => entry.name === 'Venue')
    expect(card?.auto).toBe(true)
    expect(card?.actualPaise).toBe(toPaise(40000))
    expect(card?.committedPaise).toBe(toPaise(10000))
    expect(rolled.committedRupees).toBe(10000n)
    expect(rolled.actualRupees).toBe(40000n)
    expect(rolled.remainingRupees).toBe(110000n)
    expect(card?.rows.map((row) => row.amount)).toEqual([40000, 10000, null])
  })

  it('puts a cost with no category on Uncategorised, not on a named card', () => {
    const rolled = rollupWedding(
      [venue],
      [task({ id: 'loose', status: 'Completed', actualCost: 500, budgetCategoryId: null, title: 'Tip' })],
    )
    expect(rolled.uncategorised?.actualPaise).toBe(toPaise(500))
    expect(rolled.categories[0]?.actualPaise).toBe(0n)
    expect(rolled.actualRupees).toBe(500n)
  })

  it('rounds 26.67% half-up to 27 and keeps 100 from turning red', () => {
    expect(percentOf(40000n, 150000n)).toEqual({ label: '27%', over: false, fill: 27 })
    expect(percentOf(150000n, 150000n).over).toBe(false)
    expect(percentOf(0n, 0n).label).toBe('0%')
    expect(percentOf(10n, 0n)).toEqual({ label: 'Over budget', over: true, fill: 100 })
    expect(percentOf(200n, 100n)).toMatchObject({ label: '200%', over: true, fill: 100 })
  })

  it('gives the odd rupee to the bride and words a negative remainder as over by', () => {
    expect(displaySplit(100001n)).toEqual({ bride: 50001n, groom: 50000n })
    expect(displaySplit(100n)).toEqual({ bride: 50n, groom: 50n })
    expect(remainingLabel(-25000n).text).toBe('Over by ₹25,000')
    expect(formatInrGrouped(40000n)).toBe('₹40,000')
  })

  it('labels each side of budget and actual, and dashes a blank budget', () => {
    expect(splitShareLabel(0n, 10000n)).toBe('Split 50/50 · Each side: Budget — · Actual ₹5,000')
    expect(splitShareLabel(150000n, 10000n)).toBe('Split 50/50 · Each side: Budget ₹75,000 · Actual ₹5,000')
    expect(splitShareLabel(100001n, 10001n)).toBe(
      'Split 50/50 · Bride: Budget ₹50,001 · Actual ₹5,001 · Groom: Budget ₹50,000 · Actual ₹5,000',
    )
    const rolled = rollupWedding(
      [item({ id: 'decor', category: 'Decor', estimated: 0, actual: 0 })],
      [task({ id: 'done', status: 'Completed', actualCost: 10000, budgetCategoryId: 'decor', title: 'Stage' })],
    )
    const card = rolled.categories[0]
    expect(card?.actualPaise).toBe(toPaise(10000))
    expect(card && splitShareLabel(card.budgetRupees, roundHalfUpRupees(card.actualPaise))).toBe(
      'Split 50/50 · Each side: Budget — · Actual ₹5,000',
    )
  })

  it('keeps paise exact in bigint sums past ₹10 crore and rounds half-up for display', () => {
    const huge = 100_000_000
    const card = item({ id: 'a', category: 'Venue', estimated: huge, actual: huge })
    const extra = item({ id: 'b', category: 'Catering', estimated: 1, actual: 1 })
    const rolled = rollupWedding([card, extra], [])
    expect(rolled.budgetRupees).toBe(100_000_001n)
    expect(roundHalfUpRupees(toPaise(1234.5))).toBe(1235n)
    expect(roundHalfUpRupees(toPaise(1234.49))).toBe(1234n)
    expect(chipRupees(0)).toBeNull()
    expect(chipRupees(0.49)).toBeNull()
    expect(chipRupees(40)).toBe(40n)
    expect(chipRupees(null)).toBeNull()
  })

  it('rejects grouped, decimal, and scientific rupee input', () => {
    expect(wholeRupeeProblem('')).toBe('Enter whole rupees, digits only.')
    expect(wholeRupeeProblem('', true)).toBeNull()
    for (const sample of ['1,000', '₹1000', '10.5', ' 10', '-1', '1e5']) {
      expect(wholeRupeeProblem(sample)).toBe('Enter whole rupees, digits only.')
    }
    expect(wholeRupeeProblem('100000001')).toMatch(/10 crore/)
    expect(wholeRupeeProblem('40000')).toBeNull()
  })
})
