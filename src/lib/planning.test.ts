import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../data/content.ts'
import { HINDU_CHECKLIST } from '../data/hinduChecklist.ts'
import { CATEGORIES, PRIORITIES } from '../types.ts'
import {
  canAddSplit,
  inrBudgetTotals,
  missingTemplateTasks,
  percent,
  plannerLevel,
  familySettlement,
  guestHeadcount,
  splitsForPayer,
  settlementSummary,
  splitTotal,
  templateToDrafts,
  unlockedAchievementIds,
  validateAuth,
  validateWeddingSetup,
} from './planning.ts'
import { countdownDays, daysUntil, formatDate } from './format.ts'

describe('hindu checklist', () => {
  it('has a unique starter ritual for each title', () => {
    const titles = HINDU_CHECKLIST.map((item) => item.title)
    expect(new Set(titles).size).toBe(titles.length)
    expect(titles.length).toBeGreaterThanOrEqual(45)
    expect(new Set(HINDU_CHECKLIST.map((item) => item.ceremony)).size).toBe(8)
    expect(titles).toContain('Saat Phere Setup')
    expect(titles).toContain('Mehendi Ceremony Setup')
    expect(titles).toContain('Haldi Ceremony Prep')
    expect(titles).toContain('Baraat Vehicle (Ghodi/Car)')
    expect(titles).toContain('Bidaai Preparations')
  })

  it('only uses categories and priorities the app can edit', () => {
    for (const item of HINDU_CHECKLIST) {
      expect(CATEGORIES).toContain(item.category)
      expect(PRIORITIES).toContain(item.priority)
      expect(item.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('does not add a ritual again after the couple renames it', () => {
    const drafts = templateToDrafts(HINDU_CHECKLIST.slice(0, 2))
    const existing = [
      { title: 'Roka done our way', templateTitle: drafts[0]?.templateTitle ?? null },
    ]
    const missing = missingTemplateTasks(existing, HINDU_CHECKLIST.slice(0, 2))
    expect(missing.map((item) => item.title)).toEqual([HINDU_CHECKLIST[1]?.title])
  })
})

describe('budget splits', () => {
  it('assigns a family when one side is paying', () => {
    expect(splitsForPayer('bride')).toEqual([{ name: "Bride's Family", pct: 100, side: 'bride' }])
    expect(splitsForPayer('both').map((split) => split.pct)).toEqual([50, 50])
    expect(splitTotal(splitsForPayer('both'))).toBe(100)
  })

  it('rejects a split that would pass 100 percent', () => {
    const splits = [{ pct: 60 }]
    expect(canAddSplit(splits, 40)).toBe(true)
    expect(canAddSplit(splits, 41)).toBe(false)
    expect(canAddSplit(splits, 0)).toBe(false)
  })

  it('keeps the home budget in INR', () => {
    const totals = inrBudgetTotals([
      { currency: 'INR', estimated: 1000, actual: 400 },
      { currency: 'USD', estimated: 50, actual: 20 },
    ])
    expect(totals).toEqual({ estimated: 1000, actual: 400 })
    expect(percent(totals.actual, totals.estimated)).toBe(40)
  })
})

describe('family settlement and headcount', () => {
  it('says which family should settle when one side paid the other side share', () => {
    const settlement = familySettlement([
      {
        currency: 'INR',
        estimated: 1000,
        actual: 1000,
        paid: true,
        paidBySide: 'bride',
        splits: [{ id: 'split-1', name: "Groom's Family", pct: 100, side: 'groom' }],
        partPayments: [],
      },
    ])
    expect(settlement.groomShare).toBe(1000)
    expect(settlement.bridePaid).toBe(1000)
    expect(settlement.groomOwesBride).toBe(1000)
    expect(settlementSummary(settlement)).toMatch(/Groom's family owes/)
  })

  it('counts confirmed people with plus-ones on each side', () => {
    const counts = guestHeadcount([
      { status: 'Confirmed', plusOnes: 2, side: 'bride' },
      { status: 'Pending', plusOnes: 1, side: 'groom' },
      { status: 'Declined', plusOnes: 0, side: 'groom' },
    ])
    expect(counts.bride.confirmed).toBe(3)
    expect(counts.groom.pending).toBe(2)
    expect(counts.groom.declined).toBe(1)
    expect(counts.confirmedPeople).toBe(3)
  })
})

describe('dates and progress', () => {
  it('counts whole calendar days', () => {
    const today = new Date(2026, 9, 24, 18, 30)
    expect(daysUntil('2026-10-25', today)).toBe(1)
    expect(daysUntil('2026-10-24', today)).toBe(0)
    expect(countdownDays('2026-10-20', today)).toBe(0)
  })

  it('formats dates for India', () => {
    expect(formatDate('2026-06-20')).toMatch(/20/)
    expect(formatDate('2026-06-20')).toMatch(/2026/)
    expect(formatDate('2026-06-20')).toMatch(/June/)
  })

  it('raises the planner level every five completed tasks', () => {
    expect(plannerLevel(0)).toBe(1)
    expect(plannerLevel(5)).toBe(2)
    expect(unlockedAchievementIds({ completedTasks: 5, budgetCount: 1, guestCount: 5 })).toEqual([
      'first_task',
      'five_tasks',
      'budget_set',
      'guests_5',
    ])
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
  })
})

describe('validation', () => {
  it('asks for the couple, the date, and a side', () => {
    expect(validateWeddingSetup({ coupleNames: '', weddingDate: '', city: '', side: '', displayName: '' })).toMatch(/name/i)
    expect(validateWeddingSetup({ coupleNames: 'A & B', weddingDate: '2026-12-01', city: 'Pune', side: 'bride', displayName: 'Asha' })).toBeNull()
  })

  it('checks email and password length', () => {
    expect(validateAuth({ mode: 'sign-in', email: 'nope', password: '123', displayName: '' })).toMatch(/email/i)
    expect(validateAuth({ mode: 'sign-up', email: 'a@b.co', password: 'secret', displayName: '' })).toMatch(/name/i)
    expect(validateAuth({ mode: 'sign-in', email: 'a@b.co', password: 'secret', displayName: '' })).toBeNull()
  })
})
