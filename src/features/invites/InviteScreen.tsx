import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MehendiPattern } from '../../components/ui.tsx'
import { roleLabel } from '../../lib/access.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { useAuth } from '../../state/auth-context.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import type { InviteRole, Side, WeddingInvite } from '../../types.ts'
import { inviteLink, isInviteCode, normalizeInviteCode } from './code.ts'

export function InviteScreen() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { bundle, canEdit, createInvite, listInvites, acceptInvite } = useWedding()
  const [role, setRole] = useState<InviteRole>('editor')
  const [side, setSide] = useState<Side>(bundle?.membership.side ?? 'bride')
  const [code, setCode] = useState(normalizeInviteCode(token ?? ''))
  const [invites, setInvites] = useState<WeddingInvite[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const joining = Boolean(token)

  useEffect(() => {
    if (!session || !bundle || !canEdit || joining) return
    void listInvites().then(setInvites).catch((caught: unknown) => setError(toErrorMessage(caught)))
  }, [session, bundle, canEdit, joining, listInvites])

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const created = await createInvite(role, side)
      setInvites((current) => [created, ...current])
      setInfo(`Share code ${created.code}`)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const accept = async () => {
    if (!session) {
      navigate(`/auth?next=${encodeURIComponent(`/invite/${normalizeInviteCode(code)}`)}`)
      return
    }
    if (!isInviteCode(code)) {
      setError('Enter the 6-digit invite code.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await acceptInvite(normalizeInviteCode(code))
      navigate('/', { replace: true })
    } catch (caught) {
      setError(toErrorMessage(caught))
      setBusy(false)
    }
  }

  const origin = typeof window === 'undefined' ? 'https://shaadi-wala-2.vercel.app' : window.location.origin

  return (
    <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${COLORS.maroon},${COLORS.crimson})`, color: '#fff', padding: 'calc(28px + var(--safe-area-inset-top, env(safe-area-inset-top, 0px))) 20px calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))', position: 'relative' }}>
      <MehendiPattern />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 440, margin: '0 auto' }}>
        <Link to={bundle ? '/profile' : '/'} style={{ color: COLORS.lightGold, fontWeight: 700, textDecoration: 'none' }}>{bundle ? 'Profile' : 'Shaadi Wala'}</Link>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32 }}>{joining ? 'Join a wedding' : 'Invite partner or family'}</h1>
        {joining || !bundle ? (
          <>
            <p>Enter the 6-digit code, or open the link your family shared.</p>
            <input value={code} onChange={(event) => setCode(normalizeInviteCode(event.target.value))} inputMode="numeric" aria-label="Invite code" placeholder="6-digit code" style={field} />
            <button type="button" disabled={busy} onClick={() => void accept()} style={button}>{session ? 'Accept invite' : 'Sign in to accept'}</button>
          </>
        ) : canEdit ? (
          <>
            <p>Owners and editors can invite. An editor can change the plan. A viewer can look, and cannot change it.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {(['editor', 'viewer'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setRole(item)} style={choice(role === item)}>{roleLabel(item)}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['bride', 'groom'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setSide(item)} style={choice(side === item)}>{item === 'bride' ? "Bride's side" : "Groom's side"}</button>
              ))}
            </div>
            <button type="button" disabled={busy} onClick={() => void create()} style={button}>{busy ? 'Creating…' : 'Create link and code'}</button>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {invites.map((invite) => (
                <li key={`${invite.id}-${invite.code}`} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 22, letterSpacing: 3, fontWeight: 800 }}>{invite.code}</div>
                  <div style={{ fontSize: 13 }}>{roleLabel(invite.role)} · {invite.side === 'bride' ? "Bride's side" : "Groom's side"} · {invite.acceptedAt ? 'Accepted' : 'Waiting'}</div>
                  {!invite.acceptedAt && <div style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 6 }}>{inviteLink(origin, invite.code)}</div>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>You have view-only access, so you cannot send invites.</p>
        )}
        {info && <p style={{ color: COLORS.lightGold }}>{info}</p>}
        {error && <p style={{ color: '#FFE0E0' }}>{error}</p>}
      </div>
    </div>
  )
}

const field = { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 20, letterSpacing: 4, marginBottom: 12 }
const button = { width: '100%', minHeight: 48, border: 'none', borderRadius: 14, background: COLORS.gold, color: '#3C1515', fontWeight: 800, cursor: 'pointer' }
function choice(active: boolean) {
  return { flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', background: active ? 'rgba(255,255,255,0.28)' : 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' }
}
