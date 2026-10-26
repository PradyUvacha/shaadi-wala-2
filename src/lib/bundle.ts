import { DEMO_BUDGET, DEMO_CITY, DEMO_COUPLE_NAMES, DEMO_GUESTS, DEMO_MILESTONES, DEMO_TASKS, DEMO_WEDDING_DATE } from '../data/demoData.ts'
import type {
  BudgetDraft,
  BudgetItem,
  Guest,
  GuestDraft,
  Milestone,
  MilestoneDraft,
  PartPayment,
  PartPaymentDraft,
  Side,
  Split,
  SplitDraft,
  Task,
  TaskDraft,
  WeddingBundle,
  WeddingSettings,
} from '../types.ts'

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

function blankBundle(input: {
  coupleNames: string
  weddingDate: string
  city?: string
  side: Side
  displayName: string
}): WeddingBundle {
  const displayName = input.displayName.trim() || 'there'
  return {
    wedding: {
      id: uid(),
      coupleNames: input.coupleNames.trim(),
      weddingDate: input.weddingDate,
      city: input.city?.trim() ?? '',
    },
    membership: {
      id: uid(),
      role: 'owner',
      side: input.side,
      displayName,
    },
    displayName,
    tasks: [],
    budget: [],
    guests: [],
    milestones: [],
  }
}

export function createWeddingBundle(input: {
  coupleNames: string
  weddingDate: string
  city?: string
  side: Side
  displayName: string
  tasks?: TaskDraft[]
  budget?: BudgetDraft[]
  guests?: GuestDraft[]
  milestones?: MilestoneDraft[]
}): WeddingBundle {
  let bundle = blankBundle(input)
  for (const task of input.tasks ?? []) bundle = saveTaskDraft(bundle, task)
  for (const item of input.budget ?? []) bundle = saveBudgetDraft(bundle, item)
  for (const guest of input.guests ?? []) bundle = saveGuestDraft(bundle, guest)
  for (const milestone of input.milestones ?? []) bundle = saveMilestoneDraft(bundle, milestone)
  return bundle
}

export function createDemoBundle(input: { side: Side; displayName: string }): WeddingBundle {
  return createWeddingBundle({
    coupleNames: DEMO_COUPLE_NAMES,
    weddingDate: DEMO_WEDDING_DATE,
    city: DEMO_CITY,
    side: input.side,
    displayName: input.displayName,
    tasks: DEMO_TASKS,
    budget: DEMO_BUDGET,
    guests: DEMO_GUESTS,
    milestones: DEMO_MILESTONES,
  })
}

export function saveTaskDraft(bundle: WeddingBundle, draft: TaskDraft, id?: string): WeddingBundle {
  if (id) {
    const current = bundle.tasks.find((task) => task.id === id)
    if (!current) return bundle
    const next: Task = {
      ...current,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      priority: draft.priority,
      ceremony: draft.ceremony,
      status: draft.status,
      dueDate: draft.dueDate,
    }
    return { ...bundle, tasks: bundle.tasks.map((task) => (task.id === id ? next : task)) }
  }
  const sortOrder = bundle.tasks.reduce((max, task) => Math.max(max, task.sortOrder), 0) + 1
  const task: Task = {
    id: uid(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    ceremony: draft.ceremony,
    status: draft.status,
    dueDate: draft.dueDate,
    templateTitle: draft.templateTitle ?? null,
    sortOrder,
  }
  return { ...bundle, tasks: [...bundle.tasks, task] }
}

export function replaceTasks(bundle: WeddingBundle, tasks: Task[]): WeddingBundle {
  return { ...bundle, tasks: [...tasks].sort((a, b) => a.sortOrder - b.sortOrder) }
}

export function withTask(bundle: WeddingBundle, task: Task): WeddingBundle {
  const exists = bundle.tasks.some((item) => item.id === task.id)
  const tasks = exists ? bundle.tasks.map((item) => (item.id === task.id ? task : item)) : [...bundle.tasks, task]
  return replaceTasks(bundle, tasks)
}

export function withGuest(bundle: WeddingBundle, guest: Guest): WeddingBundle {
  const exists = bundle.guests.some((item) => item.id === guest.id)
  return {
    ...bundle,
    guests: exists ? bundle.guests.map((item) => (item.id === guest.id ? guest : item)) : [...bundle.guests, guest],
  }
}

export function withMilestone(bundle: WeddingBundle, milestone: Milestone): WeddingBundle {
  const exists = bundle.milestones.some((item) => item.id === milestone.id)
  return {
    ...bundle,
    milestones: exists
      ? bundle.milestones.map((item) => (item.id === milestone.id ? milestone : item))
      : [...bundle.milestones, milestone],
  }
}

export function removeTask(bundle: WeddingBundle, id: string): WeddingBundle {
  return { ...bundle, tasks: bundle.tasks.filter((task) => task.id !== id) }
}

export function saveBudgetDraft(bundle: WeddingBundle, draft: BudgetDraft, id?: string): WeddingBundle {
  const splits = draft.splits.map(splitFromDraft)
  if (id) {
    const current = bundle.budget.find((item) => item.id === id)
    if (!current) return bundle
    const next: BudgetItem = {
      ...current,
      category: draft.category,
      currency: draft.currency,
      estimated: Number(draft.estimated || 0),
      actual: Number(draft.actual || 0),
      paid: draft.paid,
      notes: draft.notes.trim(),
      paidBySide: draft.paidBySide,
      splits,
    }
    return { ...bundle, budget: bundle.budget.map((item) => (item.id === id ? next : item)) }
  }
  const item: BudgetItem = {
    id: uid(),
    category: draft.category,
    currency: draft.currency,
    estimated: Number(draft.estimated || 0),
    actual: Number(draft.actual || 0),
    paid: draft.paid,
    notes: draft.notes.trim(),
    paidBySide: draft.paidBySide,
    splits,
    partPayments: (draft.partPayments ?? []).map(paymentFromDraft),
  }
  return { ...bundle, budget: [...bundle.budget, item] }
}

export function removeBudgetItem(bundle: WeddingBundle, id: string): WeddingBundle {
  return { ...bundle, budget: bundle.budget.filter((item) => item.id !== id) }
}

export function addPayment(bundle: WeddingBundle, budgetItemId: string, draft: PartPaymentDraft): WeddingBundle {
  return {
    ...bundle,
    budget: bundle.budget.map((item) => {
      if (item.id !== budgetItemId) return item
      const payment = paymentFromDraft(draft)
      return {
        ...item,
        actual: Number(item.actual || 0) + payment.amount,
        partPayments: [...item.partPayments, payment],
      }
    }),
  }
}

export function replaceBudgetItem(bundle: WeddingBundle, item: BudgetItem): WeddingBundle {
  const exists = bundle.budget.some((current) => current.id === item.id)
  return {
    ...bundle,
    budget: exists ? bundle.budget.map((current) => (current.id === item.id ? item : current)) : [...bundle.budget, item],
  }
}

export function saveGuestDraft(bundle: WeddingBundle, draft: GuestDraft, id?: string): WeddingBundle {
  if (id) {
    const current = bundle.guests.find((guest) => guest.id === id)
    if (!current) return bundle
    const next: Guest = { ...current, ...normalizeGuest(draft), id }
    return { ...bundle, guests: bundle.guests.map((guest) => (guest.id === id ? next : guest)) }
  }
  return { ...bundle, guests: [...bundle.guests, { ...normalizeGuest(draft), id: uid() }] }
}

export function removeGuest(bundle: WeddingBundle, id: string): WeddingBundle {
  return { ...bundle, guests: bundle.guests.filter((guest) => guest.id !== id) }
}

export function saveMilestoneDraft(bundle: WeddingBundle, draft: MilestoneDraft, id?: string): WeddingBundle {
  if (id) {
    const current = bundle.milestones.find((milestone) => milestone.id === id)
    if (!current) return bundle
    const next: Milestone = { ...current, ...normalizeMilestone(draft), id }
    return { ...bundle, milestones: bundle.milestones.map((milestone) => (milestone.id === id ? next : milestone)) }
  }
  return { ...bundle, milestones: [...bundle.milestones, { ...normalizeMilestone(draft), id: uid() }] }
}

export function removeMilestone(bundle: WeddingBundle, id: string): WeddingBundle {
  return { ...bundle, milestones: bundle.milestones.filter((milestone) => milestone.id !== id) }
}

export function updateBundleSettings(bundle: WeddingBundle, settings: WeddingSettings): WeddingBundle {
  const displayName = settings.displayName.trim() || bundle.displayName
  return {
    ...bundle,
    displayName,
    wedding: {
      ...bundle.wedding,
      coupleNames: settings.coupleNames.trim(),
      weddingDate: settings.weddingDate,
      city: settings.city.trim(),
    },
    membership: {
      ...bundle.membership,
      side: settings.side,
      displayName,
    },
  }
}

function splitFromDraft(draft: SplitDraft): Split {
  return { id: uid(), name: draft.name.trim(), pct: Number(draft.pct || 0), side: draft.side }
}

export function paymentFromDraft(draft: PartPaymentDraft): PartPayment {
  return {
    id: uid(),
    amount: Number(draft.amount || 0),
    paidBy: draft.paidBy.trim(),
    paidBySide: draft.paidBySide,
    date: draft.date,
    notes: draft.notes.trim(),
  }
}

function normalizeGuest(draft: GuestDraft): GuestDraft {
  return {
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    status: draft.status,
    meal: draft.meal,
    plusOnes: Math.max(0, Number(draft.plusOnes || 0)),
    side: draft.side,
  }
}

function normalizeMilestone(draft: MilestoneDraft): MilestoneDraft {
  return {
    name: draft.name.trim(),
    date: draft.date,
    status: draft.status,
    description: draft.description.trim(),
  }
}
