# Safety Inspector

Generic, multi-purpose checklist + inspection runner. First template is OSHA-aligned workplace safety (10 sections, 36 items), but the system supports any template.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres + Auth)

---

## What's in here

- **Templates** — admins create reusable checklists. Each has sections, items, customizable status options (`code`/`label`/`color`/`passing`), and a pass threshold.
- **Instances** — one "run" of a template. Captures who, when, where, status per item, comments, items not covered.
- **Auto-scoring** — on submit, score = passing / applicable items × 100. Status options with `passing: null` (e.g. NA) are excluded from the denominator.
- **Calendar** — month view of every submitted instance, color-coded by PASS/FAIL.
- **Roles** — `admin` (manages templates, locations, users) and `member` (runs inspections). New signups default to `member`.

---

## Setup (first time)

### 1. Supabase project

1. Create a project at https://supabase.com/dashboard
2. SQL Editor → paste the entire contents of `schema.sql` → Run. This creates all tables, RLS policies, the auto-profile trigger on signup, and seeds the Brea Office location + Workplace Safety Inspection template.
3. **Authentication → Providers → Email** → uncheck **Confirm email** (recommended for dev — lets you sign up + log in without a confirmation email).
4. **Project Settings → API** — copy the Project URL and `anon public` key.

### 2. Local env

Copy `.env.local.example` → `.env.local` and fill in the two values.

### 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 → you'll be redirected to `/login`. Click "Sign up", create an account.

### 4. Make yourself admin

The first user signs up as `member`. To self-promote (one-time):

- In the Supabase dashboard → **Table Editor → profiles** → find your row → set `role = 'admin'` → save.
- Reload the app — you'll now see Locations, Users, and template editing.

After that, you can promote others from `/admin/users`.

---

## Routes

| Path | Who | What |
|---|---|---|
| `/` | all | Dashboard — your drafts + recent submitted, quick-start templates |
| `/login`, `/signup` | public | Auth |
| `/templates` | all | List of templates (run any); admin can create + edit |
| `/templates/[id]` | admin | Edit name, description, pass threshold, status options (JSON), sections, items |
| `/inspect/new` | all | Pick a template + location → start a draft |
| `/inspect/[id]` | all | Fill out responses (autosaves every 500ms), see live score, submit |
| `/inspect/[id]/view` | all | Read-only summary of a submitted instance |
| `/calendar` | all | Month view, click any pill to view that instance |
| `/locations` | admin | Add/rename/delete inspection sites |
| `/admin/users` | admin | Promote/demote users between member/admin |

---

## Customizing status options per template

Each template has a `status_options` JSON array. The seeded default is OSHA-style:

```json
[
  {"code": "C",  "label": "Compliant",         "color": "green", "passing": true},
  {"code": "NI", "label": "Needs Improvement", "color": "amber", "passing": false},
  {"code": "NC", "label": "Non-Compliant",     "color": "red",   "passing": false},
  {"code": "NA", "label": "Not Applicable",    "color": "gray",  "passing": null}
]
```

For a different domain (e.g. Yes/No checklist), edit on the template page:

```json
[
  {"code": "Y", "label": "Yes",  "color": "green", "passing": true},
  {"code": "N", "label": "No",   "color": "red",   "passing": false},
  {"code": "—", "label": "Skip", "color": "gray",  "passing": null}
]
```

Colors supported: `green`, `amber`, `red`, `gray`, `blue`, `purple`. The `passing` field controls scoring: `true` counts toward, `false` counts against, `null` is excluded.

---

## Notes & known limitations

- **Single-team / single-tenant** in v1, by design (per `schema.sql`'s comment). RLS is permissive — any signed-in user can read/write everything in the database. Role gating (admin vs. member) happens in the app layer. Real multi-tenancy (`organizations` table + per-org RLS) is straightforward to add later.
- **Anon key** is committed to `.env.local` and ships to the browser — that's correct for Supabase. Security is enforced by RLS in Postgres, not key secrecy.
- **Middleware deprecation warning** during build: Next.js 16 renames `middleware.ts` → `proxy.ts` in a future version. Still works as-is.

---

## Project layout

```
app/
  (auth)/login, (auth)/signup       — sign-in, sign-up
  page.tsx                          — dashboard
  templates/                        — list + admin editor
  inspect/new                       — start a draft
  inspect/[id]                      — fill out (autosave)
  inspect/[id]/view                 — read-only summary
  calendar/                         — month view
  locations/                        — admin CRUD
  admin/users/                      — role management
components/                         — Nav, UI primitives, status pills
lib/
  supabase/{client,server,middleware}.ts — clients for browser, server, middleware
  auth.ts                           — requireUser / requireProfile / requireAdmin
  scoring.ts                        — auto-scoring logic
  types.ts                          — DB row types
middleware.ts                       — auth gating + session refresh
schema.sql                          — full database schema (run once in Supabase)
```
