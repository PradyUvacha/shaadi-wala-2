import { useCallback, useState } from 'react'
import { Badge, Celebration, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { canEditChecklist, canManageTasks } from '../../lib/access.ts'
import { communityLabel } from '../../lib/checklist.ts'
import { toErrorMessage } from '../../lib/errors.ts'
import { percent } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { CATEGORY_COLORS, COLORS, PRIORITY_COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import { headerPadding, listAboveFab } from '../../styles/safeArea.ts'
import type { Category, Priority, Task, TaskDraft, TaskStatus, WeddingFunction } from '../../types.ts'
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
})

export function TasksTab() {
  const { bundle, mode, saveTask, deleteTask, toggleTask, saveFunction, deleteFunction, moveFunction, moveTask } = useWedding()
  const role = bundle?.membership.role
  const canEdit = mode === 'preview' || canManageTasks(role)
  const canStructure = mode === 'preview' || canEditChecklist(role)
  const canComplete = canEdit || role === 'friend'
  const tasks = bundle?.tasks ?? []
  const functions = [...(bundle?.functions ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  const [filter, setFilter] = useState<'All' | TaskStatus>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [form, setForm] = useState<TaskDraft>(emptyForm())
  const [newFunction, setNewFunction] = useState(false)
  const [functionName, setFunctionName] = useState('')
  const [functionEditor, setFunctionEditor] = useState<{ id: string | null; name: string } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<WeddingFunction | null>(null)
  const [pendingRitual, setPendingRitual] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const stopCelebration = useCallback(() => setCelebrate(false), [])

  const filtered = filter === 'All' ? tasks : tasks.filter((task) => task.status === filter)
  const completedCount = tasks.filter((task) => task.status === 'Completed').length
  const pct = percent(completedCount, tasks.length)
  const community = communityLabel(bundle?.wedding.community)

  const groups = functions.map((fn) => ({
    fn,
    rituals: filtered
      .filter((task) => task.functionId === fn.id || (task.functionId == null && task.ceremony === fn.name))
      .sort((a, b) => a.position - b.position || a.sortOrder - b.sortOrder),
  }))
  const placed = new Set(groups.flatMap((group) => group.rituals.map((task) => task.id)))
  const loose = filtered.filter((task) => !placed.has(task.id)).sort((a, b) => a.position - b.position || a.sortOrder - b.sortOrder)
  const visibleGroups = groups.filter((group) => group.rituals.length > 0 || (filter === 'All' && canStructure))

  const openAdd = () => {
    setEditTask(null)
    setForm(emptyForm(functions[0]))
    setNewFunction(functions.length === 0 && canStructure)
    setFunctionName('')
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (task: Task) => {
    setEditTask(task)
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
    })
    setNewFunction(false)
    setFunctionName('')
    setError(null)
    setModalOpen(true)
  }
  const save = async () => {
    const ceremony = newFunction ? functionName.trim() : form.ceremony.trim()
    if (!form.title.trim()) {
      setError('Add a title.')
      return
    }
    if (!ceremony) {
      setError(newFunction ? 'Name the function.' : 'Choose a function.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveTask(
        {
          ...form,
          ceremony,
          functionId: newFunction ? null : form.functionId,
        },
        editTask?.id,
      )
      setModalOpen(false)
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
  const saveFunctionName = async () => {
    const name = functionEditor?.name.trim() ?? ''
    if (!name) {
      setError('Name the function.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveFunction(name, functionEditor?.id ?? undefined)
      setFunctionEditor(null)
    } catch (caught) {
      setError(toErrorMessage(caught))
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
        <button type="button" disabled={!canComplete} aria-label={task.status === 'Completed' ? 'Mark pending' : 'Mark completed'} onClick={() => void toggle(task)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${task.status === 'Completed' ? COLORS.green : COLORS.crimson}`, background: task.status === 'Completed' ? COLORS.green : 'transparent', cursor: canComplete ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          {task.status === 'Completed' && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#2A0A0A', textDecoration: task.status === 'Completed' ? 'line-through' : 'none', marginBottom: 4 }}>{task.title}</div>
          {task.description && <div style={{ fontSize: 12, color: '#7A5050', marginBottom: 6 }}>{task.description}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <Badge color={CATEGORY_COLORS[task.category] || '#666'} small>{task.category}</Badge>
            <Badge color={PRIORITY_COLORS[task.priority] || COLORS.gold} small>{task.priority}</Badge>
            {task.dueDate && <span style={{ fontSize: 10, color: '#8B5050' }}>📅 {task.dueDate}</span>}
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
                <button type="button" aria-label="Edit task" onClick={() => openEdit(task)} style={{ ...iconButton, color: COLORS.gold }}>✏️</button>
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
      <div style={{ background: `linear-gradient(135deg,${COLORS.saffron},${COLORS.crimson})`, padding: headerPadding }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 6 }}>Task Manager</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>Community · {community}</div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>🎯 {completedCount}/{tasks.length} Tasks Done — {pct}%</div>
      </div>

      {canStructure && (
        <div style={{ margin: '12px 16px 0' }}>
          <button type="button" onClick={() => { setError(null); setFunctionEditor({ id: null, name: '' }) }} style={{ width: '100%', padding: 10, borderRadius: 12, border: `1.5px dashed ${COLORS.gold}`, background: 'transparent', color: COLORS.crimson, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Add function
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
        {(['All', ...TASK_STATUSES] as const).map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} style={{ padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, background: filter === item ? COLORS.crimson : '#F0E0CC', color: filter === item ? '#fff' : COLORS.crimson }}>
            {item}
          </button>
        ))}
      </div>

      {error && !modalOpen && !functionEditor && !pendingDelete && !pendingRitual && <div style={{ padding: '0 16px' }}><FormError message={error} /></div>}

      <div style={{ padding: '0 16px' }}>
        {visibleGroups.length === 0 && loose.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No tasks yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add your first task to get started!</div>
          </div>
        ) : (
          <>
            {visibleGroups.map(({ fn, rituals }) => (
              <section key={fn.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: COLORS.crimson, margin: 0, flex: 1 }}>{fn.name}</h2>
                  {canStructure && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {functions.length > 1 && (
                        <>
                          <button type="button" aria-label={`Move ${fn.name} up`} onClick={() => void moveFunction(fn.id, -1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↑</button>
                          <button type="button" aria-label={`Move ${fn.name} down`} onClick={() => void moveFunction(fn.id, 1).catch((caught) => setError(toErrorMessage(caught)))} style={iconButton}>↓</button>
                        </>
                      )}
                      <button type="button" aria-label={`Rename ${fn.name}`} onClick={() => { setError(null); setFunctionEditor({ id: fn.id, name: fn.name }) }} style={iconButton}>✏️</button>
                      <button type="button" aria-label={`Delete ${fn.name}`} onClick={() => { setError(null); setPendingDelete(fn) }} style={{ ...iconButton, color: '#CC4444' }}>🗑️</button>
                    </div>
                  )}
                </div>
                {rituals.map((task) => ritualCard(task, rituals.length))}
              </section>
            ))}
            {loose.length > 0 && (
              <section>
                <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: COLORS.crimson, margin: '14px 0 8px' }}>Other</h2>
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
        <button type="button" disabled={busy} onClick={() => void saveFunctionName()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Saving…' : functionEditor?.id ? 'Rename' : 'Add function'}
        </button>
      </Modal>

      <Modal open={pendingDelete !== null} onClose={() => setPendingDelete(null)} title="Remove function">
        <FormError message={error} />
        <p style={{ fontSize: 13, color: '#5A2020', marginBottom: 16, lineHeight: 1.6 }}>
          Remove {pendingDelete?.name}? Its rituals are removed too.
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
        <Field label="Due Date">
          <input style={inputStyle} type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        </Field>
        <button type="button" disabled={busy} onClick={() => void save()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Saving…' : editTask ? 'Save Changes' : 'Add Task'}
        </button>
      </Modal>
    </div>
  )
}

const iconButton = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  color: COLORS.crimson,
  minHeight: 32,
  minWidth: 32,
} as const
