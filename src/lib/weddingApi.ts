import type { SupabaseClient, User } from '@supabase/supabase-js'
import { HINDU_CHECKLIST } from '../data/hinduChecklist.ts'
import { DEMO_BUDGET, DEMO_GUESTS, DEMO_MILESTONES, DEMO_TASKS } from '../data/demoData.ts'
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
  TemplateTask,
  WeddingBundle,
  WeddingInvite,
  WeddingSettings,
} from '../types.ts'
import { TEMPLATE_SLUG } from '../types.ts'
import { assertNoError } from './errors.ts'
import { asRecord, mapBudgetItem, mapGuest, mapMemberRole, mapMilestone, mapTask, one } from './mappers.ts'
import { ritualsForCeremonies, templateToDrafts } from './planning.ts'
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
    saveBudgetItem,
    deleteBudgetItem,
    addPayment,
    saveGuest,
    deleteGuest,
    saveMilestone,
    deleteMilestone,
    loadTemplate,
    createInvite,
    listInvites,
    acceptInvite,
  }

  async function getMine(): Promise<WeddingBundle | null> {
    const { data, error } = await client
      .from('wedding_members')
      .select('id, role, side, display_name, created_at, weddings (id, couple_names, wedding_date, city, created_at)')
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
    const [tasks, budget, guests, milestones, profile] = await Promise.all([
      loadTasks(weddingId),
      loadBudget(weddingId),
      loadGuests(weddingId),
      loadMilestones(weddingId),
      loadProfile(),
    ])
    const membershipName = member.display_name ? String(member.display_name) : ''
    const profileName = profile ? String(profile) : ''
    const displayName = profileName || membershipName || user.email?.split('@')[0] || 'there'
    const side = member.side === 'bride' || member.side === 'groom' ? member.side : null
    const role = mapMemberRole(member.role)
    return {
      wedding: {
        id: weddingId,
        coupleNames: String(wedding.couple_names ?? ''),
        weddingDate: String(wedding.wedding_date ?? ''),
        city: String(wedding.city ?? ''),
      },
      membership: {
        id: String(member.id),
        role,
        side,
        displayName: membershipName || displayName,
      },
      displayName,
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
      if (input.seed === 'template') {
        await addTasks(weddingId, templateToDrafts(ritualsForCeremonies(HINDU_CHECKLIST, input.ceremonies)))
      }
      if (input.seed === 'demo') await seedDemo(weddingId)
    } catch (seedError) {
      notice =
        seedError instanceof Error
          ? `Your wedding was created, but the starter list did not save (${seedError.message}). Open Tasks and load the Hindu checklist.`
          : 'Your wedding was created, but the starter list did not save. Open Tasks and load the Hindu checklist.'
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

  async function saveTask(weddingId: string, draft: TaskDraft, id?: string): Promise<Task> {
    if (id) {
      const { data, error } = await client.from('tasks').update(taskUpdate(draft)).eq('id', id).select('*').single()
      assertNoError(error)
      return mapTask(asRecord(data))
    }
    const sortOrder = (await maxSort(weddingId)) + 1
    const { data, error } = await client.from('tasks').insert(taskInsert(weddingId, draft, sortOrder)).select('*').single()
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
      ? await client.from('budget_items').update(payload).eq('id', id).select('id').single()
      : await client.from('budget_items').insert(payload).select('id').single()
    assertNoError(saved.error)
    const itemId = String(asRecord(saved.data).id)
    const cleared = await client.from('budget_splits').delete().eq('budget_item_id', itemId)
    assertNoError(cleared.error)
    const splits = draft.splits.filter((split) => split.name.trim() && Number(split.pct) > 0)
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
    const updated = await client
      .from('budget_items')
      .update({ actual: Number(item.actual || 0) + Number(draft.amount || 0) })
      .eq('id', item.id)
    assertNoError(updated.error)
    return requireBudgetItem(item.id)
  }

  async function saveGuest(weddingId: string, draft: GuestDraft, id?: string) {
    const payload = guestInsert(weddingId, draft)
    const saved = id
      ? await client.from('guests').update(payload).eq('id', id).select('*').single()
      : await client.from('guests').insert(payload).select('*').single()
    assertNoError(saved.error)
    return mapGuest(asRecord(saved.data))
  }

  async function deleteGuest(id: string): Promise<void> {
    const { error } = await client.from('guests').delete().eq('id', id)
    assertNoError(error)
  }

  async function saveMilestone(weddingId: string, draft: MilestoneDraft, id?: string) {
    const payload = milestoneInsert(weddingId, draft)
    const saved = id
      ? await client.from('timeline_events').update(payload).eq('id', id).select('*').single()
      : await client.from('timeline_events').insert(payload).select('*').single()
    assertNoError(saved.error)
    return mapMilestone(asRecord(saved.data))
  }

  async function deleteMilestone(id: string): Promise<void> {
    const { error } = await client.from('timeline_events').delete().eq('id', id)
    assertNoError(error)
  }

  async function loadTemplate(): Promise<TemplateTask[]> {
    const { data, error } = await client
      .from('ritual_template_items')
      .select('title, description, category, priority, ceremony, sort_order')
      .eq('template_slug', TEMPLATE_SLUG)
      .order('sort_order')
    if (error || !data || data.length === 0) return HINDU_CHECKLIST
    return data.map((row) => {
      const task = mapTask({
        id: 'template',
        title: row.title,
        description: row.description,
        category: row.category,
        priority: row.priority,
        ceremony: row.ceremony,
        status: 'Pending',
        due_date: null,
        template_title: row.title,
        sort_order: row.sort_order,
      })
      return {
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        ceremony: task.ceremony,
        sortOrder: task.sortOrder,
      }
    })
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

  async function acceptInvite(code: string, role: InviteRole, side: Side | null): Promise<string> {
    const { data, error } = await client.rpc('accept_invite', {
      p_token: code.trim(),
      p_role: role === 'open' ? '' : role,
      p_side: side ?? '',
    })
    assertNoError(error)
    return String(data)
  }

  async function seedDemo(weddingId: string): Promise<void> {
    await addTasks(weddingId, DEMO_TASKS)
    for (const item of DEMO_BUDGET) await saveBudgetItem(weddingId, item)
    if (DEMO_GUESTS.length > 0) {
      const guests = await client.from('guests').insert(DEMO_GUESTS.map((guest) => guestInsert(weddingId, guest)))
      assertNoError(guests.error)
    }
    if (DEMO_MILESTONES.length > 0) {
      const events = await client
        .from('timeline_events')
        .insert(DEMO_MILESTONES.map((milestone) => milestoneInsert(weddingId, milestone)))
      assertNoError(events.error)
    }
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
}
