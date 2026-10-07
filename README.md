# Alle

Mobile-first flashcards driven by a Google Sheet. React + Vite, Supabase, token-driven CSS.

## Run it

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon key
npm run dev
```

No Supabase yet? Put `VITE_DEMO=true` in `.env.local` instead. Auth and data then live in
`localStorage` so you can click through every screen. Demo mode is ignored once real keys are set.

`npm test` runs the logic tests (answer checking, Leitner boxes, session building, CSV parsing).

## Supabase

1. Create a project, then run `supabase/schema.sql` in the SQL editor (tables + row-level security).
   Already set up from an earlier version? Run the numbered files in `supabase/` (002–009) once each.
2. Authentication → Providers → Email: on. Turn off “Confirm email” if you want instant sign-in while testing.
3. Copy the project URL and anon key into `.env.local` (and into Vercel → Settings → Environment Variables).

Per-user preferences (colour mode, banner dismissed, sample seeded) live in the auth user's metadata, so
there is no profiles table.

## Deploy

Push to GitHub, import in Vercel, add the two `VITE_SUPABASE_*` variables. `vercel.json` handles SPA routing.

## Dashboard

Owner-only usage at `/dashboard` (e.g. `my.allecards.app/dashboard`). Run `supabase/005_analytics.sql` first and set your email as the owner inside it. All figures are aggregates; no per-user data is exposed.

## Design system

Open `/design` on any running copy (for example `my.allecards.app/design`). It shows every colour, type size, spacing, radius, icon and component, rendered live from `tokens.css` and the real components, with a light/dark switch and a device preview that runs the real app on iPhone 18 Pro, iPhone Duo (closed and open), iPad and desktop.

Dark mode is the `:root[data-theme="dark"]` block at the end of `tokens.css`: the same token names with dark values.

## Where things live

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | **The** design system. Every colour, size, radius, space, shadow. |
| `src/styles/tokens.js` | Names deck colours (no values), springs, SRS constants. |
| `src/assets/svg.js` | Logo, icons and deck shapes, extracted from the Figma SVGs. |
| `src/lib/csv.js` | CSV fetch/parse, Sheets link conversion, `|` and `•` helpers. |
| `src/lib/evaluate.js` | Normalise + Levenshtein → Correct / Almost right / Not this time. |
| `src/lib/srs.js` | Leitner (1/2/4/8/16 days), scheduled from the checked answer, and the 20-card session builder. |
| `src/lib/prompt.js` | The AI prompt template the “Create with AI” builder fills in. |
| `src/screens/` | Auth, Home, Study, Done. |

## Sheet format

Row 1 names the sides (`English`, `Dutch`). Column A is the front, column B the back.
`gaan|lopen` accepts either answer. `eerst • dan` shows on two lines.
A cell can be a picture: a Wikimedia Commons file name (`Flag of Belgium.svg`, resolved via the Commons API for reliable loading) or a direct image link. A cell like `clock 6:30` shows a drawn analog clock.
A normal share link also works if the sheet is shared as “Anyone with the link”; it's converted to CSV.
