import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { track } from '../lib/analytics.ts'
import { canEditChecklist, canEditWedding, canInvite, canLeaveWedding, canManageTasks, isCouple } from '../lib/access.ts'
import {
  addFunction,
  addPayment,
  createDemoBundle,
  moveFunctionDraft,
  moveTaskDraft,
  removeBudgetItem,
  removeFunction,
  removeGuest,
  removeMemberFromBundle,
  removeMilestone,
  removeTask,
  renameFunction,
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
import { acceptsChecklistChange, applyChecklistChange, subscribeWeddingChecklist } from '../lib/checklist.ts'
import { toErrorMessage, type RowGuard } from '../lib/errors.ts'
import { LEFT_WEDDING_MESSAGE, membershipAccessChanged, subscribeOwnMembership } from '../lib/membershipSync.ts'
import { readPreview, writePreview } from '../lib/preview.ts'
import { supabase } from '../lib/supabase.ts'
import type { createWeddingApi } from '../lib/weddingApi.ts'
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
  InviteRole,
  Side,
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
    const client = supabase
    const currentSession = session
    writePreview(null)
    let cancelled = false
    void import('../lib/weddingApi.ts').then(async ({ createWeddingApi: createApi }) => {
      if (cancelled) return
      const api = createApi(client, currentSession.user)
      apiRef.current = api
      try {
        const next = await api.getMine()
        if (cancelled) return
        setPreview(null)
        setRemote({ userId, bundle: next, error: null })
      } catch (caught: unknown) {
        if (cancelled) return
        setRemote({ userId, bundle: null, error: toErrorMessage(caught) })
      }
    }).catch((caught: unknown) => {
      if (cancelled) return
      setRemote({ userId, bundle: null, error: toErrorMessage(caught) })
    })
    return () => {
      cancelled = true
    }
  }, [session, userId, reloadKey])

  const leaveOpenWedding = useCallback((message: string) => {
    bundleRef.current = null
    modeRef.current = userId ? 'remote' : null
    if (!userId) {
      writePreview(null)
      setPreview(null)
      return
    }
    setRemote({ userId, bundle: null, error: null })
    setNotice(message)
  }, [userId])

  const commit = useCallback((next: WeddingBundle) => {
    bundleRef.current = next
    if (!userId) {
      writePreview(next)
      setPreview(next)
      return
    }
    setRemote({ userId, bundle: next, error: null })
  }, [userId])

  useEffect(() => {
    if (!supabase || mode !== 'remote') return
    const weddingId = bundle?.wedding.id
    if (!weddingId) return
    return subscribeWeddingChecklist(supabase, weddingId, (change) => {
      const current = bundleRef.current
      if (!current || current.wedding.id !== weddingId) return
      if (!acceptsChecklistChange(change, current.membership.role, userId)) return
      commit(applyChecklistChange(current, change))
    })
  }, [mode, bundle?.wedding.id, commit, userId])

  useEffect(() => {
    if (!supabase || mode !== 'remote' || !userId || !bundle?.wedding.id) return
    return subscribeOwnMembership(supabase, userId, (event) => {
      const current = bundleRef.current
      if (!current) return
      if (event.type === 'removed') {
        leaveOpenWedding(LEFT_WEDDING_MESSAGE)
        return
      }
      if (!membershipAccessChanged(current.membership, event)) return
      const api = apiRef.current
      if (!api) return
      void api.getMine().then((next) => {
        if (!bundleRef.current || bundleRef.current.wedding.id !== current.wedding.id) return
        if (!next) {
          leaveOpenWedding(LEFT_WEDDING_MESSAGE)
          return
        }
        commit(next)
      }).catch((caught: unknown) => {
        setNotice(toErrorMessage(caught))
      })
    })
  }, [mode, userId, bundle?.wedding.id, commit, leaveOpenWedding])

  const requireBundle = useCallback(() => {
    const current = bundleRef.current
    if (!current) throw new Error('No wedding is open.')
    return current
  }, [])

  const requireEditor = useCallback(() => {
    const current = requireBundle()
    if (modeRef.current === 'remote' && !canEditWedding(current.membership.role)) {
      throw new Error('You have view-only access to this wedding.')
    }
    return current
  }, [requireBundle])

  const requireTaskWriter = useCallback(() => {
    const current = requireBundle()
    if (modeRef.current === 'remote' && !canManageTasks(current.membership.role)) {
      throw new Error('You cannot edit rituals on this wedding.')
    }
    return current
  }, [requireBundle])

  const requireChecklist = useCallback(() => {
    const current = requireBundle()
    if (modeRef.current === 'remote' && !canEditChecklist(current.membership.role)) {
      throw new Error('Only the couple or the planner can change functions.')
    }
    return current
  }, [requireBundle])

  const pullChecklist = useCallback(async (current: WeddingBundle) => {
    const api = apiRef.current
    if (!api || modeRef.current !== 'remote') return current
    const [tasks, functions] = await Promise.all([
      api.listTasks(current.wedding.id),
      api.listFunctions(current.wedding.id),
    ])
    return { ...current, tasks, functions }
  }, [])

  const value = useMemo(() => ({
    ready,
    mode,
    bundle,
    canEdit: mode === 'preview' || canEditWedding(bundle?.membership.role),
    notice,
    error,
    clearNotice: () => setNotice(null),
    clearError: () => setRemote((current) => (current ? { ...current, error: null } : current)),
    reload: () => {
      setRemote(null)
      setReloadKey((current) => current + 1)
    },
    refreshWedding: async () => {
      const current = bundleRef.current
      const api = apiRef.current
      if (!api || modeRef.current !== 'remote' || !current) return current
      const next = await api.getMine()
      if (!next) {
        leaveOpenWedding(LEFT_WEDDING_MESSAGE)
        return null
      }
      commit(next)
      return next
    },
    startPreview: () => {
      const next = createDemoBundle({ side: 'bride', displayName: 'Guest' })
      modeRef.current = 'preview'
      bundleRef.current = next
      writePreview(next)
      setPreview(next)
    },
    leavePreview: () => {
      modeRef.current = null
      bundleRef.current = null
      writePreview(null)
      setPreview(null)
    },
    createWedding: async (input: CreateWeddingInput) => {
      const api = apiRef.current
      if (!api || !userId) throw new Error('Sign in before creating a wedding.')
      const result = await api.createWedding(input)
      modeRef.current = 'remote'
      bundleRef.current = result.bundle
      setRemote({ userId, bundle: result.bundle, error: null })
      setNotice(result.notice)
      track('wedding_created', { seed: input.seed })
      track('onboarding_completed')
      if (result.bundle.tasks.length > 0) track('first_task_added')
    },
    updateSettings: async (settings: WeddingSettings) => {
      const current = requireEditor()
      if (modeRef.current === 'remote') await apiRef.current?.updateSettings(current, settings)
      commit(updateBundleSettings(requireBundle(), settings))
    },
    saveTask: async (draft: TaskDraft, id?: string, guard?: RowGuard) => {
      const current = requireTaskWriter()
      const first = !id && current.tasks.length === 0
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveTaskDraft(current, draft, id))
        if (first) track('first_task_added')
        return
      }
      const saved = await apiRef.current.saveTask(current.wedding.id, draft, id, guard)
      const next = await pullChecklist(withTask(requireBundle(), saved))
      commit(next)
      if (first) track('first_task_added')
    },
    deleteTask: async (id: string) => {
      const current = requireTaskWriter()
      if (modeRef.current === 'remote') await apiRef.current?.deleteTask(id)
      commit(removeTask(current, id))
    },
    toggleTask: async (task: Task) => {
      const status = task.status === 'Completed' ? 'Pending' : 'Completed'
      const current = requireBundle()
      if (
        modeRef.current === 'remote' &&
        !canManageTasks(current.membership.role) &&
        current.membership.role !== 'friend'
      ) {
        throw new Error('You cannot update rituals on this wedding.')
      }
      const draft: TaskDraft = { ...task, status }
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveTaskDraft(current, draft, task.id))
      } else {
        const saved = await apiRef.current.saveTask(
          current.wedding.id,
          draft,
          task.id,
          task.updatedAt ? { updatedAt: task.updatedAt } : undefined,
        )
        commit(withTask(requireBundle(), saved))
      }
    },
    saveFunction: async (name: string, id?: string, guard?: RowGuard) => {
      const current = requireChecklist()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(id ? renameFunction(current, id, name) : addFunction(current, name))
        return
      }
      if (id) await apiRef.current.renameFunction(id, name, guard)
      else await apiRef.current.addFunction(current.wedding.id, name)
      commit(await pullChecklist(requireBundle()))
    },
    deleteFunction: async (id: string) => {
      const current = requireChecklist()
      if (modeRef.current === 'remote') await apiRef.current?.deleteFunction(id)
      commit(removeFunction(current, id))
    },
    moveFunction: async (id: string, direction: -1 | 1) => {
      const current = requireChecklist()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(moveFunctionDraft(current, id, direction))
        return
      }
      await apiRef.current.moveFunction(current.wedding.id, id, direction)
      commit(await pullChecklist(requireBundle()))
    },
    moveTask: async (id: string, direction: -1 | 1) => {
      const current = requireChecklist()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(moveTaskDraft(current, id, direction))
        return
      }
      await apiRef.current.moveTask(current.wedding.id, id, direction)
      commit(await pullChecklist(requireBundle()))
    },
    saveBudgetItem: async (draft: BudgetDraft, id?: string) => {
      const current = requireEditor()
      const first = !id && current.budget.length === 0
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveBudgetDraft(current, draft, id))
        if (first) track('first_budget_item_added')
        return
      }
      const saved = await apiRef.current.saveBudgetItem(current.wedding.id, draft, id)
      commit(replaceBudgetItem(requireBundle(), saved))
      if (first) track('first_budget_item_added')
    },
    deleteBudgetItem: async (id: string) => {
      const current = requireEditor()
      if (modeRef.current === 'remote') await apiRef.current?.deleteBudgetItem(id)
      commit(removeBudgetItem(current, id))
    },
    addPayment: async (budgetItemId: string, payment: PartPaymentDraft) => {
      const current = requireEditor()
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
      const current = requireEditor()
      const first = !id && current.guests.length === 0
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveGuestDraft(current, draft, id))
      } else {
        const saved = await apiRef.current.saveGuest(current.wedding.id, draft, id)
        commit(withGuest(requireBundle(), saved))
      }
      if (first) track('first_guest_added')
    },
    deleteGuest: async (id: string) => {
      const current = requireEditor()
      if (modeRef.current === 'remote') await apiRef.current?.deleteGuest(id)
      commit(removeGuest(current, id))
    },
    saveMilestone: async (draft: MilestoneDraft, id?: string) => {
      const current = requireEditor()
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveMilestoneDraft(current, draft, id))
      } else {
        const saved = await apiRef.current.saveMilestone(current.wedding.id, draft, id)
        commit(withMilestone(requireBundle(), saved))
      }
    },
    deleteMilestone: async (id: string) => {
      const current = requireEditor()
      if (modeRef.current === 'remote') await apiRef.current?.deleteMilestone(id)
      commit(removeMilestone(current, id))
    },
    toggleMilestone: async (milestone: Milestone) => {
      const status = milestone.status === 'Completed' ? 'Upcoming' : 'Completed'
      const current = requireEditor()
      const draft: MilestoneDraft = { ...milestone, status }
      if (modeRef.current === 'preview' || !apiRef.current) {
        commit(saveMilestoneDraft(current, draft, milestone.id))
        return
      }
      const saved = await apiRef.current.saveMilestone(current.wedding.id, draft, milestone.id)
      commit(withMilestone(requireBundle(), saved))
    },
    createInvite: async (role: InviteRole, side: Side | null) => {
      const current = requireBundle()
      const api = apiRef.current
      if (modeRef.current === 'remote' && !canInvite(current.membership.role)) {
        throw new Error('You cannot invite anyone to this wedding.')
      }
      if (!api || modeRef.current !== 'remote') throw new Error('Sign in to invite your partner or family.')
      const invite = await api.createInvite(current.wedding.id, role, side)
      track('invite_sent', { role })
      return invite
    },
    listInvites: async () => {
      const current = requireEditor()
      const api = apiRef.current
      if (!api || modeRef.current !== 'remote') return []
      return api.listInvites(current.wedding.id)
    },
    acceptInvite: async (code: string, role: InviteRole, side: Side | null) => {
      const api = apiRef.current
      if (!api) throw new Error('Sign in before accepting an invite.')
      await api.acceptInvite(code, role, side)
      track('invite_accepted')
      setReloadKey((current) => current + 1)
    },
    leaveWedding: async () => {
      const current = requireBundle()
      if (!canLeaveWedding(current.membership.role, current.members)) {
        throw new Error('The last bride or groom cannot leave. Delete the account instead.')
      }
      if (modeRef.current === 'remote') {
        if (!apiRef.current || !userId) throw new Error('Sign in before leaving a wedding.')
        await apiRef.current.leaveWedding(current.wedding.id)
        leaveOpenWedding(LEFT_WEDDING_MESSAGE)
        return
      }
      modeRef.current = null
      bundleRef.current = null
      writePreview(null)
      setPreview(null)
    },
    removeMember: async (memberId: string) => {
      const current = requireBundle()
      const member = current.members.find((item) => item.id === memberId)
      if (!member || member.id === current.membership.id) {
        throw new Error('Use leave wedding to remove yourself.')
      }
      if (modeRef.current === 'remote' && !isCouple(current.membership.role)) {
        throw new Error('Only the bride or groom can remove a member.')
      }
      if (modeRef.current === 'remote') {
        if (!apiRef.current) throw new Error('Sign in before removing a member.')
        await apiRef.current.removeMember(memberId)
      }
      commit(removeMemberFromBundle(requireBundle(), memberId))
    },
  }), [bundle, commit, error, leaveOpenWedding, mode, notice, pullChecklist, ready, requireBundle, requireChecklist, requireEditor, requireTaskWriter, userId])

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>
}
