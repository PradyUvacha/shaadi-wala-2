import { useState } from 'react'
import { Badge, FAB, Field, FormError, MehendiPattern, Modal } from '../../components/ui.tsx'
import { toErrorMessage } from '../../lib/errors.ts'
import { canAddSplit, payerLabel, splitsForPayer, sumAmounts } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { CATEGORY_COLORS, COLORS, CURRENCIES } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import type { BudgetDraft, BudgetItem, Category, CurrencyCode, Payer, PartPaymentDraft, PaymentSide } from '../../types.ts'
import { CATEGORIES, CURRENCY_CODES, PAYERS } from '../../types.ts'

const emptyForm = (): BudgetDraft => ({
  category: 'Venue',
  currency: 'INR',
  estimated: 0,
  actual: 0,
  paid: false,
  notes: '',
  paidBySide: 'custom',
  splits: [],
})

export function BudgetTab() {
  const { bundle, saveBudgetItem, deleteBudgetItem, addPayment } = useWedding()
  const budget = bundle?.budget ?? []
  const [currFilter, setCurrFilter] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [payItemId, setPayItemId] = useState<string | null>(null)
  const [payForm, setPayForm] = useState<PartPaymentDraft>({ amount: 0, paidBy: '', paidBySide: '', notes: '', date: '' })
  const [form, setForm] = useState<BudgetDraft>(emptyForm)
  const [splitName, setSplitName] = useState('')
  const [splitPct, setSplitPct] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const filtered = currFilter === 'All' ? budget : budget.filter((item) => item.currency === currFilter)
  const totals = sumAmounts(filtered)
  const symbol = currFilter === 'All' ? '₹' : CURRENCIES[currFilter]?.symbol || '₹'

  const openAdd = () => {
    setEditItem(null)
    setForm(emptyForm())
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (item: BudgetItem) => {
    setEditItem(item)
    setForm({
      category: item.category,
      currency: item.currency,
      estimated: item.estimated,
      actual: item.actual,
      paid: item.paid,
      notes: item.notes,
      paidBySide: item.paidBySide,
      splits: item.splits.map((split) => ({ name: split.name, pct: split.pct, side: split.side })),
    })
    setError(null)
    setModalOpen(true)
  }
  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveBudgetItem(form, editItem?.id)
      setModalOpen(false)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const addSplit = () => {
    const pct = Number(splitPct)
    if (!splitName.trim() || !canAddSplit(form.splits, pct)) return
    setForm((current) => ({
      ...current,
      paidBySide: 'custom',
      splits: [...current.splits, { name: splitName.trim(), pct, side: '' }],
    }))
    setSplitName('')
    setSplitPct('')
  }
  const recordPayment = async () => {
    if (!payItemId || !(Number(payForm.amount) > 0)) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addPayment(payItemId, { ...payForm, date: new Date().toISOString().slice(0, 10) })
      setPayItemId(null)
      setPayForm({ amount: 0, paidBy: '', paidBySide: '', notes: '', date: '' })
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ background: `linear-gradient(135deg,${COLORS.maroon},#5C0000)`, padding: '52px 20px 16px', position: 'relative', overflow: 'hidden' }}>
        <MehendiPattern />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 12 }}>💰 Budget Planner</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
            {['All', ...CURRENCY_CODES].map((code) => (
              <button key={code} type="button" onClick={() => setCurrFilter(code)} style={{ padding: '5px 14px', borderRadius: 99, border: `1px solid ${currFilter === code ? '#fff' : 'rgba(255,255,255,0.4)'}`, background: currFilter === code ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                {code === 'All' ? 'All' : `${CURRENCIES[code]?.symbol || code} ${code}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '14px 16px' }}>
        {[
          { label: 'Budget', value: totals.estimated, color: COLORS.crimson },
          { label: 'Spent', value: totals.actual, color: '#CC2222' },
          { label: 'Remaining', value: totals.estimated - totals.actual, color: totals.estimated - totals.actual >= 0 ? COLORS.green : COLORS.crimson },
        ].map((card) => (
          <div key={card.label} style={{ background: `linear-gradient(135deg,${card.color}18,${card.color}08)`, border: `1px solid ${card.color}30`, borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#7A3030', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>{card.label}</div>
            <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 14, fontWeight: 700, color: card.color }}>{symbol}{Math.abs(card.value).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>💰</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No budget items yet</div>
          </div>
        ) : (
          filtered.map((item) => {
            const itemSymbol = CURRENCIES[item.currency]?.symbol || '₹'
            return (
              <div key={item.id} style={{ background: COLORS.cardBg, border: '1px solid #E8D4B0', borderRadius: 16, padding: 14, marginBottom: 12, animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, fontWeight: 700, color: '#2A0A0A' }}>{item.category}</div>
                    {item.notes && <div style={{ fontSize: 11, color: '#8B5050', marginTop: 2 }}>{item.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Badge color={CATEGORY_COLORS[item.category] || '#666'} small>{item.currency}</Badge>
                    <Badge color={COLORS.saffron} small>{payerLabel(item.paidBySide)}</Badge>
                    {item.paid && <Badge color={COLORS.green} small>PAID</Badge>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div style={{ background: '#F5EDD8', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#8B5050', fontWeight: 600 }}>Estimated</div>
                    <div style={{ fontWeight: 700, color: COLORS.crimson, fontSize: 14 }}>{itemSymbol}{Number(item.estimated || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#F5EDD8', borderRadius: 10, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: '#8B5050', fontWeight: 600 }}>Actual</div>
                    <div style={{ fontWeight: 700, color: '#2A7A2A', fontSize: 14 }}>{itemSymbol}{Number(item.actual || 0).toLocaleString('en-IN')}</div>
                  </div>
                </div>
                {item.partPayments.length > 0 && (
                  <div style={{ background: '#FFF3E0', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.saffron, marginBottom: 6 }}>💰 Payments ({item.partPayments.length})</div>
                    {item.partPayments.map((payment) => (
                      <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                        <span style={{ color: '#5A3010' }}>{payment.paidBy || '—'} · {payment.date}</span>
                        <span style={{ fontWeight: 600, color: COLORS.saffron }}>{itemSymbol}{Number(payment.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
                {item.splits.length > 0 && (
                  <div style={{ background: '#F0F8FF', borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1E5F8E', marginBottom: 6 }}>📊 Split Between:</div>
                    {item.splits.map((split) => (
                      <div key={split.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                        <span style={{ color: '#2A4A6A' }}>{split.name}</span>
                        <span style={{ fontWeight: 600, color: '#1E5F8E' }}>{split.pct}% · {itemSymbol}{Math.round(item.estimated * (split.pct / 100)).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => { setError(null); setPayItemId(item.id) }} style={{ flex: 1, padding: 8, borderRadius: 10, border: `1px solid ${COLORS.green}`, background: 'transparent', color: COLORS.green, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Payment</button>
                  <button type="button" aria-label="Edit budget item" onClick={() => openEdit(item)} style={{ padding: '8px 12px', borderRadius: 10, border: `1px solid ${COLORS.gold}`, background: 'transparent', color: COLORS.gold, cursor: 'pointer' }}>✏️</button>
                  <button type="button" aria-label="Delete budget item" onClick={() => void deleteBudgetItem(item.id).catch((caught) => setError(toErrorMessage(caught)))} style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #CC4444', background: 'transparent', color: '#CC4444', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <FAB onClick={openAdd} />

      <Modal open={!!payItemId} onClose={() => setPayItemId(null)} title="Add Payment" headerColor={`linear-gradient(135deg,${COLORS.green},#1A5C35)`}>
        <FormError message={error} />
        <Field label="Amount">
          <input style={inputStyle} type="number" value={payForm.amount || ''} onChange={(event) => setPayForm((current) => ({ ...current, amount: Number(event.target.value) }))} placeholder="0" />
        </Field>
        <Field label="Paid By">
          <input style={inputStyle} value={payForm.paidBy} onChange={(event) => setPayForm((current) => ({ ...current, paidBy: event.target.value }))} placeholder="Name" />
        </Field>
        <Field label="Which family">
          <select style={selectStyle} value={payForm.paidBySide} onChange={(event) => setPayForm((current) => ({ ...current, paidBySide: event.target.value as PaymentSide }))}>
            <option value="">Not specified</option>
            <option value="bride">Bride's side</option>
            <option value="groom">Groom's side</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Notes">
          <input style={inputStyle} value={payForm.notes} onChange={(event) => setPayForm((current) => ({ ...current, notes: event.target.value }))} placeholder="e.g. First installment" />
        </Field>
        <button type="button" disabled={busy} onClick={() => void recordPayment()} style={primaryButton(`linear-gradient(135deg,${COLORS.green},#1A5C35)`)}>
          {busy ? 'Saving…' : 'Record Payment'}
        </button>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Budget Item' : 'New Budget Item'}>
        <FormError message={error} />
        <Field label="Category">
          <select style={selectStyle} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Category }))}>
            {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select style={selectStyle} value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value as CurrencyCode }))}>
            {CURRENCY_CODES.map((code) => <option key={code} value={code}>{CURRENCIES[code]?.symbol} {code}</option>)}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Estimated">
            <input style={inputStyle} type="number" value={form.estimated} onChange={(event) => setForm((current) => ({ ...current, estimated: Number(event.target.value) }))} />
          </Field>
          <Field label="Actual">
            <input style={inputStyle} type="number" value={form.actual} onChange={(event) => setForm((current) => ({ ...current, actual: Number(event.target.value) }))} />
          </Field>
        </div>
        <Field label="Which family pays">
          <select
            style={selectStyle}
            value={form.paidBySide}
            onChange={(event) => {
              const payer = event.target.value as Payer
              setForm((current) => ({
                ...current,
                paidBySide: payer,
                splits: payer === 'custom' ? current.splits : splitsForPayer(payer),
              }))
            }}
          >
            {PAYERS.map((payer) => <option key={payer} value={payer}>{payerLabel(payer)}</option>)}
          </select>
        </Field>
        <div style={{ background: '#FFF3E0', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.saffron, marginBottom: 10 }}>💸 Split Payment</div>
          {form.paidBySide === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input style={{ ...inputStyle, flex: 2 }} value={splitName} onChange={(event) => setSplitName(event.target.value)} placeholder="Name" />
              <input style={{ ...inputStyle, flex: 1 }} type="number" value={splitPct} onChange={(event) => setSplitPct(event.target.value)} placeholder="%" />
              <button type="button" onClick={addSplit} style={{ padding: '10px 14px', borderRadius: 10, background: COLORS.saffron, border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {form.splits.map((split, index) => (
              <div key={`${split.name}-${index}`} style={{ background: `${COLORS.saffron}22`, border: `1px solid ${COLORS.saffron}55`, borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: COLORS.saffron, display: 'flex', gap: 6, alignItems: 'center' }}>
                {split.name} {split.pct}%
                {form.paidBySide === 'custom' && (
                  <button type="button" aria-label="Remove split" onClick={() => setForm((current) => ({ ...current, splits: current.splits.filter((_, splitIndex) => splitIndex !== index) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AA5500', fontSize: 12 }}>×</button>
                )}
              </div>
            ))}
          </div>
        </div>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes..." />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <input type="checkbox" id="paid" checked={form.paid} onChange={(event) => setForm((current) => ({ ...current, paid: event.target.checked }))} style={{ width: 18, height: 18, accentColor: COLORS.crimson }} />
          <label htmlFor="paid" style={{ fontSize: 13, color: '#5A2020', fontWeight: 600 }}>Mark as Paid</label>
        </div>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Saving…' : editItem ? 'Save Changes' : 'Add Item'}
        </button>
      </Modal>
    </div>
  )
}
