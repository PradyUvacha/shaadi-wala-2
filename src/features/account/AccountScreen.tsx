import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { appConfig } from '../../config/app.ts'
import { FormError } from '../../components/ui.tsx'
import { deleteAccount } from './deleteAccount.ts'
import { signOut } from '../../lib/auth.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateWeddingSetup } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import type { Side } from '../../types.ts'

export function AccountScreen() {
  const navigate = useNavigate()
  const { bundle, mode, updateSettings } = useWedding()
  const [displayName, setDisplayName] = useState(bundle?.displayName ?? '')
  const [coupleNames, setCoupleNames] = useState(bundle?.wedding.coupleNames ?? '')
  const [weddingDate, setWeddingDate] = useState(bundle?.wedding.weddingDate ?? '')
  const [side, setSide] = useState<Side>(bundle?.membership.side ?? 'bride')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const validation = validateWeddingSetup({ displayName, coupleNames, weddingDate, side })
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateSettings({ displayName, coupleNames, weddingDate, side })
      setSaved(true)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (mode === 'preview') {
      navigate('/auth')
      return
    }
    await signOut()
    navigate('/auth')
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: '52px 20px 20px' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700 }}>Account</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{mode === 'preview' ? 'Preview on this device' : 'Saved to your wedding'}</div>
      </div>
      <div style={{ padding: 16 }}>
        <FormError message={error} />
        {saved && <p style={{ color: COLORS.green, fontSize: 13 }}>Saved.</p>}
        <label style={caption}>Your name</label>
        <input style={{ ...inputStyle, marginBottom: 14 }} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <label style={caption}>Couple names</label>
        <input style={{ ...inputStyle, marginBottom: 14 }} value={coupleNames} onChange={(event) => setCoupleNames(event.target.value)} />
        <label style={caption}>Wedding date</label>
        <input style={{ ...inputStyle, marginBottom: 14 }} type="date" value={weddingDate} onChange={(event) => setWeddingDate(event.target.value)} />
        <label style={caption}>Your side</label>
        <select style={{ ...selectStyle, marginBottom: 16 }} value={side} onChange={(event) => setSide(event.target.value as Side)}>
          <option value="bride">Bride's side</option>
          <option value="groom">Groom's side</option>
        </select>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Saving…' : 'Save details'}
        </button>
        <button type="button" onClick={() => navigate('/invite')} style={{ ...primaryButton('transparent'), color: COLORS.crimson, border: `1px solid ${COLORS.gold}`, marginTop: 10 }}>
          Invite partner or family
        </button>
        <button type="button" onClick={() => void leave().catch((caught) => setError(toErrorMessage(caught)))} style={{ ...primaryButton('transparent'), color: COLORS.crimson, border: `1px solid ${COLORS.parchment}`, marginTop: 10 }}>
          {mode === 'preview' ? 'Leave preview and sign in' : 'Sign out'}
        </button>
        <button
          type="button"
          onClick={() => void deleteAccount().catch((caught) => setError(toErrorMessage(caught)))}
          style={{ ...primaryButton('transparent'), color: '#CC4444', border: '1px solid #E7C1C1', marginTop: 18 }}
        >
          Delete account
        </button>
        <p style={{ fontSize: 12, color: '#8B5050', lineHeight: 1.5 }}>
          In-app account deletion is not available yet. The button is here so the next update can turn it on without moving the screen.
        </p>
        <p style={{ fontSize: 11, color: '#A08080', marginTop: 24 }}>
          {appConfig.appName} · {appConfig.versionName} · versionCode {appConfig.versionCode}
        </p>
      </div>
    </div>
  )
}

const caption = { display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.crimson, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
