import { Badge, Field } from '../../components/ui.tsx'
import { guestHeadcount } from '../../lib/planning.ts'
import { COLORS } from '../../styles/tokens.ts'
import { selectStyle } from '../../styles/ui.ts'
import type { Guest, GuestSide } from '../../types.ts'

/** Parked RSVP-by-side panel. Loaded only when rsvpBySideEnabled is true. */
export function RsvpHeadcount({ guests }: { guests: Guest[] }) {
  const counts = guestHeadcount(guests)
  const rows = [
    ['Bride\'s side', counts.bride],
    ['Groom\'s side', counts.groom],
    ['Both', counts.both],
    ['Unassigned', counts.unassigned],
  ] as const
  return (
    <div style={{ margin: '14px 16px 0', background: '#fff', border: '1px solid #E8D4B0', borderRadius: 16, padding: 14 }}>
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: COLORS.crimson }}>Headcount by side</div>
      <p style={{ margin: '4px 0 10px', fontSize: 13, color: '#5A2020' }}>{counts.confirmedPeople} people confirmed, including plus-ones.</p>
      {rows.map(([label, side]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderTop: '1px solid #F0E0CC' }}>
          <span>{label}</span>
          <span>{side.confirmed} confirmed · {side.pending} pending · {side.declined} declined</span>
        </div>
      ))}
    </div>
  )
}

export function RsvpSideBadge({ guest }: { guest: Guest }) {
  if (!guest.side) return null
  const label = guest.side === 'both' ? 'Both sides' : guest.side === 'bride' ? "Bride's side" : "Groom's side"
  return <Badge color={COLORS.crimson} small>{label}</Badge>
}

export function RsvpSideField({ side, onChange }: { side: GuestSide; onChange: (side: GuestSide) => void }) {
  return (
    <Field label="Side">
      <select style={selectStyle} value={side} onChange={(event) => onChange(event.target.value as GuestSide)}>
        <option value="">Not specified</option>
        <option value="bride">Bride's side</option>
        <option value="groom">Groom's side</option>
        <option value="both">Both</option>
      </select>
    </Field>
  )
}
