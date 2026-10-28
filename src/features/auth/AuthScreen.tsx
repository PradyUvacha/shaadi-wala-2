import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MehendiPattern } from '../../components/ui.tsx'
import { isSupabaseConfigured } from '../../lib/supabase.ts'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../../lib/auth.ts'
import { track } from '../../lib/analytics.ts'
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../lib/legal.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateAuth } from '../../lib/planning.ts'
import { pathWithSurvey } from '../surveys/surveys.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS, SIZE, TYPE } from '../../styles/tokens.ts'

export function AuthScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const { startPreview } = useWedding()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-up')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    const validation = validateAuth({ mode, email, password, displayName })
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'sign-up') {
        const result = await signUpWithEmail(email, password, displayName)
        track('sign_up')
        if (result === 'confirm-email') {
          setInfo('Check your email to confirm the account, then sign in.')
          setMode('sign-in')
        }
      } else {
        await signInWithEmail(email, password)
      }
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (caught) {
      setError(toErrorMessage(caught))
      setBusy(false)
    }
  }

  const preview = () => {
    startPreview()
    navigate(pathWithSurvey('/', location.search))
  }

  return (
    <div className="page-fill" style={{ background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 50%,#C4481A 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
      <MehendiPattern />
      <div className="desktop-column" style={{ position: 'relative', zIndex: 1, animation: 'fadeIn 0.6s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💍</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#fff', fontWeight: 900, margin: '0 0 8px' }}>Shaadi Wala</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>Plan your perfect day, stress-free</p>
          <div style={{ color: COLORS.gold, letterSpacing: 3, marginTop: 8, fontSize: TYPE.small }}>🪔 ✨ 💐 ✨ 🪔</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.25)' }}>
          {!isSupabaseConfigured && (
            <p style={{ color: COLORS.gold, fontSize: TYPE.small, lineHeight: 1.5, marginTop: 0 }}>
              Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or preview the demo on this device.
            </p>
          )}
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', marginBottom: 20, border: '1px solid rgba(255,255,255,0.3)' }}>
            {(['sign-up', 'sign-in'] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setError(null); setInfo(null) }} style={{ ...authControl, flex: 1, border: 'none', background: mode === item ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff', fontWeight: 600 }}>
                {item === 'sign-up' ? '✨ Create account' : '🙏 Sign in'}
              </button>
            ))}
          </div>
          {mode === 'sign-up' && (
            <AuthField label="Your name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
          )}
          <AuthField label="Email" value={email} onChange={setEmail} placeholder="you@email.com" type="email" />
          <AuthField label="Password" value={password} onChange={setPassword} placeholder="At least 6 characters" type="password" />
          {error && <p style={{ color: '#FFE0E0', fontSize: TYPE.small, margin: '0 0 12px' }}>{error}</p>}
          {info && <p style={{ color: COLORS.gold, fontSize: TYPE.small, margin: '0 0 12px' }}>{info}</p>}
          <button type="button" disabled={busy} onClick={() => void submit()} style={{ ...authControl, width: '100%', border: 'none', background: `linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`, color: '#fff', fontWeight: 700, boxShadow: '0 4px 20px rgba(201,168,76,0.5)' }}>
            {busy ? 'Please wait…' : mode === 'sign-up' ? '🎉 Create account' : 'Sign in'}
          </button>
          <button type="button" disabled={busy} onClick={() => void google()} style={{ ...authControl, width: '100%', marginTop: 10, border: 'none', background: '#fff', color: COLORS.ink, fontWeight: 700 }}>
            Continue with Google
          </button>
          <button type="button" onClick={preview} style={{ ...authControl, width: '100%', marginTop: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', fontWeight: 600 }}>
            Preview demo
          </button>
          <p style={{ margin: '8px 0 0', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <a href={TERMS_OF_SERVICE_URL} target="_blank" rel="noreferrer" style={legalLink}>Terms of Service</a>
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" style={legalLink}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

const authControl = {
  height: SIZE.button,
  minHeight: SIZE.button,
  maxHeight: SIZE.button,
  boxSizing: 'border-box' as const,
  padding: '0 16px',
  borderRadius: 14,
  fontSize: TYPE.body,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const legalLink = {
  color: COLORS.gold,
  fontSize: TYPE.small,
  minHeight: SIZE.tap,
  minWidth: SIZE.tap,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 8px',
}

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: TYPE.small, fontWeight: 600, color: COLORS.gold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
      <input className="auth-input" style={{ width: '100%', height: SIZE.input, minHeight: SIZE.input, maxHeight: SIZE.input, boxSizing: 'border-box', padding: '0 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: TYPE.body, outline: 'none' }} placeholder={placeholder} type={type} value={value} onChange={(event) => onChange(event.target.value)} autoCapitalize={type === 'email' ? 'none' : 'words'} />
    </div>
  )
}
