import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { WeddingBundle } from '../types.ts'
import {
  acceptsChecklistChange,
  applyChecklistChange,
  checklistChannelFilters,
  communityLabel,
  moveByPosition,
  subscribeTaskPings,
  subscribeWeddingChecklist,
  taskPingPayload,
  TASK_PING_EVENT,
} from './checklist.ts'
import { myTasks } from './access.ts'

describe('checklist order', () => {
  const items = [
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
    { id: 'c', position: 3 },
  ]

  it('moves a row up and rewrites positions', () => {
    const moved = moveByPosition(items, 'b', -1)
    expect(moved.map((item) => item.id)).toEqual(['b', 'a', 'c'])
    expect(moved.map((item) => item.position)).toEqual([1, 2, 3])
  })

  it('leaves the row in place at the end of the list', () => {
    expect(moveByPosition(items, 'a', -1)).toBe(items)
    expect(moveByPosition(items, 'c', 1)).toBe(items)
  })

  it('still swaps rows that share a position', () => {
    const tied = [
      { id: 'a', position: 1 },
      { id: 'b', position: 1 },
    ]
    expect(moveByPosition(tied, 'b', -1).map((item) => item.id)).toEqual(['b', 'a'])
  })

  it('labels the stored community without a picker', () => {
    expect(communityLabel('hindu')).toBe('Hindu')
    expect(communityLabel('')).toBe('Hindu')
  })
})

function openWedding(): WeddingBundle {
  return {
    wedding: { id: 'w1', coupleNames: 'A & B', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
    membership: { id: 'm1', role: 'family', side: 'bride', displayName: 'Parent' },
    displayName: 'Parent',
    members: [],
    functions: [{ id: 'fn-roka', name: 'Roka', position: 1, phase: 'pre_wedding', updatedAt: '2026-10-26T00:00:00Z' }],
    tasks: [{
      id: 't1',
      title: 'Roka Ceremony',
      description: '',
      category: 'Other',
      priority: 'High',
      ceremony: 'Roka',
      status: 'Pending',
      dueDate: '',
      templateTitle: 'Roka Ceremony',
      sortOrder: 1,
      functionId: 'fn-roka',
      position: 1,
      assignedTo: null,
      side: null,
      updatedAt: '2026-10-26T00:00:00Z',
      actualCost: null,
      budgetCategoryId: null,
      costUpdatedAt: '',
    }],
    budget: [],
    guests: [],
    milestones: [],
  }
}

describe('checklist realtime', () => {
  it('applies a couple edit onto the family member copy', () => {
    const renamed = applyChecklistChange(openWedding(), {
      table: 'wedding_functions',
      eventType: 'UPDATE',
      record: { id: 'fn-roka', name: 'Roka evening', position: 1 },
    })
    expect(renamed.functions[0]?.name).toBe('Roka evening')
    expect(renamed.tasks[0]?.ceremony).toBe('Roka evening')

    const edited = applyChecklistChange(renamed, {
      table: 'tasks',
      eventType: 'UPDATE',
      record: {
        id: 't1',
        title: 'Our roka',
        description: 'At home',
        category: 'Other',
        priority: 'High',
        ceremony: 'Roka evening',
        status: 'Pending',
        due_date: null,
        template_title: 'Roka Ceremony',
        sort_order: 1,
        function_id: 'fn-roka',
        position: 1,
      },
    })
    expect(edited.tasks[0]?.title).toBe('Our roka')

    const removed = applyChecklistChange(edited, {
      table: 'wedding_functions',
      eventType: 'DELETE',
      record: { id: 'fn-roka', name: 'Roka evening', wedding_id: 'w1' },
    })
    expect(removed.functions).toHaveLength(0)
    expect(removed.tasks).toHaveLength(0)
  })

  it('keeps a friend from seeing a ritual that is not assigned to them', () => {
    const change = {
      table: 'tasks' as const,
      eventType: 'INSERT' as const,
      record: { id: 't2', assigned_to: 'someone-else' },
    }
    expect(acceptsChecklistChange(change, 'friend', 'friend-1')).toBe(false)
    expect(acceptsChecklistChange({ ...change, record: { id: 't2', assigned_to: 'friend-1' } }, 'friend', 'friend-1')).toBe(true)
    expect(acceptsChecklistChange(change, 'family', 'parent-1')).toBe(true)
    expect(acceptsChecklistChange({ ...change, eventType: 'DELETE' }, 'friend', 'friend-1')).toBe(true)
  })

  it('TBS-08 drops a task the friend can no longer see once the allowed list is refetched', () => {
    const assigned = [{ id: 't1', assignedTo: 'friend-1' }]
    expect(myTasks(assigned, 'friend-1')).toEqual(assigned)
    expect(myTasks([], 'friend-1')).toEqual([])
    const ping = taskPingPayload('wedding-1')
    expect(ping).toEqual({ table: 'tasks', wedding_id: 'wedding-1' })
    expect(Object.keys(ping).sort()).toEqual(['table', 'wedding_id'])
  })

  it('listens to function rows only, because a task payload includes the row id', () => {
    const filters = checklistChannelFilters('wedding-1')
    expect(filters.map((filter) => filter.table)).toEqual(['wedding_functions'])
    expect(filters.every((filter) => filter.filter === 'wedding_id=eq.wedding-1')).toBe(true)
    const seen: string[] = []
    let removed = false
    const channel = {
      on(_event: string, filter: { table: string }) {
        seen.push(filter.table)
        return channel
      },
      subscribe() {
        return channel
      },
    }
    const stop = subscribeWeddingChecklist({
      channel: () => channel,
      removeChannel: () => {
        removed = true
      },
    } as unknown as SupabaseClient, 'wedding-1', () => {
      seen.push('applied')
    })
    expect(seen).toEqual(['wedding_functions'])
    stop()
    expect(removed).toBe(true)

    let pingArgs: unknown[] | null = null
    const pingChannel = {
      on(event: string, filter: { event: string }, callback: (message: { payload: Record<string, unknown> }) => void) {
        seen.push(`${event}:${filter.event}`)
        callback({ payload: { table: 'tasks', wedding_id: 'wedding-1', id: 'secret-task' } })
        return pingChannel
      },
      subscribe() {
        return pingChannel
      },
    }
    const stopPing = subscribeTaskPings({
      channel: (name: string, opts: { config: { private: boolean } }) => {
        seen.push(`${name}:${opts.config.private}`)
        return pingChannel
      },
      removeChannel: () => {
        seen.push('ping-removed')
      },
    } as unknown as SupabaseClient, 'wedding-1', (...args: unknown[]) => {
      pingArgs = args
    })
    expect(seen).toContain('wedding:wedding-1:tasks:true')
    expect(seen).toContain(`broadcast:${TASK_PING_EVENT}`)
    expect(pingArgs).toEqual([])
    stopPing()
  })
})