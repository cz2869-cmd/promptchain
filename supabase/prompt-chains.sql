-- Prompt Chain studio for Morningside Nook.
-- Run this once in the Supabase SQL editor, after supabase/admin.sql
-- from Nook Desk (that file adds profiles.is_superadmin).
-- Safe to run again. It will not overwrite a chain you have already edited.

create table if not exists public.llm_providers (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  base_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_models (
  id bigint generated always as identity primary key,
  provider_id bigint not null references public.llm_providers (id) on delete cascade,
  name text not null,
  model_key text not null,
  created_at timestamptz not null default now(),
  unique (provider_id, model_key)
);

create table if not exists public.prompt_chains (
  id bigint generated always as identity primary key,
  name text not null unique,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_steps (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  position integer not null,
  role text not null check (role in ('system', 'user')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (chain_id, position)
);

create table if not exists public.prompt_chain_mix (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains (id) on delete cascade,
  model_id bigint not null references public.llm_models (id) on delete cascade,
  weight numeric not null default 1 check (weight >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chain_id, model_id)
);

create table if not exists public.generation_requests (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles (id) on delete set null,
  chain_id bigint references public.prompt_chains (id) on delete set null,
  prompt text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_responses (
  id bigint generated always as identity primary key,
  request_id bigint references public.generation_requests (id) on delete set null,
  model_id bigint references public.llm_models (id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'llm_providers',
    'llm_models',
    'prompt_chains',
    'prompt_chain_steps',
    'prompt_chain_mix',
    'generation_requests',
    'llm_responses'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_admin_all', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())',
      table_name || '_admin_all',
      table_name
    );
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      table_name
    );
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;

insert into public.llm_providers (name, slug, base_url)
select 'Google', 'google', 'https://generativelanguage.googleapis.com'
where not exists (select 1 from public.llm_providers where slug = 'google');

insert into public.llm_models (provider_id, name, model_key)
select p.id, 'Gemini 3 Flash', 'gemini-3-flash-preview'
from public.llm_providers p
where p.slug = 'google'
  and not exists (
    select 1 from public.llm_models m
    where m.provider_id = p.id and m.model_key = 'gemini-3-flash-preview'
  );

insert into public.llm_models (provider_id, name, model_key)
select p.id, 'Gemini 3.8 Flash', 'gemini-3.8-flash'
from public.llm_providers p
where p.slug = 'google'
  and not exists (
    select 1 from public.llm_models m
    where m.provider_id = p.id and m.model_key = 'gemini-3.8-flash'
  );

insert into public.prompt_chains (name, description)
select 'Suggest a cafe', 'The prompt used when a student cannot decide where to sit.'
where not exists (select 1 from public.prompt_chains where name = 'Suggest a cafe');

insert into public.prompt_chain_steps (chain_id, position, role, content)
select c.id, 1, 'system', $step$Pick exactly one cafe for a Columbia student. Reply with JSON only: {"id": <one cafe id from the list>, "reason": "<one or two warm sentences>"}. Do not invent a cafe. Do not mention that you are an AI.$step$
from public.prompt_chains c
where c.name = 'Suggest a cafe'
  and not exists (
    select 1 from public.prompt_chain_steps s
    where s.chain_id = c.id and s.position = 1
  );

insert into public.prompt_chain_steps (chain_id, position, role, content)
select c.id, 2, 'user', $step$Vibes they chose: {{vibes}}.
What they wrote: {{note}}.
Cafes:
{{catalog}}$step$
from public.prompt_chains c
where c.name = 'Suggest a cafe'
  and not exists (
    select 1 from public.prompt_chain_steps s
    where s.chain_id = c.id and s.position = 2
  );

insert into public.prompt_chain_mix (chain_id, model_id, weight, is_active)
select c.id, m.id, 1, true
from public.prompt_chains c
join public.llm_models m on m.model_key = 'gemini-3-flash-preview'
where c.name = 'Suggest a cafe'
  and not exists (
    select 1 from public.prompt_chain_mix mix
    where mix.chain_id = c.id and mix.model_id = m.id
  );

-- The other direction: choose a cafe, and the model returns vibes plus a short description.
insert into public.prompt_chains (name, description)
select
  'Read a cafe',
  'Pick a cafe, such as Joe''s Coffee, and get back the vibes it feels like plus a short description.'
where not exists (select 1 from public.prompt_chains where name = 'Read a cafe');

insert into public.prompt_chain_steps (chain_id, position, role, content)
select c.id, 1, 'system', $step$You describe one real cafe from Morningside Nook for a Columbia student. Reply with JSON only: {"vibes": ["two to four short labels, such as Studying or Cozy"], "description": "<two or three warm sentences about what sitting there is like>"}. Use the cafe you were given. Do not invent a different cafe. Do not mention that you are an AI.$step$
from public.prompt_chains c
where c.name = 'Read a cafe'
  and not exists (
    select 1 from public.prompt_chain_steps s
    where s.chain_id = c.id and s.position = 1
  );

insert into public.prompt_chain_steps (chain_id, position, role, content)
select c.id, 2, 'user', $step$Cafe:
{{cafe}}$step$
from public.prompt_chains c
where c.name = 'Read a cafe'
  and not exists (
    select 1 from public.prompt_chain_steps s
    where s.chain_id = c.id and s.position = 2
  );

insert into public.prompt_chain_mix (chain_id, model_id, weight, is_active)
select c.id, m.id, 1, true
from public.prompt_chains c
join public.llm_models m on m.model_key = 'gemini-3-flash-preview'
where c.name = 'Read a cafe'
  and not exists (
    select 1 from public.prompt_chain_mix mix
    where mix.chain_id = c.id and mix.model_id = m.id
  );
