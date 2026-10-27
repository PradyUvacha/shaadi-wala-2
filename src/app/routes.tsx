import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './AppShell.tsx'
import { Splash } from '../components/ui.tsx'
import { COLORS } from '../styles/tokens.ts'
import { pathWithSurvey } from '../features/surveys/surveys.ts'
import { useAuth } from '../state/auth-context.ts'
import { useWedding } from '../state/wedding-context.ts'

const AccountRedirect = () => <Navigate to="/profile" replace />
const AuthScreen = lazy(() => import('../features/auth/AuthScreen.tsx').then((m) => ({ default: m.AuthScreen })))
const BudgetTab = lazy(() => import('../features/budget/BudgetTab.tsx').then((m) => ({ default: m.BudgetTab })))
const GuestsTab = lazy(() => import('../features/guests/GuestsTab.tsx').then((m) => ({ default: m.GuestsTab })))
const HomeTab = lazy(() => import('../features/home/HomeTab.tsx').then((m) => ({ default: m.HomeTab })))
const InviteScreen = lazy(() => import('../features/invites/InviteScreen.tsx').then((m) => ({ default: m.InviteScreen })))
const TasksTab = lazy(() => import('../features/tasks/TasksTab.tsx').then((m) => ({ default: m.TasksTab })))
const TimelineTab = lazy(() => import('../features/timeline/TimelineTab.tsx').then((m) => ({ default: m.TimelineTab })))
const SetupScreen = lazy(() => import('../features/wedding/SetupScreen.tsx').then((m) => ({ default: m.SetupScreen })))
const ProfileScreen = lazy(() => import('../features/account/ProfileScreen.tsx').then((m) => ({ default: m.ProfileScreen })))
const SettingsScreen = lazy(() => import('../features/account/SettingsScreen.tsx').then((m) => ({ default: m.SettingsScreen })))
const DeleteAccountScreen = lazy(() => import('../features/account/DeleteAccountScreen.tsx').then((m) => ({ default: m.DeleteAccountScreen })))
const FeedbackScreen = lazy(() => import('../features/feedback/FeedbackScreen.tsx').then((m) => ({ default: m.FeedbackScreen })))

function useAuthCallback(finishingAuth: boolean, hasSession: boolean) {
  const [expired, setExpired] = useState(false)
  useEffect(() => {
    if (!finishingAuth || hasSession) return
    const timer = window.setTimeout(() => setExpired(true), 8000)
    return () => window.clearTimeout(timer)
  }, [finishingAuth, hasSession])
  return finishingAuth && !hasSession && !expired
}

function safeNext(search: string): string | null {
  const next = new URLSearchParams(search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

export function AppRoutes() {
  const { ready: authReady, session } = useAuth()
  const { ready: weddingReady, bundle, mode, error, reload } = useWedding()
  const location = useLocation()
  const finishingAuth = new URLSearchParams(location.search).has('code') || location.hash.includes('access_token')
  const waitingForCallback = useAuthCallback(finishingAuth, Boolean(session))

  if (!authReady || !weddingReady || waitingForCallback) return <Splash />

  if (session && error && !bundle && !location.pathname.startsWith('/profile') && !location.pathname.startsWith('/invite')) {
    return (
      <div className="page-fill" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: COLORS.ivory }}>
        <div className="desktop-column">
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
  const inPreview = mode === 'preview'
  const canEnter = signedIn || inPreview
  const hasWedding = Boolean(bundle)
  const next = safeNext(location.search)
  const home = pathWithSurvey(hasWedding ? '/' : '/setup', location.search)

  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/invite/:token" element={<InviteScreen />} />
        <Route path="/invite" element={<InviteScreen />} />
        <Route path="/auth" element={signedIn ? <Navigate to={next ? pathWithSurvey(next, location.search) : home} replace /> : <AuthScreen />} />
        <Route element={canEnter ? <AppShell /> : <Navigate to={pathWithSurvey('/auth', location.search)} replace />}>
          <Route path="/setup" element={hasWedding ? <Navigate to="/" replace /> : <SetupScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/profile/settings" element={<SettingsScreen />} />
          <Route path="/profile/settings/delete-account" element={<DeleteAccountScreen />} />
          <Route path="/profile/feedback" element={<FeedbackScreen />} />
          <Route path="/account" element={<AccountRedirect />} />
          <Route element={hasWedding ? <Outlet /> : <Navigate to="/setup" replace />}>
            <Route index element={<HomeTab />} />
            <Route path="planning" element={<TasksTab />} />
            <Route path="tasks" element={<Navigate to="/planning" replace />} />
            <Route path="budget" element={<BudgetTab />} />
            <Route path="guests" element={<GuestsTab />} />
            <Route path="timeline" element={<TimelineTab />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={canEnter ? home : pathWithSurvey('/auth', location.search)} replace />} />
      </Routes>
    </Suspense>
  )
}
