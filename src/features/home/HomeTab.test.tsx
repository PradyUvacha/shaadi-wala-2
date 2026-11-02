/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WeddingContext, type WeddingContextValue } from '../../state/wedding-context.ts'
import type { Task, WeddingBundle } from '../../types.ts'
import { HomeTab } from './HomeTab.tsx'

function task(partial: Partial<Task> & Pick<Task, 'id' | 'title' | 'side'>): Task {
  return {
    description: '',
    category: 'Other',
    priority: 'High',
    ceremony: 'Wedding',
    status: 'Pending',
    dueDate: '2026-06-01',
    templateTitle: null,
    sortOrder: 1,
    functionId: null,
    position: 1,
    assignedTo: null,
    updatedAt: '2026-11-01T00:00:00.000Z',
    actualCost: 40000,
    budgetCategoryId: null,
    costUpdatedAt: '',
    ...partial,
  }
}

function bundle(role: WeddingBundle['membership']['role'], side: WeddingBundle['membership']['side']): WeddingBundle {
  return {
    wedding: { id: 'w1', coupleNames: 'A & B', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
    membership: { id: 'm1', role, side, displayName: 'Parent' },
    displayName: 'Parent',
    members: [],
    functions: [],
    tasks: [
      task({ id: 'own', title: 'Bride decor', side: 'bride' }),
      task({ id: 'shared', title: 'Shared decor', side: null }),
      task({ id: 'other', title: 'Groom decor', side: 'groom' }),
    ],
    budget: [],
    guests: [
      { id: 'g1', name: 'Bride Aunt', email: '', phone: '', status: 'Pending', meal: '', plusOnes: 0, side: 'bride', functionIds: [] },
      { id: 'g2', name: 'Groom Uncle', email: '', phone: '', status: 'Pending', meal: '', plusOnes: 0, side: 'groom', functionIds: [] },
      { id: 'g3', name: 'Mutual Cousin', email: '', phone: '', status: 'Pending', meal: '', plusOnes: 0, side: 'both', functionIds: [] },
    ],
    milestones: [],
  }
}

function value(current: WeddingBundle): WeddingContextValue {
  const unused = async () => {}
  return {
    ready: true,
    mode: 'preview',
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

describe('member home', () => {
  it('shows a parent their side and shared tasks, not the other side, and no rupees to a friend', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    await act(async () => {
      root.render(
        <MemoryRouter>
          <WeddingContext.Provider value={value(bundle('family', 'bride'))}>
            <HomeTab />
          </WeddingContext.Provider>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('Bride decor')
    expect(container.textContent).toContain('Shared decor')
    expect(container.textContent).not.toContain('Groom decor')
    expect(container.textContent).toContain('Bride Aunt')
    expect(container.textContent).toContain('Mutual Cousin')
    expect(container.textContent).not.toContain('Groom Uncle')
    expect(container.textContent).not.toContain('Your wedding progress')

    await act(async () => {
      root.render(
        <MemoryRouter>
          <WeddingContext.Provider value={value(bundle('friend', 'bride'))}>
            <HomeTab />
          </WeddingContext.Provider>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('Bride decor')
    expect(container.textContent).not.toContain('Shared decor')
    expect(container.textContent).toContain('Mutual Cousin')
    expect(container.textContent).not.toContain('Groom Uncle')
    expect(container.textContent).not.toContain('₹')
    expect(container.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    expect(container.textContent).not.toContain('Post an announcement')
    await act(async () => root.unmount())
    container.remove()
  })

  it('leaves the couple home on the progress rings', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const couple = bundle('bride', 'bride')
    couple.displayName = 'Asha'
    await act(async () => {
      root.render(
        <MemoryRouter>
          <WeddingContext.Provider value={value(couple)}>
            <HomeTab />
          </WeddingContext.Provider>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toContain('Your wedding progress')
    expect(container.textContent).not.toContain('Recent activity')
    await act(async () => root.unmount())
    container.remove()
  })
})