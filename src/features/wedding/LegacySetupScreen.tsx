import { useState } from 'react'
import { MehendiPattern } from '../../components/ui.tsx'
import { demoWeddingDate } from '../../data/demoData.ts'
import { HINDU_CHECKLIST } from '../../data/hinduChecklist.ts'
import { displayNameFromUser } from '../../lib/auth.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateWeddingSetup } from '../../lib/planning.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import type { Side } from '../../types.ts'

/** Parked wizard only. The live checklist reads wedding_functions, not this list. */
const PARKED_CEREMONIES = ['Roka', 'Sagai', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Vidaai', 'Reception'] as const
type ParkedCeremony = (typeof PARKED_CEREMONIES)[number]
import { ONBOARDING_STEPS } from '../onboarding/steps.ts'

/** Parked first-run wizard. Loaded only when legacyOnboardingEnabled is true. */
export function LegacySetupScreen() {
  const { session } = useAuth()
  const { createWedding } = useWedding()
  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState(displayNameFromUser(session?.user))
  const [coupleNames, setCoupleNames] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [city, setCity] = useState('')
  const [side, setSide] = useState<Side>('bride')
  const [ceremonies, setCeremonies] = useState<ParkedCeremony[]>([...PARKED_CEREMONIES])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const current = ONBOARDING_STEPS[step]

  const toggleCeremony = (ceremony: ParkedCeremony) => {
    setCeremonies((list) => (list.includes(ceremony) ? list.filter((item) => item !== ceremony) : [...list, ceremony]))
  }

  const next = () => {
    if (step === 0 && !displayName.trim()) return setError('Add your name.')
    if (step === 0 && !coupleNames.trim()) return setError("Add the couple's names.")
    if (step === 1 && !/^\d{4}-\d{2}-\d{2}$/.test(weddingDate)) return setError('Choose the wedding date.')
    if (step === 2 && !city.trim()) return setError('Add the city.')
    setError(null)
    setStep((value) => Math.min(value + 1, ONBOARDING_STEPS.length - 1))
  }

  const create = async (seed: 'template' | 'demo' | 'empty') => {
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
    if (seed === 'template' && ceremonies.length === 0) {
      setError('Pick at least one ceremony.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await createWedding({ ...input, seed, ceremonies: seed === 'template' ? ceremonies : [] })
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const chosen = new Set<string>(ceremonies)
  const chosenCount = HINDU_CHECKLIST.filter((item) => chosen.has(item.ceremony)).length

  return (
    <div className="page-fill" style={{ background: `linear-gradient(160deg,${COLORS.maroon} 0%,${COLORS.crimson} 55%,#C4481A 100%)`, padding: 'calc(28px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 20px calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', position: 'relative' }}>
      <MehendiPattern />
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{step + 1} / {ONBOARDING_STEPS.length}</div>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#fff', fontSize: 32, margin: '0 0 8px' }}>Shaadi Wala</h1>
        <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: 0 }}>{current?.title}</p>
        <div style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: 20 }}>
          {step === 0 && (
            <>
              <LightField label="Your name" value={displayName} onChange={setDisplayName} placeholder="Your name" />
              <LightField label="Couple names" value={coupleNames} onChange={setCoupleNames} placeholder="Priya & Rahul" />
            </>
          )}
          {step === 1 && <LightField label="Wedding date" value={weddingDate} onChange={setWeddingDate} type="date" />}
          {step === 2 && <LightField label="City" value={city} onChange={setCity} placeholder="Mumbai" />}
          {step === 3 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bride', 'groom'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setSide(item)} style={choice(side === item)}>
                  {item === 'bride' ? "Bride's side" : "Groom's side"}
                </button>
              ))}
            </div>
          )}
          {step === 4 && (
            <>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 0 }}>{chosenCount} rituals from the Hindu checklist. You can edit or delete any of them later.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PARKED_CEREMONIES.map((ceremony) => (
                  <button key={ceremony} type="button" onClick={() => toggleCeremony(ceremony)} style={choice(ceremonies.includes(ceremony))}>
                    {ceremony}
                  </button>
                ))}
              </div>
            </>
          )}
          {error && <p style={{ color: '#FFE0E0', fontSize: 14 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {step > 0 && (
              <button type="button" onClick={() => { setError(null); setStep((value) => value - 1) }} style={{ ...choice(false), flex: 1 }}>Back</button>
            )}
            {step < ONBOARDING_STEPS.length - 1 ? (
              <button type="button" onClick={next} style={{ ...choice(true), flex: 1 }}>Next</button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void create('template')} style={{ ...choice(true), flex: 1 }}>
                {busy ? 'Creating…' : 'Create wedding'}
              </button>
            )}
          </div>
          {step === ONBOARDING_STEPS.length - 1 && (
            <button type="button" disabled={busy} onClick={() => void create('demo')} style={{ ...choice(false), width: '100%', marginTop: 10 }}>
              Use the Priya & Rahul demo instead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function LightField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ display: 'block', color: COLORS.gold, fontSize: 14, fontWeight: 700, letterSpacing: 0.6, marginBottom: 6 }}>{label.toUpperCase()}</span>
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
