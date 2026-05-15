-- ===========================================================
-- Safety Inspector / Checklist Creator — Database Schema
-- Run this entire file in your Supabase SQL Editor (one time).
-- ===========================================================

-- ----- Tables ----------------------------------------------

-- Every signed-up user gets a profile row automatically (trigger below)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now()
);

-- Checklist templates (e.g. "Workplace Safety Inspection")
create table templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- The status options shown as dropdown choices on each item.
  -- Editable per-template, defaults to OSHA-style C/NI/NC/NA.
  status_options jsonb not null default '[
    {"code": "C",  "label": "Compliant",          "color": "green",  "passing": true},
    {"code": "NI", "label": "Needs Improvement",  "color": "amber",  "passing": false},
    {"code": "NC", "label": "Non-Compliant",      "color": "red",    "passing": false},
    {"code": "NA", "label": "Not Applicable",     "color": "gray",   "passing": null}
  ]'::jsonb,
  -- % of applicable items that must be "passing" for an instance to PASS
  pass_threshold numeric not null default 80,
  created_by uuid references auth.users,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sections inside a template ("Break & Rest Rooms", "Electrical", etc.)
create table sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Individual checklist items inside a section
create table items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Physical locations being inspected (e.g. "Brea Office")
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- A single "run" of a template (one inspection)
create table instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates,
  location_id uuid references locations,
  inspector_id uuid not null references auth.users,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  items_not_covered text,
  overall_score numeric,
  overall_result text check (overall_result in ('PASS', 'FAIL')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- The inspector's answer for each item on each instance
create table responses (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references instances on delete cascade,
  item_id uuid not null references items,
  status_code text,           -- e.g. 'C', 'NI', 'NC', 'NA'
  comments text,
  updated_at timestamptz default now(),
  unique(instance_id, item_id)
);

-- ----- Auto-create profile on signup -----------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----- Row-Level Security ----------------------------------
-- Single-team mode: any signed-in user can read/write everything.
-- (We can lock this down per-role later when you have more clients.)

alter table profiles  enable row level security;
alter table templates enable row level security;
alter table sections  enable row level security;
alter table items     enable row level security;
alter table locations enable row level security;
alter table instances enable row level security;
alter table responses enable row level security;

create policy "auth read profiles"     on profiles  for select using (auth.role() = 'authenticated');
create policy "auth update own profile" on profiles for update using (auth.uid() = id);

create policy "auth all templates"  on templates  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all sections"   on sections   for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all items"      on items      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all locations"  on locations  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all instances"  on instances  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth all responses"  on responses  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ===========================================================
-- SEED DATA: Brea Office + Safety Inspection template
-- ===========================================================

insert into locations (name) values ('Brea Office');

do $$
declare
  v_template_id uuid;
  v_section_id  uuid;
begin
  insert into templates (name, description)
  values (
    'Workplace Safety Inspection',
    'OSHA-aligned inspection covering electrical, fire safety, ergonomics, housekeeping, and security.'
  )
  returning id into v_template_id;

  -- 1. Break & Rest Rooms
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Break & Rest Rooms', 1) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Breakroom — Appliances working',  1),
    (v_section_id, 'Breakroom — Clean and sanitary',  2),
    (v_section_id, 'Restrooms — Clean and sanitary',  3),
    (v_section_id, 'Restrooms — Supplies stocked',    4),
    (v_section_id, 'Restrooms — Ventilation working', 5);

  -- 2. Electrical
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Electrical', 2) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Panels accessible',              1),
    (v_section_id, 'No exposed wires',               2),
    (v_section_id, 'Cords in good condition',        3),
    (v_section_id, 'Proper grounding',               4),
    (v_section_id, 'No improper extension cord use', 5);

  -- 3. Emergency
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Emergency', 3) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'First aid kits stocked',     1),
    (v_section_id, 'Exits marked',               2),
    (v_section_id, 'Evacuation routes posted',   3),
    (v_section_id, 'Emergency contacts posted',  4);

  -- 4. Fire Safety
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Fire Safety', 4) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Extinguishers accessible',    1),
    (v_section_id, 'Flammables stored properly',  2),
    (v_section_id, 'SDS available',               3),
    (v_section_id, 'Chemicals labeled',           4);

  -- 5. General Housekeeping
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'General Housekeeping', 5) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Floors clean and dry',     1),
    (v_section_id, 'Walkways unobstructed',    2),
    (v_section_id, 'Proper lighting',          3),
    (v_section_id, 'Spills cleaned promptly',  4),
    (v_section_id, 'Organized storage',        5);

  -- 6. Indoor Air Quality
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Indoor Air Quality', 6) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Temperature comfortable', 1),
    (v_section_id, 'Adequate ventilation',    2);

  -- 7. Workstations & Ergonomics
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Workstations & Ergonomics', 7) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Chairs adjustable and in good condition', 1),
    (v_section_id, 'Monitors at eye level',                   2),
    (v_section_id, 'Keyboard/mouse positioned properly',      3),
    (v_section_id, 'Adequate desk space',                     4);

  -- 8. Material Handling
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Material Handling', 8) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Proper lifting techniques', 1),
    (v_section_id, 'Racks stable',              2),
    (v_section_id, 'Heavy items low',           3);

  -- 9. Slips, Trips & Falls
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Slips, Trips & Falls', 9) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Cords secured',       1),
    (v_section_id, 'No slippery surfaces', 2);

  -- 10. Security
  insert into sections (template_id, name, sort_order)
    values (v_template_id, 'Security', 10) returning id into v_section_id;
  insert into items (section_id, name, sort_order) values
    (v_section_id, 'Visitor sign-in followed',  1),
    (v_section_id, 'Security systems working',  2);
end $$;
