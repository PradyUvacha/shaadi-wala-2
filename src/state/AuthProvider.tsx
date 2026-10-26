import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { identifyUser, initAnalytics, trackAppOpen } from '../lib/analytics.ts'
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts'
import { AuthContext } from './auth-context.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    initAnalytics()
    trackAppOpen()
  }, [])

  useEffect(() => {
    identifyUser(session?.user.id ?? null)
  }, [session])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return
    const pending = App.addListener('appUrlOpen', ({ url }) => {
      if (!url.includes('auth/callback') || !supabase) return
      const code = new URLSearchParams(url.split('?')[1] ?? '').get('code')
      if (!code) return
      void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (!error) void Browser.close().catch(() => undefined)
      })
    })
    return () => {
      void pending.then((handle) => handle.remove())
    }
  }, [])

  const value = useMemo(
    () => ({ ready, configured: isSupabaseConfigured, session }),
    [ready, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
