-- NPS (day 14 and day 30) and the price survey. Answers only. No billing.
-- Apply after 20261026230000_budget_payment_actual.sql. Safe to run again.

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  prompt text not null,
  nps_score smallint,
  comment text,
  willingness text,
  price_choice text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists survey_responses_user_prompt
  on public.survey_responses (user_id, prompt);

alter table public.survey_responses drop constraint if exists survey_responses_kind_check;
alter table public.survey_responses add constraint survey_responses_kind_check
  check (kind in ('nps', 'price'));

alter table public.survey_responses drop constraint if exists survey_responses_prompt_check;
alter table public.survey_responses add constraint survey_responses_prompt_check
  check (prompt in ('day_14', 'day_30', 'price'));

alter table public.survey_responses drop constraint if exists survey_responses_nps_score_range;
alter table public.survey_responses add constraint survey_responses_nps_score_range
  check (nps_score is null or nps_score between 0 and 10);

alter table public.survey_responses drop constraint if exists survey_responses_comment_length;
alter table public.survey_responses add constraint survey_responses_comment_length
  check (comment is null or char_length(comment) <= 1000);

alter table public.survey_responses drop constraint if exists survey_responses_willingness_length;
alter table public.survey_responses add constraint survey_responses_willingness_length
  check (willingness is null or char_length(willingness) <= 500);

alter table public.survey_responses drop constraint if exists survey_responses_price_choice_values;
alter table public.survey_responses add constraint survey_responses_price_choice_values
  check (price_choice is null or price_choice in ('yes', 'maybe', 'no'));

alter table public.survey_responses drop constraint if exists survey_responses_kind_prompt;
alter table public.survey_responses add constraint survey_responses_kind_prompt
  check (
    (kind = 'nps' and prompt in ('day_14', 'day_30'))
    or (kind = 'price' and prompt = 'price')
  );

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
      and price_choice is not null
    )
  );

alter table public.survey_responses enable row level security;

drop policy if exists survey_responses_select on public.survey_responses;
create policy survey_responses_select on public.survey_responses
for select to authenticated
using (user_id = auth.uid());

drop policy if exists survey_responses_insert on public.survey_responses;
create policy survey_responses_insert on public.survey_responses
for insert to authenticated
with check (user_id = auth.uid());

revoke all on table public.survey_responses from public, anon, authenticated;
grant select, insert on table public.survey_responses to authenticated;
