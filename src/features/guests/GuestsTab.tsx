import { useEffect, useState } from 'react'
import { Badge, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { DELETED_ITEM_MESSAGE, saveErrorPresentation, toErrorMessage } from '../../lib/errors.ts'
import { canDeleteGuestRow, canEditGuestRow, canEditGuests, guestSideChoices } from '../../lib/access.ts'
import { compareGuestNames, guestMatchesQuery, guestStatCounts } from '../../lib/guestTiles.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS, SIZE, TYPE } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import { headerPadding, listAboveFab } from '../../styles/safeArea.ts'
import type { Guest, GuestDraft, GuestSide, RsvpStatus } from '../../types.ts'
import { MEALS, RSVP_STATUSES } from '../../types.ts'
import { rsvpBySideEnabled } from '../onboarding/flag.ts'

const emptyForm = (side: GuestSide): GuestDraft => ({
  name: '',
  email: '',
  phone: '',
  status: 'Pending',
  meal: '',
  plusOnes: 0,
  side,
})

const statusColors: Record<string, string> = {
  Confirmed: COLORS.green,
  Pending: COLORS.orangeText,
  Maybe: COLORS.goldText,
  Declined: COLORS.danger,
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c.6-3 2.8-4.5 6-4.5S14.4 16 15 19" />
      <circle cx="17" cy="9" r="2.2" />
      <path d="M17 14.5c2.2.3 3.6 1.5 4.2 3.5" />
    </svg>
  )
}

type RsvpModule = typeof import('./RsvpBySide.tsx')
type GuestFilter = 'all' | 'side' | 'mutual'

export function GuestsTab() {
  const { bundle, mode, saveGuest, deleteGuest, refreshWedding } = useWedding()
  const role = bundle?.membership.role
  const viewerSide = bundle?.membership.side ?? null
  const canEdit = mode === 'preview' || canEditGuests(role)
  const planner = role === 'planner'
  const family = role === 'family'
  const showSideFilters = role === 'family' || role === 'friend'
  const ownSide = viewerSide === 'bride' || viewerSide === 'groom' ? viewerSide : null
  const sideChoices = guestSideChoices(role, ownSide)
  const defaultSide: GuestSide = planner ? 'both' : family && ownSide ? ownSide : ''
  const guests = [...(bundle?.guests ?? [])].sort((left, right) => compareGuestNames(left.name, right.name))
  const [filter, setFilter] = useState<GuestFilter>('all')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [form, setForm] = useState<GuestDraft>(() => emptyForm(defaultSide))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [rsvp, setRsvp] = useState<RsvpModule | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 150)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!rsvpBySideEnabled) return
    let active = true
    void import('./RsvpBySide.tsx').then((module) => {
      if (active) setRsvp(module)
    })
    return () => {
      active = false
    }
  }, [])

  const visible = guests.filter((guest) => {
    const sideOk = !showSideFilters || filter === 'all' || (filter === 'mutual' ? guest.side === 'both' : guest.side === viewerSide)
    return sideOk && guestMatchesQuery(guest, debouncedQuery)
  })
  const tiles = guestStatCounts(visible)
  const sideName = viewerSide === 'groom' ? "Groom's side" : "Bride's side"
  const header = !showSideFilters
    ? 'Guest list'
    : filter === 'mutual'
      ? 'Mutual guests'
      : filter === 'side'
        ? sideName
        : `${sideName} + Mutual guests`

  const openAdd = () => {
    setEditGuest(null)
    setForm(emptyForm(defaultSide))
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (guest: Guest) => {
    setEditGuest(guest)
    setForm({ name: guest.name, email: guest.email, phone: guest.phone, status: guest.status, meal: guest.meal, plusOnes: guest.plusOnes, side: guest.side })
    setError(null)
    setModalOpen(true)
  }
  const save = async () => {
    if (!form.name.trim()) {
      setError('Add the guest name.')
      return
    }
    if (planner && form.side !== 'bride' && form.side !== 'groom' && form.side !== 'both') {
      setError('Pick a side.')
      return
    }
    if (family && !sideChoices.includes(form.side)) {
      setError('Pick your side or Mutual.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveGuest(form, editGuest?.id)
      setModalOpen(false)
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        setModalOpen(false)
        setEditGuest(null)
        setError(DELETED_ITEM_MESSAGE)
        await refreshWedding()
        return
      }
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const Headcount = rsvp?.RsvpHeadcount
  const SideBadge = rsvp?.RsvpSideBadge

  return (
    <div style={{ paddingBottom: listAboveFab }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},${COLORS.crimson})`, padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#fff', fontWeight: 700 }}>{header}</div>
      </div>
      <section style={{ margin: 16, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(26,5,5,0.06)' }}>
        <div aria-hidden="true" style={{ height: 96, background: `linear-gradient(120deg,${COLORS.maroon} 0%,${COLORS.crimson} 55%,${COLORS.appBar} 100%)`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(200,164,90,0.35) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.18) 0 2px, transparent 3px)', backgroundSize: '28px 28px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, padding: 12 }}>
          {([
            ['Total', tiles.total, COLORS.ink],
            ['Confirmed', tiles.confirmed, COLORS.green],
            ['Pending', tiles.pending, COLORS.goldText],
            ['Declined', tiles.declined, COLORS.danger],
          ] as const).map(([label, value, color]) => (
            <div key={label} style={{ textAlign: 'center', background: '#FBF8F2', borderRadius: 12, padding: '10px 4px', minWidth: 0 }}>
              <div style={{ fontSize: TYPE.number, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: TYPE.small, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ minHeight: SIZE.tap, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: COLORS.roseTint, color: COLORS.crimson, fontSize: TYPE.small, fontWeight: 600 }}>
          <UsersIcon />
          <span>{tiles.attending} attending (incl. plus-ones)</span>
        </div>
      </section>
      <div style={{ padding: '0 16px 12px', position: 'relative' }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 28, top: 18, color: COLORS.muted, display: 'inline-flex' }}><SearchIcon /></span>
        <input
          className="guest-search"
          aria-label="Search guests"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, phone, email…"
          style={{ ...inputStyle, borderRadius: 16, paddingLeft: 40, paddingRight: query ? 48 : 14 }}
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery('')} style={{ position: 'absolute', right: 20, top: 2, minWidth: 48, minHeight: 48, border: 'none', background: 'transparent', color: COLORS.muted, fontSize: 18, cursor: 'pointer' }}>
            ×
          </button>
        )}
      </div>
      {showSideFilters && (
        <div className="count-chips" aria-label="Guest side">
          {([
            ['all', 'All'],
            ['side', sideName],
            ['mutual', 'Mutual'],
          ] as const).map(([value, label]) => {
            const selected = filter === value
            return (
              <button key={value} type="button" onClick={() => setFilter(value)} style={{ minHeight: SIZE.chip, padding: '0 16px', borderRadius: 999, border: selected ? 'none' : `1.5px solid ${COLORS.gold}`, background: selected ? COLORS.crimson : '#fff', color: selected ? '#fff' : COLORS.ink, fontSize: TYPE.small, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            )
          })}
        </div>
      )}
      {Headcount ? <Headcount guests={visible} /> : null}
      {error && !modalOpen && <div style={{ padding: '12px 16px 0' }}><FormError message={error} /></div>}
      <div style={{ padding: '14px 16px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.muted }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No guests yet</div>
          </div>
        ) : (
          visible.map((guest) => (
            <div key={guest.id} style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 700, color: COLORS.ink }}>{guest.name}</span>
                    <Badge color={statusColors[guest.status] || COLORS.muted}>{guest.status}</Badge>
                    {guest.side === 'both' && <Badge color={COLORS.crimson}>Mutual</Badge>}
                    {guest.side === 'bride' && <Badge color={COLORS.crimson}>Bride's side</Badge>}
                    {guest.side === 'groom' && <Badge color={COLORS.crimson}>Groom's side</Badge>}
                  </div>
                  {guest.email && <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{guest.email}</div>}
                  {guest.phone && <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>{guest.phone}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {guest.meal && <Badge color={COLORS.orangeText}>{guest.meal}</Badge>}
                    {guest.plusOnes > 0 && <Badge color={COLORS.goldText}>+{guest.plusOnes}</Badge>}
                    {SideBadge ? <SideBadge guest={guest} /> : null}
                  </div>
                </div>
                {canEdit && (canEditGuestRow(role, ownSide, guest.side) || canDeleteGuestRow(role, ownSide, guest.side)) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {canEditGuestRow(role, ownSide, guest.side) && (
                      <button type="button" aria-label="Edit guest" onClick={() => openEdit(guest)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: COLORS.crimson, minWidth: 48, minHeight: 48 }}>Edit</button>
                    )}
                    {canDeleteGuestRow(role, ownSide, guest.side) && (
                      <button type="button" aria-label="Delete guest" onClick={() => void deleteGuest(guest.id).catch((caught) => setError(toErrorMessage(caught)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: COLORS.danger, minWidth: 48, minHeight: 48 }}>Delete</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {canEdit && <FAB onClick={openAdd} />}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGuest ? 'Edit guest' : 'New guest'}>
        <FormError message={error} />
        <Field label="Name *">
          <input style={inputStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" />
        </Field>
        <Field label="Email">
          <input style={inputStyle} type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="email@example.com" />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+91 9876543210" />
        </Field>
        <Field label="RSVP status">
          <select style={selectStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as RsvpStatus }))}>
            {RSVP_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Meal preference">
            <select style={selectStyle} value={form.meal} onChange={(event) => setForm((current) => ({ ...current, meal: event.target.value }))}>
              {MEALS.map((meal) => <option key={meal || 'blank'} value={meal}>{meal || 'Not specified'}</option>)}
            </select>
          </Field>
          <Field label="Plus ones">
            <input style={inputStyle} inputMode="numeric" value={form.plusOnes} onChange={(event) => setForm((current) => ({ ...current, plusOnes: Number(event.target.value.replace(/\D/g, '') || 0) }))} />
          </Field>
        </div>
        <Field label="Side">
          <select
            style={selectStyle}
            value={form.side}
            onChange={(event) => setForm((current) => ({ ...current, side: event.target.value as GuestSide }))}
          >
            {sideChoices.map((side) => (
              <option key={side || 'unspecified'} value={side}>
                {side === 'bride' ? "Bride's side" : side === 'groom' ? "Groom's side" : side === 'both' ? 'Mutual' : 'Not specified'}
              </option>
            ))}
          </select>
        </Field>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton()}>
          {busy ? 'Saving…' : editGuest ? 'Save changes' : 'Add guest'}
        </button>
      </Modal>
    </div>
  )
}
