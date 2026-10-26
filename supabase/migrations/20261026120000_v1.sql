-- v1: ceremonies, city, owner/editor/viewer, invites, feedback rating.
-- Apply after 20261024180000_init.sql.

alter table public.weddings add column if not exists city text not null default '';
alter table public.tasks add column if not exists ceremony text not null default 'Wedding';
alter table public.ritual_template_items add column if not exists ceremony text not null default 'Wedding';
alter table public.feedback add column if not exists rating smallint;

alter table public.tasks drop constraint if exists tasks_ceremony_check;
alter table public.tasks add constraint tasks_ceremony_check check (
  ceremony in ('Roka', 'Sagai', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Vidaai', 'Reception')
);
alter table public.ritual_template_items drop constraint if exists ritual_template_items_ceremony_check;
alter table public.ritual_template_items add constraint ritual_template_items_ceremony_check check (
  ceremony in ('Roka', 'Sagai', 'Haldi', 'Mehendi', 'Sangeet', 'Wedding', 'Vidaai', 'Reception')
);
alter table public.feedback drop constraint if exists feedback_rating_check;
alter table public.feedback add constraint feedback_rating_check check (rating is null or rating between 1 and 5);

do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'wedding_members' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.wedding_members drop constraint %I', constraint_name);
  end loop;
  for constraint_name in
    select con.conname from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'wedding_invites' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.wedding_invites drop constraint %I', constraint_name);
  end loop;
end $$;

update public.wedding_members set role = 'editor' where role = 'partner';
update public.wedding_members set role = 'viewer' where role = 'family';
update public.wedding_invites set role = 'editor' where role = 'partner';
update public.wedding_invites set role = 'viewer' where role = 'family';

alter table public.wedding_members add constraint wedding_members_role_check check (role in ('owner', 'editor', 'viewer'));
alter table public.wedding_invites add constraint wedding_invites_role_check check (role in ('editor', 'viewer'));

create or replace function public.wedding_role(p_wedding_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.wedding_members
  where wedding_id = p_wedding_id and user_id = auth.uid()
  limit 1
$$;

create or replace function public.can_edit_wedding(p_wedding_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.wedding_role(p_wedding_id) in ('owner', 'editor')
$$;

revoke all on function public.wedding_role(uuid) from public;
revoke all on function public.can_edit_wedding(uuid) from public;
grant execute on function public.wedding_role(uuid) to authenticated;
grant execute on function public.can_edit_wedding(uuid) to authenticated;

drop policy if exists weddings_update on public.weddings;
create policy weddings_update_editor on public.weddings for update to authenticated
  using (public.can_edit_wedding(id)) with check (public.can_edit_wedding(id));

drop policy if exists tasks_member_all on public.tasks;
create policy tasks_select on public.tasks for select to authenticated using (public.is_wedding_member(wedding_id));
create policy tasks_insert on public.tasks for insert to authenticated with check (public.can_edit_wedding(wedding_id));
create policy tasks_update on public.tasks for update to authenticated using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
create policy tasks_delete on public.tasks for delete to authenticated using (public.can_edit_wedding(wedding_id));

drop policy if exists budget_member_all on public.budget_items;
create policy budget_select on public.budget_items for select to authenticated using (public.is_wedding_member(wedding_id));
create policy budget_insert on public.budget_items for insert to authenticated with check (public.can_edit_wedding(wedding_id));
create policy budget_update on public.budget_items for update to authenticated using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
create policy budget_delete on public.budget_items for delete to authenticated using (public.can_edit_wedding(wedding_id));

drop policy if exists splits_member_all on public.budget_splits;
create policy splits_select on public.budget_splits for select to authenticated using (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.is_wedding_member(b.wedding_id))
);
create policy splits_write on public.budget_splits for all to authenticated using (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.can_edit_wedding(b.wedding_id))
) with check (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.can_edit_wedding(b.wedding_id))
);

drop policy if exists payments_member_all on public.part_payments;
create policy payments_select on public.part_payments for select to authenticated using (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.is_wedding_member(b.wedding_id))
);
create policy payments_write on public.part_payments for all to authenticated using (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.can_edit_wedding(b.wedding_id))
) with check (
  exists (select 1 from public.budget_items b where b.id = budget_item_id and public.can_edit_wedding(b.wedding_id))
);

drop policy if exists guests_member_all on public.guests;
create policy guests_select on public.guests for select to authenticated using (public.is_wedding_member(wedding_id));
create policy guests_insert on public.guests for insert to authenticated with check (public.can_edit_wedding(wedding_id));
create policy guests_update on public.guests for update to authenticated using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
create policy guests_delete on public.guests for delete to authenticated using (public.can_edit_wedding(wedding_id));

drop policy if exists timeline_member_all on public.timeline_events;
create policy timeline_select on public.timeline_events for select to authenticated using (public.is_wedding_member(wedding_id));
create policy timeline_insert on public.timeline_events for insert to authenticated with check (public.can_edit_wedding(wedding_id));
create policy timeline_update on public.timeline_events for update to authenticated using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
create policy timeline_delete on public.timeline_events for delete to authenticated using (public.can_edit_wedding(wedding_id));

drop policy if exists invites_member_all on public.wedding_invites;
create policy invites_select on public.wedding_invites for select to authenticated using (public.can_edit_wedding(wedding_id));
create policy invites_insert on public.wedding_invites for insert to authenticated with check (public.can_edit_wedding(wedding_id));
create policy invites_update on public.wedding_invites for update to authenticated using (public.can_edit_wedding(wedding_id)) with check (public.can_edit_wedding(wedding_id));
create policy invites_delete on public.wedding_invites for delete to authenticated using (public.can_edit_wedding(wedding_id));

drop function if exists public.create_wedding(text, date, text, text);
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
  values (new_id, auth.uid(), 'owner', clean_side, trim(p_display_name));
  return new_id;
end;
$$;

revoke all on function public.create_wedding(text, date, text, text, text) from public;
grant execute on function public.create_wedding(text, date, text, text, text) to authenticated;

create or replace function public.create_invite(p_wedding_id uuid, p_role text, p_side text)
returns text language plpgsql security definer set search_path = public as $$
declare
  clean_role text := lower(trim(p_role));
  clean_side text := lower(trim(p_side));
  new_code text;
  attempt int := 0;
begin
  if auth.uid() is null then raise exception 'sign in before inviting someone'; end if;
  if public.wedding_role(p_wedding_id) not in ('owner', 'editor') then
    raise exception 'only an owner or editor can invite';
  end if;
  if clean_role not in ('editor', 'viewer') then raise exception 'role must be editor or viewer'; end if;
  if clean_side not in ('bride', 'groom') then raise exception 'side must be bride or groom'; end if;
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
  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (
    invite.wedding_id,
    auth.uid(),
    invite.role,
    invite.side,
    coalesce(nullif(trim(auth.jwt() ->> 'display_name'), ''), nullif(split_part(auth.jwt() ->> 'email', '@', 1), ''), 'Family')
  )
  on conflict (wedding_id, user_id) do update set role = excluded.role, side = excluded.side;
  update public.wedding_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite.id;
  return invite.wedding_id;
end;
$$;

revoke all on function public.create_invite(uuid, text, text) from public;
revoke all on function public.accept_invite(text) from public;
grant execute on function public.create_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;

delete from public.ritual_template_items where template_slug = 'hindu-starter';
insert into public.ritual_template_items (template_slug, title, description, category, priority, ceremony, sort_order) values
  ('hindu-starter', 'Roka Ceremony', 'Formal agreement between both families that the wedding will happen.', 'Other', 'High', 'Roka', 1),
  ('hindu-starter', 'Roka date and home', 'Confirm whose home hosts the roka and the time.', 'Venue', 'High', 'Roka', 2),
  ('hindu-starter', 'Roka outfits', 'Clothes for the couple and both sets of parents.', 'Attire', 'Medium', 'Roka', 3),
  ('hindu-starter', 'Roka mithai and gifts', 'Sweets and the gifts the families exchange.', 'Other', 'Medium', 'Roka', 4),
  ('hindu-starter', 'Roka tilak thali', 'Thali, roli, rice, and the coconut.', 'Other', 'High', 'Roka', 5),
  ('hindu-starter', 'Roka guest list', 'The close family who should be in the room.', 'Other', 'Medium', 'Roka', 6),
  ('hindu-starter', 'Sagai/Engagement', 'Exchange rings and announce the engagement.', 'Other', 'High', 'Sagai', 7),
  ('hindu-starter', 'Engagement rings', 'Choose and size both rings.', 'Attire', 'High', 'Sagai', 8),
  ('hindu-starter', 'Sagai outfits', 'Engagement clothes for the couple.', 'Attire', 'Medium', 'Sagai', 9),
  ('hindu-starter', 'Sagai venue and decor', 'Hall or home, flowers, and seating.', 'Decor', 'High', 'Sagai', 10),
  ('hindu-starter', 'Sagai invitation cards', 'Cards or a message for the engagement.', 'Invitations', 'Medium', 'Sagai', 11),
  ('hindu-starter', 'Sagai photographer', 'Photos of the ring exchange.', 'Other', 'Medium', 'Sagai', 12),
  ('hindu-starter', 'Haldi Ceremony Prep', 'Turmeric ceremony clothes, seating, and ritual items.', 'Other', 'Medium', 'Haldi', 13),
  ('hindu-starter', 'Haldi outfits in yellow', 'Yellow clothes for the couple and siblings.', 'Attire', 'Medium', 'Haldi', 14),
  ('hindu-starter', 'Haldi paste and ritual items', 'Turmeric, oil, and the bowls.', 'Other', 'High', 'Haldi', 15),
  ('hindu-starter', 'Haldi seating and decor', 'Floor seating, marigolds, and a wash area.', 'Decor', 'Medium', 'Haldi', 16),
  ('hindu-starter', 'Haldi music', 'A short playlist for the haldi.', 'Other', 'Low', 'Haldi', 17),
  ('hindu-starter', 'Mehendi Ceremony Setup', 'Book the mehendi artist and set up seating.', 'Decor', 'Medium', 'Mehendi', 18),
  ('hindu-starter', 'Mehendi artist booking', 'Confirm the artist, the hours, and a trial if you want one.', 'Other', 'High', 'Mehendi', 19),
  ('hindu-starter', 'Bridal mehendi design', 'Agree the bridal design and when it starts.', 'Other', 'High', 'Mehendi', 20),
  ('hindu-starter', 'Mehendi seating and cushions', 'Low seating, cushions, and trays.', 'Decor', 'Medium', 'Mehendi', 21),
  ('hindu-starter', 'Mehendi outfits', 'Clothes that stay clear of the fresh mehendi.', 'Attire', 'Medium', 'Mehendi', 22),
  ('hindu-starter', 'Mehendi snacks and drinks', 'A light menu while the mehendi dries.', 'Catering', 'Low', 'Mehendi', 23),
  ('hindu-starter', 'Sangeet Arrangements', 'Music, stage, and family performances for sangeet night.', 'Decor', 'High', 'Sangeet', 24),
  ('hindu-starter', 'Sangeet performance list', 'Who dances or sings, and the song list.', 'Other', 'High', 'Sangeet', 25),
  ('hindu-starter', 'Sangeet rehearsals', 'A rehearsal slot, and a choreographer if you want one.', 'Other', 'Medium', 'Sangeet', 26),
  ('hindu-starter', 'Sangeet stage and lighting', 'Stage size, lights, and a sound check.', 'Decor', 'High', 'Sangeet', 27),
  ('hindu-starter', 'Sangeet DJ or band', 'Music for the performances and the dance floor.', 'Other', 'High', 'Sangeet', 28),
  ('hindu-starter', 'Sangeet dinner menu', 'The meal served at sangeet.', 'Catering', 'Medium', 'Sangeet', 29),
  ('hindu-starter', 'Book Wedding Venue', 'Confirm the hall, mandap space, and reception venue.', 'Venue', 'High', 'Wedding', 30),
  ('hindu-starter', 'Book Pandit Ji', 'Confirm the priest for Saat Phere and the other rites.', 'Other', 'High', 'Wedding', 31),
  ('hindu-starter', 'Mandap Decoration', 'Flowers, drape, and the sacred fire space.', 'Decor', 'High', 'Wedding', 32),
  ('hindu-starter', 'Bridal Lehenga/Saree', 'Finalise the bride wedding outfit and fittings.', 'Attire', 'High', 'Wedding', 33),
  ('hindu-starter', 'Groom''s Sherwani', 'Finalise the groom sherwani or achkan.', 'Attire', 'High', 'Wedding', 34),
  ('hindu-starter', 'Bridal Jewelry', 'Polki, gold, and the pieces to borrow or buy.', 'Attire', 'High', 'Wedding', 35),
  ('hindu-starter', 'Wedding Invitations', 'Design, print, and send the cards.', 'Invitations', 'High', 'Wedding', 36),
  ('hindu-starter', 'Book Caterer', 'Lock the caterer and the guest count.', 'Catering', 'High', 'Wedding', 37),
  ('hindu-starter', 'Menu Tasting', 'Taste and confirm the wedding menu.', 'Catering', 'Medium', 'Wedding', 38),
  ('hindu-starter', 'Saat Phere Setup', 'Havan kund, pheras space, and ritual samagri.', 'Other', 'High', 'Wedding', 39),
  ('hindu-starter', 'Var Mala/Jaimala Arrangements', 'Garlands for the jaimala.', 'Decor', 'High', 'Wedding', 40),
  ('hindu-starter', 'Baraat Vehicle (Ghodi/Car)', 'Horse, car, or both for the baraat.', 'Other', 'High', 'Wedding', 41),
  ('hindu-starter', 'Flower Decoration', 'Florals for the mandap, entrance, and stage.', 'Decor', 'High', 'Wedding', 42),
  ('hindu-starter', 'Book Photographer', 'Book the photographer for every ceremony.', 'Other', 'High', 'Wedding', 43),
  ('hindu-starter', 'Bidaai Preparations', 'The farewell, the car, and the immediate family plan.', 'Other', 'High', 'Vidaai', 44),
  ('hindu-starter', 'Vidaai car decoration', 'Flowers for the car that leaves with the couple.', 'Decor', 'Medium', 'Vidaai', 45),
  ('hindu-starter', 'Vidaai gifts', 'Gifts the bride takes to her new home.', 'Other', 'Medium', 'Vidaai', 46),
  ('hindu-starter', 'Vidaai ritual tray', 'Rice, coins, and the other farewell items the pandit asks for.', 'Other', 'High', 'Vidaai', 47),
  ('hindu-starter', 'Reception Planning', 'Reception flow, outfits, and hosting.', 'Venue', 'High', 'Reception', 48),
  ('hindu-starter', 'Reception couple outfits', 'The reception outfit change.', 'Attire', 'Medium', 'Reception', 49),
  ('hindu-starter', 'Reception stage and entrance', 'Entry song, stage, and seating.', 'Decor', 'High', 'Reception', 50),
  ('hindu-starter', 'Sweets/Mithai Order', 'Order mithai for ceremonies and return boxes.', 'Catering', 'Medium', 'Reception', 51),
  ('hindu-starter', 'Return Gifts', 'Favours for guests.', 'Other', 'Low', 'Reception', 52),
  ('hindu-starter', 'Thank You Cards', 'Notes to send after the wedding.', 'Invitations', 'Low', 'Reception', 53);
