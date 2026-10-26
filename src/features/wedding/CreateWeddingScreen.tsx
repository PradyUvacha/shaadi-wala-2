import { useState } from 'react'
import { MehendiPattern } from '../../components/ui.tsx'
import { demoWeddingDate } from '../../data/demoData.ts'
import { displayNameFromUser } from '../../lib/auth.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateWeddingSetup } from '../../lib/planning.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import type { Side } from '../../types.ts'

export function CreateWeddingScreen() {
  const { session } = useAuth()
  const { createWedding, notice, clearNotice } = useWedding()
  const [displayName, setDisplayName] = useState(displayNameFromUser(session?.user))
  const [coupleNames, setCoupleNames] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [city, setCity] = useState('')
  const [side, setSide] = useState<Side>('bride')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async (seed: 'template' | 'demo') => {
    const input = {
      displayName,
      coupleNames: seed === 'demo' ? 'Priya & Rahul' : coupleNames,
      weddingDate: seed === 'demo' ? demoWeddingDate() : weddingDate,
      city: seed === 'demo' ? 'Mumbai' : city,
      side,
    }
    const validation = validateWeddingSetup(input)
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createWedding({ ...input, seed })
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-fill" style={{ width: '100%', background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 55%,#C4481A 100%)`, padding: 'calc(28px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 20px calc(28px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', position: 'relative' }}>
      <MehendiPattern />
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        {notice && (
          <p style={{ background: '#FFF3E0', color: '#5A3010', borderRadius: 12, padding: 12, fontSize: 14 }}>
            {notice}
            <button type="button" onClick={clearNotice} style={{ marginLeft: 8, background: 'none', border: 'none', color: COLORS.crimson, fontWeight: 700, cursor: 'pointer' }}>Dismiss</button>
          </p>
        )}
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#fff', fontSize: 32, margin: '18px 0 8px' }}>Create the wedding</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 0 }}>You join as the bride or the groom. Then invite the other partner, parents, friends, and a planner. They pick their role and side from the invite.</p>
        <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: 20 }}>
          <Field label="Your name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
          <Field label="Couple names" value={coupleNames} onChange={setCoupleNames} placeholder="Priya & Rahul" />
          <Field label="Wedding date" value={weddingDate} onChange={setWeddingDate} type="date" />
          <Field label="City" value={city} onChange={setCity} placeholder="Mumbai" />
          <span style={{ display: 'block', color: COLORS.lightGold, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6 }}>YOU ARE</span>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['bride', 'groom'] as const).map((item) => (
              <button key={item} type="button" onClick={() => setSide(item)} style={choice(side === item)}>
                {item === 'bride' ? 'The bride' : 'The groom'}
              </button>
            ))}
          </div>
          {error && <p style={{ color: '#FFE0E0', fontSize: 13 }}>{error}</p>}
          <button type="button" disabled={busy} onClick={() => void create('template')} style={{ ...choice(true), width: '100%' }}>
            {busy ? 'Creating…' : 'Create wedding'}
          </button>
          <button type="button" disabled={busy} onClick={() => void create('demo')} style={{ ...choice(false), width: '100%', marginTop: 10 }}>
            Use the Priya & Rahul demo instead
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', color: COLORS.lightGold, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6 }}>{label.toUpperCase()}</span>
      <input className="auth-input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 16 }} />
    </label>
  )
}

function choice(active: boolean) {
  return {
    flex: '1 1 auto' as const,
    minHeight: 44,
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.35)',
    background: active ? 'rgba(255,255,255,0.28)' : 'transparent',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  }
}
