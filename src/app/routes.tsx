import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './AppShell.tsx'
import { Splash } from '../components/ui.tsx'
import { AccountScreen } from '../features/account/AccountScreen.tsx'
import { AuthScreen } from '../features/auth/AuthScreen.tsx'
import { BudgetTab } from '../features/budget/BudgetTab.tsx'
import { GuestsTab } from '../features/guests/GuestsTab.tsx'
import { HomeTab } from '../features/home/HomeTab.tsx'
import { InviteScreen } from '../features/invites/InviteScreen.tsx'
import { TasksTab } from '../features/tasks/TasksTab.tsx'
import { TimelineTab } from '../features/timeline/TimelineTab.tsx'
import { SetupScreen } from '../features/wedding/SetupScreen.tsx'
import { COLORS } from '../styles/tokens.ts'
import { useAuth } from '../state/auth-context.ts'
import { useWedding } from '../state/wedding-context.ts'

function useAuthCallback(finishingAuth: boolean, hasSession: boolean) {
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    if (!finishingAuth || hasSession) return
    const timer = window.setTimeout(() => setExpired(true), 8000)
    return () => window.clearTimeout(timer)
  }, [finishingAuth, hasSession])
  return finishingAuth && !hasSession && !expired
}

export function AppRoutes() {
  const { ready: authReady, session } = useAuth()
  const { ready: weddingReady, bundle, error, reload } = useWedding()
  const location = useLocation()
  const finishingAuth = new URLSearchParams(location.search).has('code') || location.hash.includes('access_token')
  const waitingForCallback = useAuthCallback(finishingAuth, Boolean(session))

  if (!authReady || !weddingReady || waitingForCallback) return <Splash />

  if (session && error && !bundle) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: COLORS.ivory }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: COLORS.crimson }}>Could not load your wedding</h1>
          <p>{error}</p>
          <button type="button" onClick={reload} style={{ background: COLORS.crimson, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 16px', fontWeight: 700, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  const signedIn = Boolean(session)
  const hasWedding = Boolean(bundle)

  return (
    <Routes>
      <Route path="/invite/:token" element={<InviteScreen />} />
      <Route path="/invite" element={<InviteScreen />} />
      <Route path="/auth" element={signedIn ? <Navigate to={hasWedding ? '/' : '/setup'} replace /> : <AuthScreen />} />
      <Route path="/setup" element={!signedIn ? <Navigate to="/auth" replace /> : hasWedding ? <Navigate to="/" replace /> : <SetupScreen />} />
      <Route element={hasWedding ? <AppShell /> : <Navigate to={signedIn ? '/setup' : '/auth'} replace />}>
        <Route index element={<HomeTab />} />
        <Route path="tasks" element={<TasksTab />} />
        <Route path="budget" element={<BudgetTab />} />
        <Route path="guests" element={<GuestsTab />} />
        <Route path="timeline" element={<TimelineTab />} />
        <Route path="account" element={<AccountScreen />} />
      </Route>
      <Route path="*" element={<Navigate to={hasWedding ? '/' : signedIn ? '/setup' : '/auth'} replace />} />
    </Routes>
  )
}
