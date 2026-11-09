/** @vitest-environment happy-dom */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Navigate, Route, Routes, useSearchParams } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { isPlanningEvents, PLANNING_EVENTS_PATH } from './planningTab.ts'

function Probe() {
  const [params] = useSearchParams()
  return <div>{isPlanningEvents(params) ? 'Events' : 'Tasks'}</div>
}

describe('/timeline', () => {
  it('redirects to Planning with the Events tab selected', async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.append(container)
    const root: Root = createRoot(container)
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/timeline']}>
          <Routes>
            <Route path="/timeline" element={<Navigate to={PLANNING_EVENTS_PATH} replace />} />
            <Route path="/planning" element={<Probe />} />
          </Routes>
        </MemoryRouter>,
      )
    })
    expect(container.textContent).toBe('Events')
    expect(PLANNING_EVENTS_PATH).toBe('/planning?tab=events')
    expect(isPlanningEvents(new URLSearchParams('tab=events'))).toBe(true)
    expect(isPlanningEvents(new URLSearchParams(''))).toBe(false)
    await act(async () => root.unmount())
    container.remove()
  })
})