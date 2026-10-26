-- Shaadi Wala foundation schema.
-- Each wedding is private to its members through row-level security.
-- Invite acceptance, analytics, and account deletion are left for later changes.
-- Account deletion should be a service-role edge function: deleting auth.users
-- cascades the profile and memberships. Do not expose the service role to the app.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_wedding_owner()
returns trigger
language plpgsql
as $$
begin
  new.id = old.id;
  new.created_by = old.created_by;
  return new;
end;
$$;

create or replace function public.protect_member_keys()
returns trigger
language plpgsql
as $$
begin
  new.id = old.id;
  new.user_id = old.user_id;
  new.wedding_id = old.wedding_id;
  new.role = old.role;
  return new;
end;
$$;

create or replace function public.protect_parent_keys()
returns trigger
language plpgsql
as $$
begin
  new.id = old.id;
  new.wedding_id = old.wedding_id;
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  couple_names text not null,
  wedding_date date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weddings_couple_names_not_blank check (char_length(trim(couple_names)) > 0)
);

create table if not exists public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'family' check (role in ('owner', 'partner', 'family')),
  side text not null check (side in ('bride', 'groom')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);

-- Ready for the later "invite by link" flow. Clients cannot read invites by token.
create table if not exists public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  token text not null unique,
  side text check (side in ('bride', 'groom')),
  role text not null default 'family' check (role in ('partner', 'family')),
  created_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Venue', 'Catering', 'Decor', 'Attire', 'Invitations', 'Other')),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  status text not null check (status in ('Pending', 'In Progress', 'Completed')),
  due_date date,
  template_title text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_not_blank check (char_length(trim(title)) > 0)
);

create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  category text not null check (category in ('Venue', 'Catering', 'Decor', 'Attire', 'Invitations', 'Other')),
  currency text not null default 'INR' check (currency in ('INR', 'USD', 'EUR', 'GBP')),
  estimated numeric(14, 2) not null default 0 check (estimated >= 0 and estimated <= 100000000),
  actual numeric(14, 2) not null default 0 check (actual >= 0 and actual <= 100000000),
  paid boolean not null default false,
  notes text not null default '',
  paid_by_side text not null default 'custom' check (paid_by_side in ('bride', 'groom', 'both', 'custom')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_splits (
  id uuid primary key default gen_random_uuid(),
  budget_item_id uuid not null references public.budget_items (id) on delete cascade,
  name text not null,
  side text check (side in ('bride', 'groom', 'other')),
  pct numeric(5, 2) not null check (pct > 0 and pct <= 100)
);

create table if not exists public.part_payments (
  id uuid primary key default gen_random_uuid(),
  budget_item_id uuid not null references public.budget_items (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0 and amount <= 100000000),
  paid_by text not null default '',
  paid_by_side text check (paid_by_side in ('bride', 'groom', 'other')),
  paid_on date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  email text not null default '',
  phone text not null default '',
  rsvp_status text not null default 'Pending' check (rsvp_status in ('Pending', 'Confirmed', 'Declined')),
  meal text not null default '',
  plus_ones integer not null default 0 check (plus_ones >= 0),
  side text check (side in ('bride', 'groom', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guests_name_not_blank check (char_length(trim(name)) > 0)
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  name text not null,
  event_date date not null,
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Completed')),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_events_name_not_blank check (char_length(trim(name)) > 0)
);

create table if not exists public.ritual_templates (
  slug text primary key,
  name text not null,
  tradition text not null,
  description text not null
);

create table if not exists public.ritual_template_items (
  id uuid primary key default gen_random_uuid(),
  template_slug text not null references public.ritual_templates (slug) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null check (category in ('Venue', 'Catering', 'Decor', 'Attire', 'Invitations', 'Other')),
  priority text not null check (priority in ('High', 'Medium', 'Low')),
  sort_order integer not null check (sort_order > 0),
  unique (template_slug, title)
);

-- Ready for the later in-app feedback screen.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wedding_id uuid references public.weddings (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedback_message_not_blank check (char_length(trim(message)) > 0)
);

create index if not exists wedding_members_user_id_idx on public.wedding_members (user_id);
create index if not exists wedding_invites_wedding_id_idx on public.wedding_invites (wedding_id);
create index if not exists tasks_wedding_id_idx on public.tasks (wedding_id);
create index if not exists budget_items_wedding_id_idx on public.budget_items (wedding_id);
create index if not exists budget_splits_item_idx on public.budget_splits (budget_item_id);
create index if not exists part_payments_item_idx on public.part_payments (budget_item_id);
create index if not exists guests_wedding_id_idx on public.guests (wedding_id);
create index if not exists timeline_events_wedding_id_idx on public.timeline_events (wedding_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists weddings_updated_at on public.weddings;
create trigger weddings_updated_at
before update on public.weddings
for each row execute function public.set_updated_at();

drop trigger if exists weddings_protect_owner on public.weddings;
create trigger weddings_protect_owner
before update on public.weddings
for each row execute function public.protect_wedding_owner();

drop trigger if exists wedding_members_updated_at on public.wedding_members;
create trigger wedding_members_updated_at
before update on public.wedding_members
for each row execute function public.set_updated_at();

drop trigger if exists wedding_members_protect_keys on public.wedding_members;
create trigger wedding_members_protect_keys
before update on public.wedding_members
for each row execute function public.protect_member_keys();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists tasks_protect_keys on public.tasks;
create trigger tasks_protect_keys
before update on public.tasks
for each row execute function public.protect_parent_keys();

drop trigger if exists budget_items_updated_at on public.budget_items;
create trigger budget_items_updated_at
before update on public.budget_items
for each row execute function public.set_updated_at();

drop trigger if exists budget_items_protect_keys on public.budget_items;
create trigger budget_items_protect_keys
before update on public.budget_items
for each row execute function public.protect_parent_keys();

drop trigger if exists guests_updated_at on public.guests;
create trigger guests_updated_at
before update on public.guests
for each row execute function public.set_updated_at();

drop trigger if exists guests_protect_keys on public.guests;
create trigger guests_protect_keys
before update on public.guests
for each row execute function public.protect_parent_keys();

drop trigger if exists timeline_events_updated_at on public.timeline_events;
create trigger timeline_events_updated_at
before update on public.timeline_events
for each row execute function public.set_updated_at();

drop trigger if exists timeline_events_protect_keys on public.timeline_events;
create trigger timeline_events_protect_keys
before update on public.timeline_events
for each row execute function public.protect_parent_keys();

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
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Guest'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_wedding(
  p_couple_names text,
  p_wedding_date date,
  p_side text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  wid uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_side not in ('bride', 'groom') then
    raise exception 'invalid side';
  end if;
  if nullif(trim(p_couple_names), '') is null then
    raise exception 'couple names are required';
  end if;
  if p_wedding_date is null then
    raise exception 'wedding date is required';
  end if;

  insert into public.weddings (couple_names, wedding_date, created_by)
  values (trim(p_couple_names), p_wedding_date, uid)
  returning id into wid;

  insert into public.wedding_members (wedding_id, user_id, role, side, display_name)
  values (wid, uid, 'owner', p_side, nullif(trim(p_display_name), ''));

  update public.profiles
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
  where id = uid;

  return wid;
end;
$$;

-- SQL functions check that referenced tables exist at creation time, so this
-- comes after wedding_members.
create or replace function public.is_wedding_member(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members
    where wedding_id = p_wedding_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.protect_wedding_owner() from public;
revoke all on function public.protect_member_keys() from public;
revoke all on function public.protect_parent_keys() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.is_wedding_member(uuid) from public, anon;
revoke all on function public.create_wedding(text, date, text, text) from public, anon;
grant execute on function public.is_wedding_member(uuid) to authenticated;
grant execute on function public.create_wedding(text, date, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invites enable row level security;
alter table public.tasks enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_splits enable row level security;
alter table public.part_payments enable row level security;
alter table public.guests enable row level security;
alter table public.timeline_events enable row level security;
alter table public.ritual_templates enable row level security;
alter table public.ritual_template_items enable row level security;
alter table public.feedback enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or id in (
    select theirs.user_id
    from public.wedding_members mine
    join public.wedding_members theirs on theirs.wedding_id = mine.wedding_id
    where mine.user_id = auth.uid()
  )
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists weddings_select on public.weddings;
create policy weddings_select on public.weddings
for select to authenticated
using (public.is_wedding_member(id) or created_by = auth.uid());

drop policy if exists weddings_insert on public.weddings;
create policy weddings_insert on public.weddings
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists weddings_update on public.weddings;
create policy weddings_update on public.weddings
for update to authenticated
using (public.is_wedding_member(id))
with check (public.is_wedding_member(id));

drop policy if exists weddings_delete on public.weddings;
create policy weddings_delete on public.weddings
for delete to authenticated
using (
  exists (
    select 1 from public.wedding_members
    where wedding_id = weddings.id
      and user_id = auth.uid()
      and role = 'owner'
  )
);

drop policy if exists members_select on public.wedding_members;
create policy members_select on public.wedding_members
for select to authenticated
using (user_id = auth.uid() or public.is_wedding_member(wedding_id));

drop policy if exists members_insert_self on public.wedding_members;
create policy members_insert_self on public.wedding_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.weddings
    where weddings.id = wedding_id
      and weddings.created_by = auth.uid()
  )
);

drop policy if exists members_update_self on public.wedding_members;
create policy members_update_self on public.wedding_members
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists invites_member_all on public.wedding_invites;
create policy invites_member_all on public.wedding_invites
for all to authenticated
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists tasks_member_all on public.tasks;
create policy tasks_member_all on public.tasks
for all to authenticated
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists budget_member_all on public.budget_items;
create policy budget_member_all on public.budget_items
for all to authenticated
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists splits_member_all on public.budget_splits;
create policy splits_member_all on public.budget_splits
for all to authenticated
using (
  exists (
    select 1 from public.budget_items
    where budget_items.id = budget_item_id
      and public.is_wedding_member(budget_items.wedding_id)
  )
)
with check (
  exists (
    select 1 from public.budget_items
    where budget_items.id = budget_item_id
      and public.is_wedding_member(budget_items.wedding_id)
  )
);

drop policy if exists payments_member_all on public.part_payments;
create policy payments_member_all on public.part_payments
for all to authenticated
using (
  exists (
    select 1 from public.budget_items
    where budget_items.id = budget_item_id
      and public.is_wedding_member(budget_items.wedding_id)
  )
)
with check (
  exists (
    select 1 from public.budget_items
    where budget_items.id = budget_item_id
      and public.is_wedding_member(budget_items.wedding_id)
  )
);

drop policy if exists guests_member_all on public.guests;
create policy guests_member_all on public.guests
for all to authenticated
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists timeline_member_all on public.timeline_events;
create policy timeline_member_all on public.timeline_events
for all to authenticated
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists ritual_templates_read on public.ritual_templates;
create policy ritual_templates_read on public.ritual_templates
for select to anon, authenticated
using (true);

drop policy if exists ritual_items_read on public.ritual_template_items;
create policy ritual_items_read on public.ritual_template_items
for select to anon, authenticated
using (true);

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
for select to authenticated
using (user_id = auth.uid());

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback
for insert to authenticated
with check (user_id = auth.uid());

grant usage on schema public to anon, authenticated;

grant select on public.ritual_templates, public.ritual_template_items to anon, authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.weddings,
  public.wedding_members,
  public.wedding_invites,
  public.tasks,
  public.budget_items,
  public.budget_splits,
  public.part_payments,
  public.guests,
  public.timeline_events,
  public.feedback
to authenticated;

insert into public.ritual_templates (slug, name, tradition, description)
values (
  'hindu-starter',
  'Hindu wedding checklist',
  'Hindu',
  'A starter list of rituals and planning tasks. Copy it into a wedding, then edit or delete anything that does not fit.'
)
on conflict (slug) do nothing;

insert into public.ritual_template_items (template_slug, title, description, category, priority, sort_order)
values
  ('hindu-starter', 'Roka Ceremony', 'Formal agreement between both families that the wedding will happen.', 'Other', 'High', 1),
  ('hindu-starter', 'Sagai/Engagement', 'Exchange rings and announce the engagement.', 'Other', 'High', 2),
  ('hindu-starter', 'Book Wedding Venue', 'Confirm the hall, mandap space, and reception venue.', 'Venue', 'High', 3),
  ('hindu-starter', 'Book Pandit Ji', 'Confirm the priest for Saat Phere and the other rites.', 'Other', 'High', 4),
  ('hindu-starter', 'Sangeet Arrangements', 'Music, stage, and family performances for sangeet night.', 'Decor', 'High', 5),
  ('hindu-starter', 'Mehendi Ceremony Setup', 'Book the mehendi artist and set up seating.', 'Decor', 'Medium', 6),
  ('hindu-starter', 'Haldi Ceremony Prep', 'Turmeric ceremony clothes, seating, and ritual items.', 'Other', 'Medium', 7),
  ('hindu-starter', 'Mandap Decoration', 'Flowers, drape, and the sacred fire space.', 'Decor', 'High', 8),
  ('hindu-starter', 'Bridal Lehenga/Saree', 'Finalise the bride wedding outfit and fittings.', 'Attire', 'High', 9),
  ('hindu-starter', 'Groom''s Sherwani', 'Finalise the groom sherwani or achkan.', 'Attire', 'High', 10),
  ('hindu-starter', 'Bridal Jewelry', 'Polki, gold, and the pieces to borrow or buy.', 'Attire', 'High', 11),
  ('hindu-starter', 'Wedding Invitations', 'Design, print, and send the cards.', 'Invitations', 'High', 12),
  ('hindu-starter', 'Book Caterer', 'Lock the caterer and the guest count.', 'Catering', 'High', 13),
  ('hindu-starter', 'Menu Tasting', 'Taste and confirm the wedding menu.', 'Catering', 'Medium', 14),
  ('hindu-starter', 'Sweets/Mithai Order', 'Order mithai for ceremonies and return boxes.', 'Catering', 'Medium', 15),
  ('hindu-starter', 'Book Photographer', 'Book the photographer for every ceremony.', 'Other', 'High', 16),
  ('hindu-starter', 'Book Videographer', 'Book video coverage and a highlight film.', 'Other', 'High', 17),
  ('hindu-starter', 'Pre-Wedding Photoshoot', 'Pick outfits, a location, and a date.', 'Other', 'Medium', 18),
  ('hindu-starter', 'Book DJ/Band', 'Music for sangeet and the reception.', 'Other', 'High', 19),
  ('hindu-starter', 'Flower Decoration', 'Florals for the mandap, entrance, and stage.', 'Decor', 'High', 20),
  ('hindu-starter', 'Lighting Setup (Diyas)', 'Diyas, fairy lights, and ceremony lighting.', 'Decor', 'Medium', 21),
  ('hindu-starter', 'Baraat Vehicle (Ghodi/Car)', 'Horse, car, or both for the baraat.', 'Other', 'High', 22),
  ('hindu-starter', 'Guest Transportation', 'Cars or a bus between venues.', 'Other', 'Medium', 23),
  ('hindu-starter', 'Finalize Guest List', 'Names, sides, and a working headcount.', 'Other', 'High', 24),
  ('hindu-starter', 'Book Hotel Rooms for Guests', 'Rooms for out-of-town family.', 'Venue', 'Medium', 25),
  ('hindu-starter', 'Var Mala/Jaimala Arrangements', 'Garlands for the jaimala.', 'Decor', 'High', 26),
  ('hindu-starter', 'Saat Phere Setup', 'Havan kund, pheras space, and ritual samagri.', 'Other', 'High', 27),
  ('hindu-starter', 'Bidaai Preparations', 'The farewell, the car, and the immediate family plan.', 'Other', 'High', 28),
  ('hindu-starter', 'Reception Planning', 'Reception flow, outfits, and hosting.', 'Venue', 'High', 29),
  ('hindu-starter', 'Honeymoon Planning', 'Travel dates and bookings.', 'Other', 'Medium', 30),
  ('hindu-starter', 'Return Gifts', 'Favours for guests.', 'Other', 'Low', 31),
  ('hindu-starter', 'Thank You Cards', 'Notes to send after the wedding.', 'Invitations', 'Low', 32)
on conflict (template_slug, title) do nothing;
