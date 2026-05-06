# MCAT Prep Planner

Calendar/daily-tracking app for MCAT prep with AI-assisted plan import.

## Stack

- Vite 6 + React 19 + React Router 7
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Supabase (auth + Postgres with RLS)
- Anthropic Claude API (plan parsing — text, screenshots, PDFs)
- Vercel (hosting + serverless `/api/*`)

## Local development

1. **Install:**
   ```bash
   npm install
   ```
2. **Run the schema** in Supabase Dashboard → SQL Editor:
   ```bash
   # Paste the contents of mcat-supabase-schema.sql and run
   ```
3. **Configure env**:
   ```bash
   cp .env.example .env.local
   # Fill in:
   #   VITE_SUPABASE_URL
   #   VITE_SUPABASE_ANON_KEY  (use the new sb_publishable_... key)
   #   ANTHROPIC_API_KEY       (server-side only)
   ```
4. **Dev server:**
   ```bash
   npm run dev
   # → http://localhost:5173
   ```
   Note: `/api/*` serverless routes only run via `vercel dev` (or in production). For local
   onboarding testing, run `npx vercel dev` instead of `npm run dev`.

## Deploying to Vercel

1. Go to https://vercel.com/new
2. Import the `helkin1/MCATPrep` repo, branch `claude/mcat-prep-calendar-bTPBX`
3. Framework preset: **Vite** (auto-detected from `vercel.json`)
4. Add environment variables (Project Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy
6. In Supabase → Auth → URL Configuration, add the Vercel URL to "Site URL" and "Redirect URLs"

## Data model

Single JSONB blob per user (matches the Atlas convention):

- `profiles(id, exam_date, onboarding_complete, settings)` — `settings.categories` holds custom categories
- `mcat_days(user_id, data)` — `data` is `{ "YYYY-MM-DD": { blocks: [...], todos: [...] } }`
- `mcat_templates(user_id, data)` — `data` is `{ daily: [...], weekly: [...] }`

Block shape:
```json
{
  "id": "abc123",
  "title": "CARS practice passages",
  "start": "09:00",
  "end": "10:30",
  "category": "cars",
  "notes": "AAMC bundle"
}
```

## Features

- **Auth**: email/password via Supabase
- **Onboarding**: set exam date → optional plan import (text / screenshot / PDF) → Claude parses to blocks → user previews & confirms → blocks written to calendar
- **Month view**: infinite scroll from current month through exam month, today auto-scrolled into view, exam day highlighted
- **Day view**: Google-Calendar-style schedule grid
  - Drag empty area to create a block (snaps to 15 min)
  - Drag block body to move
  - Drag bottom edge to resize
  - Click to edit
  - Sidebar with todos, daily summary, template apply
- **Categories**: built-in MCAT subjects + custom categories with full color palette
- **Templates**: save daily blocks as a reusable template; apply to any date or weekly range

## Structure

```
api/ai/parse-plan.js   serverless route → Claude
src/
  App.jsx              router + auth/onboarding gate
  lib/                 supabase client, db data layer, time/category helpers
  hooks/               useAuth, useProfile, useDays, useTemplates
  components/
    auth/              SignIn
    onboarding/        Onboarding, PlanUploader, PlanPreview
    calendar/          MonthView, MonthSection, DayCell
    day/               DayView, ScheduleGrid, BlockEditor, Sidebar
    settings/          CategoriesPanel, TemplatesPanel
    common/            Modal, ColorPicker, TopBar
  pages/Settings.jsx
mcat-supabase-schema.sql
vercel.json
```
