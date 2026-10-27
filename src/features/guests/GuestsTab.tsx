import { useEffect, useState, type CSSProperties } from 'react'
import { FAB, FormError } from '../../components/ui.tsx'
import { DELETED_ITEM_MESSAGE, saveErrorPresentation, toErrorMessage } from '../../lib/errors.ts'
import { canDeleteGuestRow, canEditGuestRow, canEditGuests, guestIncluded, guestListFilters, guestSideChoices, type GuestListFilter } from '../../lib/access.ts'
import { compareGuestNames, guestAvatarColor, guestEmailProblem, guestFunctionLine, guestInitials, guestMatchesQuery, guestNameProblem, guestPhoneProblem, guestStatCounts, mealPillLabel, mealUsesLeaf } from '../../lib/guestTiles.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS, SIZE, TYPE } from '../../styles/tokens.ts'
import { inputStyle, primaryButton } from '../../styles/ui.ts'
import { listAboveFab, safeBottom } from '../../styles/safeArea.ts'
import type { Guest, GuestDraft, GuestSide, RsvpStatus } from '../../types.ts'
import { rsvpBySideEnabled } from '../onboarding/flag.ts'

const SIDE_OPTIONS: { value: GuestSide; label: string }[] = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'both', label: 'Mutual' },
]

const RSVP_OPTIONS: RsvpStatus[] = ['Pending', 'Confirmed', 'Declined', 'Maybe']
const STATUS_FILTERS = ['Confirmed', 'Pending', 'Declined'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const MEAL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'Vegetarian', label: 'Veg' },
  { value: 'Non-Vegetarian', label: 'Non-veg' },
  { value: 'Jain', label: 'Jain' },
  { value: 'Vegan', label: 'Vegan' },
]

const emptyForm = (side: GuestSide): GuestDraft => ({
  name: '',
  email: '',
  phone: '',
  status: 'Pending',
  meal: '',
  plusOnes: 0,
  side,
  functionIds: [],
})

const groupLabel: CSSProperties = {
  fontSize: TYPE.small,
  fontWeight: 600,
  color: COLORS.goldText,
  letterSpacing: '0.06em',
}

function choiceChip(selected: boolean, disabled = false): CSSProperties {
  return {
    minHeight: SIZE.chip,
    padding: '0 16px',
    borderRadius: 999,
    border: selected ? 'none' : `1.5px solid ${COLORS.gold}`,
    background: selected ? COLORS.crimson : '#fff',
    color: selected ? '#fff' : COLORS.ink,
    fontSize: TYPE.small,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  }
}

function stepButton(disabled: boolean): CSSProperties {
  return {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
    borderRadius: 12,
    border: `1.5px solid ${disabled ? COLORS.border : COLORS.gold}`,
    background: '#fff',
    color: disabled ? COLORS.muted : COLORS.ink,
    fontSize: 20,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
  }
}

function LeafIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 19C14 19 19 14 19 5c-9 0-14 5-14 14z" />
      <path d="M8 16c2-2 4-5 7-8" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function rsvpStyle(status: string): CSSProperties {
  if (status === 'Confirmed') return { background: COLORS.greenTint, color: COLORS.greenText, border: '1px solid transparent' }
  if (status === 'Declined') return { background: COLORS.dangerTint, color: COLORS.danger, border: '1px solid transparent' }
  if (status === 'Maybe') return { background: '#fff', color: COLORS.muted, border: `1px solid ${COLORS.border}` }
  return { background: COLORS.goldTint, color: COLORS.goldText, border: '1px solid transparent' }
}

type RsvpModule = typeof import('./RsvpBySide.tsx')
type FieldErrors = { name?: string; phone?: string; email?: string; side?: string }

export function GuestsTab() {
  const { bundle, mode, saveGuest, deleteGuest, refreshWedding } = useWedding()
  const role = bundle?.membership.role
  const viewerSide = bundle?.membership.side ?? null
  const canEdit = mode === 'preview' || canEditGuests(role)
  const planner = role === 'planner'
  const family = role === 'family'
  const limited = family || role === 'friend'
  const ownSide = viewerSide === 'bride' || viewerSide === 'groom' ? viewerSide : null
  const sideChoices = guestSideChoices(role, ownSide)
  const sideChips = guestListFilters(role, ownSide)
  const defaultSide: GuestSide = planner ? 'both' : (ownSide ?? '')
  const functions = [...(bundle?.functions ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const guests = [...(bundle?.guests ?? [])].sort((left, right) => compareGuestNames(left.name, right.name))
  const [filter, setFilter] = useState<GuestListFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [form, setForm] = useState<GuestDraft>(() => emptyForm(defaultSide))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
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

  const scoped = guests.filter((guest) => guestIncluded(role, ownSide, 'all', guest.side))
  const tiles = guestStatCounts(scoped)
  const visible = scoped.filter((guest) => {
    if (statusFilter && guest.status !== statusFilter) return false
    if (!guestIncluded(role, ownSide, filter, guest.side)) return false
    return guestMatchesQuery(guest, debouncedQuery)
  })
  const filtersActive = debouncedQuery.trim() !== '' || filter !== 'all' || statusFilter !== null
  const sideHeading = ownSide === 'groom' ? "Groom's side + Mutual guests" : "Bride's side + Mutual guests"
  const plusMax = Math.max(20, editGuest?.plusOnes ?? 0)
  const sideOptions = SIDE_OPTIONS.filter((option) => sideChoices.includes(option.value))

  const openAdd = () => {
    setEditGuest(null)
    setForm(emptyForm(defaultSide))
    setFieldErrors({})
    setError(null)
    setConfirmDelete(false)
    setModalOpen(true)
  }
  const openEdit = (guest: Guest) => {
    setEditGuest(guest)
    setForm({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      status: guest.status,
      meal: guest.meal,
      plusOnes: guest.plusOnes,
      side: guest.side,
      functionIds: [...(guest.functionIds ?? [])],
    })
    setFieldErrors({})
    setError(null)
    setConfirmDelete(false)
    setModalOpen(true)
  }
  const closeSheet = () => {
    setModalOpen(false)
    setConfirmDelete(false)
  }
  const clearFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setFilter('all')
    setStatusFilter(null)
  }
  const save = async () => {
    const nextErrors: FieldErrors = {}
    const nameError = guestNameProblem(form.name)
    const phoneError = guestPhoneProblem(form.phone)
    const emailError = guestEmailProblem(form.email)
    if (nameError) nextErrors.name = nameError
    if (phoneError) nextErrors.phone = phoneError
    if (emailError) nextErrors.email = emailError
    const sideMissing = form.side !== 'bride' && form.side !== 'groom' && form.side !== 'both'
    if (!editGuest && sideMissing) nextErrors.side = 'Pick a side.'
    if (family && form.side !== ownSide && form.side !== 'both') nextErrors.side = 'Pick a side.'
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    setBusy(true)
    setError(null)
    try {
      await saveGuest(form, editGuest?.id)
      closeSheet()
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        closeSheet()
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
  const remove = async () => {
    if (!editGuest) return
    setBusy(true)
    setError(null)
    try {
      await deleteGuest(editGuest.id)
      closeSheet()
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const Headcount = rsvp?.RsvpHeadcount
  const SideBadge = rsvp?.RsvpSideBadge
  const toggleFunction = (id: string) => {
    setForm((current) => {
      const selected = new Set(current.functionIds ?? [])
      if (selected.has(id)) selected.delete(id)
      else selected.add(id)
      return { ...current, functionIds: [...selected] }
    })
  }

  return (
    <div style={{ paddingBottom: listAboveFab }}>
      <section style={{ margin: 16, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 12, boxShadow: '0 1px 3px rgba(26,5,5,0.06)' }}>
        {limited && <div style={{ fontSize: TYPE.body, fontWeight: 600, color: COLORS.ink, marginBottom: 8 }}>{sideHeading}</div>}
        <div className="guest-stats">
          {([
            ['INVITED', tiles.invited, COLORS.ink],
            ['CONFIRMED', tiles.confirmed, COLORS.green],
            ['PENDING', tiles.pending, COLORS.goldText],
            ['DECLINED', tiles.declined, COLORS.danger],
          ] as const).map(([label, value, color]) => (
            <div key={label} style={{ textAlign: 'center', background: '#FBF8F2', borderRadius: 12, padding: '10px 4px', minWidth: 0 }}>
              <div style={{ fontSize: TYPE.number, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
              <div style={{ fontSize: TYPE.small, color: COLORS.muted, fontWeight: 600, letterSpacing: '0.04em' }}>{label}</div>
            </div>
          ))}
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
          <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); setDebouncedQuery('') }} style={{ position: 'absolute', right: 20, top: 2, minWidth: 48, minHeight: 48, border: 'none', background: 'transparent', color: COLORS.muted, fontSize: 18, cursor: 'pointer' }}>
            ×
          </button>
        )}
      </div>
      <div className="guest-filters" aria-label="Guest filters">
        {sideChips.map((chip) => {
          const selected = filter === chip.value
          return (
            <button key={chip.value} type="button" aria-pressed={selected} onClick={() => setFilter(chip.value)} style={choiceChip(selected)}>
              {chip.label}
            </button>
          )
        })}
        {sideChips.length > 0 && <span className="guest-filter-divider" aria-hidden="true" />}
        {STATUS_FILTERS.map((status) => {
          const selected = statusFilter === status
          return (
            <button key={status} type="button" aria-pressed={selected} onClick={() => setStatusFilter(selected ? null : status)} style={choiceChip(selected)}>
              {status}
            </button>
          )
        })}
      </div>
      {Headcount ? <Headcount guests={visible} /> : null}
      {error && !modalOpen && <div style={{ padding: '12px 16px 0' }}><FormError message={error} /></div>}
      <div style={{ padding: '4px 16px 14px' }}>
        {visible.length === 0 ? (
          filtersActive ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: COLORS.muted, fontSize: TYPE.body }}>
              No guests match.{' '}
              <button type="button" onClick={clearFilters} style={{ minHeight: 48, padding: '0 12px', border: 'none', background: 'transparent', color: COLORS.crimson, fontSize: TYPE.body, fontWeight: 600, cursor: 'pointer' }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.muted }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No guests yet</div>
            </div>
          )
        ) : (
          visible.map((guest) => {
            const meal = mealPillLabel(guest.meal)
            const editable = canEdit && canEditGuestRow(role, ownSide, guest.side)
            const invited = guestFunctionLine(functions.filter((fn) => (guest.functionIds ?? []).includes(fn.id)).map((fn) => fn.name))
            return (
              <div key={guest.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 12, marginBottom: 10, minHeight: 72 }}>
                <button type="button" onClick={() => { if (editable) openEdit(guest) }} aria-label={editable ? `Edit ${guest.name}` : guest.name} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0, minHeight: 48, padding: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: editable ? 'pointer' : 'default', color: 'inherit' }}>
                  <span aria-hidden="true" style={{ width: SIZE.avatar, height: SIZE.avatar, borderRadius: '50%', background: guestAvatarColor(guest.name), color: '#fff', fontSize: TYPE.small, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{guestInitials(guest.name)}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 600, color: COLORS.ink, overflow: 'hidden', textOverflow: 'ellipsis' }}>{guest.name}</span>
                    <span style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...rsvpStyle(guest.status), borderRadius: 999, padding: '4px 10px', fontSize: TYPE.small, fontWeight: 600 }}>{guest.status}</span>
                      {meal && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: '4px 10px', fontSize: TYPE.small, fontWeight: 600, color: COLORS.ink }}>
                          {mealUsesLeaf(guest.meal) ? <LeafIcon /> : null}
                          {meal}
                        </span>
                      )}
                      {SideBadge ? <SideBadge guest={guest} /> : null}
                    </span>
                    {invited && <span style={{ display: 'block', marginTop: 6, fontSize: TYPE.small, color: COLORS.muted }}>{invited}</span>}
                  </span>
                </button>
                {guest.plusOnes > 0 && (
                  <span style={{ background: COLORS.goldTint, color: COLORS.goldText, borderRadius: 999, padding: '4px 10px', fontSize: TYPE.small, fontWeight: 600, flexShrink: 0 }}>+{guest.plusOnes}</span>
                )}
              </div>
            )
          })
        )}
      </div>
      {canEdit && <FAB onClick={openAdd} />}
      {modalOpen && (
        <div
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-end', background: 'rgba(0,0,0,0.6)' }}
          onClick={(event) => { if (event.target === event.currentTarget) closeSheet() }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="guest-sheet-title" className="sheet-panel" style={{ width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: COLORS.ivory, borderRadius: '24px 24px 0 0', overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 56, flex: '0 0 56px', background: `linear-gradient(135deg,${COLORS.appBar},${COLORS.maroon})`, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
              <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: '50%', width: 42, height: 4, marginLeft: -21, borderRadius: 999, background: 'rgba(255,255,255,0.55)' }} />
              <h2 id="guest-sheet-title" style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{editGuest ? 'Edit Guest' : 'Add Guest'}</h2>
            </div>
            <div style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && <FormError message={error} />}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: TYPE.body, color: COLORS.muted }}>Full name</span>
                  <span style={{ fontSize: TYPE.small, color: COLORS.muted }}>Required</span>
                </span>
                <input style={inputStyle} autoCapitalize="words" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                {fieldErrors.name && <span style={{ color: COLORS.danger, fontSize: TYPE.small }}>{fieldErrors.name}</span>}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: TYPE.body, color: COLORS.muted }}>Phone</span>
                <input style={inputStyle} type="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
                {fieldErrors.phone && <span style={{ color: COLORS.danger, fontSize: TYPE.small }}>{fieldErrors.phone}</span>}
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: TYPE.body, color: COLORS.muted }}>Email</span>
                <input style={inputStyle} type="email" inputMode="email" autoCapitalize="none" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                {fieldErrors.email && <span style={{ color: COLORS.danger, fontSize: TYPE.small }}>{fieldErrors.email}</span>}
              </label>
              <div>
                <div style={groupLabel}>SIDE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {sideOptions.map((option) => {
                    const selected = form.side === option.value
                    return (
                      <button key={option.value} type="button" aria-pressed={selected} onClick={() => setForm((current) => ({ ...current, side: option.value }))} style={choiceChip(selected)}>
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                {fieldErrors.side && <div style={{ color: COLORS.danger, fontSize: TYPE.small, marginTop: 6 }}>{fieldErrors.side}</div>}
              </div>
              <div>
                <div style={groupLabel}>RSVP STATUS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {RSVP_OPTIONS.map((status) => {
                    const selected = form.status === status
                    return (
                      <button key={status} type="button" aria-pressed={selected} onClick={() => setForm((current) => ({ ...current, status }))} style={choiceChip(selected)}>
                        {status}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div style={groupLabel}>MEAL PREFERENCE</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {MEAL_OPTIONS.map((meal) => {
                    const selected = form.meal === meal.value
                    return (
                      <button key={meal.label} type="button" aria-pressed={selected} onClick={() => setForm((current) => ({ ...current, meal: meal.value }))} style={choiceChip(selected)}>
                        {meal.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: TYPE.body, color: COLORS.muted, marginBottom: 8 }}>Plus-ones</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button type="button" aria-label="Fewer plus-ones" disabled={form.plusOnes <= 0} onClick={() => setForm((current) => ({ ...current, plusOnes: Math.max(0, current.plusOnes - 1) }))} style={stepButton(form.plusOnes <= 0)}>−</button>
                  <span style={{ width: 32, textAlign: 'center', fontSize: TYPE.body, fontWeight: 600, color: COLORS.ink }}>{form.plusOnes}</span>
                  <button type="button" aria-label="More plus-ones" disabled={form.plusOnes >= plusMax} onClick={() => setForm((current) => ({ ...current, plusOnes: Math.min(plusMax, current.plusOnes + 1) }))} style={stepButton(form.plusOnes >= plusMax)}>+</button>
                </div>
              </div>
              {functions.length > 0 && (
                <div>
                  <div style={groupLabel}>INVITED TO FUNCTIONS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {functions.map((fn) => {
                      const selected = (form.functionIds ?? []).includes(fn.id)
                      return (
                        <button key={fn.id} type="button" aria-pressed={selected} onClick={() => toggleFunction(fn.id)} style={choiceChip(selected)}>
                          {fn.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {editGuest && canDeleteGuestRow(role, ownSide, editGuest.side) && (
                confirmDelete ? (
                  <div>
                    <div style={{ fontSize: TYPE.body, color: COLORS.ink, marginBottom: 8 }}>Delete this guest?</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} style={{ ...choiceChip(false), flex: 1 }}>Keep guest</button>
                      <button type="button" disabled={busy} onClick={() => void remove()} style={{ minHeight: 48, flex: 1, border: 'none', borderRadius: 999, background: 'transparent', color: COLORS.danger, fontSize: TYPE.body, fontWeight: 600, cursor: 'pointer' }}>Delete guest</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} style={{ minHeight: 48, border: 'none', background: 'transparent', color: COLORS.danger, fontSize: TYPE.body, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    Delete guest
                  </button>
                )
              )}
            </div>
            <div style={{ flex: '0 0 auto', padding: 16, paddingBottom: `calc(16px + ${safeBottom})`, background: COLORS.ivory }}>
              <button type="button" disabled={busy} onClick={() => void save()} style={{ ...primaryButton(COLORS.crimson), minHeight: 52 }}>
                {busy ? 'Saving…' : 'Save guest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
