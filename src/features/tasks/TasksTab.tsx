import { useCallback, useState } from 'react'
import { HINDU_CHECKLIST } from '../../data/hinduChecklist.ts'
import { Badge, Celebration, FAB, Field, FormError, Modal } from '../../components/ui.tsx'
import { toErrorMessage } from '../../lib/errors.ts'
import { percent } from '../../lib/planning.ts'
import { useWedding } from '../../state/wedding-context.ts'
import { CATEGORY_COLORS, COLORS, PRIORITY_COLORS } from '../../styles/tokens.ts'
import { inputStyle, primaryButton, selectStyle } from '../../styles/ui.ts'
import type { Category, Priority, Task, TaskDraft, TaskStatus } from '../../types.ts'
import { CATEGORIES, PRIORITIES, TASK_STATUSES } from '../../types.ts'

const emptyForm = (): TaskDraft => ({
  title: '',
  description: '',
  category: 'Venue',
  priority: 'Medium',
  dueDate: '',
  status: 'Pending',
})

export function TasksTab() {
  const { bundle, saveTask, deleteTask, toggleTask, loadHinduChecklist } = useWedding()
  const tasks = bundle?.tasks ?? []
  const [filter, setFilter] = useState<'All' | TaskStatus>('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [form, setForm] = useState<TaskDraft>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const stopCelebration = useCallback(() => setCelebrate(false), [])

  const filtered = filter === 'All' ? tasks : tasks.filter((task) => task.status === filter)
  const completedCount = tasks.filter((task) => task.status === 'Completed').length
  const pct = percent(completedCount, tasks.length)

  const openAdd = () => {
    setEditTask(null)
    setForm(emptyForm())
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
      dueDate: task.dueDate,
      status: task.status,
    })
    setError(null)
    setModalOpen(true)
  }
  const save = async () => {
    if (!form.title.trim()) {
      setError('Add a title.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveTask(form, editTask?.id)
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
  const loadTemplate = async () => {
    setBusy(true)
    setError(null)
    try {
      await loadHinduChecklist()
      setShowTemplate(false)
    } catch (caught) {
      setError(toErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <Celebration active={celebrate} onDone={stopCelebration} />
      <div style={{ background: `linear-gradient(135deg,${COLORS.saffron},${COLORS.crimson})`, padding: '52px 20px 20px' }}>
        <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, color: '#fff', fontWeight: 700, marginBottom: 10 }}>Task Manager</div>
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>🎯 {completedCount}/{tasks.length} Tasks Done — {pct}%</div>
      </div>

      <div style={{ margin: '12px 16px 0' }}>
        <button type="button" onClick={() => { setError(null); setShowTemplate(true) }} style={{ width: '100%', padding: 10, borderRadius: 12, border: `1.5px dashed ${COLORS.gold}`, background: 'transparent', color: COLORS.crimson, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          🕉️ Load Hindu Wedding Checklist ({HINDU_CHECKLIST.length} tasks)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}>
        {(['All', ...TASK_STATUSES] as const).map((item) => (
          <button key={item} type="button" onClick={() => setFilter(item)} style={{ padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600, background: filter === item ? COLORS.crimson : '#F0E0CC', color: filter === item ? '#fff' : COLORS.crimson }}>
            {item}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#A07070' }}>
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No tasks yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Add your first task to get started!</div>
          </div>
        ) : (
          filtered.map((task) => (
            <div key={task.id} style={{ background: COLORS.cardBg, border: `1px solid ${task.status === 'Completed' ? '#4CAF5040' : '#E8D4B0'}`, borderRadius: 14, padding: 14, marginBottom: 10, animation: 'fadeIn 0.3s ease', opacity: task.status === 'Completed' ? 0.75 : 1 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <button type="button" aria-label={task.status === 'Completed' ? 'Mark pending' : 'Mark completed'} onClick={() => void toggle(task)} style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${task.status === 'Completed' ? COLORS.green : COLORS.crimson}`, background: task.status === 'Completed' ? COLORS.green : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" aria-label="Edit task" onClick={() => openEdit(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: COLORS.gold }}>✏️</button>
                  <button type="button" aria-label="Delete task" onClick={() => void deleteTask(task.id).catch((caught) => setError(toErrorMessage(caught)))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#CC4444' }}>🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <FAB onClick={openAdd} />

      <Modal open={showTemplate} onClose={() => setShowTemplate(false)} title="🕉️ Hindu Wedding Checklist">
        <FormError message={error} />
        <p style={{ fontSize: 13, color: '#5A2020', marginBottom: 16, lineHeight: 1.6 }}>
          Load {HINDU_CHECKLIST.length} traditional Hindu wedding tasks. Tasks you already have, including ones you renamed, are not added again.
        </p>
        <button type="button" disabled={busy} onClick={() => void loadTemplate()} style={primaryButton(`linear-gradient(135deg,${COLORS.crimson},${COLORS.maroon})`)}>
          {busy ? 'Loading…' : 'Load All Tasks'}
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
