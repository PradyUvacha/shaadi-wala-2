import { describe, expect, it } from 'vitest'
import { DEMO_BUDGET, DEMO_GUESTS, DEMO_MILESTONES, DEMO_TASKS } from '../data/demoData.ts'
import { HINDU_CHECKLIST } from '../data/hinduChecklist.ts'
import { shiftDemoDate } from '../data/demoData.ts'
import { formatInrCompact } from './format.ts'
import { addPayment, createDemoBundle, createWeddingBundle, moveFunctionDraft, removeFunction, removeTask, renameFunction, saveBudgetDraft, saveTaskDraft } from './bundle.ts'
import { budgetHeadline, inrBudgetTotals, missingTemplateTasks, templateToDrafts } from './planning.ts'

describe('wedding bundle', () => {
  it('keeps a sample wedding after a reload of the saved snapshot', () => {
    const created = createDemoBundle({ side: 'groom', displayName: 'Rahul' })
    const restored = JSON.parse(JSON.stringify(created)) as typeof created
    expect(restored.displayName).toBe('Rahul')
    expect(restored.membership.side).toBe('groom')
    expect(restored.wedding.coupleNames).toBe('Priya & Rahul')
    expect(restored.tasks).toHaveLength(DEMO_TASKS.length)
    expect(restored.wedding.community).toBe('hindu')
    expect([...restored.functions].sort((a, b) => a.position - b.position).map((fn) => fn.name)).toEqual(['Wedding', 'Mehendi', 'Sangeet'])
    expect(restored.tasks.every((task) => task.functionId)).toBe(true)
    expect(restored.budget).toHaveLength(DEMO_BUDGET.length)
    expect(restored.guests).toHaveLength(DEMO_GUESTS.length)
    expect(restored.milestones).toHaveLength(DEMO_MILESTONES.length)
    expect(restored.budget[0]?.splits[0]?.name).toBe("Bride's Family")
    expect(restored.budget[0]?.partPayments).toHaveLength(2)
  })

  it('customises the checklist without bringing a renamed ritual back', () => {
    let bundle = createWeddingBundle({
      coupleNames: 'A & B',
      weddingDate: '2027-01-02',
      side: 'bride',
      displayName: 'Asha',
      tasks: templateToDrafts(HINDU_CHECKLIST),
    })
    const roka = bundle.tasks.find((task) => task.templateTitle === 'Roka Ceremony')
    expect(roka).toBeTruthy()
    bundle = saveTaskDraft(bundle, { ...roka!, title: 'Our roka lunch', description: 'At home' }, roka!.id)
    bundle = removeTask(bundle, bundle.tasks.find((task) => task.title === 'Return Gifts')!.id)
    const missing = missingTemplateTasks(bundle.tasks, HINDU_CHECKLIST)
    expect(missing.map((item) => item.title)).toEqual(['Return Gifts'])
    expect(bundle.tasks.find((task) => task.templateTitle === 'Roka Ceremony')?.title).toBe('Our roka lunch')
  })

  it('adds a part-payment onto the actual amount', () => {
    const bundle = createWeddingBundle({
      coupleNames: 'A & B',
      weddingDate: '2027-01-02',
      side: 'bride',
      displayName: 'Asha',
      budget: [{ category: 'Venue', currency: 'INR', estimated: 1000, actual: 100, paid: false, notes: '', paidBySide: 'bride', splits: [], partPayments: [] }],
    })
    const item = bundle.budget[0]!
    const next = addPayment(bundle, item.id, { amount: 250, paidBy: 'Asha', paidBySide: 'bride', date: '2026-10-24', notes: 'Advance' })
    expect(next.budget[0]?.actual).toBe(350)
    expect(next.budget[0]?.partPayments[0]?.paidBy).toBe('Asha')
  })

  it('places the sample wedding 180 days ahead and rejects a negative amount', () => {
    const today = new Date(2026, 9, 26)
    const created = createDemoBundle({ side: 'bride', displayName: 'Asha' }, today)
    expect(created.wedding.weddingDate).toBe('2027-04-24')
    expect(created.milestones.find((milestone) => milestone.name === 'Wedding Day')?.date).toBe('2027-04-24')
    expect(created.milestones.find((milestone) => milestone.name === 'Sangeet Night')?.date).toBe('2027-04-22')
    expect(shiftDemoDate('2026-06-18', '2027-04-24')).toBe('2027-04-22')
    expect(created.tasks.find((task) => task.title === 'Baraat Vehicle')?.dueDate).toBe('2027-04-24')
    expect(created.tasks.find((task) => task.title === 'Sangeet Arrangements')?.dueDate).not.toBe('2026-06-08')
    const totals = inrBudgetTotals(created.budget)
    expect(budgetHeadline(created.budget, 'All')).toEqual({ currency: 'INR', estimated: totals.estimated, actual: totals.actual })
    expect(created.budget.some((item) => item.currency === 'USD')).toBe(true)
    expect(totals).toEqual({ estimated: 1155000, actual: 1102000 })
    expect(formatInrCompact(totals.actual)).toBe('₹11.02 lakh')
    expect(formatInrCompact(totals.estimated)).toBe('₹11.55 lakh')
    const mehendi = created.functions.find((fn) => fn.name === 'Mehendi')
    expect(mehendi).toBeTruthy()
    let renamed = renameFunction(created, mehendi!.id, 'Mehendi night')
    expect(renamed.tasks.find((task) => task.title === 'Mehendi Ceremony Setup')?.ceremony).toBe('Mehendi night')
    renamed = moveFunctionDraft(renamed, mehendi!.id, -1)
    expect([...renamed.functions].sort((a, b) => a.position - b.position)[0]?.name).toBe('Mehendi night')
    const removed = removeFunction(renamed, mehendi!.id)
    expect(removed.functions.some((fn) => fn.id === mehendi!.id)).toBe(false)
    expect(removed.tasks.some((task) => task.title === 'Mehendi Ceremony Setup')).toBe(false)
    const weddingFn = created.functions.find((fn) => fn.name === 'Wedding')
    const venue = created.tasks.find((task) => task.title === 'Book Wedding Venue')
    expect(weddingFn && venue).toBeTruthy()
    expect(() => saveTaskDraft(created, { ...venue!, title: 'book wedding venue', functionId: weddingFn!.id, ceremony: 'Wedding' })).toThrow(
      /already has a ritual with that name/,
    )
    const renamedTitle = saveTaskDraft(created, { ...venue!, title: '  Book Wedding Venue  ' }, venue!.id)
    expect(renamedTitle.tasks.find((task) => task.id === venue!.id)?.title).toBe('Book Wedding Venue')
    const mehendiFn = created.functions.find((fn) => fn.name === 'Mehendi')
    const copied = saveTaskDraft(created, { ...venue!, title: 'Book Wedding Venue', functionId: mehendiFn!.id, ceremony: 'Mehendi' })
    expect(copied.tasks.filter((task) => task.title === 'Book Wedding Venue')).toHaveLength(2)
    expect(() => saveBudgetDraft(created, {
      category: 'Attire',
      currency: 'INR',
      estimated: -50,
      actual: 0,
      paid: false,
      notes: '',
      paidBySide: 'bride',
      splits: [],
    })).toThrow(/negative/)
    expect(() => addPayment(created, created.budget[0]!.id, {
      amount: -1,
      paidBy: 'Asha',
      paidBySide: 'bride',
      date: '2026-10-26',
      notes: '',
    })).toThrow(/negative/)
  })
})
