import type { SupabaseClient, User } from '@supabase/supabase-js'
import { DEMO_GUESTS, placeDemoContent } from '../data/demoData.ts'
import type {
  BudgetDraft,
  BudgetItem,
  CreateWeddingInput,
  GuestDraft,
  InviteRole,
  MilestoneDraft,
  PartPaymentDraft,
  Side,
  Task,
  TaskDraft,
  WeddingBundle,
  WeddingFunction,
  WeddingInvite,
  WeddingMember,
  WeddingSettings,
} from '../types.ts'
import { rosterDisplayName } from './access.ts'
import { DUPLICATE_FUNCTION_MESSAGE, DUPLICATE_RITUAL_MESSAGE, duplicateRitualName, moveByPosition } from './checklist.ts'
import { assertNoError, DeletedItemError, throwIfWriteMissed, type RowGuard } from './errors.ts'
import { splitsForSave } from './planning.ts'
import { asRecord, mapBudgetItem, mapFunction, mapGuest, mapMemberRole, mapMilestone, mapTask, one } from './mappers.ts'
import {
  budgetInsert,
  guestInsert,
  milestoneInsert,
  paymentInsert,
  splitInsert,
  taskInsert,
  taskUpdate,
} from './payloads.ts'

const BUDGET_SELECT = `
  id, category, currency, estimated, actual, paid, notes, paid_by_side, created_at,
  budget_splits (id, name, pct, side),
  part_payments (id, amount, paid_by, paid_by_side, paid_on, notes)
`

export function createWeddingApi(client: SupabaseClient, user: User) {
  return {
    getMine,
    createWedding,
    updateSettings,
    saveTask,
    deleteTask,
    addTasks,
    listFunctions,
    listTasks,
    addFunction,
    renameFunction,
    deleteFunction,
    moveFunction,
    moveTask,
    saveBudgetItem,
    deleteBudgetItem,
    addPayment,
    saveGuest,
    deleteGuest,
    saveMilestone,
    deleteMilestone,
    createInvite,
    listInvites,
    acceptInvite,
    leaveWedding,
    removeMember,
  }

  async function getMine(): Promise<WeddingBundle | null> {
    const { data, error } = await client
      .from('wedding_members')
      .select('id, role, side, display_name, created_at, weddings (id, couple_names, wedding_date, city, community, created_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    assertNoError(error)
    if (!data) return null
    const member = asRecord(data)
    const wedding = one(member.weddings as Record<string, unknown> | Record<string, unknown>[] | null)
    if (!wedding) return null
    const weddingId = String(wedding.id)
    const [tasks, functions, budget, guests, milestones, profile, members] = await Promise.all([
      loadTasks(weddingId),
      loadFunctions(weddingId),
      loadBudget(weddingId),
      loadGuests(weddingId),
      loadMilestones(weddingId),
      loadProfile(),
      loadMembers(weddingId),
    ])
    const membershipName = member.display_name ? String(member.display_name) : ''
    const profileName = profile ? String(profile) : ''
    const displayName = rosterDisplayName(profileName, membershipName, mapMemberRole(member.role), member.side === 'bride' || member.side === 'groom' ? member.side : null)
    const side = member.side === 'bride' || member.side === 'groom' ? member.side : null
    const role = mapMemberRole(member.role)
    return {
      wedding: {
        id: weddingId,
        coupleNames: String(wedding.couple_names ?? ''),
        weddingDate: String(wedding.wedding_date ?? ''),
        city: String(wedding.city ?? ''),
        community: String(wedding.community ?? 'hindu'),
      },
      membership: {
        id: String(member.id),
        role,
        side,
        displayName,
      },
      displayName,
      members,
      functions,
      tasks,
      budget,
      guests,
      milestones,
    }
  }

  async function createWedding(input: CreateWeddingInput): Promise<{ bundle: WeddingBundle; notice: string | null }> {
    const { data, error } = await client.rpc('create_wedding', {
      p_couple_names: input.coupleNames.trim(),
      p_wedding_date: input.weddingDate,
      p_side: input.side,
      p_display_name: input.displayName.trim(),
      p_city: input.city.trim(),
    })
    assertNoError(error)
    const weddingId = String(data)
    let notice: string | null = null
    try {
      if (input.seed === 'demo') await seedDemo(weddingId, input.weddingDate)
    } catch (seedError) {
      notice =
        seedError instanceof Error
          ? `Your wedding was created, but the sample list did not save (${seedError.message}).`
          : 'Your wedding was created, but the sample list did not save.'
    }
    const bundle = await getMine()
    if (!bundle) throw new Error('The wedding was created, but it could not be loaded. Refresh and try again.')
    return { bundle, notice }
  }

  async function updateSettings(current: WeddingBundle, settings: WeddingSettings): Promise<void> {
    const weddingUpdate = await client
      .from('weddings')
      .update({
        couple_names: settings.coupleNames.trim(),
        wedding_date: settings.weddingDate,
        city: settings.city.trim(),
      })
      .eq('id', current.wedding.id)
    assertNoError(weddingUpdate.error)
    const memberUpdate = await client
      .from('wedding_members')
      .update(
        current.membership.role === 'family' || current.membership.role === 'friend'
          ? { side: settings.side, display_name: settings.displayName.trim() }
          : { display_name: settings.displayName.trim() },
      )
      .eq('id', current.membership.id)
    assertNoError(memberUpdate.error)
    const profileUpdate = await client.from('profiles').upsert({ id: user.id, display_name: settings.displayName.trim() })
    assertNoError(profileUpdate.error)
  }

  async function saveTask(weddingId: string, draft: TaskDraft, id?: string, guard?: RowGuard): Promise<Task> {
    const placed = await placeTask(weddingId, draft, id)
    if (placed.functionId) {
      const siblings = await client.from('tasks').select('id, title').eq('function_id', placed.functionId)
      assertNoError(siblings.error)
      const clash = duplicateRitualName(
        (siblings.data ?? []).map((row) => ({
          id: String(asRecord(row).id),
          functionId: placed.functionId ?? null,
          title: String(asRecord(row).title ?? ''),
        })),
        { functionId: placed.functionId, title: placed.title, exceptId: id },
      )
      if (clash) throw new Error(DUPLICATE_RITUAL_MESSAGE)
    }
    if (id) {
      const updated = await requireUpdatedRow(
        withGuard(client.from('tasks').update(taskUpdate(placed)).eq('id', id), guard).select('*').maybeSingle(),
        () => client.from('tasks').select('id').eq('id', id).maybeSingle(),
      )
      return mapTask(asRecord(updated))
    }
    const sortOrder = (await maxSort(weddingId)) + 1
    const { data, error } = await client.from('tasks').insert(taskInsert(weddingId, placed, sortOrder)).select('*').single()
    assertNoError(error)
    return mapTask(asRecord(data))
  }

  async function deleteTask(id: string): Promise<void> {
    const { error } = await client.from('tasks').delete().eq('id', id)
    assertNoError(error)
  }

  async function addTasks(weddingId: string, drafts: TaskDraft[]): Promise<Task[]> {
    if (drafts.length === 0) return []
    let sortOrder = await maxSort(weddingId)
    const rows = drafts.map((draft) => {
      sortOrder += 1
      return taskInsert(weddingId, draft, sortOrder)
    })
    const { data, error } = await client.from('tasks').insert(rows).select('*')
    assertNoError(error)
    return (data ?? []).map((row) => mapTask(asRecord(row))).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async function saveBudgetItem(weddingId: string, draft: BudgetDraft, id?: string): Promise<BudgetItem> {
    const payload = budgetInsert(weddingId, draft)
    const saved = id
      ? await requireUpdatedRow(
          client.from('budget_items').update(payload).eq('id', id).select('id').maybeSingle(),
          () => client.from('budget_items').select('id').eq('id', id).maybeSingle(),
        )
      : await client.from('budget_items').insert(payload).select('id').single().then((result) => {
          assertNoError(result.error)
          return result.data
        })
    const itemId = String(asRecord(saved).id)
    const cleared = await client.from('budget_splits').delete().eq('budget_item_id', itemId)
    assertNoError(cleared.error)
    const splits = splitsForSave(draft)
    if (splits.length > 0) {
      const inserted = await client.from('budget_splits').insert(splits.map((split) => splitInsert(itemId, split)))
      assertNoError(inserted.error)
    }
    if (!id && draft.partPayments && draft.partPayments.length > 0) {
      const payments = await client.from('part_payments').insert(draft.partPayments.map((payment) => paymentInsert(itemId, payment)))
      assertNoError(payments.error)
    }
    return requireBudgetItem(itemId)
  }

  async function deleteBudgetItem(id: string): Promise<void> {
    const { error } = await client.from('budget_items').delete().eq('id', id)
    assertNoError(error)
  }

  async function addPayment(item: BudgetItem, draft: PartPaymentDraft): Promise<BudgetItem> {
    const inserted = await client.from('part_payments').insert(paymentInsert(item.id, draft))
    assertNoError(inserted.error)
    return requireBudgetItem(item.id)
  }

  async function saveGuest(weddingId: string, draft: GuestDraft, id?: string) {
    const payload = guestInsert(weddingId, draft)
    const saved = id
      ? await requireUpdatedRow(
          client.from('guests').update(payload).eq('id', id).select('*').maybeSingle(),
          () => client.from('guests').select('id').eq('id', id).maybeSingle(),
        )
      : await client.from('guests').insert(payload).select('*').single().then((result) => {
          assertNoError(result.error)
          return result.data
        })
    return mapGuest(asRecord(saved))
  }

  async function deleteGuest(id: string): Promise<void> {
    const { error } = await client.from('guests').delete().eq('id', id)
    assertNoError(error)
  }

  async function saveMilestone(weddingId: string, draft: MilestoneDraft, id?: string) {
    const payload = milestoneInsert(weddingId, draft)
    const saved = id
      ? await requireUpdatedRow(
          client.from('timeline_events').update(payload).eq('id', id).select('*').maybeSingle(),
          () => client.from('timeline_events').select('id').eq('id', id).maybeSingle(),
        )
      : await client.from('timeline_events').insert(payload).select('*').single().then((result) => {
          assertNoError(result.error)
          return result.data
        })
    return mapMilestone(asRecord(saved))
  }

  async function deleteMilestone(id: string): Promise<void> {
    const { error } = await client.from('timeline_events').delete().eq('id', id)
    assertNoError(error)
  }

  async function listFunctions(weddingId: string): Promise<WeddingFunction[]> {
    return loadFunctions(weddingId)
  }

  async function listTasks(weddingId: string): Promise<Task[]> {
    return loadTasks(weddingId)
  }

  async function addFunction(weddingId: string, name: string): Promise<WeddingFunction> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name the function.')
    const existing = await findFunctionByName(weddingId, trimmed)
    if (existing) throw new Error(DUPLICATE_FUNCTION_MESSAGE)
    return insertFunction(weddingId, trimmed)
  }

  async function renameFunction(id: string, name: string, guard?: RowGuard): Promise<void> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name the function.')
    const current = await client.from('wedding_functions').select('id, wedding_id, name').eq('id', id).maybeSingle()
    assertNoError(current.error)
    if (!current.data) throwIfWriteMissed(null, false)
    const record = asRecord(current.data)
    const weddingId = String(record.wedding_id)
    const existing = await findFunctionByName(weddingId, trimmed)
    if (existing && existing.id !== id) throw new Error(DUPLICATE_FUNCTION_MESSAGE)
    await requireUpdatedRow(
      withGuard(client.from('wedding_functions').update({ name: trimmed }).eq('id', id), guard).select('id').maybeSingle(),
      () => client.from('wedding_functions').select('id').eq('id', id).maybeSingle(),
    )
  }

  async function deleteFunction(id: string): Promise<void> {
    const { error } = await client.from('wedding_functions').delete().eq('id', id)
    assertNoError(error)
  }

  async function moveFunction(weddingId: string, id: string, direction: -1 | 1): Promise<void> {
    const functions = await loadFunctions(weddingId)
    const moved = moveByPosition(functions, id, direction)
    if (moved === functions) return
    for (const fn of moved) {
      const previous = functions.find((item) => item.id === fn.id)
      if (!previous || previous.position === fn.position) continue
      const { error } = await client.from('wedding_functions').update({ position: fn.position }).eq('id', fn.id)
      assertNoError(error)
    }
  }

  async function moveTask(weddingId: string, id: string, direction: -1 | 1): Promise<void> {
    const tasks = await loadTasks(weddingId)
    const task = tasks.find((item) => item.id === id)
    if (!task) return
    const siblings = tasks.filter((item) => item.functionId === task.functionId)
    const moved = moveByPosition(siblings, id, direction)
    if (moved === siblings) return
    for (const item of moved) {
      const previous = siblings.find((sibling) => sibling.id === item.id)
      if (!previous || previous.position === item.position) continue
      const { error } = await client.from('tasks').update({ position: item.position }).eq('id', item.id)
      assertNoError(error)
    }
  }

  async function createInvite(weddingId: string, role: InviteRole, side: Side | null): Promise<WeddingInvite> {
    const { data, error } = await client.rpc('create_invite', {
      p_wedding_id: weddingId,
      p_role: role,
      p_side: side ?? '',
    })
    assertNoError(error)
    const code = String(data ?? '')
    return {
      id: code,
      code,
      role,
      side,
      expiresAt: null,
      acceptedAt: null,
    }
  }

  async function listInvites(weddingId: string): Promise<WeddingInvite[]> {
    const { data, error } = await client
      .from('wedding_invites')
      .select('id, token, role, side, expires_at, accepted_at')
      .eq('wedding_id', weddingId)
      .order('created_at', { ascending: false })
    assertNoError(error)
    return (data ?? []).map((row) => {
      const record = asRecord(row)
      const role = record.role === 'open' ? 'open' : mapMemberRole(record.role)
      const inviteSide = record.side === 'bride' || record.side === 'groom' ? record.side : null
      return {
        id: String(record.id),
        code: String(record.token ?? ''),
        role,
        side: inviteSide,
        expiresAt: record.expires_at ? String(record.expires_at) : null,
        acceptedAt: record.accepted_at ? String(record.accepted_at) : null,
      }
    })
  }

  async function leaveWedding(weddingId: string): Promise<void> {
    const { error } = await client.rpc('leave_wedding', { p_wedding_id: weddingId })
    assertNoError(error)
  }

  async function removeMember(memberId: string): Promise<void> {
    const { error } = await client.rpc('remove_wedding_member', { p_member_id: memberId })
    assertNoError(error)
  }

  async function acceptInvite(code: string, role: InviteRole, side: Side | null): Promise<string> {
    const { data, error } = await client.rpc('accept_invite', {
      p_token: code.trim(),
      p_role: role === 'open' ? '' : role,
      p_side: side ?? '',
    })
    assertNoError(error)
    return String(data)
  }

  async function seedDemo(weddingId: string, weddingDate: string): Promise<void> {
    const demo = placeDemoContent(weddingDate)
    const removed = await client.from('tasks').delete().eq('wedding_id', weddingId)
    assertNoError(removed.error)
    const functions = await loadFunctions(weddingId)
    const byName = new Map(functions.map((fn) => [fn.name, fn.id]))
    await addTasks(
      weddingId,
      demo.tasks.map((task) => ({ ...task, functionId: byName.get(task.ceremony) ?? null })),
    )
    for (const item of demo.budget) await saveBudgetItem(weddingId, item)
    if (DEMO_GUESTS.length > 0) {
      const guests = await client.from('guests').insert(DEMO_GUESTS.map((guest) => guestInsert(weddingId, guest)))
      assertNoError(guests.error)
    }
    if (demo.milestones.length > 0) {
      const events = await client
        .from('timeline_events')
        .insert(demo.milestones.map((milestone) => milestoneInsert(weddingId, milestone)))
      assertNoError(events.error)
    }
  }

  async function loadFunctions(weddingId: string): Promise<WeddingFunction[]> {
    const { data, error } = await client
      .from('wedding_functions')
      .select('id, name, position, updated_at')
      .eq('wedding_id', weddingId)
      .order('position')
    assertNoError(error)
    return (data ?? []).map((row) => mapFunction(asRecord(row)))
  }

  async function findFunctionByName(weddingId: string, name: string): Promise<WeddingFunction | null> {
    const key = name.trim().toLowerCase()
    if (!key) return null
    const functions = await loadFunctions(weddingId)
    return functions.find((fn) => fn.name.trim().toLowerCase() === key) ?? null
  }

  async function insertFunction(weddingId: string, name: string): Promise<WeddingFunction> {
    const top = await client
      .from('wedding_functions')
      .select('position')
      .eq('wedding_id', weddingId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    assertNoError(top.error)
    const inserted = await client
      .from('wedding_functions')
      .insert({ wedding_id: weddingId, name, position: Number(top.data?.position ?? 0) + 1 })
      .select('id, name, position, updated_at')
      .single()
    assertNoError(inserted.error)
    return mapFunction(asRecord(inserted.data))
  }

  async function ensureFunction(weddingId: string, name: string): Promise<WeddingFunction> {
    const trimmed = name.trim() || 'Wedding'
    const existing = await findFunctionByName(weddingId, trimmed)
    if (existing) return existing
    return insertFunction(weddingId, trimmed)
  }

  async function loadMembers(weddingId: string): Promise<WeddingMember[]> {
    const { data, error } = await client
      .from('wedding_members')
      .select('id, user_id, role, side, display_name')
      .eq('wedding_id', weddingId)
      .order('created_at')
    assertNoError(error)
    const rows = (data ?? []).map((row) => asRecord(row))
    const ids = rows.map((row) => String(row.user_id))
    const profiles = ids.length === 0
      ? { data: [], error: null }
      : await client.from('profiles').select('id, display_name').in('id', ids)
    assertNoError(profiles.error)
    const names = new Map(
      (profiles.data ?? []).map((row) => {
        const record = asRecord(row)
        return [String(record.id), String(record.display_name ?? '')] as const
      }),
    )
    return rows.map((row) => {
      const role = mapMemberRole(row.role)
      const side = row.side === 'bride' || row.side === 'groom' ? row.side : null
      return {
        id: String(row.id),
        userId: String(row.user_id),
        role,
        side,
        displayName: rosterDisplayName(names.get(String(row.user_id)) ?? '', String(row.display_name ?? ''), role, side),
      }
    })
  }

  async function placeTask(weddingId: string, draft: TaskDraft, id?: string): Promise<TaskDraft> {
    let functionId = draft.functionId ?? null
    let ceremony = draft.ceremony.trim() || 'Wedding'
    if (functionId) {
      const fn = await client.from('wedding_functions').select('name').eq('id', functionId).maybeSingle()
      assertNoError(fn.error)
      if (fn.data?.name) ceremony = String(fn.data.name)
      else functionId = null
    }
    if (!functionId) {
      const fn = await ensureFunction(weddingId, ceremony)
      functionId = fn.id
      ceremony = fn.name
    }
    let position = draft.position
    if (id) {
      const current = await client.from('tasks').select('function_id, position').eq('id', id).maybeSingle()
      assertNoError(current.error)
      const sameFunction = current.data?.function_id === functionId
      position = sameFunction ? Number(current.data?.position ?? position ?? 0) : (await maxTaskPosition(weddingId, functionId)) + 1
    } else {
      position = (await maxTaskPosition(weddingId, functionId)) + 1
    }
    return { ...draft, ceremony, functionId, position }
  }

  async function maxTaskPosition(weddingId: string, functionId: string): Promise<number> {
    const { data, error } = await client
      .from('tasks')
      .select('position')
      .eq('wedding_id', weddingId)
      .eq('function_id', functionId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()
    assertNoError(error)
    return Number(data?.position ?? 0)
  }

  async function loadTasks(weddingId: string): Promise<Task[]> {
    const { data, error } = await client.from('tasks').select('*').eq('wedding_id', weddingId).order('sort_order')
    assertNoError(error)
    return (data ?? []).map((row) => mapTask(asRecord(row)))
  }

  async function loadBudget(weddingId: string): Promise<BudgetItem[]> {
    const { data, error } = await client
      .from('budget_items')
      .select(BUDGET_SELECT)
      .eq('wedding_id', weddingId)
      .order('created_at')
    assertNoError(error)
    return (data ?? []).map((row) => mapBudgetItem(asRecord(row)))
  }

  async function loadGuests(weddingId: string) {
    const { data, error } = await client.from('guests').select('*').eq('wedding_id', weddingId).order('created_at')
    assertNoError(error)
    return (data ?? []).map((row) => mapGuest(asRecord(row)))
  }

  async function loadMilestones(weddingId: string) {
    const { data, error } = await client.from('timeline_events').select('*').eq('wedding_id', weddingId).order('event_date')
    assertNoError(error)
    return (data ?? []).map((row) => mapMilestone(asRecord(row)))
  }

  async function loadProfile(): Promise<string | null> {
    const { data, error } = await client.from('profiles').select('display_name').eq('id', user.id).maybeSingle()
    assertNoError(error)
    return data?.display_name ? String(data.display_name) : null
  }

  async function maxSort(weddingId: string): Promise<number> {
    const { data, error } = await client
      .from('tasks')
      .select('sort_order')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    assertNoError(error)
    return Number(data?.sort_order ?? 0)
  }

  async function requireBudgetItem(id: string): Promise<BudgetItem> {
    const { data, error } = await client.from('budget_items').select(BUDGET_SELECT).eq('id', id).single()
    assertNoError(error)
    return mapBudgetItem(asRecord(data))
  }

  function withGuard<Q extends { eq: (column: string, value: string) => Q }>(query: Q, guard?: RowGuard): Q {
    if (guard?.updatedAt && !guard.overwrite) return query.eq('updated_at', guard.updatedAt)
    return query
  }

  async function requireUpdatedRow<T>(
    saved: PromiseLike<{ data: T | null; error: { message: string; code?: string; details?: string | null } | null }>,
    stillThere: () => PromiseLike<{ data: unknown; error: { message: string; code?: string; details?: string | null } | null }>,
  ): Promise<T> {
    const result = await saved
    assertNoError(result.error)
    if (result.data) return result.data
    const still = await stillThere()
    assertNoError(still.error)
    throwIfWriteMissed(result.data, Boolean(still.data))
    throw new DeletedItemError()
  }
}
