-- Approved roles: bride, groom, family, friend, planner.
-- Apply after 20261026120000_v1.sql. Safe to run again.
-- If v1 is applied again after this file, apply this file again so its policies win.

alter table public.tasks add column if not exists side text;
alter table public.tasks drop constraint if exists tasks_side_check;
alter table public.tasks add constraint tasks_side_check check (side is null or side in ('bride', 'groom'));
alter table public.tasks add column if not exists assigned_to uuid references auth.users (id) on delete set null;

alter table public.wedding_members alter column side drop not null;
alter table public.wedding_members drop constraint if exists wedding_members_side_check;
alter table public.wedding_members drop constraint if exists wedding_members_role_check;
alter table public.wedding_members drop constraint if exists wedding_members_role_shape;
alter table public.wedding_invites drop constraint if exists wedding_invites_role_check;
alter table public.wedding_invites drop constraint if exists wedding_invites_role_shape;

update public.wedding_members set role = 'bride', side = 'bride' where role = 'owner' and side = 'bride';
update public.wedding_members set role = 'groom', side = 'groom' where role = 'owner' and side is distinct from 'bride';
update public.wedding_members set role = 'family' where role in ('editor', 'viewer', 'partner');
update public.wedding_invites set role = 'family' where role in ('editor', 'viewer', 'partner', 'owner');

alter table public.wedding_members add constraint wedding_members_role_shape check (
  (role = 'bride' and side = 'bride')
  or (role = 'groom' and side = 'groom')
  or (role in ('family', 'friend') and side in ('bride', 'groom'))
  or (role = 'planner' and side is null)
);
alter table public.wedding_invites add constraint wedding_invites_role_shape check (
  role in ('bride', 'groom', 'family', 'friend', 'planner')
);

create unique index if not exists wedding_one_bride on public.wedding_members (wedding_id) where role = 'bride';
create unique index if not exists wedding_one_groom on public.wedding_members (wedding_id) where role = 'groom';

create table if not exists public.wedding_feed (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint wedding_feed_body_not_blank check (char_length(trim(body)) > 0)
);
create index if not exists wedding_feed_wedding_id_idx on public.wedding_feed (wedding_id);
alter table public.wedding_feed enable row level security;

create or replace function public.wedding_role(p_wedding_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.wedding_members
  where wedding_id = p_wedding_id and user_id = auth.uid()
  limit 1
$$;

create or replace function public.member_side(p_wedding_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select side from public.wedding_members
  where wedding_id = p_wedding_id and user_id = auth.uid()
  limit 1
$$;

create or replace function public.can_edit_wedding(p_wedding_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.wedding_role(p_wedding_id) in ('bride', 'groom')
$$;

create or replace function public.protect_member_keys()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id = old.id;
  new.user_id = old.user_id;
  new.wedding_id = old.wedding_id;
  if new.role is distinct from old.role or new.side is distinct from old.side then
    if public.wedding_role(old.wedding_id) not in ('bride', 'groom') then
      raise exception 'only the bride or groom can change a member''s side';
    end if;
  end if;
  if new.role = 'bride' then
    new.side = 'bride';
  elsif new.role = 'groom' then
    new.side = 'groom';
  elsif new.role = 'planner' then
    new.side = null;
  elsif new.role in ('family', 'friend') and new.side not in ('bride', 'groom') then
    raise exception 'pick a side before joining';
  end if;
  return new;
end;
$$;

create or replace function public.protect_task_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor text := public.wedding_role(old.wedding_id);
  actor_side text := public.member_side(old.wedding_id);
begin
  if auth.uid() is null then
    return new;
  end if;
  if actor in ('bride', 'groom', 'planner') then
    return new;
  end if;
  if actor = 'family' then
    if old.side is distinct from actor_side or new.side is distinct from actor_side then
      raise exception 'family can only edit their own side';
    end if;
    return new;
  end if;
  if actor = 'friend' then
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
      or new.wedding_id is distinct from old.wedding_id
    then
      raise exception 'friends can only complete tasks assigned to them';
    end if;
    return new;
  end if;
  raise exception 'no task access';
end;
$$;

drop trigger if exists tasks_protect_assignment on public.tasks;
create trigger tasks_protect_assignment
before update on public.tasks
for each row execute function public.protect_task_update();

revoke all on function public.wedding_role(uuid) from public;
revoke all on function public.member_side(uuid) from public;
revoke all on function public.can_edit_wedding(uuid) from public;
grant execute on function public.wedding_role(uuid) to authenticated;
grant execute on function public.member_side(uuid) to authenticated;
grant execute on function public.can_edit_wedding(uuid) to authenticated;

drop policy if exists weddings_update on public.weddings;
drop policy if exists weddings_update_editor on public.weddings;
drop policy if exists weddings_update_couple on public.weddings;
create policy weddings_update_couple on public.weddings for update to authenticated
  using (public.can_edit_wedding(id)) with check (public.can_edit_wedding(id));

drop policy if exists tasks_member_all on public.tasks;
drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;
drop policy if exists tasks_select_members on public.tasks;
drop policy if exists tasks_select_friend on public.tasks;
drop policy if exists tasks_insert_managers on public.tasks;
drop policy if exists tasks_insert_family on public.tasks;
drop policy if exists tasks_update_managers on public.tasks;
drop policy if exists tasks_update_family on public.tasks;
drop policy if exists tasks_update_friend on public.tasks;
drop policy if exists tasks_delete_managers on public.tasks;
drop policy if exists tasks_delete_family on public.tasks;

create policy tasks_select_members on public.tasks for select to authenticated using (
  public.is_wedding_member(wedding_id) and public.wedding_role(wedding_id) is distinct from 'friend'
);
create policy tasks_select_friend on public.tasks for select to authenticated using (
  public.wedding_role(wedding_id) = 'friend' and assigned_to = auth.uid()
);
create policy tasks_insert_managers on public.tasks for insert to authenticated with check (
  public.wedding_role(wedding_id) in ('bride', 'groom', 'planner')
);
create policy tasks_insert_family on public.tasks for insert to authenticated with check (
  public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id)
);
create policy tasks_update_managers on public.tasks for update to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'))
  with check (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'));
create policy tasks_update_family on public.tasks for update to authenticated
  using (public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id))
  with check (public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id));
create policy tasks_update_friend on public.tasks for update to authenticated
  using (public.wedding_role(wedding_id) = 'friend' and assigned_to = auth.uid())
  with check (public.wedding_role(wedding_id) = 'friend' and assigned_to = auth.uid());
create policy tasks_delete_managers on public.tasks for delete to authenticated using (
  public.wedding_role(wedding_id) in ('bride', 'groom', 'planner')
);
create policy tasks_delete_family on public.tasks for delete to authenticated using (
  public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id)
);

drop policy if exists budget_member_all on public.budget_items;
drop policy if exists budget_select on public.budget_items;
drop policy if exists budget_insert on public.budget_items;
drop policy if exists budget_update on public.budget_items;
drop policy if exists budget_delete on public.budget_items;
drop policy if exists budget_select_allowed on public.budget_items;
drop policy if exists budget_write_couple on public.budget_items;
create policy budget_select_allowed on public.budget_items for select to authenticated using (
  public.wedding_role(wedding_id) in ('bride', 'groom', 'family', 'planner')
);
create policy budget_write_couple on public.budget_items for all to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom'))
  with check (public.wedding_role(wedding_id) in ('bride', 'groom'));

drop policy if exists splits_member_all on public.budget_splits;
drop policy if exists splits_select on public.budget_splits;
drop policy if exists splits_write on public.budget_splits;
drop policy if exists splits_select_allowed on public.budget_splits;
drop policy if exists splits_write_couple on public.budget_splits;
create policy splits_select_allowed on public.budget_splits for select to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id
      and public.wedding_role(b.wedding_id) in ('bride', 'groom', 'family', 'planner')
  )
);
create policy splits_write_couple on public.budget_splits for all to authenticated
  using (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.wedding_role(b.wedding_id) in ('bride', 'groom')
    )
  )
  with check (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.wedding_role(b.wedding_id) in ('bride', 'groom')
    )
  );

drop policy if exists payments_member_all on public.part_payments;
drop policy if exists payments_select on public.part_payments;
drop policy if exists payments_write on public.part_payments;
drop policy if exists payments_select_allowed on public.part_payments;
drop policy if exists payments_insert_side on public.part_payments;
drop policy if exists payments_write_couple on public.part_payments;
create policy payments_select_allowed on public.part_payments for select to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id
      and public.wedding_role(b.wedding_id) in ('bride', 'groom', 'family', 'planner')
  )
);
create policy payments_insert_side on public.part_payments for insert to authenticated with check (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id
      and (
        public.wedding_role(b.wedding_id) in ('bride', 'groom')
        or (
          public.wedding_role(b.wedding_id) = 'family'
          and part_payments.paid_by_side = public.member_side(b.wedding_id)
        )
      )
  )
);
create policy payments_write_couple on public.part_payments for update to authenticated
  using (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.wedding_role(b.wedding_id) in ('bride', 'groom')
    )
  )
  with check (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.wedding_role(b.wedding_id) in ('bride', 'groom')
    )
  );
drop policy if exists payments_delete_couple on public.part_payments;
create policy payments_delete_couple on public.part_payments for delete to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id and public.wedding_role(b.wedding_id) in ('bride', 'groom')
  )
);

drop policy if exists guests_member_all on public.guests;
drop policy if exists guests_select on public.guests;
drop policy if exists guests_insert on public.guests;
drop policy if exists guests_update on public.guests;
drop policy if exists guests_delete on public.guests;
drop policy if exists guests_select_open on public.guests;
drop policy if exists guests_select_side on public.guests;
drop policy if exists guests_write_open on public.guests;
drop policy if exists guests_write_family on public.guests;
create policy guests_select_open on public.guests for select to authenticated using (
  public.wedding_role(wedding_id) in ('bride', 'groom', 'planner')
);
create policy guests_select_side on public.guests for select to authenticated using (
  public.wedding_role(wedding_id) in ('family', 'friend') and side = public.member_side(wedding_id)
);
create policy guests_write_open on public.guests for all to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'))
  with check (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'));
create policy guests_write_family on public.guests for all to authenticated
  using (public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id))
  with check (public.wedding_role(wedding_id) = 'family' and side = public.member_side(wedding_id));

drop policy if exists timeline_member_all on public.timeline_events;
drop policy if exists timeline_select on public.timeline_events;
drop policy if exists timeline_insert on public.timeline_events;
drop policy if exists timeline_update on public.timeline_events;
drop policy if exists timeline_delete on public.timeline_events;
drop policy if exists timeline_select_members on public.timeline_events;
drop policy if exists timeline_write_editors on public.timeline_events;
create policy timeline_select_members on public.timeline_events for select to authenticated using (
  public.is_wedding_member(wedding_id)
);
create policy timeline_write_editors on public.timeline_events for all to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'))
  with check (public.wedding_role(wedding_id) in ('bride', 'groom', 'planner'));

drop policy if exists feed_select on public.wedding_feed;
drop policy if exists feed_insert on public.wedding_feed;
create policy feed_select on public.wedding_feed for select to authenticated using (
  public.is_wedding_member(wedding_id)
);
create policy feed_insert on public.wedding_feed for insert to authenticated with check (
  author_id = auth.uid()
  and public.wedding_role(wedding_id) in ('bride', 'groom', 'family', 'planner')
);

drop policy if exists members_update_couple on public.wedding_members;
create policy members_update_couple on public.wedding_members for update to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom') or user_id = auth.uid())
  with check (public.wedding_role(wedding_id) in ('bride', 'groom') or user_id = auth.uid());

drop policy if exists invites_member_all on public.wedding_invites;
drop policy if exists invites_select on public.wedding_invites;
drop policy if exists invites_insert on public.wedding_invites;
drop policy if exists invites_update on public.wedding_invites;
drop policy if exists invites_delete on public.wedding_invites;
drop policy if exists invites_select_allowed on public.wedding_invites;
drop policy if exists invites_write_allowed on public.wedding_invites;
create policy invites_select_allowed on public.wedding_invites for select to authenticated using (
  public.wedding_role(wedding_id) in ('bride', 'groom', 'family')
);
create policy invites_write_allowed on public.wedding_invites for all to authenticated
  using (public.wedding_role(wedding_id) in ('bride', 'groom', 'family'))
  with check (public.wedding_role(wedding_id) in ('bride', 'groom', 'family'));

grant select, insert on public.wedding_feed to authenticated;

create or replace function public.create_wedding(
  p_couple_names text,
  p_wedding_date date,
  p_side text,
  p_display_name text,
  p_city text default ''
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_id uuid;
  clean_side text := lower(trim(p_side));
  clean_city text := left(trim(coalesce(p_city, '')), 80);
begin
  if auth.uid() is null then raise exception 'sign in before creating a wedding'; end if;
  if clean_side not in ('bride', 'groom') then raise exception 'side must be bride or groom'; end if;
  if length(trim(p_couple_names)) = 0 then raise exception 'couple names are required'; end if;
  if length(trim(p_display_name)) = 0 then raise exception 'your name is required'; end if;
  if length(clean_city) = 0 then raise exception 'city is required'; end if;
  insert into public.weddings (couple_names, wedding_date, city, created_by)
  values (trim(p_couple_names), p_wedding_date, clean_city, auth.uid())
  returning id into new_id;
  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (new_id, auth.uid(), clean_side, clean_side, trim(p_display_name));
  return new_id;
end;
$$;

create or replace function public.create_invite(p_wedding_id uuid, p_role text, p_side text)
returns text language plpgsql security definer set search_path = public as $$
declare
  actor text := public.wedding_role(p_wedding_id);
  actor_side text := public.member_side(p_wedding_id);
  clean_role text := lower(trim(p_role));
  clean_side text := nullif(lower(trim(coalesce(p_side, ''))), '');
  new_code text;
  attempt int := 0;
begin
  if auth.uid() is null then raise exception 'sign in before inviting someone'; end if;
  if actor is null or actor in ('friend', 'planner') then
    raise exception 'you cannot invite anyone';
  end if;
  if clean_role not in ('bride', 'groom', 'family', 'friend', 'planner') then
    raise exception 'unknown role';
  end if;
  if actor = 'family' then
    if clean_role not in ('family', 'friend') then
      raise exception 'family can invite family and friends only';
    end if;
    if clean_side is distinct from actor_side then
      raise exception 'family can invite only to their own side';
    end if;
  end if;
  if clean_role = 'bride' then
    clean_side := 'bride';
    if exists (select 1 from public.wedding_members where wedding_id = p_wedding_id and role = 'bride') then
      raise exception 'This wedding already has a bride. Ask them for a family or friend invite.';
    end if;
  elsif clean_role = 'groom' then
    clean_side := 'groom';
    if exists (select 1 from public.wedding_members where wedding_id = p_wedding_id and role = 'groom') then
      raise exception 'This wedding already has a groom. Ask them for a family or friend invite.';
    end if;
  elsif clean_role = 'planner' then
    clean_side := null;
  elsif clean_side not in ('bride', 'groom') then
    raise exception 'pick a side before joining';
  end if;
  if actor not in ('bride', 'groom', 'family') then
    raise exception 'you cannot invite anyone';
  end if;
  loop
    attempt := attempt + 1;
    new_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.wedding_invites where token = new_code);
    if attempt > 20 then raise exception 'could not create an invite code'; end if;
  end loop;
  insert into public.wedding_invites (wedding_id, token, role, side, created_by, expires_at)
  values (p_wedding_id, new_code, clean_role, clean_side, auth.uid(), now() + interval '30 days');
  return new_code;
end;
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invite public.wedding_invites%rowtype;
  clean text := trim(p_token);
begin
  if auth.uid() is null then raise exception 'sign in before accepting an invite'; end if;
  if clean !~ '^[0-9]{6}$' then raise exception 'enter the 6-digit invite code'; end if;
  select * into invite from public.wedding_invites
  where token = clean and accepted_at is null and (expires_at is null or expires_at > now())
  for update;
  if invite.id is null then raise exception 'this invite is invalid, expired, or already used'; end if;
  if invite.role in ('family', 'friend') and invite.side is null then
    raise exception 'pick a side before joining';
  end if;
  if invite.role = 'bride' and exists (
    select 1 from public.wedding_members where wedding_id = invite.wedding_id and role = 'bride'
  ) then
    raise exception 'This wedding already has a bride. Ask them for a family or friend invite.';
  end if;
  if invite.role = 'groom' and exists (
    select 1 from public.wedding_members where wedding_id = invite.wedding_id and role = 'groom'
  ) then
    raise exception 'This wedding already has a groom. Ask them for a family or friend invite.';
  end if;
  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (
    invite.wedding_id,
    auth.uid(),
    invite.role,
    case when invite.role = 'planner' then null else invite.side end,
    coalesce(nullif(trim(auth.jwt() ->> 'display_name'), ''), nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''), 'Family')
  )
  on conflict (wedding_id, user_id) do update
    set role = excluded.role, side = excluded.side;
  update public.wedding_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite.id;
  return invite.wedding_id;
end;
$$;

create or replace function public.parent_dashboard(p_wedding_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  actor text := public.wedding_role(p_wedding_id);
  actor_side text := public.member_side(p_wedding_id);
begin
  if actor is distinct from 'family' then
    raise exception 'the parent dashboard is for a parent or family member';
  end if;
  return jsonb_build_object(
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'title', t.title, 'side', t.side))
      from public.tasks t
      where t.wedding_id = p_wedding_id and t.side = actor_side
    ), '[]'::jsonb),
    'guests', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'side', g.side))
      from public.guests g
      where g.wedding_id = p_wedding_id and g.side = actor_side
    ), '[]'::jsonb),
    'budget_share', coalesce((
      select sum(b.estimated * s.pct / 100)
      from public.budget_splits s
      join public.budget_items b on b.id = s.budget_item_id
      where b.wedding_id = p_wedding_id and b.currency = 'INR' and s.side = actor_side
    ), 0),
    'feed', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'body', f.body))
      from public.wedding_feed f
      where f.wedding_id = p_wedding_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.release_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  membership record;
begin
  update public.tasks t
  set assigned_to = null
  from public.wedding_members m
  where m.user_id = p_user_id
    and m.role in ('family', 'friend', 'planner')
    and t.wedding_id = m.wedding_id
    and t.assigned_to = p_user_id;

  for membership in
    select wedding_id, role from public.wedding_members
    where user_id = p_user_id and role in ('bride', 'groom')
  loop
    if membership.role = 'bride'
      and not exists (
        select 1 from public.wedding_members
        where wedding_id = membership.wedding_id and role = 'groom'
      )
    then
      delete from public.weddings where id = membership.wedding_id;
    elsif membership.role = 'groom'
      and not exists (
        select 1 from public.wedding_members
        where wedding_id = membership.wedding_id and role = 'bride'
      )
    then
      delete from public.weddings where id = membership.wedding_id;
    else
      delete from public.wedding_members
      where wedding_id = membership.wedding_id and user_id = p_user_id;
    end if;
  end loop;

  delete from public.wedding_members
  where user_id = p_user_id and role in ('family', 'friend', 'planner');
end;
$$;

revoke all on function public.create_invite(uuid, text, text) from public;
revoke all on function public.accept_invite(text) from public;
revoke all on function public.parent_dashboard(uuid) from public;
revoke all on function public.release_account(uuid) from public, anon, authenticated;
grant execute on function public.create_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.parent_dashboard(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.release_account(uuid) to service_role;
  end if;
end $$;
