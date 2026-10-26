import type { User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { appConfig } from '../config/app.ts'
import { supabase } from './supabase.ts'

export function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (configured) return configured
  if (Capacitor.isNativePlatform()) return `${appConfig.appId}://auth/callback`
  return `${window.location.origin}/auth`
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

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before using Google sign-in.')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
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
