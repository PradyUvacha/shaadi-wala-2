import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav.tsx'
import { SurveyGate } from '../features/surveys/SurveyGate.tsx'
import { COLORS } from '../styles/tokens.ts'
import { useWedding } from '../state/wedding-context.ts'

export function AppShell() {
  const { mode, bundle, notice } = useWedding()
  const location = useLocation()
  const navigate = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    if (mode === 'preview' || bundle || !notice) return
    const path = location.pathname
    if (path === '/setup' || path.startsWith('/invite') || path.startsWith('/profile/settings')) return
    navigate('/setup', { replace: true })
  }, [bundle, notice, mode, location.pathname, navigate])

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
      <SurveyGate />
      <BottomNav />
    </div>
  )
}
