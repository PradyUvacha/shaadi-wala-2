-- Price survey: save the open amount first, then Yes or No. Leaving unassigns tasks
-- and keeps the member's side. Apply after 20261026250000_members_assignment.sql.
-- Safe to run again. This file has not been applied to the hosted project from this repo.

drop trigger if exists survey_responses_guard_trigger on public.survey_responses;

alter table public.survey_responses drop constraint if exists survey_responses_payload;
alter table public.survey_responses add constraint survey_responses_payload
  check (
    (
      dismissed
      and nps_score is null
      and price_choice is null
      and (willingness is null or char_length(btrim(willingness)) = 0)
      and (comment is null or char_length(btrim(comment)) = 0)
    )
    or (
      not dismissed
      and kind = 'nps'
      and nps_score is not null
      and price_choice is null
      and willingness is null
    )
    or (
      not dismissed
      and kind = 'price'
      and nps_score is null
      and willingness is not null
      and char_length(btrim(willingness)) > 0
    )
  );

-- A previous Maybe is not a Yes or a No. Ask that question again.
update public.survey_responses
set price_choice = null
where price_choice = 'maybe';

alter table public.survey_responses drop constraint if exists survey_responses_price_choice_values;
alter table public.survey_responses add constraint survey_responses_price_choice_values
  check (price_choice is null or price_choice in ('yes', 'no'));

create or replace function public.survey_responses_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  amount bigint;
begin
  if tg_op = 'UPDATE' then
    if old.id is distinct from new.id
      or old.user_id is distinct from new.user_id
      or old.kind is distinct from new.kind
      or old.prompt is distinct from new.prompt
      or old.nps_score is distinct from new.nps_score
      or old.comment is distinct from new.comment
      or old.willingness is distinct from new.willingness
      or old.dismissed is distinct from new.dismissed
      or old.created_at is distinct from new.created_at
      or old.price_choice is not null
      or new.kind is distinct from 'price'
      or new.dismissed
      or new.price_choice is null
      or new.price_choice not in ('yes', 'no')
    then
      raise exception 'this survey answer is locked';
    end if;
  end if;

  if new.kind = 'price' and not new.dismissed then
    if new.willingness is null or new.willingness !~ '^[0-9]{1,7}$' then
      raise exception 'enter an amount from 0 to 1000000 rupees, digits only';
    end if;
    amount := new.willingness::bigint;
    if amount < 0 or amount > 1000000 then
      raise exception 'enter an amount from 0 to 1000000 rupees, digits only';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists survey_responses_guard_trigger on public.survey_responses;
create trigger survey_responses_guard_trigger
before insert or update on public.survey_responses
for each row execute function public.survey_responses_guard();

revoke all on function public.survey_responses_guard() from public;
grant execute on function public.survey_responses_guard() to authenticated;

drop policy if exists survey_responses_update on public.survey_responses;
create policy survey_responses_update on public.survey_responses
for update to authenticated
using (
  user_id = auth.uid()
  and kind = 'price'
  and not dismissed
  and price_choice is null
)
with check (
  user_id = auth.uid()
  and kind = 'price'
  and not dismissed
  and price_choice in ('yes', 'no')
);

revoke all on table public.survey_responses from public, anon, authenticated;
grant select, insert on table public.survey_responses to authenticated;
grant update (price_choice) on table public.survey_responses to authenticated;

-- Called only from leave_wedding and remove_wedding_member. Clients cannot execute it,
-- so a friend still cannot unassign a task by hand.
create or replace function public.release_member_tasks(p_wedding_id uuid, p_user_id uuid, p_side text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  alter table public.tasks disable trigger tasks_protect_assignment;
  begin
    update public.tasks
    set assigned_to = null,
        side = case when p_side in ('bride', 'groom') then p_side else side end
    where wedding_id = p_wedding_id and assigned_to = p_user_id;
    alter table public.tasks enable trigger tasks_protect_assignment;
  exception
    when others then
      alter table public.tasks enable trigger tasks_protect_assignment;
      raise;
  end;
end;
$$;

revoke all on function public.release_member_tasks(uuid, uuid, text) from public, anon, authenticated;

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

  perform public.release_member_tasks(p_wedding_id, actor, membership.side);

  delete from public.wedding_members where id = membership.id;
end;
$$;

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

  perform public.release_member_tasks(target.wedding_id, target.user_id, target.side);

  delete from public.wedding_members where id = target.id;
end;
$$;

revoke all on function public.leave_wedding(uuid) from public, anon;
revoke all on function public.remove_wedding_member(uuid) from public, anon;
grant execute on function public.leave_wedding(uuid) to authenticated;
grant execute on function public.remove_wedding_member(uuid) to authenticated;
