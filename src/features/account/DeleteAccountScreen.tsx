import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormError } from '../../components/ui.tsx'
import { DELETE_ACCOUNT_URL } from '../../lib/legal.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton } from '../../styles/ui.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'
import { deleteAccount, isExactDeleteConfirmation } from './deleteAccount.ts'

export function DeleteAccountScreen() {
  const navigate = useNavigate()
  const { mode } = useWedding()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const ready = isExactDeleteConfirmation(confirm)

  const submit = async () => {
    if (!ready) {
      setError('Type DELETE to confirm.')
      return
    }
    if (mode === 'preview') {
      setError('This preview is only on this device. Sign in to delete a Shaadi Wala account.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await deleteAccount()
      navigate('/auth', { replace: true })
    } catch (caught) {
      setError(toErrorMessage(caught))
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <button type="button" onClick={() => navigate('/profile/settings')} style={{ background: 'transparent', border: 'none', color: COLORS.lightGold, padding: '0 0 8px', fontWeight: 700, cursor: 'pointer' }}>Settings</button>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#fff', fontWeight: 700 }}>Delete account</div>
      </div>
      <div style={{ padding: 16, color: '#3C1515', fontSize: 14, lineHeight: 1.55 }}>
        <p>You can delete your account and data at any time.</p>
        <p><strong>What gets deleted.</strong> Your profile and membership. If the bride or groom deletes their account, that slot is freed and the wedding stays so the other can invite a replacement. If both the bride and the groom delete their accounts, the wedding and its data are deleted. If a parent, friend, or planner deletes their account, their membership is removed and tasks assigned to them become unassigned.</p>
        <p><strong>What we may keep.</strong> Payment records we are legally required to retain, for up to 8 years. Everything else is deleted within 30 days.</p>
        <p>
          You can also use the web page{' '}
          <a href={DELETE_ACCOUNT_URL} target="_blank" rel="noreferrer">shaadi-wala.in/delete-account</a>
          {' '}or email contact@shaadi-wala.in from your registered address with the subject “Delete my account”.
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, margin: '16px 0 6px' }}>Type DELETE to confirm</label>
        <input style={inputStyle} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" aria-label="Type DELETE to confirm" />
        <FormError message={error} />
        <button type="button" disabled={!ready || busy} onClick={() => void submit()} style={{ ...primaryButton(ready ? '#8B1E1E' : '#C9A8A8'), marginTop: 16 }}>
          {busy ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </div>
  )
}
