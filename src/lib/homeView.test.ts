import { describe, expect, it } from 'vitest'
import { priorityTasks, recentActivity, sideGuests } from './homeView.ts'

const tasks = [
  { id: 'low', title: 'Low bride', priority: 'Low', status: 'Pending', dueDate: '2026-01-01', side: 'bride' as const, assignedTo: null, updatedAt: '2026-11-01T00:00:00.000Z' },
  { id: 'soon', title: 'Soon bride', priority: 'High', status: 'Pending', dueDate: '2026-02-01', side: 'bride' as const, assignedTo: 'p', updatedAt: '2026-11-02T00:00:00.000Z', createdAt: '2026-10-01T00:00:00.000Z' },
  { id: 'later', title: 'Later bride', priority: 'High', status: 'Pending', dueDate: '2026-03-01', side: 'bride' as const, assignedTo: null, updatedAt: '2026-11-03T00:00:00.000Z' },
  { id: 'shared', title: 'Shared task', priority: 'Medium', status: 'Pending', dueDate: '2026-02-02', side: null, assignedTo: null, updatedAt: '2026-11-04T00:00:00.000Z', createdAt: '2026-10-02T00:00:00.000Z' },
  { id: 'groom', title: 'Groom only', priority: 'High', status: 'Pending', dueDate: '2026-01-01', side: 'groom' as const, assignedTo: null, updatedAt: '2026-11-05T00:00:00.000Z', createdAt: '2026-12-01T00:00:00.000Z' },
  { id: 'done', title: 'Finished', priority: 'High', status: 'Completed', dueDate: '2026-01-01', side: 'bride' as const, assignedTo: 'p', updatedAt: '2026-11-06T00:00:00.000Z' },
]

describe('parent home', () => {
  it('orders a parent’s priority tasks by rank and due date, without the other side', () => {
    expect(priorityTasks(tasks, 'family', 'bride').map((task) => task.id)).toEqual(['soon', 'later', 'shared', 'low'])
    expect(priorityTasks(tasks, 'friend', 'bride').map((task) => task.id)).toEqual(['soon', 'later', 'low'])
    expect(priorityTasks(tasks, 'planner', null).map((task) => task.id)).toContain('groom')
  })

  it('keeps recent activity on the viewer’s side and shared, newest first, with no amounts', () => {
    const activity = recentActivity({
      tasks,
      guests: [
        { id: 'gb', name: 'Bride Aunt', side: 'bride', createdAt: '2026-11-07T00:00:00.000Z' },
        { id: 'gg', name: 'Groom Uncle', side: 'groom', createdAt: '2026-11-08T00:00:00.000Z' },
        { id: 'gm', name: 'Shared Aunt', side: 'both', createdAt: '2026-11-03T12:00:00.000Z' },
      ],
      posts: [
        { id: 'post-g', body: 'Groom side note ₹500', createdAt: '2026-11-09T00:00:00.000Z', authorId: 'groom-parent' },
        { id: 'post-b', body: 'Bride side note', createdAt: '2026-11-04T12:00:00.000Z', authorId: 'bride-parent' },
      ],
      authors: [
        { userId: 'groom-parent', role: 'family', side: 'groom', displayName: 'Groom Parent' },
        { userId: 'bride-parent', role: 'family', side: 'bride', displayName: 'Bride Parent' },
      ],
      members: [{ userId: 'p', displayName: 'Parent', side: 'bride', role: 'family' }],
      role: 'family',
      viewerSide: 'bride',
    })
    expect(activity.map((item) => item.id)).toEqual([
      'guest-gb',
      'task-done-done',
      'post-post-b',
      'guest-gm',
      'task-added-later',
      'task-added-low',
      'task-added-shared',
      'task-added-soon',
    ])
    expect(activity.some((item) => item.text.includes('Groom'))).toBe(false)
    expect(activity.some((item) => item.text.includes('₹'))).toBe(false)
    const withCost = recentActivity({
      tasks: [{ id: 'cost', title: 'Book hall', priority: 'High', status: 'Pending', dueDate: '', side: 'bride', assignedTo: null, updatedAt: '2026-11-01T00:00:00.000Z', actualCost: 40000 }],
      guests: [],
      posts: [{ id: 'typed', body: 'Bring ₹500 exactly', createdAt: '2026-11-02T00:00:00.000Z', authorId: 'bride-parent' }],
      authors: [{ userId: 'bride-parent', role: 'family', side: 'bride', displayName: 'Bride Parent' }],
      members: [],
      role: 'friend',
      viewerSide: 'bride',
    })
    expect(withCost.find((item) => item.id === 'task-added-cost')?.text).toBe('Book hall added')
    expect(withCost.find((item) => item.id === 'post-typed')?.text).toBe('Bring ₹500 exactly')
    expect(withCost.find((item) => item.id === 'task-added-cost')?.text).not.toMatch(/₹|40000/)
    expect(activity[0]).toMatchObject({ who: 'Bride Aunt', text: 'Bride Aunt added' })
    expect(activity.find((item) => item.id === 'task-done-done')).toMatchObject({ who: 'Parent', text: 'Finished done' })
    expect(sideGuests([
      { id: 'gb', name: 'Bride Aunt', side: 'bride' },
      { id: 'gg', name: 'Groom Uncle', side: 'groom' },
      { id: 'gm', name: 'Shared Aunt', side: 'both' },
    ], 'family', 'bride').map((guest) => guest.id)).toEqual(['gb', 'gm'])
    expect(sideGuests([
      { id: 'gb', name: 'Bride Aunt', side: 'bride' },
      { id: 'gg', name: 'Groom Uncle', side: 'groom' },
      { id: 'gm', name: 'Shared Aunt', side: 'both' },
    ], 'friend', 'bride').map((guest) => guest.id)).toEqual(['gb', 'gm'])
  })
})