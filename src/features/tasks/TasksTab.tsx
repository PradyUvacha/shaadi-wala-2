import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Celebration, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { FUNCTION_PHASES, PHASE_HEADERS, PHASE_LABELS, type FunctionPhase } from '../../config/phases.ts'
import { assignableMembers, canEditChecklist, canEditTaskCost, canManageTasks, canSeeBudget, unassignedSideGroups } from '../../lib/access.ts'
import { communityLabel, functionRemovalCopy } from '../../lib/checklist.ts'
import { DELETED_ITEM_MESSAGE, STALE_WRITE_MESSAGE, saveErrorPresentation, toErrorMessage } from '../../lib/errors.ts'
import { percent } from '../../lib/planning.ts'
import { chipRupees, formatInrGrouped, roundHalfUpRupees, toPaise, wholeRupeeProblem } from '../../lib/rollup.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { CATEGORY_COLORS, COLORS, PRIORITY_COLORS, SIZE, TYPE } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, sectionLabel, selectStyle } from '../../styles/ui.ts'
import { headerPadding, listAboveFab } from '../../styles/safeArea.ts'
import type { Category, MemberRole, Priority, Side, Task, TaskDraft, TaskStatus, WeddingFunction, WeddingMember } from '../../types.ts'
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from '../../types.ts'

const emptyForm = (fn?: WeddingFunction): TaskDraft => ({
  title: '',
  description: '',
  category: 'Venue',
  priority: 'Medium',
  ceremony: fn?.name ?? '',
  functionId: fn?.id ?? null,
  dueDate: '',
  status: 'Pending',
  assignedTo: null,
})

export function TasksTab() {
  const { bundle, mode, saveTask, deleteTask, toggleTask, saveFunction, deleteFunction, moveFunction, moveTask, refreshWedding } = useWedding()
  const role = bundle?.membership.role
  const canEdit = mode === 'preview' || canManageTasks(role)
  const canStructure = mode === 'preview' || canEditChecklist(role)
  const canComplete = canEdit || role === 'friend'
  const tasks = bundle?.tasks ?? []
  const members = bundle?.members ?? []
  const ownSide = bundle?.membership.side ?? null
  const functions = [...(bundle?.functions ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Done'>('All')
  const [params, setParams] = useSearchParams()
  const [costText, setCostText] = useState('')
  const [costDirty, setCostDirty] = useState(false)
  const [costCategoryId, setCostCategoryId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [form, setForm] = useState<TaskDraft>(emptyForm())
  const [newFunction, setNewFunction] = useState(false)
  const [functionName, setFunctionName] = useState('')
  const [functionEditor, setFunctionEditor] = useState<{ id: string | null; name: string; updatedAt: string; phase: FunctionPhase | null } | null>(null)
  const [loadedTaskAt, setLoadedTaskAt] = useState('')
  const [taskConflict, setTaskConflict] = useState(false)
  const [functionConflict, setFunctionConflict] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<WeddingFunction | null>(null)
  const [pendingRitual, setPendingRitual] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [appliedEdit, setAppliedEdit] = useState<string | null>(null)
  const stopCelebration = useCallback(() => setCelebrate(false), [])
  const editParam = params.get('edit')

  const filtered = filter === 'All' ? tasks : tasks.filter((task) => (filter === 'Done' ? task.status === 'Completed' : task.status !== 'Completed'))
  const pendingCount = tasks.filter((task) => task.status !== 'Completed').length
  const doneCount = tasks.filter((task) => task.status === 'Completed').length
  const seeCosts = mode === 'preview' || canSeeBudget(role)
  const costEditable = editTask
    ? (mode === 'preview' || canEditTaskCost(role, editTask, ownSide))
    : (mode === 'preview' || canEditTaskCost(role, { side: null }, ownSide))
  const completedCount = tasks.filter((task) => task.status === 'Completed').length
  const pct = percent(completedCount, tasks.length)
  const community = communityLabel(bundle?.wedding.community)
  const sideGroups = unassignedSideGroups(filtered, role, ownSide)
  const heldAside = new Set(sideGroups.flatMap((group) => group.tasks.map((task) => task.id)))

  const groups = functions.map((fn) => ({
    fn,
    rituals: filtered
      .filter((task) => !heldAside.has(task.id) && (task.functionId === fn.id || (task.functionId == null && task.ceremony === fn.name)))
      .sort((a, b) => a.position - b.position || a.sortOrder - b.sortOrder),
  }))
  const placed = new Set(groups.flatMap((group) => group.rituals.map((task) => task.id)))
  const loose = filtered.filter((task) => !placed.has(task.id) && !heldAside.has(task.id)).sort((a, b) => a.position - b.position || a.sortOrder - b.sortOrder)
  const visibleGroups = groups.filter((group) => group.rituals.length > 0 || (filter === 'All' && canStructure))
  const ritualsFor = (fn: WeddingFunction) => tasks.filter((task) => task.functionId === fn.id || (task.functionId == null && task.ceremony === fn.name))
  const deleteCopy = pendingDelete
    ? functionRemovalCopy(
        pendingDelete.name,
        ritualsFor(pendingDelete).length,
        ritualsFor(pendingDelete).filter((task) => task.assignedTo).length,
      )
    : ''

  const openAdd = () => {
    setEditTask(null)
    setForm(emptyForm(functions[0]))
    setCostText('')
    setCostDirty(false)
    setCostCategoryId(null)
    setNewFunction(functions.length === 0 && canStructure)
    setFunctionName('')
    setError(null)
    setTaskConflict(false)
    setModalOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditTask(task)
    setLoadedTaskAt(task.updatedAt)
    setTaskConflict(false)
    setForm({
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      ceremony: task.ceremony,
      functionId: task.functionId,
      position: task.position,
      dueDate: task.dueDate,
      status: task.status,
      assignedTo: task.assignedTo,
    })
    setCostText('')
    setCostDirty(false)
    setCostCategoryId(task.budgetCategoryId)
    setNewFunction(false)
    setFunctionName('')
    setError(null)
    setModalOpen(true)
  }
  if (editParam && appliedEdit !== editParam) {
    setAppliedEdit(editParam)
    const task = (bundle?.tasks ?? []).find((item) => item.id === editParam)
    if (task) openEdit(task)
    const next = new URLSearchParams(params)
    next.delete('edit')
    queueMicrotask(() => setParams(next, { replace: true }))
  }
  const save = async (overwrite = false) => {
    const ceremony = newFunction ? functionName.trim() : form.ceremony.trim()
    if (!form.title.trim()) {
      setError('Add a title.')
      return
    }
    if (!ceremony) {
      setError(newFunction ? 'Name the function.' : 'Choose a function.')
      return
    }
    let actualCost = editTask?.actualCost ?? null
    const budgetCategoryId = costCategoryId
    if (seeCosts && costEditable) {
      if (!editTask || costDirty) {
        if (!costText.trim()) actualCost = null
        else {
          const problem = wholeRupeeProblem(costText)
          if (problem) {
            setError(problem)
            return
          }
          actualCost = Number(costText.trim())
        }
      }
    }
    setBusy(true)
    setError(null)
    try {
      await saveTask(
        {
          ...form,
          ceremony,
          functionId: newFunction ? null : form.functionId,
          ...(seeCosts && costEditable ? { actualCost, budgetCategoryId } : {}),
        },
        editTask?.id,
        editTask ? { updatedAt: loadedTaskAt, costUpdatedAt: editTask.costUpdatedAt, overwrite } : undefined,
      )
      setTaskConflict(false)
      setModalOpen(false)
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        setTaskConflict(false)
        setModalOpen(false)
        setEditTask(null)
        setError(DELETED_ITEM_MESSAGE)
        await refreshWedding()
        return
      }
      if (failure.kind === 'stale') {
        setTaskConflict(true)
        setError(null)
        return
      }
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  const reloadTask = async () => {
    if (!editTask) return
    setBusy(true)
    setError(null)
    try {
      const next = await refreshWedding()
      const latest = next?.tasks.find((task) => task.id === editTask.id)
      if (!latest) {
        setModalOpen(false)
        setEditTask(null)
        setTaskConflict(false)
        setError(DELETED_ITEM_MESSAGE)
        return
      }
      openEdit(latest)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const reloadFunction = async () => {
    if (!functionEditor?.id) return
    const editorId = functionEditor.id
    setBusy(true)
    setError(null)
    try {
      const next = await refreshWedding()
      const latest = next?.functions.find((fn) => fn.id === editorId)
      if (!latest) {
        setFunctionEditor(null)
        setFunctionConflict(false)
        setError(DELETED_ITEM_MESSAGE)
        return
      }
      setFunctionEditor({ id: latest.id, name: latest.name, updatedAt: latest.updatedAt, phase: latest.phase })
      setFunctionConflict(false)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const toggle = async (task: Task) => {
    const completed = task.status !== 'Completed'
    try {
      await toggleTask(task)
      if (completed) setCelebrate(true)
    } catch (caught) {
      setError(toErrorMessage(caught))
    }
  }
  const saveFunctionName = async (overwrite = false) => {
    const name = functionEditor?.name.trim() ?? ''
    if (!name) {
      setError('Name the function.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveFunction(
        name,
        functionEditor?.id ?? undefined,
        functionEditor?.id ? { updatedAt: functionEditor.updatedAt, overwrite } : undefined,
        functionEditor?.phase,
      )
      setFunctionConflict(false)
      setFunctionEditor(null)
    } catch (caught) {
      const failure = saveErrorPresentation(caught)
      if (failure.kind === 'deleted') {
        setFunctionConflict(false)
        setFunctionEditor(null)
        setError(DELETED_ITEM_MESSAGE)
        await refreshWedding()
        return
      }
      if (failure.kind === 'stale') {
        setFunctionConflict(true)
        setError(null)
        return
      }
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }
  const removeFunctionNow = async () => {
    if (!pendingDelete) return
    setBusy(true)
    setError(null)
    try {
      await deleteFunction(pendingDelete.id)
      setPendingDelete(null)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }
  const removeRitualNow = async () => {
    if (!pendingRitual) return
    setBusy(true)
    setError(null)
    try {
      await deleteTask(pendingRitual.id)
      setPendingRitual(null)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const ritualCard = (task: Task, siblings: number) => (
    <div key={task.id} style={{ background: COLORS.cardBg, border: `1px solid ${task.status === 'Completed' ? '#4CAF5040' : '#E8D4B0'}`, borderRadius: 14, padding: 14, marginBottom: 10, animation: 'fadeIn 0.3s ease', opacity: task.status === 'Completed' ? 0.75 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <button type="button" disabled={!canComplete} aria-label={task.status === 'Completed' ? 'Mark pending' : 'Mark completed'} onClick={() => void toggle(task)} style={{ width: SIZE.tap, height: SIZE.tap, borderRadius: '50%', border: `2px solid ${task.status === 'Completed' ? COLORS.green : COLORS.crimson}`, background: task.status === 'Completed' ? COLORS.green : 'transparent', cursor: canComplete ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {task.status === 'Completed' && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2A0A0A', textDecoration: task.status === 'Completed' ? 'line-through' : 'none', marginBottom: 4 }}>{task.title}</div>
          {task.description && <div style={{ fontSize: 12, color: '#7A5050', marginBottom: 6 }}>{task.description}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <Badge color={CATEGORY_COLORS[task.category] || '#666'} small>{task.category}</Badge>
            <Badge color={PRIORITY_COLORS[task.priority] || COLORS.gold} small>{task.priority}</Badge>
            {seeCosts && chipRupees(task.actualCost) != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: SIZE.tap }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 999, background: COLORS.goldTint, border: '1px solid #E5D4B2', color: COLORS.ink, fontSize: TYPE.small }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /></svg>
                  {formatInrGrouped(chipRupees(task.actualCost)!)}
                </span>
              </span>
            )}
            {task.dueDate && <span style={{ fontSize: TYPE.small, color: COLORS.muted }}>{task.dueDate}</span>}
            {task.assignedTo && (
              <span style={{ fontSize: 10, color: '#8B5050' }}>
                Assigned to {members.find((member) => member.userId === task.assignedTo)?.displayName ?? 'a member'}
              </span>
            )}
          </div>
        </div>
        {(canEdit || canStructure) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {canStructure && siblings > 1 && (
              <>
                <button type="button" aria-label={`Move ${task.title} up`} onClick={() => void moveTask(task.id, -1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↑</button>
                <button type="button" aria-label={`Move ${task.title} down`} onClick={() => void moveTask(task.id, 1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↓</button>
              </>
            )}
            {canEdit && (
              <>
                <button type="button" aria-label="Edit task" onClick={() => openEdit(task)} style={{ ...iconButton, color: COLORS.crimson }}>Edit</button>
                <button type="button" aria-label="Delete task" onClick={() => { setError(null); setPendingRitual(task) }} style={{ ...iconButton, color: '#CC4444' }}>🗑️</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: listAboveFab }}>
      <Celebration active={celebrate} onDone={stopCelebration} />
      <div style={{ background: `linear-gradient(135deg,${COLORS.appBar},${COLORS.crimson})`, padding: headerPadding }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Task Manager</div>
          <Link to="/timeline" style={{ color: COLORS.gold, fontSize: TYPE.small, fontWeight: 600, minHeight: SIZE.tap, display: 'inline-flex', alignItems: 'center' }}>Events</Link>
        </div>
        <div style={{ fontSize: TYPE.small, color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>Community · {community}</div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>🎯 {completedCount}/{tasks.length} Tasks Done — {pct}%</div>
      </div>

      {canStructure && (
        <div style={{ margin: '12px 16px 0' }}>
          <button type="button" onClick={() => { setError(null); setFunctionConflict(false); setFunctionEditor({ id: null, name: '', updatedAt: '', phase: 'pre_wedding' }) }} style={{ width: '100%', padding: 10, borderRadius: 12, border: `1.5px dashed ${COLORS.goldText}`, background: 'transparent', color: COLORS.crimson, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Add function
          </button>
        </div>
      )}

      <div className="count-chips" aria-label="Task status">
        {([
          ['All', tasks.length],
          ['Pending', pendingCount],
          ['Done', doneCount],
        ] as const).map(([item, count]) => {
          const selected = filter === item
          return (
            <button key={item} type="button" onClick={() => setFilter(item)} style={{ minHeight: SIZE.chip, padding: '0 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: TYPE.small, fontWeight: 600, background: selected ? COLORS.crimson : '#fff', color: selected ? '#fff' : COLORS.ink, border: selected ? 'none' : `1.5px solid ${COLORS.gold}` }}>
              {item} · {count}
            </button>
          )
        })}
      </div>

      {error && !modalOpen && !functionEditor && !pendingDelete && !pendingRitual && <div style={{ padding: '0 16px' }}><FormError message={error} /></div>}

      <div style={{ padding: '0 16px' }}>
        {sideGroups.length === 0 && visibleGroups.length === 0 && loose.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No tasks yet</div>
            <div style={{ fontSize: TYPE.small, marginTop: 4 }}>Add your first task to get started.</div>
          </div>
        ) : (
          <>
            {sideGroups.map((group) => (
              <section key={group.label}>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: COLORS.crimson, margin: '14px 0 8px' }}>{group.label}</h2>
                {group.tasks.map((task) => ritualCard(task, group.tasks.length))}
              </section>
            ))}
            {visibleGroups.map(({ fn, rituals }) => (
              <section key={fn.id}>
                <div className="event-group-header">
                  <span className="event-group-name">
                    <span aria-hidden="true" style={{ color: COLORS.muted, display: 'inline-flex', flex: '0 0 auto' }}><CalendarIcon /></span>
                    <h2>{fn.name}</h2>
                  </span>
                  {fn.phase ? <span className="event-phase-label">{PHASE_HEADERS[fn.phase]}</span> : null}
                  <span className="event-count-pill">{rituals.length} {rituals.length === 1 ? 'task' : 'tasks'}</span>
                  {canStructure && (
                    <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
                      {functions.length > 1 && (
                        <>
                          <button type="button" aria-label={`Move ${fn.name} up`} onClick={() => void moveFunction(fn.id, -1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↑</button>
                          <button type="button" aria-label={`Move ${fn.name} down`} onClick={() => void moveFunction(fn.id, 1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↓</button>
                        </>
                      )}
                      <button type="button" aria-label={`Rename ${fn.name}`} onClick={() => { setError(null); setFunctionConflict(false); setFunctionEditor({ id: fn.id, name: fn.name, updatedAt: fn.updatedAt, phase: fn.phase }) }} style={iconButton}>Edit</button>
                      <button type="button" aria-label={`Delete ${fn.name}`} onClick={() => { setError(null); setPendingDelete(fn) }} style={{ ...iconButton, color: COLORS.danger }}>Delete</button>
                    </div>
                  )}
                </div>
                {rituals.map((task) => ritualCard(task, rituals.length))}
              </section>
            ))}
            {loose.length > 0 && (
              <section>
                <div className="event-group-header">
                  <span className="event-group-name">
                    <h2>Other tasks</h2>
                  </span>
                  <span className="event-count-pill">{loose.length} {loose.length === 1 ? 'task' : 'tasks'}</span>
                </div>
                {loose.map((task) => ritualCard(task, loose.length))}
              </section>
            )}
          </>
        )}
      </div>

      {canEdit && <FAB onClick={openAdd} />}

      <Modal open={functionEditor !== null} onClose={() => setFunctionEditor(null)} title={functionEditor?.id ? 'Rename function' : 'New function'}>
        <FormError message={error} />
        <Field label="Function name">
          <input style={inputStyle} value={functionEditor?.name ?? ''} onChange={(event) => setFunctionEditor((current) => current ? { ...current, name: event.target.value } : current)} placeholder="Tilak" />
        </Field>
        <Field label="Phase">
          <select style={selectStyle} value={functionEditor?.phase ?? ''} onChange={(event) => setFunctionEditor((current) => current ? { ...current, phase: event.target.value === '' ? null : event.target.value as FunctionPhase } : current)}>
            <option value="">No phase</option>
            {FUNCTION_PHASES.map((phase) => <option key={phase} value={phase}>{PHASE_LABELS[phase]}</option>)}
          </select>
        </Field>
        {functionConflict ? (
          <ConflictChoices busy={busy} onReload={() => void reloadFunction()} onOverwrite={() => void saveFunctionName(true)} />
        ) : (
          <button type="button" disabled={busy} onClick={() => void saveFunctionName()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
            {busy ? 'Saving…' : functionEditor?.id ? 'Rename' : 'Add function'}
          </button>
        )}
      </Modal>

      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title="Remove function">
        <FormError message={error} />
        <p style={{ fontSize: 13, color: '#5A2020', marginBottom: 16, lineHeight: 1.6 }}>
          {deleteCopy}
        </p>
        <button type="button" disabled={busy} onClick={() => void removeFunctionNow()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Removing…' : 'Remove function'}
        </button>
      </Modal>

      <Modal open={pendingRitual !== null} onClose={() => setPendingRitual(null)} title="Remove ritual">
        <FormError message={error} />
        <p style={{ fontSize: 13, color: '#5A2020', marginBottom: 16, lineHeight: 1.6 }}>
          Remove {pendingRitual?.title}?
        </p>
        <button type="button" disabled={busy} onClick={() => void removeRitualNow()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Removing…' : 'Remove ritual'}
        </button>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTask ? 'Edit Task' : 'New Task'}>
        <FormError message={error} />
        <Field label="Title *">
          <input style={inputStyle} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Task title" />
        </Field>
        <Field label="Description">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Details..." />
        </Field>
        <Field label="Function">
          <select
            style={selectStyle}
            value={newFunction ? '__new__' : (form.functionId ?? '')}
            onChange={(event) => {
              const value = event.target.value
              if (value === '__new__') {
                setNewFunction(true)
                setForm((current) => ({ ...current, functionId: null }))
                return
              }
              const fn = functions.find((item) => item.id === value)
              setNewFunction(false)
              setForm((current) => ({ ...current, functionId: value, ceremony: fn?.name ?? current.ceremony }))
            }}
          >
            {functions.map((fn) => <option key={fn.id} value={fn.id}>{fn.name}</option>)}
            {canStructure && <option value="__new__">New function</option>}
          </select>
        </Field>
        {newFunction && (
          <Field label="New function name">
            <input style={inputStyle} value={functionName} onChange={(event) => setFunctionName(event.target.value)} placeholder="Tilak" />
          </Field>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Category">
            <select style={selectStyle} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as Category }))}>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select style={selectStyle} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as Priority }))}>
              {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </Field>
        </div>
        {editTask && (
          <Field label="Status">
            <select style={selectStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}>
              {TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
        )}
        {canEdit && (
          <Field label="Assign to">
            <select
              style={selectStyle}
              value={form.assignedTo ?? ''}
              onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value || null }))}
            >
              <option value="">Unassigned</option>
              {assigneeChoices(members, role, ownSide, editTask?.assignedTo).map((member) => (
                <option key={member.id} value={member.userId}>{member.displayName}</option>
              ))}
            </select>
          </Field>
        )}
        {seeCosts && (
          <>
            <Field label="Actual cost (₹)">
              <input
                style={inputStyle}
                inputMode="numeric"
                disabled={!costEditable}
                value={costDirty ? costText : (editTask?.actualCost == null ? '' : String(roundHalfUpRupees(toPaise(editTask.actualCost))))}
                placeholder="—"
                onChange={(event) => {
                  setCostDirty(true)
                  setCostText(event.target.value)
                }}
              />
              {costDirty && wholeRupeeProblem(costText, true) && <p style={{ color: COLORS.danger, fontSize: TYPE.small, margin: '6px 0 0' }}>{wholeRupeeProblem(costText, true)}</p>}
            </Field>
            <div style={{ marginBottom: 14 }}>
              <div style={sectionLabel}>Budget category</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(bundle?.budget ?? []).map((item) => {
                  const selected = costCategoryId === item.id
                  const duplicate = (bundle?.budget ?? []).filter((other) => other.category === item.category).length > 1
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!costEditable}
                      onClick={() => setCostCategoryId((current) => (current === item.id ? null : item.id))}
                      style={{ minHeight: SIZE.chip, padding: '0 16px', borderRadius: 999, border: selected ? 'none' : `1.5px solid ${COLORS.gold}`, background: selected ? COLORS.crimson : '#fff', color: selected ? '#fff' : COLORS.ink, fontSize: TYPE.small, fontWeight: 600, cursor: costEditable ? 'pointer' : 'default' }}
                    >
                      {duplicate && item.notes ? `${item.category} · ${item.notes}` : item.category}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
        <Field label="Due Date">
          <input style={inputStyle} type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        </Field>
        {taskConflict ? (
          <ConflictChoices busy={busy} onReload={() => void reloadTask()} onOverwrite={() => void save(true)} />
        ) : (
          <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
            {busy ? 'Saving…' : editTask ? 'Save Changes' : 'Add Task'}
          </button>
        )}
      </Modal>
    </div>
  )
}

function ConflictChoices({ busy, onReload, onOverwrite }: { busy: boolean; onReload: () => void; onOverwrite: () => void }) {
  return (
    <div>
      <p style={{ color: '#8B0000', fontSize: 13, margin: '8px 0' }}>{STALE_WRITE_MESSAGE}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" disabled={busy} onClick={onReload} style={{ ...primaryButton('transparent'), color: COLORS.crimson, border: `1px solid ${COLORS.gold}`, flex: 1 }}>
          Reload
        </button>
        <button type="button" disabled={busy} onClick={onOverwrite} style={{ ...primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`), flex: 1 }}>
          Overwrite
        </button>
      </div>
    </div>
  )
}

function assigneeChoices(
  members: readonly WeddingMember[],
  role: MemberRole | undefined,
  side: Side | null,
  currentAssignee: string | null | undefined,
) {
  const allowed = assignableMembers(members, role, side)
  if (!currentAssignee || allowed.some((member) => member.userId === currentAssignee)) return allowed
  const current = members.find((member) => member.userId === currentAssignee)
  return current ? [current, ...allowed] : allowed
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

const iconButton = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  color: COLORS.crimson,
  minHeight: 48,
  minWidth: 48,
} as const
