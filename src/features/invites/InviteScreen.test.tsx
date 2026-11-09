/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../../state/auth-context.ts'
import { WeddingContext, type WeddingContextValue } from '../../state/wedding-context.ts'
import type { MemberRole, WeddingBundle } from '../../types.ts'
import { InviteScreen } from './InviteScreen.tsx'

function bundle(role: MemberRole): WeddingBundle {
  return {
    wedding: { id: 'w1', coupleNames: 'Priya & Rahul', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
    membership: { id: 'm1', role, side: 'bride', displayName: 'Member' },
    displayName: 'Member',
    members: [],
    functions: [],
    tasks: [],
    budget: [],
    guests: [],
    milestones: [],
  }
}

function value(role: MemberRole): WeddingContextValue {
  const unused = async () => {}
  return {
    ready: true,
    mode: 'remote',
    bundle: bundle(role),
    canEdit: true,
    notice: null,
    error: null,
    clearNotice: () => {},
    clearError: () => {},
    reload: () => {},
    refreshWedding: async () => bundle(role),
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
    saveBudgetItem: unused,
    deleteBudgetItem: unused,
    addPayment: unused,
    saveGuest: unused,
    deleteGuest: unused,
    saveMilestone: unused,
    deleteMilestone: unused,
    toggleMilestone: unused,
    createInvite: async () => ({ id: 'i', code: '123456', role: 'friend', side: 'bride', expiresAt: null, acceptedAt: null }),
    listInvites: async () => [{ id: 'i', code: '123456', role: 'friend', side: 'bride', expiresAt: null, acceptedAt: null }],
    acceptInvite: unused,
    leaveWedding: unused,
    removeMember: unused,
  }
}

async function renderInvite(role: MemberRole) {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  await act(async () => {
    root.render(
      <MemoryRouter>
        <AuthContext.Provider value={{ ready: true, configured: true, session: { user: { id: 'user-1' } } as never }}>
          <WeddingContext.Provider value={value(role)}>
            <InviteScreen />
          </WeddingContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>,
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

describe('invite screen share', () => {
  it('offers WhatsApp to a parent and not to a friend or planner', async () => {
    const parent = await renderInvite('family')
    expect(parent.container.textContent).toContain('Share on WhatsApp')
    expect(parent.container.textContent).toContain('/invite/123456?role=friend&side=bride')
    await parent.unmount()
    const friend = await renderInvite('friend')
    expect(friend.container.textContent).not.toContain('Share on WhatsApp')
    await friend.unmount()
    const planner = await renderInvite('planner')
    expect(planner.container.textContent).not.toContain('Share on WhatsApp')
    await planner.unmount()
  })
})