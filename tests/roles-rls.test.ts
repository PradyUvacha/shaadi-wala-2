import { execFileSync, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, beforeAll } from 'vitest'

const root = fileURLToPath(new URL('../', import.meta.url))

const bride = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
const groom = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
const family = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'
const friend = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'
const planner = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5'
const db = process.env.PGDATABASE ?? 'shaadi_roles'

function run(database: string, args: string[], sql?: string): string {
  if (process.env.PGHOST) {
    return execFileSync('psql', ['-h', process.env.PGHOST, '-U', process.env.PGUSER ?? 'postgres', '-d', database, ...args], {
      encoding: 'utf8',
      input: sql,
      env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'postgres' },
    })
  }
  return execFileSync('sudo', ['-u', 'postgres', 'psql', '-d', database, ...args], {
    encoding: 'utf8',
    input: sql,
  })
}

function psql(sql: string, database = db): string {
  return run(database, ['-v', 'ON_ERROR_STOP=1', '-t', '-A'], sql)
}

function file(path: string) {
  run(db, ['-v', 'ON_ERROR_STOP=1', '-f', path])
}

function asUser(userId: string, sql: string): string {
  return psql(`
    select set_config('request.jwt.claim.sub', '${userId}', false);
    select set_config('request.jwt.claim.email', 'member@example.com', false);
    select set_config('request.jwt.claim.display_name', 'Member', false);
    set role authenticated;
    ${sql}
  `).trim().split('\n').filter(Boolean).at(-1) ?? ''
}

function errorOf(userId: string, sql: string): string {
  try {
    asUser(userId, sql)
    return ''
  } catch (caught) {
    return errorText(caught)
  }
}

function dbError(sql: string): string {
  try {
    psql(sql)
    return ''
  } catch (caught) {
    return errorText(caught)
  }
}

function errorText(caught: unknown): string {
  const error = caught as { stderr?: string | Buffer; message?: string }
  return `${error.stderr?.toString() ?? ''}\n${error.message ?? ''}`
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitUntil(sql: string, ready: (value: string) => boolean, timeoutMs = 8000): Promise<string> {
  const started = Date.now()
  let last = ''
  while (Date.now() - started < timeoutMs) {
    last = psql(sql).trim()
    if (ready(last)) return last
    await sleep(40)
  }
  throw new Error(`timed out waiting for ${sql}; last=${last}`)
}

class PsqlSession {
  private child: ChildProcessWithoutNullStreams
  private out = ''
  private err = ''
  private closed: number | null = null
  private waiters: Array<() => void> = []

  constructor() {
    const env = { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? 'postgres' }
    this.child = process.env.PGHOST
      ? spawn('psql', ['-h', process.env.PGHOST, '-U', process.env.PGUSER ?? 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '-A', '-t', '-q'], { env })
      : spawn('sudo', ['-u', 'postgres', 'psql', '-d', db, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '-A', '-t', '-q'], { env })
    this.child.stdout.on('data', (chunk: Buffer) => {
      this.out += chunk.toString()
      this.wake()
    })
    this.child.stderr.on('data', (chunk: Buffer) => {
      this.err += chunk.toString()
      this.wake()
    })
    this.child.on('close', (code) => {
      this.closed = code ?? 1
      this.wake()
    })
    this.child.stdin.write('\\set VERBOSITY verbose\n')
  }

  private wake() {
    for (const waiter of [...this.waiters]) waiter()
  }

  private waitFor(ready: () => boolean, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error(`psql timed out\nstdout:\n${this.out}\nstderr:\n${this.err}`))
      }, timeoutMs)
      const onWake = () => {
        if (!ready()) return
        cleanup()
        resolve()
      }
      const cleanup = () => {
        clearTimeout(timer)
        this.waiters = this.waiters.filter((item) => item !== onWake)
      }
      this.waiters.push(onWake)
      onWake()
    })
  }

  query(sql: string, timeoutMs = 15000): Promise<string> {
    const marker = `MARK_${Math.random().toString(16).slice(2)}`
    const start = this.out.length
    const errStart = this.err.length
    this.child.stdin.write(`${sql}\n\\echo ${marker}\n`)
    return this.waitFor(() => this.out.slice(start).includes(marker) || this.closed !== null, timeoutMs).then(() => {
      if (!this.out.slice(start).includes(marker)) {
        throw new Error(`psql exited ${this.closed}\n${this.err.slice(errStart)}\n${this.out.slice(start)}`)
      }
      return this.out.slice(start).replace(marker, '').trim()
    })
  }

  async close() {
    if (this.closed !== null) return
    this.child.stdin.end()
    const killer = setTimeout(() => this.child.kill('SIGKILL'), 1000)
    await this.waitFor(() => this.closed !== null, 3000).catch(() => this.child.kill('SIGKILL'))
    clearTimeout(killer)
  }
}

async function holdSecondWriter(options: { signalKey: number; gateKey: number; winnerSql: string; loserSql: string }): Promise<string> {
  const gate = new PsqlSession()
  const winner = new PsqlSession()
  const loser = new PsqlSession()
  try {
    await gate.query(`select pg_advisory_lock(42002, ${options.gateKey});`)
    const winnerDone = winner.query(`
      begin;
      ${options.winnerSql}
      select pg_advisory_lock(42002, ${options.signalKey});
      select pg_advisory_lock(42002, ${options.gateKey});
      commit;
      select pg_advisory_unlock(42002, ${options.signalKey});
    `, 20000)
    await waitUntil(
      `select count(*) from pg_locks where locktype = 'advisory' and classid = 42002 and objid = ${options.signalKey} and granted;`,
      (value) => value === '1',
    )
    const loserDone = loser.query(options.loserSql, 20000).then(
      (stdout) => ({ failed: false, detail: stdout }),
      (error: Error) => ({ failed: true, detail: error.message }),
    )
    await waitUntil(
      `select count(*) from pg_locks where locktype = 'transactionid' and not granted;`,
      (value) => value !== '0' && value !== '',
    )
    await gate.query(`select pg_advisory_unlock(42002, ${options.gateKey});`)
    await winnerDone
    const lost = await loserDone
    if (!lost.failed) throw new Error(`second writer succeeded: ${lost.detail}`)
    return lost.detail
  } finally {
    await Promise.all([gate.close(), winner.close(), loser.close()])
  }
}

beforeAll(() => {
  if (!process.env.PGHOST) {
    run('postgres', ['-v', 'ON_ERROR_STOP=1', '-c', 'drop database if exists shaadi_roles'])
    run('postgres', ['-v', 'ON_ERROR_STOP=1', '-c', 'create database shaadi_roles'])
  } else {
    psql('drop schema if exists storage cascade; drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;')
  }
  file(`${root}supabase/tests/auth-stub.sql`)
  file(`${root}supabase/migrations/20261024180000_init.sql`)
  file(`${root}supabase/migrations/20261026120000_v1.sql`)
  file(`${root}supabase/migrations/20261026150000_roles.sql`)
  file(`${root}supabase/migrations/20261026150000_roles.sql`)
  file(`${root}supabase/migrations/20261026180000_permissions.sql`)
  file(`${root}supabase/migrations/20261026180000_permissions.sql`)
  file(`${root}supabase/migrations/20261026190000_feedback_screenshot.sql`)
  file(`${root}supabase/migrations/20261026190000_feedback_screenshot.sql`)
  file(`${root}supabase/migrations/20261026200000_checklist_templates.sql`)
  file(`${root}supabase/migrations/20261026200000_checklist_templates.sql`)
  file(`${root}supabase/migrations/20261026210000_checklist_realtime.sql`)
  file(`${root}supabase/migrations/20261026210000_checklist_realtime.sql`)
  file(`${root}supabase/migrations/20261026220000_ritual_names.sql`)
  file(`${root}supabase/migrations/20261026220000_ritual_names.sql`)
  file(`${root}supabase/migrations/20261026230000_budget_payment_actual.sql`)
  file(`${root}supabase/migrations/20261026230000_budget_payment_actual.sql`)
  file(`${root}supabase/migrations/20261026240000_survey_responses.sql`)
  file(`${root}supabase/migrations/20261026240000_survey_responses.sql`)
  file(`${root}supabase/migrations/20261026250000_members_assignment.sql`)
  file(`${root}supabase/migrations/20261026250000_members_assignment.sql`)
  file(`${root}supabase/migrations/20261026260000_price_answer_leave.sql`)
  file(`${root}supabase/migrations/20261026260000_price_answer_leave.sql`)
  psql(`
    insert into auth.users (id, email) values
      ('${bride}', 'bride@example.com'),
      ('${groom}', 'groom@example.com'),
      ('${family}', 'family@example.com'),
      ('${friend}', 'friend@example.com'),
      ('${planner}', 'planner@example.com');
    select set_config('request.jwt.claim.sub', '${bride}', false);
    set role authenticated;
    select public.create_wedding('Role Fixture', '2027-04-24', 'bride', 'Asha', 'Mumbai');
    reset role;
    insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
    select id, '${groom}', 'groom', 'groom', 'Rahul' from public.weddings where couple_names = 'Role Fixture';
    insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
    select id, '${family}', 'family', 'bride', 'Parent' from public.weddings where couple_names = 'Role Fixture';
    insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
    select id, '${friend}', 'friend', 'bride', 'Friend' from public.weddings where couple_names = 'Role Fixture';
    insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
    select id, '${planner}', 'planner', null, 'Planner' from public.weddings where couple_names = 'Role Fixture';
    insert into public.tasks (wedding_id, title, category, priority, status, side)
    select id, 'Bride task', 'Decor', 'High', 'Pending', 'bride' from public.weddings where couple_names = 'Role Fixture';
    insert into public.tasks (wedding_id, title, category, priority, status, side)
    select id, 'Groom task', 'Other', 'Low', 'Pending', 'groom' from public.weddings where couple_names = 'Role Fixture';
    insert into public.tasks (wedding_id, title, category, priority, status, side, assigned_to)
    select id, 'Friend task', 'Invitations', 'Low', 'Pending', 'bride', '${friend}' from public.weddings where couple_names = 'Role Fixture';
    insert into public.budget_items (wedding_id, category, currency, estimated, actual, notes, paid_by_side)
    select id, 'Venue', 'INR', 1000, 0, 'hall', 'both' from public.weddings where couple_names = 'Role Fixture';
    insert into public.budget_splits (budget_item_id, name, pct, side)
    select id, 'Bride family', 60, 'bride' from public.budget_items where notes = 'hall';
    insert into public.budget_splits (budget_item_id, name, pct, side)
    select id, 'Groom family', 40, 'groom' from public.budget_items where notes = 'hall';
    insert into public.guests (wedding_id, name, side)
    select id, 'Bride Guest', 'bride' from public.weddings where couple_names = 'Role Fixture';
    insert into public.guests (wedding_id, name, side)
    select id, 'Groom Guest', 'groom' from public.weddings where couple_names = 'Role Fixture';
    insert into public.timeline_events (wedding_id, name, event_date, status)
    select id, 'Haldi', '2027-04-23', 'Upcoming' from public.weddings where couple_names = 'Role Fixture';
    insert into public.wedding_feed (wedding_id, author_id, body)
    select id, '${bride}', 'Welcome' from public.weddings where couple_names = 'Role Fixture';
  `)
}, 120000)

describe('approved role permissions', () => {
  it('planner has no side and works for both sides', () => {
    expect(psql(`select side is null from public.wedding_members where user_id = '${planner}'`).trim()).toBe('t')
    expect(asUser(planner, `update public.tasks set description = 'both sides' where title in ('Bride task', 'Groom task'); select count(*) from public.tasks where description = 'both sides';`)).toBe('2')
  })

  it('parent/family can edit and assign tasks for their own side only', () => {
    expect(asUser(family, `update public.tasks set assigned_to = '${friend}' where title = 'Bride task'; select assigned_to::text from public.tasks where title = 'Bride task';`)).toBe(friend)
    expect(errorOf(family, `update public.tasks set assigned_to = '${groom}' where title = 'Bride task';`)).toMatch(/own side/)
    expect(psql(`select assigned_to::text from public.tasks where title = 'Bride task';`).trim()).toBe(friend)
    expect(asUser(family, `update public.tasks set title = 'Nope' where title = 'Groom task'; select count(*) from public.tasks where title = 'Nope';`)).toBe('0')
  })

  it('friend can view and complete only tasks assigned to them', () => {
    expect(asUser(friend, `select count(*) from public.tasks where title = 'Friend task';`)).toBe('1')
    expect(asUser(friend, `select count(*) from public.tasks where title = 'Groom task';`)).toBe('0')
    expect(asUser(friend, `update public.tasks set status = 'Completed' where title = 'Friend task'; select status from public.tasks where title = 'Friend task';`)).toBe('Completed')
    expect(errorOf(friend, `update public.tasks set title = 'Taken' where title = 'Friend task';`)).toMatch(/complete tasks assigned|row-level security/i)
  })

  it('planner can edit all tasks and assign to anyone', () => {
    expect(asUser(planner, `update public.tasks set assigned_to = '${family}' where title = 'Groom task'; select assigned_to::text from public.tasks where title = 'Groom task';`)).toBe(family)
  })

  it('parent/family can view the whole budget and log payments for their own side', () => {
    expect(asUser(family, `select count(*) from public.budget_items;`)).toBe('1')
    expect(asUser(family, `insert into public.part_payments (budget_item_id, amount, paid_by_side) select id, 25, 'bride' from public.budget_items where notes = 'hall'; select count(*) from public.part_payments where paid_by_side = 'bride';`)).toBe('1')
    expect(psql(`select actual from public.budget_items where notes = 'hall';`).trim()).toBe('25.00')
    expect(asUser(family, `update public.budget_items set actual = 999 where notes = 'hall'; select actual from public.budget_items where notes = 'hall';`)).toBe('25.00')
    expect(errorOf(family, `insert into public.part_payments (budget_item_id, amount, paid_by_side) select id, 25, 'groom' from public.budget_items where notes = 'hall';`)).toMatch(/row-level security/i)
    expect(asUser(family, `update public.budget_items set notes = 'changed' where notes = 'hall'; select notes from public.budget_items;`)).toBe('hall')
  })

  it('friend has no budget access', () => {
    expect(asUser(friend, `select count(*) from public.budget_items;`)).toBe('0')
    expect(asUser(friend, `select count(*) from public.part_payments;`)).toBe('0')
    expect(errorOf(friend, `insert into public.budget_items (wedding_id, category, estimated) select id, 'Venue', 10 from public.weddings;`)).toMatch(/row-level security/i)
  })

  it('planner can view the whole budget, not edit', () => {
    expect(asUser(planner, `select count(*) from public.budget_items;`)).toBe('1')
    expect(asUser(planner, `update public.budget_items set notes = 'planner edit' where notes = 'hall'; select notes from public.budget_items;`)).toBe('hall')
    expect(errorOf(planner, `insert into public.part_payments (budget_item_id, amount, paid_by_side) select id, 5, 'bride' from public.budget_items;`)).toMatch(/row-level security/i)
  })

  it("parent/family can edit their own side's guests", () => {
    expect(asUser(family, `update public.guests set phone = '111' where name = 'Bride Guest'; select phone from public.guests where name = 'Bride Guest';`)).toBe('111')
    expect(asUser(family, `select count(*) from public.guests where name = 'Groom Guest';`)).toBe('0')
    expect(asUser(family, `update public.guests set phone = '222' where name = 'Groom Guest'; select count(*) from public.guests where phone = '222';`)).toBe('0')
  })

  it("friend can view their own side's guest list", () => {
    expect(asUser(friend, `select name from public.guests where name = 'Bride Guest';`)).toBe('Bride Guest')
    expect(asUser(friend, `select count(*) from public.guests where name = 'Groom Guest';`)).toBe('0')
    expect(asUser(friend, `update public.guests set phone = '333' where name = 'Bride Guest'; select count(*) from public.guests where phone = '333';`)).toBe('0')
  })

  it('planner can edit all guests and the timeline', () => {
    expect(asUser(planner, `update public.guests set meal = 'Vegan' where name in ('Bride Guest', 'Groom Guest'); select count(*) from public.guests where meal = 'Vegan';`)).toBe('2')
    expect(asUser(planner, `insert into public.timeline_events (wedding_id, name, event_date) select id, 'Planner note', '2027-04-22' from public.weddings; select count(*) from public.timeline_events where name = 'Planner note';`)).toBe('1')
    expect(errorOf(family, `insert into public.timeline_events (wedding_id, name, event_date) select id, 'Family note', '2027-04-22' from public.weddings;`)).toMatch(/row-level security/i)
    expect(asUser(friend, `select count(*) from public.timeline_events where name = 'Haldi';`)).toBe('1')
  })

  it('parent/family can post to the feed', () => {
    expect(asUser(family, `insert into public.wedding_feed (wedding_id, author_id, body) select id, '${family}', 'From the parents' from public.weddings; select count(*) from public.wedding_feed where body = 'From the parents';`)).toBe('1')
    expect(errorOf(friend, `insert into public.wedding_feed (wedding_id, author_id, body) select id, '${friend}', 'Friend post' from public.weddings;`)).toMatch(/row-level security/i)
    expect(asUser(friend, `select count(*) from public.wedding_feed where body = 'Welcome';`)).toBe('1')
  })

  it('planner can post to the feed', () => {
    expect(asUser(planner, `insert into public.wedding_feed (wedding_id, author_id, body) select id, '${planner}', 'From the planner' from public.weddings; select count(*) from public.wedding_feed where body = 'From the planner';`)).toBe('1')
  })

  it('parent/family can invite family and friends to their own side', () => {
    expect(asUser(family, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'bride');`)).toMatch(/^\d{6}$/)
    expect(errorOf(family, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'groom');`)).toMatch(/own side/)
    expect(errorOf(family, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'planner', '');`)).toMatch(/family and friends only/)
  })

  it('friends and planners cannot invite anyone', () => {
    expect(errorOf(friend, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'bride');`)).toMatch(/cannot invite/)
    expect(errorOf(planner, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'bride');`)).toMatch(/cannot invite/)
  })

  it("parent dashboard shows own side's tasks, guests, budget share and the feed", () => {
    const dashboard = asUser(family, `select (
      (public.parent_dashboard(w.id) -> 'tasks')::text like '%Bride task%'
      and (public.parent_dashboard(w.id) -> 'tasks')::text not like '%Groom task%'
      and (public.parent_dashboard(w.id) -> 'guests')::text like '%Bride Guest%'
      and (public.parent_dashboard(w.id) -> 'guests')::text not like '%Groom Guest%'
      and (public.parent_dashboard(w.id) ->> 'budget_share')::numeric = 600
      and (public.parent_dashboard(w.id) -> 'feed')::text like '%Welcome%'
    )::text from public.weddings w where w.couple_names = 'Role Fixture';`)
    expect(dashboard).toBe('true')
    expect(errorOf(friend, `select public.parent_dashboard((select id from public.weddings where couple_names = 'Role Fixture'));`)).toMatch(/parent dashboard/)
  })

  it("only the bride or groom can change a member's side after joining", () => {
    expect(errorOf(family, `update public.wedding_members set side = 'groom' where user_id = '${family}';`)).toMatch(/only the bride or groom/)
    expect(asUser(bride, `update public.wedding_members set side = 'groom' where user_id = '${family}'; select side from public.wedding_members where user_id = '${family}';`)).toBe('groom')
    expect(asUser(bride, `update public.wedding_members set side = 'bride' where user_id = '${family}'; select side from public.wedding_members where user_id = '${family}';`)).toBe('bride')
  })

  it('if the bride or groom deletes their account, the slot frees and the wedding stays', () => {
    const kept = psql(`
      insert into auth.users (id, email) values
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'bride2@example.com'),
        ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'groom2@example.com');
      select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
      set role authenticated;
      select public.create_wedding('Slot Wedding', '2027-05-01', 'bride', 'Bride Two', 'Pune');
      reset role;
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'groom', 'groom', 'Groom Two'
      from public.weddings where couple_names = 'Slot Wedding';
    `)
    expect(kept).toBeDefined()
    expect(errorOf('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', `select public.create_invite((select id from public.weddings where couple_names = 'Slot Wedding'), 'bride', 'bride');`)).toMatch(/already has a bride/)
    psql(`select public.release_account('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1');`)
    expect(psql(`select count(*) from public.weddings where couple_names = 'Slot Wedding';`).trim()).toBe('1')
    expect(psql(`select count(*) from public.wedding_members where role = 'bride' and wedding_id = (select id from public.weddings where couple_names = 'Slot Wedding');`).trim()).toBe('0')
    expect(asUser('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', `select public.create_invite((select id from public.weddings where couple_names = 'Slot Wedding'), 'bride', 'bride');`)).toMatch(/^\d{6}$/)
  })

  it('if both bride and groom delete, the wedding and all its data are deleted', () => {
    psql(`
      insert into auth.users (id, email) values
        ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'bride3@example.com'),
        ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'groom3@example.com');
      select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', false);
      set role authenticated;
      select public.create_wedding('Both Delete', '2027-06-01', 'bride', 'Bride Three', 'Delhi');
      reset role;
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'groom', 'groom', 'Groom Three'
      from public.weddings where couple_names = 'Both Delete';
      insert into public.tasks (wedding_id, title, category, priority, status)
      select id, 'Goes away', 'Other', 'Low', 'Pending' from public.weddings where couple_names = 'Both Delete';
    `)
    psql(`select public.release_account('cccccccc-cccc-cccc-cccc-ccccccccccc1');`)
    expect(psql(`select count(*) from public.weddings where couple_names = 'Both Delete';`).trim()).toBe('1')
    psql(`select public.release_account('cccccccc-cccc-cccc-cccc-ccccccccccc2');`)
    expect(psql(`select count(*) from public.weddings where couple_names = 'Both Delete';`).trim()).toBe('0')
    expect(psql(`select count(*) from public.tasks where title = 'Goes away';`).trim()).toBe('0')
  })

  it('deleting a family, friend, or planner unassigns their tasks', () => {
    psql(`
      insert into auth.users (id, email) values ('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'helper@example.com');
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'dddddddd-dddd-dddd-dddd-ddddddddddd1', 'family', 'groom', 'Helper'
      from public.weddings where couple_names = 'Role Fixture';
      insert into public.tasks (wedding_id, title, category, priority, status, side, assigned_to)
      select id, 'Helper task', 'Other', 'Low', 'Pending', 'groom', 'dddddddd-dddd-dddd-dddd-ddddddddddd1'
      from public.weddings where couple_names = 'Role Fixture';
    `)
    psql(`select public.release_account('dddddddd-dddd-dddd-dddd-ddddddddddd1');`)
    expect(psql(`select assigned_to is null from public.tasks where title = 'Helper task';`).trim()).toBe('t')
    expect(psql(`select count(*) from public.wedding_members where user_id = 'dddddddd-dddd-dddd-dddd-ddddddddddd1';`).trim()).toBe('0')
    expect(psql(`select count(*) from public.weddings where couple_names = 'Role Fixture';`).trim()).toBe('1')
  })

  it('keeps one bride and one groom with a partial unique index', () => {
    const brideIndex = psql(`select indexdef from pg_indexes where indexname = 'wedding_one_bride';`)
    const groomIndex = psql(`select indexdef from pg_indexes where indexname = 'wedding_one_groom';`)
    expect(brideIndex).toMatch(/UNIQUE/i)
    expect(brideIndex).toMatch(/where \(+\(?role = 'bride'/i)
    expect(groomIndex).toMatch(/UNIQUE/i)
    expect(groomIndex).toMatch(/where \(+\(?role = 'groom'/i)
    expect(() => psql(`
      insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee9', 'second-bride@example.com');
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee9', 'bride', 'bride', 'Second'
      from public.weddings where couple_names = 'Role Fixture';
    `)).toThrow(/duplicate key|wedding_one_bride/i)
    expect(() => psql(`
      insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea1', 'second-groom@example.com');
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeea1', 'groom', 'groom', 'Second Groom'
      from public.weddings where couple_names = 'Role Fixture';
    `)).toThrow(/duplicate key|wedding_one_groom/i)
    expect(psql(`select count(*) from public.wedding_members where wedding_id = (select id from public.weddings where couple_names = 'Role Fixture') and role = 'bride';`).trim()).toBe('1')
    expect(psql(`select count(*) from public.wedding_members where wedding_id = (select id from public.weddings where couple_names = 'Role Fixture') and role = 'groom';`).trim()).toBe('1')
  })

  it('reads permissions from role_permissions through has_permission', () => {
    const wedding = `(select id from public.weddings where couple_names = 'Role Fixture')`
    expect(asUser(friend, `select public.has_permission(${wedding}, 'budget.view')::text;`)).toBe('false')
    expect(asUser(planner, `select public.has_permission(${wedding}, 'budget.view')::text;`)).toBe('true')
    expect(asUser(planner, `select public.has_permission(${wedding}, 'budget.edit')::text;`)).toBe('false')
    expect(asUser(family, `select public.permission_scope(${wedding}, 'budget.pay');`)).toBe('own_side')
    expect(asUser(family, `select public.permission_scope(${wedding}, 'tasks.edit');`)).toBe('own_side')
    expect(asUser(friend, `select public.permission_scope(${wedding}, 'tasks.edit');`)).toBe('assigned')
    expect(asUser(planner, `select public.permission_scope(${wedding}, 'members.change_side');`)).toBe('none')
    expect(asUser(bride, `select count(*) from public.budget_items where notes = 'hall';`)).toBe('1')
    psql(`update public.role_permissions set scope = 'all' where role = 'friend' and action = 'budget.view';`)
    try {
      expect(asUser(friend, `select public.has_permission(${wedding}, 'budget.view')::text;`)).toBe('true')
      expect(asUser(friend, `select count(*) from public.budget_items where notes = 'hall';`)).toBe('1')
    } finally {
      psql(`update public.role_permissions set scope = 'none' where role = 'friend' and action = 'budget.view';`)
    }
    expect(asUser(friend, `select count(*) from public.budget_items where notes = 'hall';`)).toBe('0')
  })

  it('copies the hindu checklist and lets only the couple or planner edit that wedding', () => {
    const wedding = `(select id from public.weddings where couple_names = 'Role Fixture')`
    expect(psql(`select count(*) from public.checklist_templates where community = 'hindu' and version = 1;`).trim()).toBe('1')
    expect(psql(`select count(*) from public.checklist_template_functions f join public.checklist_templates t on t.id = f.template_id where t.community = 'hindu' and t.version = 1;`).trim()).toBe('8')
    expect(psql(`select count(*) from public.checklist_template_rituals r join public.checklist_template_functions f on f.id = r.function_id join public.checklist_templates t on t.id = f.template_id where t.community = 'hindu' and t.version = 1;`).trim()).toBe('53')
    expect(Number(psql(`select count(*) from public.checklist_template_rituals r join public.checklist_template_functions f on f.id = r.function_id join public.checklist_templates t on t.id = f.template_id where t.community = 'hindu' and t.version = 1 and r.position > 0;`).trim())).toBeGreaterThanOrEqual(45)
    expect(psql(`select relreplident from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'tasks';`).trim()).toBe('f')
    expect(psql(`select relreplident from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'wedding_functions';`).trim()).toBe('f')
    expect(psql(`select string_agg(tablename, ',' order by tablename) from pg_publication_tables where pubname = 'supabase_realtime' and tablename in ('tasks', 'wedding_functions');`).trim()).toBe('tasks,wedding_functions')
    expect(psql(`select community from public.weddings where couple_names = 'Role Fixture';`).trim()).toBe('hindu')
    expect(psql(`select string_agg(name, ',' order by position) from public.wedding_functions where wedding_id = ${wedding};`).trim()).toBe('Roka,Sagai,Haldi,Mehendi,Sangeet,Wedding,Vidaai,Reception')
    expect(psql(`select count(*) from public.tasks where wedding_id = ${wedding} and template_title is not null;`).trim()).toBe('53')
    expect(psql(`select conname from pg_constraint where conname = 'tasks_ceremony_check';`).trim()).toBe('')

    expect(asUser(bride, `
      insert into public.tasks (wedding_id, title, category, priority, status, ceremony)
      select id, 'Custom rite', 'Other', 'Low', 'Pending', 'Mehendi night' from public.weddings where couple_names = 'Role Fixture';
      select ceremony from public.tasks where title = 'Custom rite';
    `)).toBe('Mehendi night')
    expect(asUser(planner, `update public.wedding_functions set name = 'Roka evening' where name = 'Roka' and wedding_id = ${wedding}; select ceremony from public.tasks where template_title = 'Roka Ceremony';`)).toBe('Roka evening')
    expect(asUser(planner, `update public.tasks set title = 'Our roka' where template_title = 'Roka Ceremony'; select title from public.tasks where template_title = 'Roka Ceremony';`)).toBe('Our roka')
    expect(psql(`select indexdef from pg_indexes where indexname = 'tasks_function_title_ci';`)).toMatch(/lower\(btrim\(title\)\)/)
    expect(errorOf(planner, `
      insert into public.tasks (wedding_id, function_id, title, category, priority, status, ceremony)
      select w.id, f.id, 'our ROKA', 'Other', 'Low', 'Pending', f.name
      from public.weddings w
      join public.wedding_functions f on f.wedding_id = w.id and f.name = 'Roka evening'
      where w.couple_names = 'Role Fixture';
    `)).toMatch(/tasks_function_title_ci/)
    expect(asUser(planner, `
      insert into public.tasks (wedding_id, function_id, title, category, priority, status, ceremony)
      select w.id, f.id, 'our roka', 'Other', 'Low', 'Pending', f.name
      from public.weddings w
      join public.wedding_functions f on f.wedding_id = w.id and f.name = 'Sagai'
      where w.couple_names = 'Role Fixture';
      select title from public.tasks where title = 'our roka' and ceremony = 'Sagai';
    `)).toBe('our roka')
    let templateClash = ''
    try {
      psql(`
        insert into public.checklist_template_rituals (function_id, title, description, category, priority, position)
        select function_id, 'roka ceremony', description, category, priority, 99
        from public.checklist_template_rituals
        where title = 'Roka Ceremony';
      `)
    } catch (caught) {
      const error = caught as { stderr?: Buffer; message?: string }
      templateClash = `${error.stderr?.toString() ?? ''}\n${error.message ?? ''}`
    }
    expect(templateClash).toMatch(/checklist_template_rituals_function_title_ci/)
    expect(asUser(planner, `
      update public.wedding_functions set position = 1
      where wedding_id = ${wedding} and name in ('Sagai', 'Haldi');
      select count(*) from public.wedding_functions where wedding_id = ${wedding} and position = 1;
    `)).toBe('3')

    expect(asUser(family, `update public.wedding_functions set name = 'Family function' where name = 'Haldi' and wedding_id = ${wedding}; select count(*) from public.wedding_functions where name = 'Family function';`)).toBe('0')
    expect(errorOf(family, `insert into public.wedding_functions (wedding_id, name, position) select id, 'Family function', 40 from public.weddings where couple_names = 'Role Fixture';`)).toMatch(/row-level security/i)
    expect(asUser(family, `delete from public.wedding_functions where name = 'Haldi' and wedding_id = ${wedding}; select count(*) from public.wedding_functions where name = 'Haldi' and wedding_id = ${wedding};`)).toBe('1')

    psql(`insert into auth.users (id, email) values ('cccccccc-cccc-cccc-cccc-ccccccccccc1', 'outsider@example.com') on conflict (id) do nothing;`)
    expect(asUser('cccccccc-cccc-cccc-cccc-ccccccccccc1', `select public.create_wedding('Outsider Wedding', '2027-07-01', 'groom', 'Outsider', 'Jaipur');`)).toMatch(/[0-9a-f-]{36}/)
    expect(asUser('cccccccc-cccc-cccc-cccc-ccccccccccc1', `update public.wedding_functions set name = 'Stolen' where wedding_id = ${wedding}; select count(*) from public.wedding_functions where name = 'Stolen';`)).toBe('0')

    expect(errorOf(friend, `update public.tasks set position = 99 where title = 'Friend task';`)).toMatch(/complete tasks assigned/i)
    expect(errorOf(friend, `update public.tasks set function_id = (select id from public.wedding_functions where wedding_id = ${wedding} limit 1) where title = 'Friend task';`)).toMatch(/complete tasks assigned/i)

    expect(errorOf(bride, `insert into public.checklist_templates (community, version) values ('sikh', 1);`)).toMatch(/permission denied|row-level security/i)
    expect(errorOf(bride, `insert into public.checklist_template_functions (template_id, name, position) select id, 'Extra', 9 from public.checklist_templates where community = 'hindu';`)).toMatch(/permission denied|row-level security/i)
    expect(psql(`select count(*) from public.checklist_templates where community = 'sikh';`).trim()).toBe('0')

    expect(asUser(planner, `
      with fn as (
        insert into public.wedding_functions (wedding_id, name, position)
        select id, 'Tilak', 20 from public.weddings where couple_names = 'Role Fixture'
        returning id
      )
      insert into public.tasks (wedding_id, function_id, title, category, priority, status, ceremony)
      select w.id, fn.id, 'Tilak rite', 'Other', 'Low', 'Pending', 'Tilak'
      from fn, public.weddings w
      where w.couple_names = 'Role Fixture';
      delete from public.wedding_functions where name = 'Tilak' and wedding_id = ${wedding};
      select count(*) from public.tasks where title = 'Tilak rite';
    `)).toBe('0')

    psql(`
      insert into public.weddings (couple_names, wedding_date, city) values ('Legacy Tasks', '2027-08-01', 'Pune');
      insert into public.tasks (wedding_id, title, category, priority, status, ceremony, sort_order)
      select id, 'Old party', 'Other', 'Low', 'Pending', 'Party', 1 from public.weddings where couple_names = 'Legacy Tasks';
      insert into public.tasks (wedding_id, title, category, priority, status, ceremony, sort_order)
      select id, 'Old haldi', 'Other', 'Low', 'Pending', 'Haldi', 2 from public.weddings where couple_names = 'Legacy Tasks';
      insert into public.weddings (couple_names, wedding_date, city) values ('Legacy Empty', '2027-09-01', 'Delhi');
    `)
    psql(`select public.backfill_checklists();`)
    expect(psql(`select string_agg(name, ',' order by position) from public.wedding_functions where wedding_id = (select id from public.weddings where couple_names = 'Legacy Tasks');`).trim()).toBe('Party,Haldi')
    expect(psql(`select count(*) from public.tasks where wedding_id = (select id from public.weddings where couple_names = 'Legacy Tasks') and function_id is not null;`).trim()).toBe('2')
    expect(psql(`select count(*) from public.tasks where wedding_id = (select id from public.weddings where couple_names = 'Legacy Empty');`).trim()).toBe('53')
    psql(`select public.backfill_checklists();`)
    expect(psql(`select count(*) from public.tasks where wedding_id = (select id from public.weddings where couple_names = 'Legacy Tasks');`).trim()).toBe('2')
    expect(psql(`select count(*) from public.tasks where wedding_id = (select id from public.weddings where couple_names = 'Legacy Empty');`).trim()).toBe('53')
    expect(psql(`select count(*) from public.wedding_functions where wedding_id = (select id from public.weddings where couple_names = 'Legacy Empty');`).trim()).toBe('8')
  })

  it('lets the person joining pick a role and a side', () => {
    const code = asUser(bride, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'open', '');`)
    expect(code).toMatch(/^\d{6}$/)
    psql(`insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'joiner@example.com') on conflict (id) do nothing;`)
    expect(errorOf('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', `select public.accept_invite('${code}', 'friend', '');`)).toMatch(/pick a side/)
    expect(asUser('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', `select public.accept_invite('${code}', 'friend', 'groom');`)).toMatch(/[0-9a-f-]{36}/)
    expect(psql(`select role || ' ' || side from public.wedding_members where user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1';`).trim()).toBe('friend groom')

    const familyCode = asUser(family, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'open', 'bride');`)
    expect(familyCode).toMatch(/^\d{6}$/)
    psql(`insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'joiner2@example.com') on conflict (id) do nothing;`)
    expect(errorOf('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', `select public.accept_invite('${familyCode}', 'planner', '');`)).toMatch(/family and friends only/)
    expect(errorOf('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', `select public.accept_invite('${familyCode}', 'family', 'groom');`)).toMatch(/own side/)
    expect(asUser('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', `select public.accept_invite('${familyCode}', 'family', 'bride');`)).toMatch(/[0-9a-f-]{36}/)

    const brideCode = asUser(groom, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'open', '');`)
    psql(`insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'joiner3@example.com') on conflict (id) do nothing;`)
    expect(errorOf('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', `select public.accept_invite('${brideCode}', 'bride', 'bride');`)).toMatch(/already has a bride/)
  })

  it('rejects a second bride when two people join at the same time', async () => {
    await expectOneSlotUnderRace({
      couple: 'Race Join Bride',
      creator: 'b1111111-1111-1111-1111-111111111111',
      creatorRole: 'groom',
      takenRole: 'bride',
      joinerA: 'b2222222-2222-2222-2222-222222222222',
      joinerB: 'b3333333-3333-3333-3333-333333333333',
      signalKey: 11,
      gateKey: 19,
      mode: 'join',
    })
  }, 20000)

  it('rejects a second groom when two people join at the same time', async () => {
    await expectOneSlotUnderRace({
      couple: 'Race Join Groom',
      creator: 'b4444444-4444-4444-4444-444444444444',
      creatorRole: 'bride',
      takenRole: 'groom',
      joinerA: 'b5555555-5555-5555-5555-555555555555',
      joinerB: 'b6666666-6666-6666-6666-666666666666',
      signalKey: 12,
      gateKey: 29,
      mode: 'join',
    })
  }, 20000)

  it('rejects a second bride when two direct inserts run together', async () => {
    await expectOneSlotUnderRace({
      couple: 'Race Direct Bride',
      creator: 'b7777777-7777-7777-7777-777777777777',
      creatorRole: 'groom',
      takenRole: 'bride',
      joinerA: 'b8888888-8888-8888-8888-888888888888',
      joinerB: 'b9999999-9999-9999-9999-999999999999',
      signalKey: 13,
      gateKey: 39,
      mode: 'insert',
    })
  }, 20000)

  it('rejects a second groom when two direct inserts run together', async () => {
    await expectOneSlotUnderRace({
      couple: 'Race Direct Groom',
      creator: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
      creatorRole: 'bride',
      takenRole: 'groom',
      joinerA: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
      joinerB: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
      signalKey: 14,
      gateKey: 49,
      mode: 'insert',
    })
  }, 20000)

  it('lets only the sender read their feedback screenshot', () => {
    const path = `${bride}/note.png`
    expect(psql(`select (storage.foldername('${path}'))[1];`).trim()).toBe(bride)
    expect(asUser(bride, `
      insert into storage.objects (bucket_id, name) values ('feedback-screenshots', '${path}');
      select count(*) from storage.objects where bucket_id = 'feedback-screenshots' and name = '${path}';
    `)).toBe('1')
    expect(asUser(groom, `select count(*) from storage.objects where bucket_id = 'feedback-screenshots';`)).toBe('0')
    expect(errorOf(groom, `insert into storage.objects (bucket_id, name) values ('feedback-screenshots', '${bride}/other.png'); select 1;`)).toMatch(/row-level security|policy/i)
    expect(asUser(groom, `
      insert into storage.objects (bucket_id, name) values ('feedback-screenshots', '${groom}/own.png');
      select count(*) from storage.objects where name = '${groom}/own.png';
    `)).toBe('1')
    expect(asUser(bride, `
      insert into public.feedback (user_id, message, screenshot_path) values ('${bride}', 'A note', '${path}');
      select screenshot_path from public.feedback;
    `)).toBe(path)
    expect(asUser(groom, `select count(*) from public.feedback;`)).toBe('0')
    asUser(groom, `delete from storage.objects where name = '${path}'; select 1;`)
    expect(psql(`select count(*) from storage.objects where name = '${path}';`).trim()).toBe('1')
    expect(asUser(bride, `
      delete from storage.objects where name = '${path}';
      select count(*) from storage.objects where name = '${path}';
    `)).toBe('0')
  })

  it('lets a person insert and read only their own survey answers', () => {
    expect(asUser(bride, `
      insert into public.survey_responses (user_id, kind, prompt, nps_score, comment)
      values ('${bride}', 'nps', 'day_14', 9, 'Clear so far');
      select nps_score from public.survey_responses where prompt = 'day_14';
    `)).toBe('9')
    expect(asUser(bride, `
      insert into public.survey_responses (user_id, kind, prompt, dismissed)
      values ('${bride}', 'nps', 'day_30', true);
      select dismissed from public.survey_responses where prompt = 'day_30';
    `)).toBe('t')
    expect(asUser(bride, `
      insert into public.survey_responses (user_id, kind, prompt, willingness, price_choice)
      values ('${bride}', 'price', 'price', '4999', null);
      select coalesce(price_choice, 'pending') from public.survey_responses where prompt = 'price';
    `)).toBe('pending')
    expect(asUser(groom, `select count(*) from public.survey_responses;`)).toBe('0')
    expect(errorOf(groom, `
      insert into public.survey_responses (user_id, kind, prompt, nps_score)
      values ('${bride}', 'nps', 'day_14', 1);
      select 1;
    `)).toMatch(/row-level security|policy/i)
    expect(errorOf(bride, `
      update public.survey_responses set nps_score = 1 where prompt = 'day_14';
      select 1;
    `)).toMatch(/permission denied/i)
    expect(errorOf(bride, `
      delete from public.survey_responses where prompt = 'price';
      select 1;
    `)).toMatch(/permission denied/i)
    expect(asUser(bride, `select nps_score from public.survey_responses where prompt = 'day_14';`)).toBe('9')
    expect(asUser(bride, `select count(*) from public.survey_responses where prompt = 'price';`)).toBe('1')
    expect(errorOf(bride, `
      insert into public.survey_responses (user_id, kind, prompt, nps_score)
      values ('${bride}', 'nps', 'day_14', 11);
      select 1;
    `)).toMatch(/survey_responses_nps_score_range|check/i)
    expect(asUser(family, `
      insert into public.survey_responses (user_id, kind, prompt, willingness)
      values ('${family}', 'price', 'price', '2000');
      select willingness from public.survey_responses where user_id = '${family}';
    `)).toBe('2000')
    expect(errorOf(friend, `
      insert into public.survey_responses (user_id, kind, prompt, willingness)
      values ('${friend}', 'price', 'price', 'about 2000');
      select 1;
    `)).toMatch(/digits only|0 to 1000000/i)
    expect(errorOf(friend, `
      insert into public.survey_responses (user_id, kind, prompt, willingness)
      values ('${friend}', 'price', 'price', '1000001');
      select 1;
    `)).toMatch(/digits only|0 to 1000000/i)
    expect(errorOf(planner, `
      insert into public.survey_responses (user_id, kind, prompt, willingness, price_choice)
      values ('${planner}', 'price', 'price', '1000', 'maybe');
      select 1;
    `)).toMatch(/survey_responses_price_choice_values|check/i)
    expect(asUser(planner, `
      insert into public.survey_responses (user_id, kind, prompt, willingness)
      values ('${planner}', 'price', 'price', '0');
      select willingness from public.survey_responses where user_id = '${planner}';
    `)).toBe('0')
    expect(errorOf(bride, `
      update public.survey_responses set willingness = '1' where prompt = 'price';
      select 1;
    `)).toMatch(/permission denied/i)
    expect(errorOf(bride, `
      update public.survey_responses set price_choice = 'maybe' where prompt = 'price';
      select 1;
    `)).toMatch(/survey_responses_price_choice_values|check|locked/i)
    expect(asUser(bride, `
      update public.survey_responses set price_choice = 'yes' where prompt = 'price';
      select price_choice from public.survey_responses where prompt = 'price';
    `)).toBe('yes')
    expect(asUser(bride, `
      update public.survey_responses set price_choice = 'no' where prompt = 'price';
      select price_choice from public.survey_responses where prompt = 'price';
    `)).toBe('yes')
    expect(dbError(`update public.survey_responses set willingness = '1' where user_id = '${bride}' and prompt = 'price';`)).toMatch(/this survey answer is locked/i)
    expect(errorOf(bride, `
      insert into public.survey_responses (user_id, kind, prompt, nps_score)
      values ('${bride}', 'nps', 'day_14', 8);
      select 1;
    `)).toMatch(/survey_responses_user_prompt|duplicate key|unique/i)
  })

  it('rejects a function name that matches after trimming and ignoring case', () => {
    const wedding = `(select id from public.weddings where couple_names = 'Role Fixture')`
    expect(errorOf(bride, `update public.wedding_functions set name = '  mehendi ' where name = 'Haldi' and wedding_id = ${wedding};`)).toMatch(/wedding_functions_name_ci|duplicate key|unique/i)
    expect(psql(`select name from public.wedding_functions where name = 'Haldi' and wedding_id = ${wedding};`).trim()).toBe('Haldi')
    expect(asUser(bride, `update public.wedding_functions set name = ' Haldi ' where name = 'Haldi' and wedding_id = ${wedding}; select btrim(name) from public.wedding_functions where wedding_id = ${wedding} and lower(btrim(name)) = 'haldi';`)).toBe('Haldi')
  })

  it('stores a profile or sign-up name and never an email prefix', () => {
    const named = 'f1f1f1f1-f1f1-f1f1-f1f1-f1f1f1f1f1f1'
    const prefixed = 'f2f2f2f2-f2f2-f2f2-f2f2-f2f2f2f2f2f2'
    psql(`
      insert into auth.users (id, email) values
        ('${named}', 'named@example.com'),
        ('${prefixed}', 'prefixuser@example.com');
      update public.profiles set display_name = 'Real Kavita' where id = '${named}';
      update public.profiles set display_name = 'prefixuser' where id = '${prefixed}';
    `)
    const namedCode = asUser(bride, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'bride');`)
    const prefixedCode = asUser(bride, `select public.create_invite((select id from public.weddings where couple_names = 'Role Fixture'), 'friend', 'bride');`)
    expect(psql(`
      select set_config('request.jwt.claim.sub', '${named}', false);
      select set_config('request.jwt.claim.email', 'named@example.com', false);
      select set_config('request.jwt.claim.display_name', 'Ignored Claim', false);
      select set_config('request.jwt.claim.meta_display_name', 'Metadata Name', false);
      set role authenticated;
      select public.accept_invite('${namedCode}', 'friend', 'bride');
      select display_name from public.wedding_members where user_id = '${named}';
    `).trim().split('\n').filter(Boolean).at(-1)).toBe('Real Kavita')
    expect(psql(`
      select set_config('request.jwt.claim.sub', '${prefixed}', false);
      select set_config('request.jwt.claim.email', 'prefixuser@example.com', false);
      select set_config('request.jwt.claim.display_name', 'prefixuser', false);
      select set_config('request.jwt.claim.meta_display_name', 'Kavita Rao', false);
      set role authenticated;
      select public.accept_invite('${prefixedCode}', 'friend', 'bride');
      select display_name from public.wedding_members where user_id = '${prefixed}';
    `).trim().split('\n').filter(Boolean).at(-1)).toBe('Kavita Rao')
    expect(psql(`select count(*) from information_schema.columns where table_schema = 'public' and table_name in ('profiles', 'wedding_members') and column_name = 'email';`).trim()).toBe('0')
    expect(asUser(family, `select display_name from public.profiles where id = '${prefixed}';`)).toBe('Kavita Rao')
  })
})

describe('leave wedding and remove member', () => {
  const leaveBride = 'c1c1c1c1-c1c1-c1c1-c1c1-c1c1c1c1c1c1'
  const leaveGroom = 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2'
  const leaveFamily = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3'
  const leaveFriend = 'c4c4c4c4-c4c4-c4c4-c4c4-c4c4c4c4c4c4'
  const soloBride = 'c5c5c5c5-c5c5-c5c5-c5c5-c5c5c5c5c5c5'
  const wedding = 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'
  const solo = 'd2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2'

  it('lets anyone except the last bride or groom leave, and lets only the couple remove someone', () => {
    psql(`
      insert into auth.users (id, email) values
        ('${leaveBride}', 'leave-bride@example.com'),
        ('${leaveGroom}', 'leave-groom@example.com'),
        ('${leaveFamily}', 'leave-family@example.com'),
        ('${leaveFriend}', 'leave-friend@example.com'),
        ('${soloBride}', 'solo-bride@example.com');
      insert into public.weddings (id, couple_names, wedding_date, created_by) values
        ('${wedding}', 'Leave Fixture', '2027-05-01', '${leaveBride}'),
        ('${solo}', 'Solo Fixture', '2027-05-02', '${soloBride}');
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name) values
        ('${wedding}', '${leaveBride}', 'bride', 'bride', 'Asha'),
        ('${wedding}', '${leaveGroom}', 'groom', 'groom', 'Rahul'),
        ('${wedding}', '${leaveFamily}', 'family', 'bride', 'Parent'),
        ('${wedding}', '${leaveFriend}', 'friend', 'groom', 'Friend'),
        ('${solo}', '${soloBride}', 'bride', 'bride', 'Only');
      insert into public.tasks (wedding_id, title, category, priority, status, side, assigned_to) values
        ('${wedding}', 'Family helper', 'Other', 'Low', 'Pending', 'bride', '${leaveFamily}'),
        ('${wedding}', 'Bride helper', 'Other', 'Low', 'Pending', 'bride', '${leaveBride}'),
        ('${wedding}', 'Friend errand', 'Other', 'Low', 'Pending', null, '${leaveFriend}');
    `)
    expect(errorOf(leaveFriend, `update public.tasks set assigned_to = null where title = 'Friend errand';`)).toMatch(/complete tasks assigned|own side|row-level security/i)
    expect(errorOf(leaveFriend, `select public.release_member_tasks('${wedding}', '${leaveFriend}', 'groom');`)).toMatch(/permission denied/i)
    expect(errorOf(soloBride, `select public.leave_wedding('${solo}');`)).toMatch(/last bride or groom/)
    expect(psql(`select count(*) from public.wedding_members where wedding_id = '${solo}';`).trim()).toBe('1')
    expect(psql(`select count(*) from public.weddings where id = '${solo}';`).trim()).toBe('1')

    expect(errorOf(leaveFamily, `select public.remove_wedding_member((select id from public.wedding_members where user_id = '${leaveFriend}'));`)).toMatch(/bride or groom/)
    expect(errorOf(leaveBride, `select public.remove_wedding_member((select id from public.wedding_members where user_id = '${leaveBride}' and wedding_id = '${wedding}'));`)).toMatch(/leave wedding/)

    expect(asUser(leaveBride, `select public.remove_wedding_member((select id from public.wedding_members where user_id = '${leaveFamily}' and wedding_id = '${wedding}')); select 'removed';`)).toBe('removed')
    expect(psql(`select count(*) from public.wedding_members where user_id = '${leaveFamily}';`).trim()).toBe('0')
    expect(psql(`select assigned_to is null from public.tasks where title = 'Family helper';`).trim()).toBe('t')
    expect(psql(`select side from public.tasks where title = 'Family helper';`).trim()).toBe('bride')

    expect(asUser(leaveBride, `select public.leave_wedding('${wedding}'); select 'left';`)).toBe('left')
    expect(psql(`select count(*) from public.wedding_members where user_id = '${leaveBride}' and wedding_id = '${wedding}';`).trim()).toBe('0')
    expect(psql(`select count(*) from public.weddings where id = '${wedding}';`).trim()).toBe('1')
    expect(psql(`select count(*) from public.wedding_members where user_id = '${leaveGroom}' and wedding_id = '${wedding}';`).trim()).toBe('1')
    expect(psql(`select assigned_to is null from public.tasks where title = 'Bride helper';`).trim()).toBe('t')

    expect(asUser(leaveFriend, `select public.leave_wedding('${wedding}'); select 'left';`)).toBe('left')
    expect(psql(`select count(*) from public.wedding_members where user_id = '${leaveFriend}';`).trim()).toBe('0')
    expect(psql(`select (assigned_to is null)::text || '|' || coalesce(side, 'none') from public.tasks where title = 'Friend errand';`).trim()).toBe('true|groom')
    expect(asUser(leaveGroom, `select side from public.tasks where title = 'Friend errand';`)).toBe('groom')
  })
})

async function expectOneSlotUnderRace(input: {
  couple: string
  creator: string
  creatorRole: 'bride' | 'groom'
  takenRole: 'bride' | 'groom'
  joinerA: string
  joinerB: string
  signalKey: number
  gateKey: number
  mode: 'join' | 'insert'
}) {
  psql(`
    insert into auth.users (id, email) values
      ('${input.creator}', '${input.signalKey}-creator@example.com'),
      ('${input.joinerA}', '${input.signalKey}-a@example.com'),
      ('${input.joinerB}', '${input.signalKey}-b@example.com');
  `)
  asUser(input.creator, `select public.create_wedding('${input.couple}', '2027-04-24', '${input.creatorRole}', 'Creator', 'Mumbai');`)
  const claim = (userId: string) => `
    select set_config('request.jwt.claim.sub', '${userId}', false);
    select set_config('request.jwt.claim.email', '${userId.slice(0, 8)}@example.com', false);
    select set_config('request.jwt.claim.display_name', 'Joiner', false);
    set role authenticated;
  `
  let winnerSql: string
  let loserSql: string
  if (input.mode === 'join') {
    const codeA = asUser(input.creator, `select public.create_invite((select id from public.weddings where couple_names = '${input.couple}'), 'open', '');`)
    const codeB = asUser(input.creator, `select public.create_invite((select id from public.weddings where couple_names = '${input.couple}'), 'open', '');`)
    expect(codeA).toMatch(/^\d{6}$/)
    expect(codeB).toMatch(/^\d{6}$/)
    expect(codeA).not.toBe(codeB)
    winnerSql = `${claim(input.joinerA)} select public.accept_invite('${codeA}', '${input.takenRole}', '${input.takenRole}');`
    loserSql = `${claim(input.joinerB)} select public.accept_invite('${codeB}', '${input.takenRole}', '${input.takenRole}');`
  } else {
    const insert = (userId: string) => `
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, '${userId}', '${input.takenRole}', '${input.takenRole}', 'Direct'
      from public.weddings where couple_names = '${input.couple}';
    `
    winnerSql = insert(input.joinerA)
    loserSql = insert(input.joinerB)
  }
  const detail = await holdSecondWriter({
    signalKey: input.signalKey,
    gateKey: input.gateKey,
    winnerSql,
    loserSql,
  })
  expect(detail).toMatch(/23505/)
  if (input.mode === 'join') {
    expect(detail).toMatch(input.takenRole === 'bride' ? /already has a bride/ : /already has a groom/)
  } else {
    expect(detail).toMatch(input.takenRole === 'bride' ? /wedding_one_bride/ : /wedding_one_groom/)
  }
  const count = psql(`select count(*) from public.wedding_members where wedding_id = (select id from public.weddings where couple_names = '${input.couple}') and role = '${input.takenRole}';`).trim()
  expect(count).toBe('1')
}
