import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav.tsx'
import { COLORS } from '../styles/tokens.ts'
import { useWedding } from '../state/wedding-context.ts'

export function AppShell() {
  const { mode } = useWedding()
  const location = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: COLORS.ivory, position: 'relative', paddingLeft: 'var(--safe-area-inset-left, env(safe-area-inset-left, 0px))', paddingRight: 'var(--safe-area-inset-right, env(safe-area-inset-right, 0px))' }}>
      <div ref={scroller} style={{ overflowY: 'auto', height: '100%' }}>
        {mode === 'preview' && (
          <button type="button" onClick={() => navigate('/auth')} style={{ width: '100%', border: 'none', background: COLORS.gold, color: '#3C1515', fontSize: 12, fontWeight: 700, padding: '8px 12px', cursor: 'pointer' }}>
            Preview on this device only. Sign in to save your wedding.
          </button>
        )}
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
