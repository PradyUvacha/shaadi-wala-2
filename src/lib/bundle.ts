import { DEFAULT_BUDGET_CATEGORIES } from '../config/budgetRules.ts'
import { asFunctionPhase, defaultPhaseForFunction, type FunctionPhase } from '../config/phases.ts'
import { DEMO_CITY, DEMO_COUPLE_NAMES, DEMO_GUESTS, demoWeddingDate, placeDemoContent } from '../data/demoData.ts'
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
  WeddingFunction,
  WeddingMember,
  WeddingSettings,
} from '../types.ts'
import { DUPLICATE_FUNCTION_MESSAGE, DUPLICATE_RITUAL_MESSAGE, duplicateRitualName, moveByPosition } from './checklist.ts'
import { moneyAmountError, splitsForSave, validateBudgetAmounts } from './planning.ts'

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
  const membershipId = uid()
  const role = input.side === 'groom' ? 'groom' : 'bride'
  const self: WeddingMember = {
    id: membershipId,
    userId: membershipId,
    role,
    side: input.side,
    displayName,
  }
  return {
    wedding: {
      id: uid(),
      coupleNames: input.coupleNames.trim(),
      weddingDate: input.weddingDate,
      city: input.city?.trim() ?? '',
      community: 'hindu',
    },
    membership: {
      id: membershipId,
      role,
      side: input.side,
      displayName,
    },
    displayName,
    members: [self],
    functions: [],
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
  const budget = input.budget ?? []
  for (const item of budget) bundle = saveBudgetDraft(bundle, item)
  if (input.budget == null || input.budget.length === 0) {
    for (const category of DEFAULT_BUDGET_CATEGORIES) {
      bundle = saveBudgetDraft(bundle, {
        category,
        currency: 'INR',
        estimated: 0,
        actual: 0,
        paid: false,
        notes: '',
        paidBySide: 'both',
        splits: [
          { name: "Bride's Family", pct: 50, side: 'bride' },
          { name: "Groom's Family", pct: 50, side: 'groom' },
        ],
      })
    }
  }
  for (const guest of input.guests ?? []) bundle = saveGuestDraft(bundle, guest)
  for (const milestone of input.milestones ?? []) bundle = saveMilestoneDraft(bundle, milestone)
  return bundle
}

export function createDemoBundle(input: { side: Side; displayName: string }, today = new Date()): WeddingBundle {
  const weddingDate = demoWeddingDate(today)
  const demo = placeDemoContent(weddingDate)
  const bundle = createWeddingBundle({
    coupleNames: DEMO_COUPLE_NAMES,
    weddingDate,
    city: DEMO_CITY,
    side: input.side,
    displayName: input.displayName,
    tasks: demo.tasks,
    budget: demo.budget,
    guests: DEMO_GUESTS,
    milestones: demo.milestones,
  })
  const otherSide: Side = input.side === 'bride' ? 'groom' : 'bride'
  return {
    ...bundle,
    members: [
      ...bundle.members,
      { id: uid(), userId: uid(), role: 'family', side: input.side, displayName: 'Meera Sharma' },
      { id: uid(), userId: uid(), role: 'family', side: otherSide, displayName: 'Anil Patil' },
    ],
  }
}

function sameFunctionName(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function ensureFunction(bundle: WeddingBundle, name: string): { bundle: WeddingBundle; fn: WeddingFunction } {
  const trimmed = name.trim() || 'Wedding'
  const existing = bundle.functions.find((fn) => sameFunctionName(fn.name, trimmed))
  if (existing) return { bundle, fn: existing }
  const position = bundle.functions.reduce((max, fn) => Math.max(max, fn.position), 0) + 1
  const fn: WeddingFunction = { id: uid(), name: trimmed, position, phase: defaultPhaseForFunction(trimmed), updatedAt: '' }
  return { bundle: { ...bundle, functions: [...bundle.functions, fn] }, fn }
}

function nextTaskPosition(bundle: WeddingBundle, functionId: string): number {
  return bundle.tasks
    .filter((task) => task.functionId === functionId)
    .reduce((max, task) => Math.max(max, task.position), 0) + 1
}

export function addFunction(bundle: WeddingBundle, name: string, phase?: FunctionPhase | null): WeddingBundle {
  const trimmed = name.trim()
  if (!trimmed) return bundle
  if (bundle.functions.some((fn) => sameFunctionName(fn.name, trimmed))) {
    throw new Error(DUPLICATE_FUNCTION_MESSAGE)
  }
  const next = ensureFunction(bundle, trimmed)
  if (phase === undefined) return next.bundle
  return {
    ...next.bundle,
    functions: next.bundle.functions.map((fn) => (fn.id === next.fn.id ? { ...fn, phase } : fn)),
  }
}

export function renameFunction(bundle: WeddingBundle, id: string, name: string, phase?: FunctionPhase | null): WeddingBundle {
  const trimmed = name.trim()
  const current = bundle.functions.find((fn) => fn.id === id)
  if (!trimmed || !current) return bundle
  const nextPhase = phase === undefined ? current.phase : phase
  if (current.name === trimmed && current.phase === nextPhase) return bundle
  if (bundle.functions.some((fn) => fn.id !== id && sameFunctionName(fn.name, trimmed))) {
    throw new Error(DUPLICATE_FUNCTION_MESSAGE)
  }
  return {
    ...bundle,
    functions: bundle.functions.map((fn) => (fn.id === id ? { ...fn, name: trimmed, phase: nextPhase } : fn)),
    tasks: bundle.tasks.map((task) =>
      task.functionId === id || (task.functionId == null && task.ceremony === current.name)
        ? { ...task, ceremony: trimmed, functionId: task.functionId ?? id }
        : task,
    ),
  }
}

export function removeMemberFromBundle(bundle: WeddingBundle, memberId: string): WeddingBundle {
  const member = bundle.members.find((item) => item.id === memberId)
  if (!member || member.id === bundle.membership.id) return bundle
  return {
    ...bundle,
    members: bundle.members.filter((item) => item.id !== memberId),
    tasks: bundle.tasks.map((task) => (
      task.assignedTo === member.userId
        ? { ...task, assignedTo: null, side: member.side === 'bride' || member.side === 'groom' ? member.side : task.side }
        : task
    )),
  }
}

export function removeFunction(bundle: WeddingBundle, id: string): WeddingBundle {
  const current = bundle.functions.find((fn) => fn.id === id)
  if (!current) return bundle
  return {
    ...bundle,
    functions: bundle.functions.filter((fn) => fn.id !== id),
    tasks: bundle.tasks.filter((task) => task.functionId !== id && !(task.functionId == null && task.ceremony === current.name)),
  }
}

export function moveFunctionDraft(bundle: WeddingBundle, id: string, direction: -1 | 1): WeddingBundle {
  const functions = moveByPosition(bundle.functions, id, direction)
  if (functions === bundle.functions) return bundle
  return { ...bundle, functions }
}

export function moveTaskDraft(bundle: WeddingBundle, id: string, direction: -1 | 1): WeddingBundle {
  const task = bundle.tasks.find((item) => item.id === id)
  if (!task) return bundle
  const siblings = bundle.tasks.filter((item) => item.functionId === task.functionId)
  const moved = moveByPosition(siblings, id, direction)
  if (moved === siblings) return bundle
  const byId = new Map(moved.map((item) => [item.id, item]))
  return { ...bundle, tasks: bundle.tasks.map((item) => byId.get(item.id) ?? item) }
}

export function saveTaskDraft(bundle: WeddingBundle, draft: TaskDraft, id?: string): WeddingBundle {
  const named = draft.functionId ? bundle.functions.find((fn) => fn.id === draft.functionId) : undefined
  const ensured = named ? { bundle, fn: named } : ensureFunction(bundle, draft.ceremony)
  const fn = ensured.fn
  const base = ensured.bundle
  if (duplicateRitualName(base.tasks, { functionId: fn.id, title: draft.title, exceptId: id })) {
    throw new Error(DUPLICATE_RITUAL_MESSAGE)
  }
  if (id) {
    const current = base.tasks.find((task) => task.id === id)
    if (!current) return base
    const moved = current.functionId !== fn.id
    const next: Task = {
      ...current,
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      priority: draft.priority,
      ceremony: fn.name,
      status: draft.status,
      dueDate: draft.dueDate,
      functionId: fn.id,
      position: moved ? nextTaskPosition(base, fn.id) : (draft.position ?? current.position),
      assignedTo: draft.assignedTo === undefined ? current.assignedTo : (draft.assignedTo || null),
      side: current.side ?? null,
      updatedAt: current.updatedAt,
      actualCost: draft.actualCost === undefined ? (current.actualCost ?? null) : draft.actualCost,
      budgetCategoryId: draft.budgetCategoryId === undefined ? (current.budgetCategoryId ?? null) : draft.budgetCategoryId,
      costUpdatedAt: current.costUpdatedAt ?? '',
    }
    return { ...base, tasks: base.tasks.map((task) => (task.id === id ? next : task)) }
  }
  const sortOrder = base.tasks.reduce((max, task) => Math.max(max, task.sortOrder), 0) + 1
  const task: Task = {
    id: uid(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    priority: draft.priority,
    ceremony: fn.name,
    status: draft.status,
    dueDate: draft.dueDate,
    templateTitle: draft.templateTitle ?? null,
    sortOrder,
    functionId: fn.id,
    position: draft.position ?? nextTaskPosition(base, fn.id),
    assignedTo: draft.assignedTo || null,
    side: null,
    updatedAt: '',
    actualCost: draft.actualCost ?? null,
    budgetCategoryId: draft.budgetCategoryId ?? null,
    costUpdatedAt: '',
  }
  return { ...base, tasks: [...base.tasks, task] }
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
  const invalid = validateBudgetAmounts(draft.estimated, draft.actual)
  if (invalid) throw new Error(invalid)
  const splits = splitsForSave(draft).map(splitFromDraft)
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
  const invalid = moneyAmountError(Number(draft.amount), 'Payment', false)
  if (invalid) throw new Error(invalid)
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

export function normalizeBundle(bundle: WeddingBundle): WeddingBundle {
  const community = bundle.wedding.community?.trim() || 'hindu'
  const tasks = (bundle.tasks ?? []).map((task) => ({
    ...task,
    ceremony: task.ceremony || 'Wedding',
    functionId: task.functionId ?? null,
    position: Number.isFinite(task.position) ? task.position : task.sortOrder,
    assignedTo: task.assignedTo ?? null,
    side: task.side === 'bride' || task.side === 'groom' ? task.side : null,
    updatedAt: task.updatedAt ?? '',
    actualCost: task.actualCost ?? null,
    budgetCategoryId: task.budgetCategoryId ?? null,
    costUpdatedAt: task.costUpdatedAt ?? '',
  }))
  let functions = Array.isArray(bundle.functions)
    ? bundle.functions.map((fn) => ({
        ...fn,
        phase: fn.phase === undefined ? defaultPhaseForFunction(fn.name) : asFunctionPhase(fn.phase),
        updatedAt: fn.updatedAt ?? '',
      }))
    : []
  if (functions.length === 0 && tasks.length > 0) {
    const names: string[] = []
    for (const task of [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))) {
      if (!names.includes(task.ceremony)) names.push(task.ceremony)
    }
    functions = names.map((name, index) => ({ id: `function-${index + 1}`, name, position: index + 1, phase: defaultPhaseForFunction(name), updatedAt: '' }))
  }
  const byName = new Map(functions.map((fn) => [fn.name, fn.id]))
  for (const task of tasks) {
    if (!task.functionId) task.functionId = byName.get(task.ceremony) ?? null
  }
  const members = Array.isArray(bundle.members) && bundle.members.length > 0
    ? bundle.members
    : [{
        id: bundle.membership.id,
        userId: bundle.membership.id,
        role: bundle.membership.role,
        side: bundle.membership.side,
        displayName: bundle.membership.displayName,
      }]
  const guests = (bundle.guests ?? []).map((guest) => ({
    ...guest,
    functionIds: Array.isArray(guest.functionIds) ? guest.functionIds : [],
  }))
  return { ...bundle, wedding: { ...bundle.wedding, community }, members, functions, tasks, guests }
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
    members: (bundle.members ?? []).map((member) =>
      member.id === bundle.membership.id ? { ...member, side: settings.side, displayName } : member,
    ),
  }
}

function splitFromDraft(draft: SplitDraft): Split {
  return { id: uid(), name: draft.name.trim(), pct: Number(draft.pct || 0), side: draft.side }
}

export function paymentFromDraft(draft: PartPaymentDraft): PartPayment {
  const invalid = moneyAmountError(Number(draft.amount), 'Payment', false)
  if (invalid) throw new Error(invalid)
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
    functionIds: [...new Set((draft.functionIds ?? []).filter(Boolean))],
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
