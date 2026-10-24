import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { HINDU_CHECKLIST } from '../data/hinduChecklist.ts'
import { track } from '../lib/analytics.ts'
import {
  addPayment,
  createDemoBundle,
  removeBudgetItem,
  removeGuest,
  removeMilestone,
  removeTask,
  replaceBudgetItem,
  saveBudgetDraft,
  saveGuestDraft,
  saveMilestoneDraft,
  saveTaskDraft,
  updateBundleSettings,
  withGuest,
  withMilestone,
  withTask,
} from '../lib/bundle.ts'
import { toErrorMessage } from '../lib/errors.ts'
import { missingTemplateTasks, templateToDrafts } from '../lib/planning.ts'
import { readPreview, writePreview } from '../lib/preview.ts'
import { supabase } from '../lib/supabase.ts'
import { createWeddingApi } from '../lib/weddingApi.ts'
import type {
  BudgetDraft,
  CreateWeddingInput,
  GuestDraft,
  Milestone,
  MilestoneDraft,
  PartPaymentDraft,
  Task,
  TaskDraft,
  WeddingBundle,
  WeddingSettings,
} from '../types.ts'
import { useAuth } from './auth-context.ts'
import { WeddingContext, type WeddingMode } from './wedding-context.ts'

export function WeddingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id ?? null
  const [preview, setPreview] = useState<WeddingBundle | null>(() => readPreview())
  const [remote, setRemote] = useState<{ userId: string; bundle: WeddingBundle | null; error: string | null } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const bundleRef = useRef<WeddingBundle | null>(null)
  const modeRef = useRef<WeddingMode>(null)
  const apiRef = useRef<ReturnType<typeof createWeddingApi> | null>(null)

  const ready = !userId || remote?.userId === userId
  const bundle = userId ? (remote?.userId === userId ? remote.bundle : null) : preview
  const mode: WeddingMode = userId ? 'remote' : preview ? 'preview' : null
  const error = userId && remote?.userId === userId ? remote.error : null

  useEffect(() => {
    bundleRef.current = bundle
    modeRef.current = mode
  }, [bundle, mode])

  useEffect(() => {
    if (!session || !supabase || !userId) {
      apiRef.current = null
      return
    }
    writePreview(null)
    let cancelled = false
    const api = createWeddingApi(supabase, session.user)
    apiRef.current = api
    void api.getMine().then((next) => {
      if (cancelled) return
      setPreview(null)
      setRemote({ userId, bundle: next, error: null })
    }).catch((caught: unknown) => {
      if (cancelled) return
      setRemote({ userId, bundle: null, error: toErrorMessage(caught) })
    })
    return () => {
      cancelled = true
    }
  }, [session, userId, reloadKey])

  const commit = useCallback((next: WeddingBundle) => {
    bundleRef.current = next
    if (!userId) {
      writePreview(next)
      setPreview(next)
      return
    }
    setRemote({ userId, bundle: next, error: null })
  }, [userId])

  const requireBundle = useCallback(() => {
    const current = bundleRef.current
    if (!current) throw new Error('No wedding is open.')
    return current
  }, [])

  const value = useMemo(() => ({
    ready,
    mode,
    bundle,
    notice,
    error,
    clearNotice: () => setNotice(null),
    clearError: () => setRemote((current) => (current ? { ...current, error: null } : current)),
    reload: () => {
      setRemote(null)
      setReloadKey((current) => current + 1)
    },
    startPreview: () => {
      const next = createDemoBundle({ side: 'bride', displayName: 'Guest' })
      modeRef.current = 'preview'
      bundleRef.current = next
      writePreview(next)
      setPreview(next)
    },
    createWedding: async (input: CreateWeddingInput) => {
      const api = apiRef.current
      if (!api || !userId) throw new Error('Sign in before creating a wedding.')
      const result = await api.createWedding(input)
      modeRef.current = 'remote'
      bundleRef.current = result.bundle
      setRemote({ userId, bundle: result.bundle, error: null })
      setNotice(result.notice)
    },
    updateSettings: async (settings: WeddingSettings) => {
      const current = requireBundle()
      if (modeRef.current === 'remote') await apiRef.current?.updateSettings(current, settings)
      commit(updateBundleSettings(requireBundle(), settings))
    },
    saveTask: async (draft: TaskDraft, id?: string) => {
      const current = requireBundle()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveTaskDraft(current, draft, id))
        return
      }
      const saved = await apiRef.current.saveTask(current.wedding.id, draft, id)
      commit(withTask(requireBundle(), saved))
    },
    deleteTask: async (id: string) => {
      const current = requireBundle()
      if (modeRef.current === 'remote') await apiRef.current?.deleteTask(id)
      commit(removeTask(current, id))
    },
    toggleTask: async (task: Task) => {
      const status = task.status === 'Completed' ? 'Pending' : 'Completed'
      const current = requireBundle()
      const draft: TaskDraft = { ...task, status }
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveTaskDraft(current, draft, task.id))
      } else {
        const saved = await apiRef.current.saveTask(current.wedding.id, draft, task.id)
        commit(withTask(requireBundle(), saved))
      }
      if (status === 'Completed') track('task_completed')
    },
    loadHinduChecklist: async () => {
      const current = requireBundle()
      const template = modeRef.current === 'remote' && apiRef.current ? await apiRef.current.loadTemplate() : HINDU_CHECKLIST
      const missing = missingTemplateTasks(current.tasks, template)
      if (missing.length === 0) return 0
      const drafts = templateToDrafts(missing)
      if (modeRef.current === 'preview' || !apiRef.current) {
        let next = requireBundle()
        for (const draft of drafts) next = saveTaskDraft(next, draft)
        commit(next)
      } else {
        const saved = await apiRef.current.addTasks(current.wedding.id, drafts)
        let next = requireBundle()
        for (const task of saved) next = withTask(next, task)
        commit(next)
      }
      track('checklist_loaded', { count: missing.length })
      return missing.length
    },
    saveBudgetItem: async (draft: BudgetDraft, id?: string) => {
      const current = requireBundle()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveBudgetDraft(current, draft, id))
        track('budget_item_saved')
        return
      }
      const saved = await apiRef.current.saveBudgetItem(current.wedding.id, draft, id)
      commit(replaceBudgetItem(requireBundle(), saved))
      track('budget_item_saved')
    },
    deleteBudgetItem: async (id: string) => {
      const current = requireBundle()
      if (modeRef.current === 'remote') await apiRef.current?.deleteBudgetItem(id)
      commit(removeBudgetItem(current, id))
    },
    addPayment: async (budgetItemId: string, payment: PartPaymentDraft) => {
      const current = requireBundle()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(addPayment(current, budgetItemId, payment))
        return
      }
      const item = current.budget.find((entry) => entry.id === budgetItemId)
      if (!item) throw new Error('That budget item is no longer here.')
      const saved = await apiRef.current.addPayment(item, payment)
      commit(replaceBudgetItem(requireBundle(), saved))
    },
    saveGuest: async (draft: GuestDraft, id?: string) => {
      const current = requireBundle()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveGuestDraft(current, draft, id))
      } else {
        const saved = await apiRef.current.saveGuest(current.wedding.id, draft, id)
        commit(withGuest(requireBundle(), saved))
      }
      track('guest_saved')
    },
    deleteGuest: async (id: string) => {
      const current = requireBundle()
      if (modeRef.current === 'remote') await apiRef.current?.deleteGuest(id)
      commit(removeGuest(current, id))
    },
    saveMilestone: async (draft: MilestoneDraft, id?: string) => {
      const current = requireBundle()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveMilestoneDraft(current, draft, id))
      } else {
        const saved = await apiRef.current.saveMilestone(current.wedding.id, draft, id)
        commit(withMilestone(requireBundle(), saved))
      }
      track('timeline_event_saved')
    },
    deleteMilestone: async (id: string) => {
      const current = requireBundle()
      if (modeRef.current === 'remote') await apiRef.current?.deleteMilestone(id)
      commit(removeMilestone(current, id))
    },
    toggleMilestone: async (milestone: Milestone) => {
      const status = milestone.status === 'Completed' ? 'Upcoming' : 'Completed'
      const current = requireBundle()
      const draft: MilestoneDraft = { ...milestone, status }
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveMilestoneDraft(current, draft, milestone.id))
        return
      }
      const saved = await apiRef.current.saveMilestone(current.wedding.id, draft, milestone.id)
      commit(withMilestone(requireBundle(), saved))
    },
  }), [bundle, commit, error, mode, notice, ready, requireBundle, userId])

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
}
