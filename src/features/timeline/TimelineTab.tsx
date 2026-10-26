import { useState } from 'react'
import { Badge, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { canEditTimeline } from '../../lib/access.ts'
import { DELETED_ITEM_MESSAGE, saveErrorPresentation, toErrorMessage } from '../../lib/errors.ts'
import { formatDate } from '../../lib/format.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import { headerPadding, listAboveFab } from '../../styles/safeArea.ts'
import type { Milestone, MilestoneDraft, MilestoneStatus } from '../../types.ts'
import { MILESTONE_STATUSES } from '../../types.ts'

const emptyForm = (): MilestoneDraft => ({ name: '', date: '', status: 'Upcoming', description: '' })

export function TimelineTab() {
  const { bundle, mode, saveMilestone, deleteMilestone, toggleMilestone, refreshWedding } = useWedding()
  const canEdit = mode === 'preview' || canEditTimeline(bundle?.membership.role)
  const milestones = bundle?.milestones ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneDraft>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const sorted = [...milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const openAdd = () => {
    setEditMilestone(null)
    setForm(emptyForm())
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (milestone: Milestone) => {
    setEditMilestone(milestone)
    setForm({ name: milestone.name, date: milestone.date, status: milestone.status, description: milestone.description })
    setError(null)
    setModalOpen(true)
  }
  const save = async () => {
    if (!form.name.trim() || !form.date) {
      setError('Add a name and a date.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveMilestone(form, editMilestone?.id)
      setModalOpen(false)
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        setModalOpen(false)
        setEditMilestone(null)
        setError(DELETED_ITEM_MESSAGE)
        await refreshWedding()
        return
      }
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: listAboveFab }}>
      <div style={{ background: 'linear-gradient(135deg,#1A4060,#0D2A40)', padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700 }}>📅 Wedding Timeline</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{sorted.filter((milestone) => milestone.status === 'Completed').length}/{sorted.length} milestones completed</div>
      </div>
      <div style={{ padding: 20 }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📅</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No milestones yet</div>
          </div>
        ) : (
          sorted.map((milestone, index) => {
            const done = milestone.status === 'Completed'
            return (
              <div key={milestone.id} style={{ display: 'flex', gap: 16, animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button type="button" aria-label={done ? 'Mark upcoming' : 'Mark completed'} onClick={() => void toggleMilestone(milestone).catch((caught) => setError(toErrorMessage(caught)))} style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${done ? COLORS.green : COLORS.gold}`, background: done ? COLORS.green : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {done ? <span style={{ color: '#fff', fontSize: 14 }}>✓</span> : <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS.gold, display: 'block' }} />}
                  </button>
                  {index < sorted.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 32, background: done ? `${COLORS.green}40` : '#E8D4B0', margin: '4px 0' }} />}
                </div>
                <div style={{ flex: 1, background: COLORS.cardBg, border: `1px solid ${done ? '#4CAF5030' : '#E8D4B0'}`, borderRadius: 14, padding: 14, marginBottom: 12, opacity: done ? 0.85 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 15, fontWeight: 700, color: done ? '#4A7A4A' : '#2A0A0A', textDecoration: done ? 'line-through' : 'none' }}>{milestone.name}</div>
                      <div style={{ fontSize: 11, color: '#8B5050', marginTop: 3 }}>📅 {formatDate(milestone.date)}</div>
                      {milestone.description && <div style={{ fontSize: 12, color: '#7A5050', marginTop: 6, lineHeight: 1.5 }}>{milestone.description}</div>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                      <Badge color={done ? COLORS.green : COLORS.gold} small>{done ? 'Completed' : 'Upcoming'}</Badge>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <button type="button" aria-label="Edit milestone" onClick={() => openEdit(milestone)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: COLORS.gold }}>✏️</button>
                        <button type="button" aria-label="Delete milestone" onClick={() => void deleteMilestone(milestone.id).catch((caught) => setError(toErrorMessage(caught)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#CC4444' }}>🗑️</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      {error && !modalOpen && <p style={{ padding: '0 20px 12px', color: COLORS.crimson, fontSize: 13 }}>{error}</p>}
      {canEdit && <FAB onClick={openAdd} />}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editMilestone ? 'Edit Milestone' : 'New Milestone'} headerColor="linear-gradient(135deg,#1A4060,#0D2A40)">
        <FormError message={error} />
        <Field label="Milestone Name *">
          <input style={inputStyle} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Sangeet Night" />
        </Field>
        <Field label="Date *">
          <input style={inputStyle} type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </Field>
        <Field label="Status">
          <select style={selectStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MilestoneStatus }))}>
            {MILESTONE_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Details..." />
        </Field>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton('linear-gradient(135deg,#1A4060,#0D2A40)')}>
          {busy ? 'Saving…' : editMilestone ? 'Save Changes' : 'Add Milestone'}
        </button>
      </Modal>
    </div>
  )
}
