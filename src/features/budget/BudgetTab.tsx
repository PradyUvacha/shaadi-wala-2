import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { MOVE_LINKS_BEFORE_DELETE } from '../../config/budgetRules.ts'
import { canEditBudget, canLogPayment, canSeeBudget } from '../../lib/access.ts'
import { DELETED_ITEM_MESSAGE, saveErrorPresentation, toErrorMessage } from '../../lib/errors.ts'
import { money } from '../../lib/format.ts'
import { budgetHeadline, canAddSplit, defaultPayerForSide, familySettlement, MAX_BUDGET_AMOUNT, otherCurrencyTotals, payerLabel, settlementSummary, sideLabel, SPLIT_REQUIRED, splitsForPayer, splitsForSave } from '../../lib/planning.ts'
import { formatInrGrouped, formatInrShort, percentOf, remainingLabel, rollupWedding, roundHalfUpRupees, splitShareLabel, toPaise, wholeRupeeProblem, type CategoryCard } from '../../lib/rollup.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { COLORS, RADIUS, SIZE, TYPE } from '../../styles/tokens.ts'
import { cardStyle, inputStyle, primaryButton, sectionLabel, selectStyle } from '../../styles/ui.ts'
import { headerPadding } from '../../styles/safeArea.ts'
import type { BudgetDraft, BudgetItem, Payer, PartPaymentDraft, PaymentSide, Task } from '../../types.ts'
import { PAYERS } from '../../types.ts'

const emptyForm = (side: 'bride' | 'groom' | null): BudgetDraft => {
  const paidBySide = defaultPayerForSide(side)
  return {
    category: '',
    currency: 'INR',
    estimated: 0,
    actual: 0,
    paid: false,
    notes: '',
    paidBySide,
    splits: splitsForPayer(paidBySide),
  }
}

function useNarrow(max = 320) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${max}px)`).matches)
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${max}px)`)
    const update = () => setNarrow(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [max])
  return narrow
}

export function BudgetTab() {
  const navigate = useNavigate()
  const { bundle, mode, saveBudgetItem, deleteBudgetItem, addPayment, refreshWedding } = useWedding()
  const role = bundle?.membership.role
  const seeBudget = mode === 'preview' || canSeeBudget(role)
  const editBudget = mode === 'preview' || canEditBudget(role)
  const logPayment = mode === 'preview' || canLogPayment(role)
  const creatorSide = bundle?.membership.side ?? null
  const budget = bundle?.budget ?? []
  const tasks = bundle?.tasks ?? []
  const narrow = useNarrow()
  const rolled = rollupWedding(budget, tasks)
  const headline = budgetHeadline(budget, 'INR')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetItem | null>(null)
  const [estimateText, setEstimateText] = useState('')
  const [payItemId, setPayItemId] = useState<string | null>(null)
  const [payText, setPayText] = useState('')
  const [payForm, setPayForm] = useState<Omit<PartPaymentDraft, 'amount'>>({ paidBy: '', paidBySide: '', notes: '', date: '' })
  const [inlineId, setInlineId] = useState<string | null>(null)
  const [inlineText, setInlineText] = useState('')
  const [form, setForm] = useState<BudgetDraft>(() => emptyForm(creatorSide))
  const [splitSide, setSplitSide] = useState<'bride' | 'groom'>(creatorSide === 'groom' ? 'groom' : 'bride')
  const [splitName, setSplitName] = useState('')
  const [splitPct, setSplitPct] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const moneyText = (rupees: bigint) => (narrow ? formatInrShort(rupees) : formatInrGrouped(rupees))
  const remaining = remainingLabel(rolled.remainingRupees)

  const openAdd = () => {
    setEditItem(null)
    setForm(emptyForm(creatorSide))
    setEstimateText('')
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (item: BudgetItem) => {
    setEditItem(item)
    setEstimateText(String(Math.round(item.estimated)))
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
    const problem = wholeRupeeProblem(estimateText)
    if (problem) {
      setError(problem)
      return
    }
    if (!form.category.trim()) {
      setError('Name the category.')
      return
    }
    const next = { ...form, currency: editItem ? form.currency : 'INR' as const, estimated: Number(estimateText), actual: editItem?.actual ?? 0 }
    try {
      splitsForSave(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : SPLIT_REQUIRED)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveBudgetItem(next, editItem?.id)
      setModalOpen(false)
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        setModalOpen(false)
        setEditItem(null)
        setError(DELETED_ITEM_MESSAGE)
        await refreshWedding()
        return
      }
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const saveInline = async (item: BudgetItem) => {
    const problem = wholeRupeeProblem(inlineText)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveBudgetItem({
        category: item.category,
        currency: item.currency,
        estimated: Number(inlineText),
        actual: item.actual,
        paid: item.paid,
        notes: item.notes,
        paidBySide: item.paidBySide,
        splits: item.splits,
      }, item.id)
      setInlineId(null)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const removeCategory = async (item: BudgetItem) => {
    const linked = tasks.some((task) => task.budgetCategoryId === item.id)
    if (linked || item.partPayments.length > 0) {
      setError(MOVE_LINKS_BEFORE_DELETE)
      return
    }
    try {
      await deleteBudgetItem(item.id)
    } catch (caught) {
      setError(toErrorMessage(caught))
    }
  }
  const addSplit = () => {
    const pct = Number(splitPct)
    if (!splitName.trim() || !canAddSplit(form.splits, pct)) return
    setForm((current) => ({
      ...current,
      paidBySide: 'custom',
      splits: [...current.splits, { name: splitName.trim(), pct, side: splitSide }],
    }))
    setSplitName('')
    setSplitPct('')
  }
  const recordPayment = async () => {
    const problem = wholeRupeeProblem(payText)
    if (!payItemId || problem || Number(payText) === 0) {
      setError(problem && Number(payText) !== 0 ? problem : 'Enter a payment amount greater than zero.')
      return
    }
    if (Number(payText) > MAX_BUDGET_AMOUNT) {
      setError('Payment cannot be more than ₹10 crore.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addPayment(payItemId, { ...payForm, amount: Number(payText), date: new Date().toISOString().slice(0, 10) })
      setPayItemId(null)
      setPayText('')
      setPayForm({ paidBy: '', paidBySide: '', notes: '', date: '' })
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  if (!seeBudget) {
    return (
      <div style={{ padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: COLORS.crimson }}>Budget</div>
        <p style={{ color: COLORS.ink }}>Friends do not have budget access.</p>
      </div>
    )
  }

  const cards = rolled.uncategorised ? [...rolled.categories, rolled.uncategorised] : rolled.categories

  return (
    <div>
      <div style={{ background: COLORS.appBar, padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, color: '#fff', fontWeight: 700 }}>Budget</div>
        <p style={{ margin: '6px 0 0', color: COLORS.gold, fontSize: TYPE.small }}>{headline.currency} totals</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, margin: '16px' }}>
        <Tile label="Budget" value={moneyText(rolled.budgetRupees)} tint={COLORS.roseTint} labelColor={COLORS.crimson} icon="budget" />
        <Tile label="Actual" value={moneyText(rolled.actualRupees)} tint={COLORS.goldTint} labelColor={COLORS.goldText} icon="actual" hint={rolled.categories.some((card) => card.auto) || rolled.uncategorised ? 'auto-calc' : undefined} />
        <Tile label="Remaining" value={remaining.over ? remaining.text : moneyText(rolled.remainingRupees)} tint={remaining.over ? COLORS.dangerTint : COLORS.greenTint} labelColor={remaining.over ? COLORS.danger : COLORS.greenText} icon="remaining" />
      </div>
      {rolled.committedRupees > 0n && (
        <p style={{ margin: '-8px 16px 12px', color: COLORS.muted, fontSize: TYPE.small }}>Committed (pending) {formatInrGrouped(rolled.committedRupees)}</p>
      )}
      {rolled.foreignNotes.length > 0 && (
        <p style={{ margin: '0 16px 12px', color: COLORS.muted, fontSize: TYPE.small }}>{rolled.foreignNotes.join(' · ')}</p>
      )}
      {otherCurrencyTotals(budget).length > 0 && rolled.foreignNotes.length === 0 && (
        <p style={{ margin: '0 16px 12px', color: COLORS.muted, fontSize: TYPE.small }}>Totals stay in rupees.</p>
      )}

      <Settlement items={budget} tasks={tasks} />
      {error && !modalOpen && !payItemId && <div style={{ padding: '0 16px 8px' }}><FormError message={error} /></div>}

      <div style={{ padding: '0 16px' }}>
        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: COLORS.muted }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No budget items yet</div>
          </div>
        ) : cards.map((card) => (
          <CategoryCardView
            key={card.key}
            card={card}
            narrow={narrow}
            expanded={Boolean(expanded[card.key])}
            editBudget={editBudget && card.primaryItemId != null}
            logPayment={logPayment && card.primaryItemId != null}
            inline={inlineId === card.primaryItemId}
            inlineText={inlineText}
            onInlineText={setInlineText}
            onToggle={() => setExpanded((current) => ({ ...current, [card.key]: !current[card.key] }))}
            onEditBudget={() => {
              const item = budget.find((entry) => entry.id === card.primaryItemId)
              if (!item) return
              setInlineId(item.id)
              setInlineText(String(Math.round(item.estimated)))
            }}
            onSaveInline={() => {
              const item = budget.find((entry) => entry.id === card.primaryItemId)
              if (item) void saveInline(item)
            }}
            onPay={() => {
              if (!card.primaryItemId) return
              setError(null)
              setPayItemId(card.primaryItemId)
            }}
            onOpen={(taskId) => navigate(`/planning?edit=${taskId}`)}
            onRename={() => {
              const item = budget.find((entry) => entry.id === card.primaryItemId)
              if (item) openEdit(item)
            }}
            onDelete={() => {
              const item = budget.find((entry) => entry.id === card.primaryItemId)
              if (item) void removeCategory(item)
            }}
          />
        ))}
      </div>

      {editBudget && <FAB onClick={openAdd} />}

      <Modal open={!!payItemId} onClose={() => setPayItemId(null)} title="Record payment">
        <FormError message={error} />
        <Field label="Amount">
          <input style={inputStyle} inputMode="numeric" value={payText} onChange={(event) => setPayText(event.target.value)} placeholder="0" />
        </Field>
        <Field label="Paid by">
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
          <input style={inputStyle} value={payForm.notes} onChange={(event) => setPayForm((current) => ({ ...current, notes: event.target.value }))} placeholder="First installment" />
        </Field>
        <button type="button" disabled={busy} onClick={() => void recordPayment()} style={primaryButton(`linear-gradient(135deg,${COLORS.green},${COLORS.greenText})`)}>
          {busy ? 'Saving…' : 'Record Payment'}
        </button>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit category' : 'New category'}>
        <FormError message={error} />
        <Field label="Category">
          <input style={inputStyle} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Venue" />
        </Field>
        <Field label="Budget (₹)">
          <input style={inputStyle} inputMode="numeric" value={estimateText} onChange={(event) => setEstimateText(event.target.value)} />
        </Field>
        {editItem && <p style={{ color: COLORS.muted, fontSize: TYPE.small }}>Actual follows logged payments and done tasks.</p>}
        <Field label="Which family pays">
          <select
            style={selectStyle}
            value={form.paidBySide}
            onChange={(event) => {
              const payer = event.target.value as Payer
              setForm((current) => ({ ...current, paidBySide: payer, splits: payer === 'custom' ? current.splits : splitsForPayer(payer) }))
            }}
          >
            {PAYERS.map((payer) => <option key={payer} value={payer}>{payerLabel(payer)}</option>)}
          </select>
        </Field>
        <div style={{ background: COLORS.parchment, borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ ...sectionLabel, marginTop: 0 }}>Split payment</div>
          {form.paidBySide === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <input style={{ ...inputStyle, flex: 2 }} value={splitName} onChange={(event) => setSplitName(event.target.value)} placeholder="Name" />
              <select style={{ ...selectStyle, flex: 1 }} aria-label="Split side" value={splitSide} onChange={(event) => setSplitSide(event.target.value === 'groom' ? 'groom' : 'bride')}>
                <option value="bride">Bride's side</option>
                <option value="groom">Groom's side</option>
              </select>
              <input style={{ ...inputStyle, flex: 1 }} inputMode="numeric" value={splitPct} onChange={(event) => setSplitPct(event.target.value)} placeholder="%" />
              <button type="button" onClick={addSplit} style={{ ...primaryButton(COLORS.crimson), width: 'auto', minWidth: SIZE.tap }}>+</button>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {form.splits.map((split, index) => (
              <div key={`${split.name}-${index}`} style={{ background: COLORS.goldTint, borderRadius: 999, padding: '8px 12px', fontSize: TYPE.small, color: COLORS.ink }}>
                {split.name} {split.pct}%{split.side === 'bride' || split.side === 'groom' ? ` · ${sideLabel(split.side)}` : ''}
              </div>
            ))}
          </div>
        </div>
        <Field label="Notes">
          <textarea style={{ ...inputStyle, height: 'auto', maxHeight: 'none', minHeight: 72, resize: 'vertical' }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </Field>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton()}>
          {busy ? 'Saving…' : editItem ? 'Save changes' : 'Add category'}
        </button>
      </Modal>
    </div>
  )
}

function Tile({ label, value, tint, labelColor, icon, hint }: { label: string; value: string; tint: string; labelColor: string; icon: 'budget' | 'actual' | 'remaining'; hint?: string }) {
  return (
    <div style={{ background: tint, borderRadius: RADIUS.card, padding: 12, minWidth: 0 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: labelColor }}>
        <TileIcon name={icon} />
      </div>
      <div style={{ fontSize: TYPE.small, color: labelColor, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.ink, overflowWrap: 'anywhere' }}>{value}</div>
      {hint && <div style={{ fontSize: TYPE.small, color: hint === 'Over by' ? COLORS.danger : COLORS.muted }}>{hint}</div>}
    </div>
  )
}

function TileIcon({ name }: { name: 'budget' | 'actual' | 'remaining' }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true as const }
  if (name === 'budget') {
    return (
      <svg {...common}>
        <path d="M4.5 11.5c.4-3.2 3.2-5.5 6.6-5.5 2.4 0 4.4 1.2 5.6 3.1.5-.2 1-.3 1.6-.3 1.8 0 3.2 1.2 3.2 2.8 0 .7-.3 1.4-.7 1.9.4.6.7 1.3.7 2.1 0 2.2-1.8 4.4-5.2 4.4H8.4c-3 0-5.2-1.6-5.2-4 0-1 .4-1.9.9-2.6-.6-.6-1-1.4-1-2.3 0-.2 0-.4.1-.6z" />
        <path d="M19.2 12.2h2.3M8.2 10.2h.01" />
      </svg>
    )
  }
  if (name === 'actual') {
    return (
      <svg {...common}>
        <path d="M7 3h10v18l-2-1.4-2 1.4-2-1.4L9 21l-2-1.4L5 21V5a2 2 0 0 1 2-2z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M4 16l5-5 3.5 3.5L20 7" />
      <path d="M14 7h6v6" />
    </svg>
  )
}

function CategoryCardView({
  card, narrow, expanded, editBudget, logPayment, inline, inlineText, onInlineText, onToggle, onEditBudget, onSaveInline, onPay, onOpen, onRename, onDelete,
}: {
  card: CategoryCard
  narrow: boolean
  expanded: boolean
  editBudget: boolean
  logPayment: boolean
  inline: boolean
  inlineText: string
  onInlineText: (value: string) => void
  onToggle: () => void
  onEditBudget: () => void
  onSaveInline: () => void
  onPay: () => void
  onOpen: (taskId: string) => void
  onRename: () => void
  onDelete: () => void
}) {
  const actualRupees = roundHalfUpRupees(card.actualPaise)
  const percent = percentOf(actualRupees, card.budgetRupees)
  const show = (rupees: bigint) => (narrow ? formatInrShort(rupees) : formatInrGrouped(rupees))
  return (
    <article style={{ ...cardStyle, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: 99, background: COLORS.crimson, flex: '0 0 auto' }} />
        <h2 style={{ margin: 0, flex: 1, fontSize: 18, color: COLORS.ink }}>{card.name}</h2>
        {card.auto && <span style={{ background: COLORS.goldTint, color: COLORS.goldText, fontSize: TYPE.small, borderRadius: 999, padding: '4px 10px' }}>Auto</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>Budget</div>
          {inline ? (
            <input
              style={inputStyle}
              inputMode="numeric"
              value={inlineText}
              onChange={(event) => onInlineText(event.target.value)}
              onBlur={onSaveInline}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                onSaveInline()
              }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16, color: COLORS.ink }}>{show(card.budgetRupees)}</strong>
              {editBudget && <button type="button" onClick={onEditBudget} style={{ minHeight: SIZE.tap, border: 'none', background: COLORS.goldTint, color: COLORS.crimson, borderRadius: 999, padding: '0 12px', cursor: 'pointer' }}>Edit</button>}
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ fontSize: TYPE.small, color: COLORS.muted }}>Actual{card.auto ? ' · auto-calc' : ''}</div>
          <strong style={{ fontSize: 16, color: COLORS.ink }}>{show(actualRupees)}</strong>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 999, background: COLORS.border, overflow: 'hidden' }}>
          <div style={{ width: `${percent.fill}%`, height: '100%', background: percent.over ? COLORS.danger : COLORS.gold }} />
        </div>
        <span style={{ fontSize: TYPE.small, color: percent.over ? COLORS.danger : COLORS.muted, fontWeight: percent.over ? 600 : 400 }}>{percent.label}</span>
      </div>
      {!expanded && card.rows.length > 0 && (
        <button type="button" onClick={onToggle} style={{ marginTop: 8, minHeight: SIZE.tap, width: '100%', border: 'none', background: 'transparent', color: COLORS.ink, fontSize: TYPE.small, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
          Contributing tasks: {card.rows.length}
        </button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onToggle} style={{ minHeight: SIZE.tap, border: 'none', background: 'transparent', color: COLORS.muted, fontSize: TYPE.small, cursor: 'pointer', padding: 0 }}>
          {expanded ? 'Hide breakdown' : 'Tap to expand'}
        </button>
        <span style={{ color: COLORS.goldText, fontSize: TYPE.small, display: 'block', flex: '1 1 160px', minWidth: 0, lineHeight: 1.4, paddingTop: 12 }}>
          {splitShareLabel(card.budgetRupees, actualRupees)}
        </span>
      </div>
      {card.foreignNotes.map((note) => <p key={note} style={{ color: COLORS.muted, fontSize: TYPE.small }}>{note}</p>)}
      {card.committedPaise > 0n && <p style={{ color: COLORS.muted, fontSize: TYPE.small, margin: '4px 0' }}>Committed (pending) {formatInrGrouped(roundHalfUpRupees(card.committedPaise))}</p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {logPayment && <button type="button" onClick={onPay} style={{ ...primaryButton('transparent'), width: 'auto', color: COLORS.greenText, border: `1px solid ${COLORS.green}` }}>Record Payment</button>}
        {editBudget && <button type="button" onClick={onRename} style={{ ...primaryButton('transparent'), width: 'auto', color: COLORS.crimson, border: `1px solid ${COLORS.border}` }}>Rename</button>}
        {editBudget && <button type="button" onClick={onDelete} style={{ ...primaryButton('transparent'), width: 'auto', color: COLORS.danger, border: `1px solid ${COLORS.dangerBorder}` }}>Delete</button>}
      </div>
      {expanded && (
        <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 12, paddingTop: 12 }}>
          <div style={sectionLabel}>Contributing tasks</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: TYPE.small, marginBottom: 8 }}>
            <span style={{ color: COLORS.ink }}>Logged payments</span>
            <strong style={{ color: COLORS.goldText }}>{formatInrGrouped(roundHalfUpRupees(card.loggedPaise))}</strong>
          </div>
          {card.rows.map((row) => (
            <button key={row.taskId} type="button" onClick={() => onOpen(row.taskId)} style={{ width: '100%', minHeight: SIZE.tap, display: 'flex', justifyContent: 'space-between', gap: 8, border: 'none', background: 'transparent', padding: '4px 0', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ color: COLORS.ink, fontSize: TYPE.small, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</span>
              <span style={{ color: COLORS.goldText, fontSize: TYPE.small, fontWeight: 600, flex: '0 0 auto' }}>
                {row.amount == null ? '—' : row.planned ? `Planned ${formatInrGrouped(roundHalfUpRupees(toPaise(row.amount)))}` : formatInrGrouped(roundHalfUpRupees(toPaise(row.amount)))}
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

function Settlement({ items, tasks }: { items: BudgetItem[]; tasks: Task[] }) {
  const settlement = familySettlement(items, tasks)
  return (
    <div style={{ margin: '0 16px 12px', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.card, padding: 16 }}>
      <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: COLORS.ink, marginBottom: 8 }}>Family settlement</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: TYPE.small, color: COLORS.ink }}>
        <div>Bride's share<br /><strong>{money(settlement.brideShare, '₹')}</strong></div>
        <div>Groom's share<br /><strong>{money(settlement.groomShare, '₹')}</strong></div>
        <div>Bride's family paid<br /><strong>{money(settlement.bridePaid, '₹')}</strong></div>
        <div>Groom's family paid<br /><strong>{money(settlement.groomPaid, '₹')}</strong></div>
      </div>
      {settlement.unattributed > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: TYPE.small, color: COLORS.muted }}>Unattributed spend {money(settlement.unattributed, '₹')} (no family payer)</p>
      )}
      <p style={{ margin: '10px 0 0', fontSize: TYPE.small, fontWeight: 600, color: COLORS.ink }}>{settlementSummary(settlement)}</p>
    </div>
  )
}
