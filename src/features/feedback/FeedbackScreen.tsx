import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormError } from '../../components/ui.tsx'
import { toErrorMessage } from '../../lib/errors.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton } from '../../styles/ui.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import { submitFeedback } from './submitFeedback.ts'

export function FeedbackScreen() {
  const navigate = useNavigate()
  const { bundle, mode } = useWedding()
  const [message, setMessage] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'preview') throw new Error('Sign in to send feedback. This preview stays on this device.')
      await submitFeedback(message, rating, bundle?.wedding.id)
      setSent(true)
      setMessage('')
      setRating(null)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <button type="button" onClick={() => navigate('/profile')} style={{ background: 'transparent', border: 'none', color: COLORS.lightGold, padding: '0 0 8px', fontWeight: 700, cursor: 'pointer' }}>Profile</button>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#fff', fontWeight: 700 }}>Feedback</div>
      </div>
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 13, color: '#5A2020', lineHeight: 1.5 }}>Tell us what would help. Text only — do not include a screenshot.</p>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" aria-pressed={rating === value} onClick={() => setRating(rating === value ? null : value)} style={{ flex: 1, minHeight: 44, borderRadius: 12, border: `1px solid ${COLORS.gold}`, background: rating === value ? COLORS.gold : '#fff', color: rating === value ? '#3C1515' : COLORS.crimson, fontWeight: 700, cursor: 'pointer' }}>
              {value}
            </button>
          ))}
        </div>
        <textarea style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What should we improve?" />
        <FormError message={error} />
        {sent && <p style={{ color: COLORS.green, fontSize: 13 }}>Thank you. We read every note.</p>}
        <button type="button" disabled={busy} onClick={() => void send()} style={{ ...primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`), marginTop: 16 }}>
          {busy ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </div>
  )
}
