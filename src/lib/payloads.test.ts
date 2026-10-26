import { describe, expect, it } from 'vitest'
import { budgetInsert, paymentInsert, taskInsert } from './payloads.ts'
import { mapBudgetItem, mapTask, one } from './mappers.ts'

describe('database payloads', () => {
  it('stores an empty due date as null and remembers the template title', () => {
    expect(taskInsert('wedding-1', {
      title: '  Saat Phere Setup ',
      description: 'Havan',
      category: 'Other',
      priority: 'High',
      ceremony: 'Wedding',
      status: 'Pending',
      dueDate: '',
      templateTitle: 'Saat Phere Setup',
    }, 4)).toEqual({
      wedding_id: 'wedding-1',
      title: 'Saat Phere Setup',
      description: 'Havan',
      category: 'Other',
      priority: 'High',
      ceremony: 'Wedding',
      status: 'Pending',
      due_date: null,
      template_title: 'Saat Phere Setup',
      sort_order: 4,
      function_id: null,
      position: 4,
      assigned_to: null,
    })
  })

  it('records which family pays', () => {
    expect(budgetInsert('wedding-1', {
      category: 'Venue',
      currency: 'INR',
      estimated: 10,
      actual: 0,
      paid: false,
      notes: 'Hall',
      paidBySide: 'groom',
      splits: [],
    }).paid_by_side).toBe('groom')
    expect(() => budgetInsert('wedding-1', {
      category: 'Venue',
      currency: 'INR',
      estimated: -1,
      actual: 0,
      paid: false,
      notes: '',
      paidBySide: 'bride',
      splits: [],
    })).toThrow(/negative/)
    expect(() => paymentInsert('item-1', {
      amount: 100000001,
      paidBy: 'Rahul',
      paidBySide: 'groom',
      date: '2026-03-01',
      notes: '',
    })).toThrow(/10 crore/)
    expect(paymentInsert('item-1', {
      amount: 500,
      paidBy: 'Rahul',
      paidBySide: 'groom',
      date: '2026-03-01',
      notes: 'Second installment',
    })).toMatchObject({ budget_item_id: 'item-1', paid_by_side: 'groom', paid_on: '2026-03-01' })
  })

  it('maps numeric database values back into the screen model', () => {
    const task = mapTask({
      id: 't1',
      title: 'Book Pandit Ji',
      description: '',
      category: 'Other',
      priority: 'High',
      status: 'Pending',
      due_date: null,
      template_title: 'Book Pandit Ji',
      sort_order: '2',
    })
    expect(task.dueDate).toBe('')
    expect(task.sortOrder).toBe(2)
    const item = mapBudgetItem({
      id: 'b1',
      category: 'Venue',
      currency: 'INR',
      estimated: '500000.00',
      actual: '0',
      paid: false,
      notes: '',
      paid_by_side: 'bride',
      budget_splits: [{ id: 's1', name: "Bride's Family", pct: '100.00', side: 'bride' }],
      part_payments: [],
    })
    expect(item.estimated).toBe(500000)
    expect(item.splits[0]?.pct).toBe(100)
    expect(one([{ id: 'only' }])?.id).toBe('only')
  })
})
