-- Leave wedding, remove a member, own-side assignment, profile names, and unique function names.
-- Apply after 20261026240000_survey_responses.sql.
-- Re-creates protect_task_update from the checklist file and adds the assignee check.
-- Does not grant copy, backfill, or release_account to authenticated.

-- Names other members can see come from the profile or sign-up metadata, never the email.
create or replace function public.member_display_name(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  profile_name text;
  email_prefix text;
  meta_name text;
  claim_name text;
begin
  select nullif(btrim(p.display_name), ''), nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  into profile_name, email_prefix
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user_id;

  if profile_name is not null
    and lower(profile_name) <> 'guest'
    and position('@' in profile_name) = 0
    and (email_prefix is null or lower(profile_name) <> lower(email_prefix))
  then
    return profile_name;
  end if;

  meta_name := nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'display_name'), '');
  claim_name := nullif(btrim(auth.jwt() ->> 'display_name'), '');

  if meta_name is not null
    and position('@' in meta_name) = 0
    and (email_prefix is null or lower(meta_name) <> lower(email_prefix))
  then
    return meta_name;
  end if;

  if claim_name is not null
    and position('@' in claim_name) = 0
    and (email_prefix is null or lower(claim_name) <> lower(email_prefix))
  then
    return claim_name;
  end if;

  return 'Family';
end;
$$;

revoke all on function public.member_display_name(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'Guest')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Replace stored email prefixes so the member list stops showing them.
update public.profiles p
set display_name = coalesce(nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''), 'Guest')
from auth.users u
where p.id = u.id
  and (
    p.display_name is null
    or btrim(p.display_name) = ''
    or position('@' in p.display_name) > 0
    or lower(btrim(p.display_name)) = lower(split_part(coalesce(u.email, ''), '@', 1))
  );

update public.wedding_members m
set display_name = coalesce(nullif(btrim(p.display_name), ''), 'Guest')
from public.profiles p
join auth.users u on u.id = p.id
where m.user_id = u.id
  and (
    m.display_name is null
    or btrim(m.display_name) = ''
    or position('@' in m.display_name) > 0
    or lower(btrim(m.display_name)) = lower(split_part(coalesce(u.email, ''), '@', 1))
  );

create or replace function public.accept_invite(p_token text, p_role text default null, p_side text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invite public.wedding_invites%rowtype;
  inviter text;
  clean text := trim(p_token);
  chosen_role text := lower(trim(coalesce(p_role, '')));
  chosen_side text := nullif(lower(trim(coalesce(p_side, ''))), '');
  chosen_name text;
begin
  if auth.uid() is null then raise exception 'sign in before accepting an invite'; end if;
  if clean !~ '^[0-9]{6}$' then raise exception 'enter the 6-digit invite code'; end if;
  select * into invite from public.wedding_invites
  where token = clean and accepted_at is null and (expires_at is null or expires_at > now())
  for update;
  if invite.id is null then raise exception 'this invite is invalid, expired, or already used'; end if;
  select role into inviter from public.wedding_members
  where wedding_id = invite.wedding_id and user_id = invite.created_by;

  if invite.role = 'open' then
    if chosen_role = '' then
      raise exception 'pick a role before joining';
    end if;
    if inviter = 'family' then
      if chosen_role not in ('family', 'friend') then
        raise exception 'family can invite family and friends only';
      end if;
      if chosen_side is null then
        raise exception 'pick a side before joining';
      end if;
      if chosen_side is distinct from invite.side then
        raise exception 'family can invite only to their own side';
      end if;
    end if;
  else
    if chosen_role <> '' and chosen_role <> invite.role then
      raise exception 'this invite is for a % role', invite.role;
    end if;
    chosen_role := invite.role;
    if chosen_side is null then
      chosen_side := invite.side;
    elsif invite.side is not null and chosen_role in ('family', 'friend') and chosen_side is distinct from invite.side then
      raise exception 'pick a side before joining';
    end if;
  end if;

  if chosen_role = 'bride' then
    chosen_side := 'bride';
    if exists (select 1 from public.wedding_members where wedding_id = invite.wedding_id and role = 'bride' and user_id <> auth.uid()) then
      raise exception 'This wedding already has a bride. Ask them for a family or friend invite.';
    end if;
  elsif chosen_role = 'groom' then
    chosen_side := 'groom';
    if exists (select 1 from public.wedding_members where wedding_id = invite.wedding_id and role = 'groom' and user_id <> auth.uid()) then
      raise exception 'This wedding already has a groom. Ask them for a family or friend invite.';
    end if;
  elsif chosen_role = 'planner' then
    chosen_side := null;
  elsif chosen_role in ('family', 'friend') then
    if chosen_side is null or chosen_side not in ('bride', 'groom') then
      raise exception 'pick a side before joining';
    end if;
  else
    raise exception 'unknown role';
  end if;

  chosen_name := public.member_display_name(auth.uid());

  update public.profiles p
  set display_name = chosen_name
  from auth.users u
  where p.id = auth.uid()
    and u.id = p.id
    and (
      p.display_name is null
      or btrim(p.display_name) = ''
      or lower(btrim(p.display_name)) = 'guest'
      or position('@' in p.display_name) > 0
      or lower(btrim(p.display_name)) = lower(split_part(coalesce(u.email, ''), '@', 1))
    );

  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (
    invite.wedding_id,
    auth.uid(),
    chosen_role,
    chosen_side,
    chosen_name
  )
  on conflict (wedding_id, user_id) do update
    set role = excluded.role,
        side = excluded.side,
        display_name = coalesce(nullif(btrim(wedding_members.display_name), ''), excluded.display_name);
  update public.wedding_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite.id;
  return invite.wedding_id;
exception
  when unique_violation then
    if chosen_role = 'bride' then
      raise exception 'This wedding already has a bride. Ask them for a family or friend invite.'
        using errcode = 'unique_violation';
    elsif chosen_role = 'groom' then
      raise exception 'This wedding already has a groom. Ask them for a family or friend invite.'
        using errcode = 'unique_violation';
    else
      raise;
    end if;
end;
$$;

-- A parent may assign a task only to someone on their own side.
-- Couple and planner (scope all) can still assign anyone.
create or replace function public.protect_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  scope text := public.permission_scope(old.wedding_id, 'tasks.edit');
  actor_side text := public.member_side(old.wedding_id);
begin
  if auth.uid() is null then
    return new;
  end if;
  if scope = 'all' then
    return new;
  end if;
  if scope = 'own_side' then
    if old.side is distinct from actor_side or new.side is distinct from actor_side then
      raise exception 'family can only edit their own side';
    end if;
    if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
      if not exists (
        select 1 from public.wedding_members assignee
        where assignee.wedding_id = new.wedding_id
          and assignee.user_id = new.assigned_to
          and assignee.side = actor_side
      ) then
        raise exception 'family can only assign people on their own side';
      end if;
    end if;
    return new;
  end if;
  if scope = 'assigned' then
    if old.assigned_to is distinct from auth.uid() then
      raise exception 'friends can only update tasks assigned to them';
    end if;
    if new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.priority is distinct from old.priority
      or new.ceremony is distinct from old.ceremony
      or new.due_date is distinct from old.due_date
      or new.assigned_to is distinct from old.assigned_to
      or new.side is distinct from old.side
      or new.template_title is distinct from old.template_title
      or new.sort_order is distinct from old.sort_order
      or new.position is distinct from old.position
      or new.function_id is distinct from old.function_id
      or new.wedding_id is distinct from old.wedding_id
    then
      raise exception 'friends can only complete tasks assigned to them';
    end if;
    return new;
  end if;
  raise exception 'no task access';
end;
$$;

-- Leaving removes this membership. The last bride or groom must delete the account,
-- which is the path that deletes the wedding when the other partner is already gone.
create or replace function public.leave_wedding(p_wedding_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  membership public.wedding_members%rowtype;
begin
  if actor is null then
    raise exception 'sign in before leaving a wedding';
  end if;
  select * into membership from public.wedding_members
  where wedding_id = p_wedding_id and user_id = actor;
  if membership.id is null then
    raise exception 'you are not a member of this wedding';
  end if;

  if membership.role = 'bride' and not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding_id and role = 'groom'
  ) then
    raise exception 'the last bride or groom cannot leave; delete the account instead';
  end if;
  if membership.role = 'groom' and not exists (
    select 1 from public.wedding_members
    where wedding_id = p_wedding_id and role = 'bride'
  ) then
    raise exception 'the last bride or groom cannot leave; delete the account instead';
  end if;

  update public.tasks
  set assigned_to = null
  where wedding_id = p_wedding_id and assigned_to = actor;

  delete from public.wedding_members where id = membership.id;
end;
$$;

-- Bride or groom removes someone else. Their tasks are unassigned. The wedding stays.
create or replace function public.remove_wedding_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  actor_role text;
  target public.wedding_members%rowtype;
begin
  if actor is null then
    raise exception 'sign in before removing a member';
  end if;
  select * into target from public.wedding_members where id = p_member_id;
  if target.id is null then
    raise exception 'that member is not in this wedding';
  end if;
  select role into actor_role from public.wedding_members
  where wedding_id = target.wedding_id and user_id = actor;
  if actor_role is null or actor_role not in ('bride', 'groom') then
    raise exception 'only the bride or groom can remove a member';
  end if;
  if target.user_id = actor then
    raise exception 'use leave wedding to remove yourself';
  end if;

  update public.tasks
  set assigned_to = null
  where wedding_id = target.wedding_id and assigned_to = target.user_id;

  delete from public.wedding_members where id = target.id;
end;
$$;

revoke all on function public.leave_wedding(uuid) from public, anon;
revoke all on function public.remove_wedding_member(uuid) from public, anon;
grant execute on function public.leave_wedding(uuid) to authenticated;
grant execute on function public.remove_wedding_member(uuid) to authenticated;

-- Function names are unique per wedding after trimming, ignoring case.
update public.wedding_functions
set name = btrim(name)
where name is distinct from btrim(name);

do $$
declare
  row record;
  base text;
  candidate text;
  n int;
begin
  for row in
    select id, wedding_id, btrim(name) as name
    from public.wedding_functions
    where id not in (
      select distinct on (wedding_id, lower(btrim(name))) id
      from public.wedding_functions
      order by wedding_id, lower(btrim(name)), position, id
    )
  loop
    base := btrim(row.name);
    n := 2;
    loop
      candidate := base || ' (' || n || ')';
      exit when not exists (
        select 1 from public.wedding_functions
        where wedding_id = row.wedding_id
          and id <> row.id
          and lower(btrim(name)) = lower(candidate)
      );
      n := n + 1;
    end loop;
    update public.wedding_functions set name = candidate where id = row.id;
  end loop;
end $$;

create unique index if not exists wedding_functions_name_ci
  on public.wedding_functions (wedding_id, lower(btrim(name)));
