/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import { WeddingContext, type WeddingContextValue } from '../../state/wedding-context.ts'
import type { Guest, GuestDraft, WeddingBundle } from '../../types.ts'
import { GuestsTab } from './GuestsTab.tsx'

const mutual: Guest = {
  id: 'g-mutual',
  name: 'Shared Aunt',
  email: '',
  phone: '',
  status: 'Pending',
  meal: '',
  plusOnes: 0,
  side: 'both',
  functionIds: [],
}

const ownSide: Guest = {
  id: 'g-bride',
  name: 'Bride Aunt',
  email: '',
  phone: '',
  status: 'Pending',
  meal: '',
  plusOnes: 0,
  side: 'bride',
  functionIds: [],
}

function bundle(role: WeddingBundle['membership']['role'], side: WeddingBundle['membership']['side']): WeddingBundle {
  return {
    wedding: { id: 'w1', coupleNames: 'A & B', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
    membership: { id: 'm1', role, side, displayName: 'Member' },
    displayName: 'Member',
    members: [],
    functions: [],
    tasks: [],
    budget: [],
    guests: [mutual, ownSide],
    milestones: [],
  }
}

function weddingValue(current: WeddingBundle, saves: GuestDraft[] = []): WeddingContextValue {
  const unused = async () => {}
  return {
    ready: true,
    mode: 'remote',
    bundle: current,
    canEdit: true,
    notice: null,
    error: null,
    clearNotice: () => {},
    clearError: () => {},
    reload: () => {},
    refreshWedding: async () => current,
    refreshGuests: async () => current.guests,
    guestPingDown: false,
    startPreview: () => {},
    leavePreview: () => {},
    createWedding: unused,
    updateSettings: unused,
    saveTask: unused,
    deleteTask: unused,
    toggleTask: unused,
    saveFunction: unused,
    deleteFunction: unused,
    moveFunction: unused,
    moveTask: unused,
    saveBudgetItem: unused,
    deleteBudgetItem: unused,
    addPayment: unused,
    saveGuest: async (draft) => {
      saves.push(draft)
    },
    deleteGuest: unused,
    saveMilestone: unused,
    deleteMilestone: unused,
    toggleMilestone: unused,
    createInvite: async () => ({ id: 'i', code: '123456', role: 'friend', side: 'bride', expiresAt: null, acceptedAt: null }),
    listInvites: async () => [],
    acceptInvite: unused,
    leaveWedding: unused,
    removeMember: unused,
  }
}

async function renderTab(value: WeddingContextValue) {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  await act(async () => {
    root.render(
      <WeddingContext.Provider value={value}>
        <GuestsTab />
      </WeddingContext.Provider>,
    )
  })
  return {
    container,
    async unmount() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

function clickButton(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === label || item.textContent?.trim() === label)
  if (!button) throw new Error(`missing ${label}`)
  button.click()
}

function dialog() {
  const sheet = document.body.querySelector('[role="dialog"]')
  if (!sheet) throw new Error('missing dialog')
  return sheet
}

function sideButtons(sheet: Element) {
  return [...sheet.querySelectorAll('button')].map((button) => button.textContent?.trim() ?? '').filter((label) => label === 'Bride' || label === 'Groom' || label === 'Mutual')
}

describe('Mutual guest side', () => {
  it('shows Mutual as a label when family edits it, and still offers Mutual when they add a guest', async () => {
    const saves: GuestDraft[] = []
    const family = await renderTab(weddingValue(bundle('family', 'bride'), saves))
    await act(async () => {
      clickButton(family.container, 'Edit Shared Aunt')
    })
    const editing = dialog()
    const label = [...editing.querySelectorAll('p')].find((node) => node.textContent === 'Mutual')
    const note = [...editing.querySelectorAll('p')].find((node) => node.textContent === 'Only the couple or planner can change this.')
    expect(label).toBeTruthy()
    expect(note).toBeTruthy()
    expect(Number.parseFloat(label?.style.fontSize ?? '0')).toBeGreaterThanOrEqual(14)
    expect(Number.parseFloat(note?.style.fontSize ?? '0')).toBeGreaterThanOrEqual(14)
    expect(sideButtons(editing)).toEqual([])
    await act(async () => {
      clickButton(editing as HTMLElement, 'Save guest')
    })
    expect(saves.at(-1)?.side).toBe('both')

    await act(async () => {
      clickButton(family.container, 'Add')
    })
    const adding = dialog()
    expect(adding.textContent).toContain('Add Guest')
    expect(adding.textContent).not.toContain('Only the couple or planner can change this.')
    expect(sideButtons(adding)).toEqual(['Bride', 'Mutual'])
    await family.unmount()

    const planner = await renderTab(weddingValue(bundle('planner', null)))
    await act(async () => {
      clickButton(planner.container, 'Edit Shared Aunt')
    })
    const plannerSheet = dialog()
    expect(plannerSheet.textContent).not.toContain('Only the couple or planner can change this.')
    expect(sideButtons(plannerSheet)).toEqual(['Bride', 'Groom', 'Mutual'])
    await planner.unmount()
  })
})

describe('guest list fallback', () => {
  it('refetches the allowed list while the private ping is down', async () => {
    let pulls = 0
    const value = weddingValue(bundle('friend', 'bride'))
    value.guestPingDown = true
    value.refreshGuests = async () => {
      pulls += 1
      return value.bundle?.guests ?? []
    }
    const view = await renderTab(value)
    expect(pulls).toBe(1)
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(pulls).toBe(2)
    await view.unmount()
    const quiet = weddingValue(bundle('family', 'bride'))
    let extra = 0
    quiet.refreshGuests = async () => {
      extra += 1
      return []
    }
    const idle = await renderTab(quiet)
    expect(extra).toBe(0)
    await idle.unmount()
  })
})