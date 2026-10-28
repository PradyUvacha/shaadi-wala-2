import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { aboutVersionLabel } from '../../config/about.ts'
import { appConfig } from '../../config/app.ts'
import { commitSha } from '../../config/buildMeta.ts'
import { FormError } from '../../components/ui.tsx'
import { signOut } from '../../lib/auth.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../lib/legal.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { primaryButton } from '../../styles/ui.ts'
import { headerPadding, screenBottom } from '../../styles/safeArea.ts'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { mode, leavePreview } = useWedding()
  const [error, setError] = useState<string | null>(null)

  const leave = async () => {
    if (mode === 'preview') {
      leavePreview()
      navigate('/auth')
      return
    }
    await signOut()
    navigate('/auth')
  }

  return (
    <div style={{ paddingBottom: screenBottom }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <button type="button" onClick={() => navigate('/profile')} style={backButton}>Profile</button>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 28, color: '#fff', fontWeight: 700 }}>Settings</div>
      </div>
      <div style={{ padding: 16 }}>
        <FormError message={error} />
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer" style={linkRow}>Privacy Policy</a>
        <a href={TERMS_OF_SERVICE_URL} target="_blank" rel="noreferrer" style={linkRow}>Terms of Service</a>
        <button type="button" onClick={() => void leave().catch((caught) => setError(toErrorMessage(caught)))} style={{ ...primaryButton('transparent'), color: COLORS.crimson, border: `1px solid ${COLORS.gold}`, marginTop: 16 }}>
          {mode === 'preview' ? 'Leave preview and sign in' : 'Sign out'}
        </button>
        <button type="button" onClick={() => navigate('/profile/settings/delete-account')} style={{ ...primaryButton('transparent'), color: '#CC4444', border: '1px solid #E7C1C1', marginTop: 18 }}>
          Delete account
        </button>
        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, color: COLORS.crimson, margin: '28px 0 8px' }}>About</h2>
        <p style={{ fontSize: 16, color: COLORS.muted, margin: 0 }}>
          {aboutVersionLabel({
            versionName: appConfig.versionName,
            versionCode: appConfig.versionCode,
            commitSha,
          })}
        </p>
        <p style={{ fontSize: 16, color: COLORS.ink, margin: '8px 0 0' }}>Design by Sushrut.</p>
      </div>
    </div>
  )
}

const backButton = { background: 'transparent', border: 'none', color: COLORS.gold, padding: '0 0 8px', fontWeight: 700, cursor: 'pointer', fontSize: 16 }
const linkRow = { display: 'flex', alignItems: 'center', minHeight: 48, padding: '14px 0', borderBottom: '1px solid #E8D4B0', color: COLORS.crimson, fontWeight: 600, textDecoration: 'none', fontSize: 16 }
