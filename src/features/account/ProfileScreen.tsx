import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormError } from '../../components/ui.tsx'
import { canInvite, roleLabel } from '../../lib/access.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { validateWeddingSetup } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import type { Side } from '../../types.ts'

export function ProfileScreen() {
  const navigate = useNavigate()
  const { bundle, mode, canEdit, updateSettings } = useWedding()
  const [displayName, setDisplayName] = useState(bundle?.displayName ?? '')
  const [coupleNames, setCoupleNames] = useState(bundle?.wedding.coupleNames ?? '')
  const [weddingDate, setWeddingDate] = useState(bundle?.wedding.weddingDate ?? '')
  const [city, setCity] = useState(bundle?.wedding.city ?? '')
  const [side, setSide] = useState<Side>(bundle?.membership.side ?? 'bride')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    const validation = validateWeddingSetup({ displayName, coupleNames, weddingDate, city, side })
    if (validation) {
      setError(validation)
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await updateSettings({ displayName, coupleNames, weddingDate, city, side })
      setSaved(true)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#fff', fontWeight: 700 }}>Profile</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          {mode === 'preview' ? 'Preview on this device' : bundle ? roleLabel(bundle.membership.role, bundle.membership.side) : 'Signed in'}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <FormError message={error} />
        {saved && <p style={{ color: COLORS.green, fontSize: 13 }}>Saved.</p>}
        {bundle ? (
          <>
            <Field label="Your name" value={displayName} onChange={setDisplayName} disabled={!canEdit} />
            <Field label="Couple names" value={coupleNames} onChange={setCoupleNames} disabled={!canEdit} />
            <label style={caption}>Wedding date</label>
            <input style={{ ...inputStyle, marginBottom: 14 }} type="date" value={weddingDate} disabled={!canEdit} onChange={(event) => setWeddingDate(event.target.value)} />
            <Field label="City" value={city} onChange={setCity} disabled={!canEdit} />
            <label style={caption}>Your side</label>
            <select style={{ ...selectStyle, marginBottom: 16 }} value={side || 'bride'} disabled={!canEdit || bundle.membership.role === 'bride' || bundle.membership.role === 'groom' || bundle.membership.role === 'planner'} onChange={(event) => setSide(event.target.value as Side)}>
              <option value="bride">Bride's side</option>
              <option value="groom">Groom's side</option>
            </select>
            {canEdit && (
              <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
                {busy ? 'Saving…' : 'Save details'}
              </button>
            )}
            {(mode === 'preview' || canInvite(bundle.membership.role)) && (
              <button type="button" onClick={() => navigate('/invite')} style={secondaryButton}>
                Invite partner or family
              </button>
            )}
          </>
        ) : (
          <p style={{ color: '#5A2020', fontSize: 14, lineHeight: 1.5 }}>Finish setting up your wedding, or open Settings to manage this account.</p>
        )}
        <button type="button" onClick={() => navigate('/profile/feedback')} style={secondaryButton}>
          Send feedback
        </button>
        <button type="button" onClick={() => navigate('/profile/settings')} style={secondaryButton}>
          Settings
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <>
      <label style={caption}>{label}</label>
      <input style={{ ...inputStyle, marginBottom: 14 }} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </>
  )
}

const caption = { display: 'block', fontSize: 11, fontWeight: 600, color: COLORS.crimson, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const secondaryButton = { ...primaryButton('transparent'), color: COLORS.crimson, border: `1px solid ${COLORS.gold}`, marginTop: 10 }
