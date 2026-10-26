import { describe, expect, it } from 'vitest'
import { roleLabel, unassignedSideGroups } from './access.ts'

describe('role labels', () => {
  it('names the bride, groom, parent, friend, and planner', () => {
    expect(roleLabel('bride', 'bride')).toBe('Bride')
    expect(roleLabel('groom', 'groom')).toBe('Groom')
    expect(roleLabel('family', 'bride')).toBe("Parent · Bride's side")
    expect(roleLabel('friend', 'groom')).toBe("Friend · Groom's side")
    expect(roleLabel('planner', null)).toBe('Planner')
  })

  it('groups unassigned tasks by the side a parent can reassign', () => {
    const tasks = [
      { id: 'a', assignedTo: null, side: 'bride' as const },
      { id: 'b', assignedTo: 'friend', side: 'bride' as const },
      { id: 'c', assignedTo: null, side: 'groom' as const },
      { id: 'd', assignedTo: null, side: null },
    ]
    expect(unassignedSideGroups(tasks, 'family', 'bride').map((group) => group.label)).toEqual(["Unassigned · Bride's side"])
    expect(unassignedSideGroups(tasks, 'family', 'bride')[0]?.tasks.map((task) => task.id)).toEqual(['a'])
    expect(unassignedSideGroups(tasks, 'family', 'groom').map((group) => group.label)).toEqual(["Unassigned · Groom's side"])
    expect(unassignedSideGroups(tasks, 'bride', 'bride').map((group) => group.label)).toEqual([
      "Unassigned · Bride's side",
      "Unassigned · Groom's side",
    ])
    expect(unassignedSideGroups(tasks, 'planner', null)).toHaveLength(2)
    expect(unassignedSideGroups(tasks, 'friend', 'bride')).toEqual([])
  })
})
