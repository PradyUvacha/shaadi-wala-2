/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DeletedItemError, StaleWriteError } from '../../lib/errors.ts'
import { WeddingContext, type WeddingContextValue } from '../../state/wedding-context.ts'
import type { Task, WeddingBundle } from '../../types.ts'
import { TasksTab } from './TasksTab.tsx'

const ritual: Task = {
  id: 'task-1',
  title: 'Book the hall',
  description: '',
  category: 'Venue',
  priority: 'High',
  ceremony: 'Wedding',
  status: 'Pending',
  dueDate: '',
  templateTitle: null,
  sortOrder: 1,
  functionId: 'fn-1',
  position: 1,
  assignedTo: null,
  side: null,
  updatedAt: '2026-10-26T10:00:00.000Z',
  actualCost: null,
  budgetCategoryId: null,
  costUpdatedAt: '',
}

const bundle: WeddingBundle = {
  wedding: { id: 'w1', coupleNames: 'A & B', weddingDate: '2027-04-24', city: 'Mumbai', community: 'hindu' },
  membership: { id: 'm1', role: 'groom', side: 'groom', displayName: 'Groom' },
  displayName: 'Groom',
  members: [],
  functions: [{ id: 'fn-1', name: 'Wedding', position: 1, phase: 'wedding_day', updatedAt: '2026-10-26T09:00:00.000Z' }],
  tasks: [ritual],
  budget: [],
  guests: [],
  milestones: [],
}

function weddingValue(overrides: Partial<WeddingContextValue>): WeddingContextValue {
  const unused = async () => {}
  return {
    ready: true,
    mode: 'remote',
    bundle,
    canEdit: true,
    notice: null,
    error: null,
    clearNotice: () => {},
    clearError: () => {},
    reload: () => {},
    refreshWedding: async () => bundle,
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
    ...overrides,
  }
}

async function renderTab(value: WeddingContextValue) {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  await act(async () => {
    root.render(
      <MemoryRouter>
        <WeddingContext.Provider value={value}>
          <TasksTab />
        </WeddingContext.Provider>
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

function clickButton(container: HTMLElement, label: string) {
  const scopes = [container, document.body]
  const button = scopes.flatMap((scope) => [...scope.querySelectorAll('button')]).find((item) => item.getAttribute('aria-label') === label || item.textContent?.trim() === label)
  if (!button) throw new Error(`missing ${label}`)
  button.click()
}

describe('ritual editor conflicts', () => {
  it('offers reload or overwrite when the ritual changed, and closes when it was deleted', async () => {
    const saves: Array<{ overwrite?: boolean }> = []
    let refresh = 0
    const stale = await renderTab(weddingValue({
      saveTask: async (_draft, _id, guard) => {
        saves.push({ overwrite: guard?.overwrite })
        if (!guard?.overwrite) throw new StaleWriteError()
      },
      refreshWedding: async () => {
        refresh += 1
        return bundle
      },
    }))
    expect(stale.container.textContent).toContain('WEDDING DAY')
    expect(stale.container.textContent).toContain('1 task')
    expect(stale.container.textContent).toContain('24/04/2027')
    expect(stale.container.textContent).toContain('0 / 1 · 0%')
    expect(stale.container.textContent).toContain('Community ·')
    expect(stale.container.textContent).not.toContain('🎯')
    await act(async () => {
      clickButton(stale.container, 'Actions for Book the hall')
    })
    await act(async () => {
      clickButton(stale.container, 'Edit task')
    })
    await act(async () => {
      clickButton(stale.container, 'Save Changes')
    })
    expect(stale.container.textContent).toContain('This was changed by someone else')
    expect(stale.container.textContent).toContain('Book the hall')
    await act(async () => {
      clickButton(stale.container, 'Overwrite')
    })
    expect(saves.map((save) => Boolean(save.overwrite))).toEqual([false, true])
    expect(stale.container.textContent).not.toContain('This was changed by someone else')
    await stale.unmount()

    const deleted = await renderTab(weddingValue({
      saveTask: async () => {
        throw new DeletedItemError()
      },
      refreshWedding: async () => {
        refresh += 1
        return { ...bundle, tasks: [] }
      },
    }))
    await act(async () => {
      clickButton(deleted.container, 'Actions for Book the hall')
    })
    await act(async () => {
      clickButton(deleted.container, 'Edit task')
    })
    await act(async () => {
      clickButton(deleted.container, 'Save Changes')
    })
    expect(deleted.container.textContent).toContain('This item was deleted by someone else')
    expect(deleted.container.textContent).not.toContain('Edit Task')
    expect(deleted.container.textContent).not.toContain('Cannot coerce')
    expect(refresh).toBeGreaterThan(0)
    await deleted.unmount()
  })
})
