/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DUPLICATE_CATEGORY_MESSAGE } from '../../lib/budgetCategories.ts'
import { WeddingContext, type WeddingContextValue } from '../../state/wedding-context.ts'
import type { BudgetItem, WeddingBundle } from '../../types.ts'
import { BudgetTab } from './BudgetTab.tsx'

const venue: BudgetItem = {
  id: 'venue',
  category: 'Venue',
  currency: 'INR',
  estimated: 1000,
  actual: 0,
  paid: false,
  notes: '',
  paidBySide: 'both',
  splits: [],
  partPayments: [],
}

const bundle: WeddingBundle = {
  wedding: { id: 'w1', coupleNames: 'A & B', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
  membership: { id: 'm1', role: 'bride', side: 'bride', displayName: 'Asha' },
  displayName: 'Asha',
  members: [],
  functions: [],
  tasks: [],
  budget: [venue],
  guests: [],
  milestones: [],
}

function weddingValue(saves: string[]): WeddingContextValue {
  const unused = async () => {}
  return {
    ready: true,
    mode: 'preview',
    bundle,
    canEdit: true,
    notice: null,
    error: null,
    clearNotice: () => {},
    clearError: () => {},
    reload: () => {},
    refreshWedding: async () => bundle,
    refreshGuests: async () => [],
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
    saveBudgetItem: async (draft) => {
      saves.push(draft.category)
    },
    deleteBudgetItem: unused,
    addPayment: unused,
    saveGuest: unused,
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

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
}

describe('duplicate category', () => {
  it('keeps the new-category sheet open and names the clash', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const saves: string[] = []
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    await act(async () => {
      root.render(
        <MemoryRouter>
          <WeddingContext.Provider value={weddingValue(saves)}>
            <BudgetTab />
          </WeddingContext.Provider>
        </MemoryRouter>,
      )
    })
    const add = container.querySelector('button[aria-label="Add"]')
    if (!(add instanceof HTMLButtonElement)) throw new Error('missing add')
    await act(async () => {
      add.click()
    })
    const inputs = [...document.body.querySelectorAll('input')]
    const name = inputs.find((input) => input.getAttribute('placeholder') === 'Venue')
    const amount = inputs.find((input) => input !== name && input.getAttribute('inputmode') === 'numeric')
    if (!(name instanceof HTMLInputElement) || !(amount instanceof HTMLInputElement)) throw new Error('missing fields')
    await act(async () => {
      setNativeValue(name, ' venue ')
      name.dispatchEvent(new InputEvent('input', { bubbles: true, data: ' venue ', inputType: 'insertText' }))
      setNativeValue(amount, '2500')
      amount.dispatchEvent(new InputEvent('input', { bubbles: true, data: '2500', inputType: 'insertText' }))
    })
    const save = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Add category')
    if (!save) throw new Error('missing save')
    await act(async () => {
      save.click()
    })
    expect(document.body.textContent).toContain(DUPLICATE_CATEGORY_MESSAGE)
    expect([...document.body.querySelectorAll('button')].some((button) => button.textContent?.trim() === 'Add category')).toBe(true)
    expect(saves).toEqual([])
    await act(async () => root.unmount())
    container.remove()
  })
})
