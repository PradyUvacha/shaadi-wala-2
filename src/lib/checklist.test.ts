import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { WeddingBundle } from '../types.ts'
import {
  acceptsChecklistChange,
  applyChecklistChange,
  checklistChannelFilters,
  communityLabel,
  moveByPosition,
  subscribeWeddingChecklist,
} from './checklist.ts'

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
    functions: [{ id: 'fn-roka', name: 'Roka', position: 1, updatedAt: '2026-10-26T00:00:00Z' }],
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

  it('listens to functions and rituals for one wedding', () => {
    const filters = checklistChannelFilters('wedding-1')
    expect(filters.map((filter) => filter.table)).toEqual(['tasks', 'wedding_functions'])
    expect(filters.every((filter) => filter.filter === 'wedding_id=eq.wedding-1')).toBe(true)
    const seen: string[] = []
    let removed = false
    const channel = {
      on(_event: string, filter: { table: string }, callback: (payload: { eventType: 'INSERT'; new: Record<string, unknown>; old: Record<string, unknown> }) => void) {
        seen.push(filter.table)
        if (filter.table === 'tasks') {
          callback({
            eventType: 'INSERT',
            new: {
              id: 't2',
              title: 'Extra rite',
              description: '',
              category: 'Other',
              priority: 'Low',
              ceremony: 'Roka',
              status: 'Pending',
              due_date: null,
              template_title: null,
              sort_order: 2,
              function_id: 'fn-roka',
              position: 2,
            },
            old: {},
          })
        }
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
    } as unknown as SupabaseClient, 'wedding-1', (change) => {
      const next = applyChecklistChange(openWedding(), change)
      expect(next.tasks.map((task) => task.title)).toEqual(['Roka Ceremony', 'Extra rite'])
    })
    expect(seen).toEqual(['tasks', 'wedding_functions'])
    stop()
    expect(removed).toBe(true)
  })
})