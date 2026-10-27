import type { RealtimePostgresChangesPayload, SupabaseClient } from '@supabase/supabase-js'
import type { Task, WeddingBundle } from '../types.ts'

export type TaskCostChange = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  record: Record<string, unknown>
}

export function stripTaskCosts(bundle: WeddingBundle): WeddingBundle {
  if (bundle.membership.role !== 'friend') return bundle
  return {
    ...bundle,
    tasks: bundle.tasks.map((task) => ({ ...task, actualCost: null, budgetCategoryId: null, costUpdatedAt: '' })),
  }
}

export function applyTaskCostChange(bundle: WeddingBundle, change: TaskCostChange): WeddingBundle {
  if (bundle.membership.role === 'friend') return stripTaskCosts(bundle)
  const taskId = String(change.record.task_id ?? change.record.id ?? '')
  if (!taskId) return bundle
  const tasks = bundle.tasks.map((task) => {
    if (task.id !== taskId) return task
    if (change.eventType === 'DELETE') {
      return { ...task, actualCost: null, budgetCategoryId: null, costUpdatedAt: '' }
    }
    return {
      ...task,
      actualCost: change.record.actual_cost == null ? null : Number(change.record.actual_cost),
      budgetCategoryId: change.record.budget_category_id ? String(change.record.budget_category_id) : null,
      costUpdatedAt: change.record.updated_at ? String(change.record.updated_at) : task.costUpdatedAt,
    }
  })
  return { ...bundle, tasks }
}

export function subscribeTaskCosts(
  client: SupabaseClient,
  weddingId: string,
  onChange: (change: TaskCostChange) => void,
): () => void {
  const channel = client.channel(`task-costs:${weddingId}`)
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'task_costs', filter: `wedding_id=eq.${weddingId}` },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE' && payload.eventType !== 'DELETE') return
      const record = payload.eventType === 'DELETE' ? payload.old : payload.new
      if (!record || typeof record !== 'object') return
      onChange({ eventType: payload.eventType, record: record as Record<string, unknown> })
    },
  )
  channel.subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

export function costFields(task: Pick<Task, 'actualCost' | 'budgetCategoryId' | 'costUpdatedAt'>) {
  return {
    actualCost: task.actualCost,
    budgetCategoryId: task.budgetCategoryId,
    costUpdatedAt: task.costUpdatedAt,
  }
}
