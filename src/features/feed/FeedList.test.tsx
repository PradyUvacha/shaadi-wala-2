/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { FeedAuthor } from './feedAuthors.ts'
import { FeedList, type FeedPost } from './FeedList.tsx'

const posts: FeedPost[] = [
  { id: 'p1', body: 'Haldi is at 4', createdAt: '2026-11-02T10:00:00.000Z', authorId: 'parent' },
  { id: 'p2', body: 'Welcome', createdAt: '2026-11-02T09:00:00.000Z', authorId: 'bride' },
]

const authors: FeedAuthor[] = [
  { userId: 'parent', role: 'family', side: 'bride', displayName: 'Parent' },
  { userId: 'bride', role: 'bride', side: 'bride', displayName: 'Asha' },
]

async function renderList(canPost: boolean, currentUserId: string | null) {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const created: string[] = []
  const container = document.createElement('div')
  document.body.append(container)
  const root: Root = createRoot(container)
  await act(async () => {
    root.render(
      <FeedList
        posts={posts}
        authors={authors}
        canPost={canPost}
        currentUserId={currentUserId}
        onCreate={(body) => created.push(body)}
        onUpdate={() => {}}
        onDelete={() => {}}
      />,
    )
  })
  return {
    container,
    created,
    async unmount() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('announcement feed', () => {
  it('lets a parent post and shows role labels, and gives a friend no composer', async () => {
    const parent = await renderList(true, 'parent')
    expect(parent.container.querySelector('textarea[aria-label="Announcement"]')).toBeTruthy()
    expect(parent.container.textContent).toContain("Parent · Bride's side")
    expect(parent.container.textContent).toContain('Bride')
    expect(parent.container.textContent).toContain('Delete')
    expect(parent.container.querySelector('textarea[aria-label="Edit announcement"]')).toBeNull()
    expect(parent.container.querySelector('time')?.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    const confirm = vi.fn(() => false)
    window.confirm = confirm
    const deleteButton = [...parent.container.querySelectorAll('button')].find((button) => button.textContent === 'Delete')
    if (!(deleteButton instanceof HTMLButtonElement)) throw new Error('missing delete')
    await act(async () => {
      deleteButton.click()
    })
    expect(confirm).toHaveBeenCalledWith('Delete this announcement?')
    const edit = [...parent.container.querySelectorAll('button')].find((button) => button.textContent === 'Edit')
    if (!(edit instanceof HTMLButtonElement)) throw new Error('missing edit')
    await act(async () => {
      edit.click()
    })
    expect(parent.container.querySelector('textarea[aria-label="Edit announcement"]')).toBeTruthy()
    const form = parent.container.querySelector('form')
    if (!(form instanceof HTMLFormElement)) throw new Error('missing composer')
    await act(async () => {
      form.requestSubmit()
    })
    expect(parent.created).toEqual([])
    await parent.unmount()

    const friend = await renderList(false, 'friend')
    expect(friend.container.querySelector('textarea[aria-label="Announcement"]')).toBeNull()
    expect(friend.container.textContent).toContain('Haldi is at 4')
    await friend.unmount()
  })

  it('shows a typed announcement exactly, including an amount', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    const exact = 'Bring ₹500 exactly'
    await act(async () => {
      root.render(
        <FeedList
          posts={[{ id: 'exact', body: exact, createdAt: '2026-11-02T10:00:00.000Z', authorId: 'parent' }]}
          authors={authors}
          canPost={false}
          currentUserId="friend"
          onCreate={() => {}}
          onUpdate={() => {}}
          onDelete={() => {}}
        />,
      )
    })
    expect(container.textContent).toContain(exact)
    expect(container.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/)
    await act(async () => root.unmount())
    container.remove()
  })
})