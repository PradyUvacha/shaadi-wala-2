import { describe, expect, it } from 'vitest'
import { canDeleteGuestRow, canEditGuestRow, guestIncluded, guestListFilters, guestSideChoices, roleLabel, unassignedSideGroups } from './access.ts'

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

  it('lets family on either side edit Mutual guests and keeps Mutual deletes with the couple and planner', () => {
    expect(canEditGuestRow('family', 'bride', 'both')).toBe(true)
    expect(canEditGuestRow('family', 'groom', 'both')).toBe(true)
    expect(canEditGuestRow('family', 'bride', 'bride')).toBe(true)
    expect(canEditGuestRow('family', 'bride', 'groom')).toBe(false)
    expect(canDeleteGuestRow('family', 'bride', 'both')).toBe(false)
    expect(canDeleteGuestRow('family', 'groom', 'both')).toBe(false)
    expect(canDeleteGuestRow('family', 'groom', 'groom')).toBe(true)
    expect(canDeleteGuestRow('bride', 'bride', 'both')).toBe(true)
    expect(canDeleteGuestRow('planner', null, 'both')).toBe(true)
    expect(canEditGuestRow('friend', 'bride', 'both')).toBe(false)
    expect(canDeleteGuestRow('friend', 'bride', 'bride')).toBe(false)
    expect(guestSideChoices('family', 'bride')).toEqual(['bride', 'both'])
    expect(guestSideChoices('family', 'groom')).toEqual(['groom', 'both'])
    expect(guestSideChoices('planner', null)).toEqual(['both', 'bride', 'groom'])
    expect(guestSideChoices('friend', 'bride')).toEqual(['', 'bride', 'groom', 'both'])
    expect(guestListFilters('bride', 'bride').map((chip) => chip.label)).toEqual(["All sides", "Bride's", "Groom's", 'Mutual'])
    expect(guestListFilters('family', 'groom').map((chip) => chip.label)).toEqual(['All sides', "Groom's", 'Mutual'])
    expect(guestListFilters('friend', 'groom')).toEqual([{ value: 'groom', label: "Groom's" }])
    expect(guestListFilters('friend', 'bride')).toEqual([{ value: 'bride', label: "Bride's" }])
    expect(guestIncluded('friend', 'groom', 'groom', 'bride')).toBe(false)
    expect(guestIncluded('friend', 'groom', 'groom', 'both')).toBe(true)
    expect(guestIncluded('friend', 'groom', 'groom', 'groom')).toBe(true)
    expect(guestIncluded('family', 'bride', 'all', 'groom')).toBe(false)
    expect(guestIncluded('family', 'bride', 'both', 'both')).toBe(true)
    expect(guestIncluded('planner', null, 'bride', 'bride')).toBe(true)
    expect(guestIncluded('planner', null, 'both', 'both')).toBe(true)
  })
})
