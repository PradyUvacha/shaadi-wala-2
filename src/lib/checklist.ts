import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import { mapFunction, mapTask } from './mappers.ts'
import type { MemberRole, WeddingBundle } from '../types.ts'

export type ChecklistTable = 'tasks' | 'wedding_functions'

export type ChecklistChange = {
  table: ChecklistTable
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  record: Record<string, unknown>
}

export function communityLabel(community: string | null | undefined): string {
  const text = (community ?? '').trim()
  if (!text) return 'Hindu'
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const DUPLICATE_RITUAL_MESSAGE = 'This function already has a ritual with that name.'
export const DUPLICATE_FUNCTION_MESSAGE = 'This wedding already has a function with that name.'

export function functionRemovalCopy(name: string, rituals: number, assigned: number): string {
  const ritualLabel = rituals === 1 ? '1 ritual' : `${rituals} rituals`
  const assignedLabel = assigned === 1 ? '1 assigned task' : `${assigned} assigned tasks`
  return `Remove ${name}? ${ritualLabel} will be removed, including ${assignedLabel}.`
}

export function ritualNameKey(title: string): string {
  return title.trim().toLowerCase()
}

export function duplicateRitualName(
  tasks: readonly { id: string; functionId: string | null; title: string }[],
  input: { functionId: string; title: string; exceptId?: string },
): boolean {
  const key = ritualNameKey(input.title)
  if (!key) return false
  return tasks.some(
    (task) => task.functionId === input.functionId && task.id !== input.exceptId && ritualNameKey(task.title) === key,
  )
}

/** Swap one row with its neighbour and rewrite positions as 1..n. Equal positions still move. */
export function moveByPosition<T extends { id: string; position: number }>(
  items: readonly T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const ordered = [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
  const index = ordered.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= ordered.length) return items as T[]
  const swapped = [...ordered]
  const [moved] = swapped.splice(index, 1)
  swapped.splice(target, 0, moved!)
  return swapped.map((item, position) => ({ ...item, position: position + 1 }))
}

export function checklistChannelFilters(weddingId: string) {
  return [
    { event: '*' as const, schema: 'public' as const, table: 'tasks' as const, filter: `wedding_id=eq.${weddingId}` },
    { event: '*' as const, schema: 'public' as const, table: 'wedding_functions' as const, filter: `wedding_id=eq.${weddingId}` },
  ]
}

export function checklistChangeFromPayload(
  table: ChecklistTable,
  payload: Pick<RealtimePostgresChangesPayload<Record<string, unknown>>, 'eventType' | 'new' | 'old'>,
): ChecklistChange | null {
  if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE' && payload.eventType !== 'DELETE') return null
  const record = payload.eventType === 'DELETE' ? payload.old : payload.new
  if (!record || typeof record !== 'object' || !('id' in record) || !record.id) return null
  return { table, eventType: payload.eventType, record }
}

/** A friend only receives assigned rituals. Function rows stay visible to every member. */
export function acceptsChecklistChange(change: ChecklistChange, role: MemberRole | null | undefined, userId: string | null): boolean {
  if (change.table !== 'tasks' || role !== 'friend' || change.eventType === 'DELETE') return true
  return Boolean(userId) && String(change.record.assigned_to ?? '') === userId
}

/** Apply one realtime insert, update, or delete onto the open wedding. */
export function applyChecklistChange(bundle: WeddingBundle, change: ChecklistChange): WeddingBundle {
  if (change.table === 'wedding_functions') {
    const id = String(change.record.id ?? '')
    if (!id) return bundle
    if (change.eventType === 'DELETE') {
      const current = bundle.functions.find((fn) => fn.id === id)
      return {
        ...bundle,
        functions: bundle.functions.filter((fn) => fn.id !== id),
        tasks: bundle.tasks.filter((task) => task.functionId !== id && !(current && task.functionId == null && task.ceremony === current.name)),
      }
    }
    const next = mapFunction(change.record)
    const previous = bundle.functions.find((fn) => fn.id === next.id)
    const functions = previous
      ? bundle.functions.map((fn) => (fn.id === next.id ? next : fn))
      : [...bundle.functions, next]
    const tasks = previous && previous.name !== next.name
      ? bundle.tasks.map((task) => (task.functionId === next.id ? { ...task, ceremony: next.name } : task))
      : bundle.tasks
    return { ...bundle, functions, tasks }
  }
  const id = String(change.record.id ?? '')
  if (!id) return bundle
  if (change.eventType === 'DELETE') {
    return { ...bundle, tasks: bundle.tasks.filter((task) => task.id !== id) }
  }
  const task = mapTask(change.record)
  const exists = bundle.tasks.some((item) => item.id === task.id)
  const tasks = exists ? bundle.tasks.map((item) => (item.id === task.id ? task : item)) : [...bundle.tasks, task]
  return { ...bundle, tasks: [...tasks].sort((a, b) => a.sortOrder - b.sortOrder || a.position - b.position) }
}

export function subscribeWeddingChecklist(
  client: SupabaseClient,
  weddingId: string,
  onChange: (change: ChecklistChange) => void,
): () => void {
  const channel = client.channel(`checklist:${weddingId}`)
  for (const filter of checklistChannelFilters(weddingId)) {
    channel.on('postgres_changes', filter, (payload) => {
      const change = checklistChangeFromPayload(filter.table, payload)
      if (change) onChange(change)
    })
  }
  channel.subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}
