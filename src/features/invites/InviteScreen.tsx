import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { MehendiPattern } from '../../components/ui.tsx'
import { COLORS } from '../../styles/tokens.ts'

export function InviteScreen() {
  const { token } = useParams()
  return (
    <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${COLORS.maroon},${COLORS.crimson})`, color: '#fff', padding: 32, position: 'relative' }}>
      <MehendiPattern />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 420, margin: '48px auto' }}>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, marginTop: 0 }}>Shaadi Wala</h1>
        <p style={{ lineHeight: 1.6 }}>
          Partner and family invite links are not available yet. The database already has a private invite table, and this address is reserved for them.
        </p>
        {token && <p style={{ fontSize: 13, color: COLORS.lightGold }}>This link ({token.slice(0, 8)}…) cannot be accepted yet.</p>}
        <Link to="/" style={{ color: COLORS.lightGold }}>Back to Shaadi Wala</Link>
      </div>
    </div>
  )
}
