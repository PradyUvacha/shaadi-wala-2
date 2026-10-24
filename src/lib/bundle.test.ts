import { describe, expect, it } from 'vitest'
import { DEMO_BUDGET, DEMO_GUESTS, DEMO_MILESTONES, DEMO_TASKS } from '../data/demoData.ts'
import { HINDU_CHECKLIST } from '../data/hinduChecklist.ts'
import { addPayment, createDemoBundle, createWeddingBundle, removeTask, saveTaskDraft } from './bundle.ts'
import { missingTemplateTasks, templateToDrafts } from './planning.ts'

describe('wedding bundle', () => {
  it('keeps a sample wedding after a reload of the saved snapshot', () => {
    const created = createDemoBundle({ side: 'groom', displayName: 'Rahul' })
    const restored = JSON.parse(JSON.stringify(created)) as typeof created
    expect(restored.displayName).toBe('Rahul')
    expect(restored.membership.side).toBe('groom')
    expect(restored.wedding.coupleNames).toBe('Priya & Rahul')
    expect(restored.tasks).toHaveLength(DEMO_TASKS.length)
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
})
