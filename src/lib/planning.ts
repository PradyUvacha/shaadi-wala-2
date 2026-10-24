import type { AchievementType } from '../data/content.ts'
import { ACHIEVEMENTS } from '../data/content.ts'
import type { Payer, SplitDraft, Task, TemplateTask } from '../types.ts'

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
    status: 'Pending' as const,
    dueDate: '',
    templateTitle: item.title,
  }))
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
  side: string
  displayName: string
}): string | null {
  if (!input.displayName.trim()) return 'Add your name.'
  if (!input.coupleNames.trim()) return "Add the couple's names."
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weddingDate)) return 'Choose the wedding date.'
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
