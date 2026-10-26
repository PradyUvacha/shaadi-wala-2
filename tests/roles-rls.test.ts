import { execFileSync } from 'node:child_process'
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
    const error = caught as { stderr?: string | Buffer; message?: string }
    return `${error.stderr?.toString() ?? ''}\n${error.message ?? ''}`
  }
}

beforeAll(() => {
  if (!process.env.PGHOST) {
    run('postgres', ['-v', 'ON_ERROR_STOP=1', '-c', 'drop database if exists shaadi_roles'])
    run('postgres', ['-v', 'ON_ERROR_STOP=1', '-c', 'create database shaadi_roles'])
  } else {
    psql('drop schema if exists public cascade; drop schema if exists auth cascade; create schema public;')
  }
  file(`${root}supabase/tests/auth-stub.sql`)
  file(`${root}supabase/migrations/20261024180000_init.sql`)
  file(`${root}supabase/migrations/20261026120000_v1.sql`)
  file(`${root}supabase/migrations/20261026150000_roles.sql`)
  file(`${root}supabase/migrations/20261026150000_roles.sql`)
  file(`${root}supabase/migrations/20261026180000_permissions.sql`)
  file(`${root}supabase/migrations/20261026180000_permissions.sql`)
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

  it('keeps one bride and one groom with a unique constraint', () => {
    const indexes = psql(`select indexname from pg_indexes where indexname in ('wedding_one_bride', 'wedding_one_groom') order by 1;`)
    expect(indexes).toContain('wedding_one_bride')
    expect(indexes).toContain('wedding_one_groom')
    expect(() => psql(`
      insert into auth.users (id, email) values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee9', 'second-bride@example.com');
      insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
      select id, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee9', 'bride', 'bride', 'Second'
      from public.weddings where couple_names = 'Role Fixture';
    `)).toThrow(/duplicate key|wedding_one_bride/i)
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
})
