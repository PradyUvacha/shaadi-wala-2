-- Table-driven permissions. Apply after 20261026150000_roles.sql. Safe to run again.
-- The rows are the matrix Prathamesh approved on 26 Oct 2026. Change this insert
-- to change who can do what. Re-apply this file if roles.sql is applied after it.
--
-- scope: all (every row), own_side (row side = member side), assigned (assigned_to = caller), none.

create table if not exists public.role_permissions (
  role text not null,
  action text not null,
  scope text not null check (scope in ('all', 'own_side', 'assigned', 'none')),
  primary key (role, action)
);
alter table public.role_permissions enable row level security;

insert into public.role_permissions (role, action, scope) values
  ('bride', 'tasks.view', 'all'),
  ('groom', 'tasks.view', 'all'),
  ('family', 'tasks.view', 'all'),
  ('friend', 'tasks.view', 'assigned'),
  ('planner', 'tasks.view', 'all'),
  ('bride', 'tasks.edit', 'all'),
  ('groom', 'tasks.edit', 'all'),
  ('family', 'tasks.edit', 'own_side'),
  ('friend', 'tasks.edit', 'assigned'),
  ('planner', 'tasks.edit', 'all'),
  ('bride', 'tasks.delete', 'all'),
  ('groom', 'tasks.delete', 'all'),
  ('family', 'tasks.delete', 'own_side'),
  ('friend', 'tasks.delete', 'none'),
  ('planner', 'tasks.delete', 'all'),
  ('bride', 'budget.view', 'all'),
  ('groom', 'budget.view', 'all'),
  ('family', 'budget.view', 'all'),
  ('friend', 'budget.view', 'none'),
  ('planner', 'budget.view', 'all'),
  ('bride', 'budget.edit', 'all'),
  ('groom', 'budget.edit', 'all'),
  ('family', 'budget.edit', 'none'),
  ('friend', 'budget.edit', 'none'),
  ('planner', 'budget.edit', 'none'),
  ('bride', 'budget.pay', 'all'),
  ('groom', 'budget.pay', 'all'),
  ('family', 'budget.pay', 'own_side'),
  ('friend', 'budget.pay', 'none'),
  ('planner', 'budget.pay', 'none'),
  ('bride', 'guests.view', 'all'),
  ('groom', 'guests.view', 'all'),
  ('family', 'guests.view', 'own_side'),
  ('friend', 'guests.view', 'own_side'),
  ('planner', 'guests.view', 'all'),
  ('bride', 'guests.edit', 'all'),
  ('groom', 'guests.edit', 'all'),
  ('family', 'guests.edit', 'own_side'),
  ('friend', 'guests.edit', 'none'),
  ('planner', 'guests.edit', 'all'),
  ('bride', 'timeline.view', 'all'),
  ('groom', 'timeline.view', 'all'),
  ('family', 'timeline.view', 'all'),
  ('friend', 'timeline.view', 'all'),
  ('planner', 'timeline.view', 'all'),
  ('bride', 'timeline.edit', 'all'),
  ('groom', 'timeline.edit', 'all'),
  ('family', 'timeline.edit', 'none'),
  ('friend', 'timeline.edit', 'none'),
  ('planner', 'timeline.edit', 'all'),
  ('bride', 'feed.read', 'all'),
  ('groom', 'feed.read', 'all'),
  ('family', 'feed.read', 'all'),
  ('friend', 'feed.read', 'all'),
  ('planner', 'feed.read', 'all'),
  ('bride', 'feed.post', 'all'),
  ('groom', 'feed.post', 'all'),
  ('family', 'feed.post', 'all'),
  ('friend', 'feed.post', 'none'),
  ('planner', 'feed.post', 'all'),
  ('bride', 'invites.create', 'all'),
  ('groom', 'invites.create', 'all'),
  ('family', 'invites.create', 'own_side'),
  ('friend', 'invites.create', 'none'),
  ('planner', 'invites.create', 'none'),
  ('bride', 'members.change_side', 'all'),
  ('groom', 'members.change_side', 'all'),
  ('family', 'members.change_side', 'none'),
  ('friend', 'members.change_side', 'none'),
  ('planner', 'members.change_side', 'none'),
  ('bride', 'wedding.edit', 'all'),
  ('groom', 'wedding.edit', 'all'),
  ('family', 'wedding.edit', 'none'),
  ('friend', 'wedding.edit', 'none'),
  ('planner', 'wedding.edit', 'none'),
  ('bride', 'wedding.delete', 'all'),
  ('groom', 'wedding.delete', 'all'),
  ('family', 'wedding.delete', 'none'),
  ('friend', 'wedding.delete', 'none'),
  ('planner', 'wedding.delete', 'none'),
  ('bride', 'dashboard.view', 'none'),
  ('groom', 'dashboard.view', 'none'),
  ('family', 'dashboard.view', 'all'),
  ('friend', 'dashboard.view', 'none'),
  ('planner', 'dashboard.view', 'none')
on conflict (role, action) do update set scope = excluded.scope;

create or replace function public.permission_scope(p_wedding_id uuid, p_action text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((
    select scope from public.role_permissions
    where role = public.wedding_role(p_wedding_id) and action = p_action
  ), 'none')
$$;

create or replace function public.has_permission(p_wedding_id uuid, p_action text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.permission_scope(p_wedding_id, p_action) <> 'none'
$$;

revoke all on function public.permission_scope(uuid, text) from public;
revoke all on function public.has_permission(uuid, text) from public;
grant execute on function public.permission_scope(uuid, text) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;

create or replace function public.protect_member_keys()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id = old.id;
  new.user_id = old.user_id;
  new.wedding_id = old.wedding_id;
  if new.role is distinct from old.role or new.side is distinct from old.side then
    if not public.has_permission(old.wedding_id, 'members.change_side') then
      raise exception 'only the bride or groom can change a member''s side';
    end if;
  end if;
  if new.role = 'bride' then
    new.side = 'bride';
  elsif new.role = 'groom' then
    new.side = 'groom';
  elsif new.role = 'planner' then
    new.side = null;
  elsif new.role in ('family', 'friend') and (new.side is null or new.side not in ('bride', 'groom')) then
    raise exception 'pick a side before joining';
  end if;
  return new;
end;
$$;

create or replace function public.protect_task_update()
returns trigger language plpgsql security definer set search_path = public as $$
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
      or new.wedding_id is distinct from old.wedding_id
    then
      raise exception 'friends can only complete tasks assigned to them';
    end if;
    return new;
  end if;
  raise exception 'no task access';
end;
$$;

drop policy if exists weddings_update_couple on public.weddings;
drop policy if exists weddings_update_by_permission on public.weddings;
create policy weddings_update_by_permission on public.weddings for update to authenticated
  using (public.has_permission(id, 'wedding.edit'))
  with check (public.has_permission(id, 'wedding.edit'));

drop policy if exists tasks_select_members on public.tasks;
drop policy if exists tasks_select_friend on public.tasks;
drop policy if exists tasks_insert_managers on public.tasks;
drop policy if exists tasks_insert_family on public.tasks;
drop policy if exists tasks_update_managers on public.tasks;
drop policy if exists tasks_update_family on public.tasks;
drop policy if exists tasks_update_friend on public.tasks;
drop policy if exists tasks_delete_managers on public.tasks;
drop policy if exists tasks_delete_family on public.tasks;
drop policy if exists tasks_select_by_permission on public.tasks;
drop policy if exists tasks_insert_by_permission on public.tasks;
drop policy if exists tasks_update_by_permission on public.tasks;
drop policy if exists tasks_delete_by_permission on public.tasks;

create policy tasks_select_by_permission on public.tasks for select to authenticated using (
  case public.permission_scope(wedding_id, 'tasks.view')
    when 'all' then true
    when 'own_side' then side = public.member_side(wedding_id)
    when 'assigned' then assigned_to = auth.uid()
    else false
  end
);
create policy tasks_insert_by_permission on public.tasks for insert to authenticated with check (
  case public.permission_scope(wedding_id, 'tasks.edit')
    when 'all' then true
    when 'own_side' then side = public.member_side(wedding_id)
    else false
  end
);
create policy tasks_update_by_permission on public.tasks for update to authenticated
  using (
    case public.permission_scope(wedding_id, 'tasks.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id)
      when 'assigned' then assigned_to = auth.uid()
      else false
    end
  )
  with check (
    case public.permission_scope(wedding_id, 'tasks.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id)
      when 'assigned' then assigned_to = auth.uid()
      else false
    end
  );
create policy tasks_delete_by_permission on public.tasks for delete to authenticated using (
  case public.permission_scope(wedding_id, 'tasks.delete')
    when 'all' then true
    when 'own_side' then side = public.member_side(wedding_id)
    else false
  end
);

drop policy if exists budget_select_allowed on public.budget_items;
drop policy if exists budget_write_couple on public.budget_items;
drop policy if exists budget_select_by_permission on public.budget_items;
drop policy if exists budget_write_by_permission on public.budget_items;
create policy budget_select_by_permission on public.budget_items for select to authenticated using (
  public.permission_scope(wedding_id, 'budget.view') = 'all'
);
create policy budget_write_by_permission on public.budget_items for all to authenticated
  using (public.permission_scope(wedding_id, 'budget.edit') = 'all')
  with check (public.permission_scope(wedding_id, 'budget.edit') = 'all');

drop policy if exists splits_select_allowed on public.budget_splits;
drop policy if exists splits_write_couple on public.budget_splits;
drop policy if exists splits_select_by_permission on public.budget_splits;
drop policy if exists splits_write_by_permission on public.budget_splits;
create policy splits_select_by_permission on public.budget_splits for select to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.view') = 'all'
  )
);
create policy splits_write_by_permission on public.budget_splits for all to authenticated
  using (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.edit') = 'all'
    )
  )
  with check (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.edit') = 'all'
    )
  );

drop policy if exists payments_select_allowed on public.part_payments;
drop policy if exists payments_insert_side on public.part_payments;
drop policy if exists payments_write_couple on public.part_payments;
drop policy if exists payments_delete_couple on public.part_payments;
drop policy if exists payments_select_by_permission on public.part_payments;
drop policy if exists payments_insert_by_permission on public.part_payments;
drop policy if exists payments_update_by_permission on public.part_payments;
drop policy if exists payments_delete_by_permission on public.part_payments;
create policy payments_select_by_permission on public.part_payments for select to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.view') = 'all'
  )
);
create policy payments_insert_by_permission on public.part_payments for insert to authenticated with check (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id
      and (
        public.permission_scope(b.wedding_id, 'budget.pay') = 'all'
        or (
          public.permission_scope(b.wedding_id, 'budget.pay') = 'own_side'
          and part_payments.paid_by_side = public.member_side(b.wedding_id)
        )
      )
  )
);
create policy payments_update_by_permission on public.part_payments for update to authenticated
  using (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.edit') = 'all'
    )
  )
  with check (
    exists (
      select 1 from public.budget_items b
      where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.edit') = 'all'
    )
  );
create policy payments_delete_by_permission on public.part_payments for delete to authenticated using (
  exists (
    select 1 from public.budget_items b
    where b.id = budget_item_id and public.permission_scope(b.wedding_id, 'budget.edit') = 'all'
  )
);

drop policy if exists guests_select_open on public.guests;
drop policy if exists guests_select_side on public.guests;
drop policy if exists guests_write_open on public.guests;
drop policy if exists guests_write_family on public.guests;
drop policy if exists guests_select_by_permission on public.guests;
drop policy if exists guests_write_by_permission on public.guests;
create policy guests_select_by_permission on public.guests for select to authenticated using (
  case public.permission_scope(wedding_id, 'guests.view')
    when 'all' then true
    when 'own_side' then side = public.member_side(wedding_id)
    else false
  end
);
create policy guests_write_by_permission on public.guests for all to authenticated
  using (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id)
      else false
    end
  )
  with check (
    case public.permission_scope(wedding_id, 'guests.edit')
      when 'all' then true
      when 'own_side' then side = public.member_side(wedding_id)
      else false
    end
  );

drop policy if exists timeline_select_members on public.timeline_events;
drop policy if exists timeline_write_editors on public.timeline_events;
drop policy if exists timeline_select_by_permission on public.timeline_events;
drop policy if exists timeline_write_by_permission on public.timeline_events;
create policy timeline_select_by_permission on public.timeline_events for select to authenticated using (
  public.permission_scope(wedding_id, 'timeline.view') = 'all'
);
create policy timeline_write_by_permission on public.timeline_events for all to authenticated
  using (public.permission_scope(wedding_id, 'timeline.edit') = 'all')
  with check (public.permission_scope(wedding_id, 'timeline.edit') = 'all');

drop policy if exists feed_select on public.wedding_feed;
drop policy if exists feed_insert on public.wedding_feed;
drop policy if exists feed_select_by_permission on public.wedding_feed;
drop policy if exists feed_insert_by_permission on public.wedding_feed;
create policy feed_select_by_permission on public.wedding_feed for select to authenticated using (
  public.permission_scope(wedding_id, 'feed.read') = 'all'
);
create policy feed_insert_by_permission on public.wedding_feed for insert to authenticated with check (
  author_id = auth.uid() and public.has_permission(wedding_id, 'feed.post')
);

drop policy if exists members_update_couple on public.wedding_members;
drop policy if exists members_update_by_permission on public.wedding_members;
create policy members_update_by_permission on public.wedding_members for update to authenticated
  using (public.has_permission(wedding_id, 'members.change_side') or user_id = auth.uid())
  with check (public.has_permission(wedding_id, 'members.change_side') or user_id = auth.uid());

drop policy if exists invites_select_allowed on public.wedding_invites;
drop policy if exists invites_write_allowed on public.wedding_invites;
drop policy if exists invites_select_by_permission on public.wedding_invites;
drop policy if exists invites_write_by_permission on public.wedding_invites;
create policy invites_select_by_permission on public.wedding_invites for select to authenticated using (
  public.has_permission(wedding_id, 'invites.create')
);
create policy invites_write_by_permission on public.wedding_invites for all to authenticated
  using (public.has_permission(wedding_id, 'invites.create'))
  with check (public.has_permission(wedding_id, 'invites.create'));

alter table public.wedding_members drop constraint if exists wedding_members_role_shape;
alter table public.wedding_members add constraint wedding_members_role_shape check (
  (role = 'bride' and side = 'bride')
  or (role = 'groom' and side = 'groom')
  or (role in ('family', 'friend') and side is not null and side in ('bride', 'groom'))
  or (role = 'planner' and side is null)
);

alter table public.wedding_invites drop constraint if exists wedding_invites_role_shape;
alter table public.wedding_invites add constraint wedding_invites_role_shape check (
  role in ('bride', 'groom', 'family', 'friend', 'planner', 'open')
);

create or replace function public.create_invite(p_wedding_id uuid, p_role text, p_side text)
returns text language plpgsql security definer set search_path = public as $$
declare
  actor text := public.wedding_role(p_wedding_id);
  actor_side text := public.member_side(p_wedding_id);
  invite_scope text := public.permission_scope(p_wedding_id, 'invites.create');
  clean_role text := lower(trim(p_role));
  clean_side text := nullif(lower(trim(coalesce(p_side, ''))), '');
  new_code text;
  attempt int := 0;
begin
  if auth.uid() is null then raise exception 'sign in before inviting someone'; end if;
  if not public.has_permission(p_wedding_id, 'invites.create') then
    raise exception 'you cannot invite anyone';
  end if;
  if clean_role not in ('bride', 'groom', 'family', 'friend', 'planner', 'open') then
    raise exception 'unknown role';
  end if;
  if invite_scope = 'own_side' then
    if clean_role not in ('family', 'friend', 'open') then
      raise exception 'family can invite family and friends only';
    end if;
    if clean_side is not null and clean_side is distinct from actor_side then
      raise exception 'family can invite only to their own side';
    end if;
    clean_side := actor_side;
  end if;
  if clean_role = 'open' then
    if actor in ('bride', 'groom') then
      clean_side := null;
    end if;
  elsif clean_role = 'bride' then
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

drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(p_token text, p_role text default null, p_side text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  invite public.wedding_invites%rowtype;
  inviter text;
  clean text := trim(p_token);
  chosen_role text := lower(trim(coalesce(p_role, '')));
  chosen_side text := nullif(lower(trim(coalesce(p_side, ''))), '');
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

  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (
    invite.wedding_id,
    auth.uid(),
    chosen_role,
    chosen_side,
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
  actor_side text := public.member_side(p_wedding_id);
begin
  if not public.has_permission(p_wedding_id, 'dashboard.view') then
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

revoke all on function public.create_invite(uuid, text, text) from public;
revoke all on function public.accept_invite(text, text, text) from public;
revoke all on function public.parent_dashboard(uuid) from public;
grant execute on function public.create_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_invite(text, text, text) to authenticated;
grant execute on function public.parent_dashboard(uuid) to authenticated;
