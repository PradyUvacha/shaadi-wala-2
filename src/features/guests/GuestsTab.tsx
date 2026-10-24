import { useState } from 'react'
import { Badge, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { toErrorMessage } from '../../lib/errors.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import type { Guest, GuestDraft, GuestSide, RsvpStatus } from '../../types.ts'
import { MEALS, RSVP_STATUSES } from '../../types.ts'

const emptyForm = (): GuestDraft => ({
  name: '',
  email: '',
  phone: '',
  status: 'Pending',
  meal: '',
  plusOnes: 0,
  side: '',
})

const statusColors: Record<string, string> = { Confirmed: COLORS.green, Pending: COLORS.saffron, Declined: '#CC4444' }

export function GuestsTab() {
  const { bundle, saveGuest, deleteGuest } = useWedding()
  const guests = bundle?.guests ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [form, setForm] = useState<GuestDraft>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const openAdd = () => {
    setEditGuest(null)
    setForm(emptyForm())
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
    setBusy(true)
    setError(null)
    try {
      await saveGuest(form, editGuest?.id)
      setModalOpen(false)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: `linear-gradient(135deg,#4A1060,${COLORS.crimson})`, padding: '52px 20px 20px' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 12 }}>👥 Guest List</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Total', value: guests.length, color: 'rgba(255,255,255,0.9)' },
            { label: 'Confirmed', value: guests.filter((guest) => guest.status === 'Confirmed').length, color: '#80FF9E' },
            { label: 'Pending', value: guests.filter((guest) => guest.status === 'Pending').length, color: '#FFD080' },
            { label: 'Declined', value: guests.filter((guest) => guest.status === 'Declined').length, color: '#FF8080' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 4px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 16px' }}>
        {guests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>👥</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No guests yet</div>
          </div>
        ) : (
          guests.map((guest) => (
            <div key={guest.id} style={{ background: COLORS.cardBg, border: '1px solid #E8D4B0', borderRadius: 14, padding: 14, marginBottom: 10, animation: 'fadeIn 0.3s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, color: '#2A0A0A' }}>{guest.name}</span>
                    <Badge color={statusColors[guest.status] || '#666'} small>{guest.status}</Badge>
                  </div>
                  {guest.email && <div style={{ fontSize: 11, color: '#8B5050' }}>✉️ {guest.email}</div>}
                  {guest.phone && <div style={{ fontSize: 11, color: '#8B5050' }}>📱 {guest.phone}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {guest.meal && <Badge color={COLORS.saffron} small>🍽 {guest.meal}</Badge>}
                    {guest.plusOnes > 0 && <Badge color={COLORS.gold} small>+{guest.plusOnes} guests</Badge>}
                    {guest.side && <Badge color={COLORS.crimson} small>{guest.side === 'both' ? 'Both sides' : guest.side === 'bride' ? "Bride's side" : "Groom's side"}</Badge>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" aria-label="Edit guest" onClick={() => openEdit(guest)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: COLORS.gold }}>✏️</button>
                  <button type="button" aria-label="Delete guest" onClick={() => void deleteGuest(guest.id).catch((caught) => setError(toErrorMessage(caught)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#CC4444' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <FAB onClick={openAdd} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGuest ? 'Edit Guest' : 'New Guest'}>
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
        <Field label="RSVP Status">
          <select style={selectStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as RsvpStatus }))}>
            {RSVP_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Meal Preference">
            <select style={selectStyle} value={form.meal} onChange={(event) => setForm((current) => ({ ...current, meal: event.target.value }))}>
              {MEALS.map((meal) => <option key={meal || 'blank'} value={meal}>{meal || 'Not specified'}</option>)}
            </select>
          </Field>
          <Field label="Plus Ones">
            <input style={inputStyle} type="number" min="0" value={form.plusOnes} onChange={(event) => setForm((current) => ({ ...current, plusOnes: Number(event.target.value) }))} />
          </Field>
        </div>
        <Field label="Side">
          <select style={selectStyle} value={form.side} onChange={(event) => setForm((current) => ({ ...current, side: event.target.value as GuestSide }))}>
            <option value="">Not specified</option>
            <option value="bride">Bride's side</option>
            <option value="groom">Groom's side</option>
            <option value="both">Both</option>
          </select>
        </Field>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Saving…' : editGuest ? 'Save Changes' : 'Add Guest'}
        </button>
      </Modal>
    </div>
  )
}
