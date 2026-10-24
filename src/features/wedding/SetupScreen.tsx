import { useState } from 'react'
import { MehendiPattern } from '../../components/ui.tsx'
import { DEMO_BUDGET, DEMO_COUPLE_NAMES, DEMO_GUESTS, DEMO_MILESTONES, DEMO_TASKS, DEMO_WEDDING_DATE } from '../../data/demoData.ts'
import { HINDU_CHECKLIST } from '../../data/hinduChecklist.ts'
import { track } from '../../lib/analytics.ts'
import { displayNameFromUser } from '../../lib/auth.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateWeddingSetup } from '../../lib/planning.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import type { Side } from '../../types.ts'

export function SetupScreen() {
  const { session } = useAuth()
  const { createWedding } = useWedding()
  const [tab, setTab] = useState<'new' | 'demo'>('new')
  const [displayName, setDisplayName] = useState(displayNameFromUser(session?.user))
  const [coupleNames, setCoupleNames] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [side, setSide] = useState<Side>('bride')
  const [useChecklist, setUseChecklist] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async (seed: 'template' | 'demo' | 'empty') => {
    const input = {
      displayName,
      coupleNames: seed === 'demo' ? DEMO_COUPLE_NAMES : coupleNames,
      weddingDate: seed === 'demo' ? DEMO_WEDDING_DATE : weddingDate,
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
      track('wedding_created', { seed })
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 50%,${COLORS.saffron}44 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
      <MehendiPattern />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, animation: 'fadeIn 0.6s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💍</div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, color: '#fff', fontWeight: 900, margin: '0 0 8px' }}>Shaadi Wala</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>Plan your perfect day, stress-free</p>
          <div style={{ color: COLORS.lightGold, letterSpacing: 3, marginTop: 8, fontSize: 12 }}>🪔 ✨ 💐 ✨ 🪔</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,0.25)' }}>
          <Field label="Your name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.lightGold, marginBottom: 6, letterSpacing: 1 }}>YOUR SIDE</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bride', 'groom'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setSide(item)} style={{ flex: 1, padding: 10, borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', cursor: 'pointer', fontWeight: 600, background: side === item ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff' }}>
                  {item === 'bride' ? "Bride's side" : "Groom's side"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', marginBottom: 20, border: '1px solid rgba(255,255,255,0.3)' }}>
            {(['new', 'demo'] as const).map((item) => (
              <button key={item} type="button" onClick={() => setTab(item)} style={{ flex: 1, padding: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === item ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff' }}>
                {item === 'new' ? '✨ New Wedding' : '🔍 Demo'}
              </button>
            ))}
          </div>
          {tab === 'new' ? (
            <>
              <Field label="Couple names" value={coupleNames} onChange={setCoupleNames} placeholder="Priya & Rahul" />
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.lightGold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Wedding date</label>
                <input className="auth-input" style={fieldStyle} type="date" value={weddingDate} onChange={(event) => setWeddingDate(event.target.value)} />
              </div>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 16 }}>
                <input type="checkbox" checked={useChecklist} onChange={(event) => setUseChecklist(event.target.checked)} style={{ marginTop: 2, accentColor: COLORS.gold }} />
                <span>Start with the Hindu wedding checklist ({HINDU_CHECKLIST.length} rituals you can edit)</span>
              </label>
            </>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ color: '#FFD88B', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Sample wedding includes:</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.8 }}>
                💑 Couple: {DEMO_COUPLE_NAMES}<br />
                📅 Date: 20 June 2026<br />
                ✓ {DEMO_TASKS.length} Tasks · 💰 {DEMO_BUDGET.length} Budget items · 👥 {DEMO_GUESTS.length} Guests · 📅 {DEMO_MILESTONES.length} Milestones
              </div>
            </div>
          )}
          {error && <p style={{ color: '#FFE0E0', fontSize: 13, margin: '0 0 12px' }}>{error}</p>}
          <button type="button" disabled={busy} onClick={() => void create(tab === 'demo' ? 'demo' : useChecklist ? 'template' : 'empty')} style={{ width: '100%', padding: 14, borderRadius: 14, background: `linear-gradient(135deg,${COLORS.gold},${COLORS.saffron})`, border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(201,168,76,0.5)' }}>
            {busy ? 'Saving…' : tab === 'new' ? '🎉 Create Wedding Plan' : '🔍 Save sample wedding'}
          </button>
        </div>
      </div>
    </div>
  )
}

const fieldStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.4)',
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
} as const

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.lightGold, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>
      <input className="auth-input" style={fieldStyle} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
