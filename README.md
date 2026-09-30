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
   Already set up from an earlier version? Run `supabase/002_shapes.sql` once instead (adds deck shapes).
2. Authentication → Providers → Email: on. Turn off “Confirm email” if you want instant sign-in while testing.
3. Copy the project URL and anon key into `.env.local` (and into Vercel → Settings → Environment Variables).

Per-user preferences (colour mode, banner dismissed, sample seeded) live in the auth user's metadata, so
there is no profiles table.

## Deploy

Push to GitHub, import in Vercel, add the two `VITE_SUPABASE_*` variables. `vercel.json` handles SPA routing.

## Where things live

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | **The** design system. Every colour, size, radius, space, shadow. |
| `src/styles/tokens.js` | Names deck colours (no values), springs, SRS constants. |
| `src/assets/svg.js` | Logo, icons and deck shapes, extracted from the Figma SVGs. |
| `src/lib/csv.js` | CSV fetch/parse, Sheets link conversion, `|` and `•` helpers. |
| `src/lib/evaluate.js` | Normalise + Levenshtein → Correct / Almost right / Not this time. |
| `src/lib/srs.js` | Leitner (1/2/4/8/16 days) and the 20-card session builder. |
| `src/screens/` | Auth, Home, Study, Done. |

## Sheet format

Row 1 names the sides (`English`, `Dutch`). Column A is the front, column B the back.
`gaan|lopen` accepts either answer. `eerst • dan` shows on two lines.
A normal share link also works if the sheet is shared as “Anyone with the link”; it's converted to CSV.

Live
