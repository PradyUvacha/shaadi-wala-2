-- Ritual titles are unique inside a function, ignoring case and surrounding spaces.
-- Position stays non-unique so a reorder can swap two rows.
-- Tasks with no function (legacy rows) are left out of the index.

create unique index if not exists tasks_function_title_ci
  on public.tasks (function_id, lower(btrim(title)))
  where function_id is not null;

create unique index if not exists checklist_template_rituals_function_title_ci
  on public.checklist_template_rituals (function_id, lower(btrim(title)));
