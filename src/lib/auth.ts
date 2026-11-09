import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { appConfig } from '../config/app.ts'
import { supabase } from './supabase.ts'

export const AUTH_CALLBACK_PATH = '/auth'

/** Off until the Google OAuth client is configured. Unset, empty, and "false" stay hidden. */
export function googleAuthEnabled(flag: string | undefined = import.meta.env.VITE_ENABLE_GOOGLE_AUTH): boolean {
  return flag === 'true'
}

/** Keep an invite's role and side inside next, and reject an off-site redirect. */
export function authNextFromSearch(search: string): string | null {
  const next = new URLSearchParams(search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null
  return next
}

export function withAuthNext(redirectTo: string, next: string | null | undefined): string {
  if (!next) return redirectTo
  const joiner = redirectTo.includes('?') ? '&' : '?'
  return `${redirectTo}${joiner}next=${encodeURIComponent(next)}`
}

export function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (configured) return configured
  if (Capacitor.isNativePlatform()) return `${appConfig.appId}://auth/callback`
  return `${window.location.origin}${AUTH_CALLBACK_PATH}`
}

export function displayNameFromUser(user: User | null | undefined): string {
  const meta = user?.user_metadata?.display_name
  if (typeof meta === 'string' && meta.trim()) return meta.trim()
  const emailName = user?.email?.split('@')[0]
  return emailName?.trim() || 'there'
}

export async function signUpWithEmail(email: string, password: string, displayName: string): Promise<'session' | 'confirm-email'> {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before creating an account.')
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  })
  if (error) throw new Error(error.message)
  return data.session ? 'session' : 'confirm-email'
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before signing in.')
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(error.message)
}

export async function signInWithGoogle(next?: string | null): Promise<void> {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before using Google sign-in.')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: withAuthNext(getAuthRedirectUrl(), next),
      skipBrowserRedirect: Capacitor.isNativePlatform(),
    },
  })
  if (error) throw new Error(error.message)
  if (Capacitor.isNativePlatform()) {
    if (!data.url) throw new Error('Google sign-in did not return a URL.')
    await Browser.open({ url: data.url })
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
