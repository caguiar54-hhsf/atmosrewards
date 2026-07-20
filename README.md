# Atmos Tracker

A standalone version of your Atmos Rewards points/status tracker, backed by Supabase instead
of Claude's artifact storage, ready to push to GitHub and deploy on Vercel.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. In the SQL editor, run everything in `supabase/schema.sql`. This creates one table
   (`kv_store`) with row-level security, so each signed-in user only ever sees their own data.
3. Under **Authentication → Providers**, make sure **Email** is enabled. This app signs people
   in with a magic link (no password), so under **Authentication → Email templates** you don't
   need to change anything — the default "Magic Link" template works.
4. Under **Project Settings → API**, copy the **Project URL** and the **anon public** key.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# paste your Project URL and anon key into .env.local
npm run dev
```

Open the local URL it prints, enter your email, and click the link that arrives to sign in.
The first time you sign in, the app starts empty — use the **Import CSV** button to load your
Atmos activity export (same format as before: `date, description, flightPoints, bonusPoints,
statusPoints, redeemPoints`).

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Atmos tracker"
git branch -M main
git remote add origin https://github.com/<you>/atmos-tracker.git
git push -u origin main
```

## 4. Deploy on Vercel

1. In Vercel, **Add New → Project**, import the GitHub repo you just pushed.
2. Vercel auto-detects Vite — leave the build command (`vite build`) and output directory
   (`dist`) as default.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (same values as your `.env.local`)
4. Deploy. Once it's live, add the Vercel URL to Supabase under **Authentication → URL
   Configuration → Redirect URLs**, so magic-link sign-in works from your deployed site.

## How data is stored

Everything the app saves (activity log, goal, beginning balance) goes into one Supabase table,
`kv_store`, as `(user_id, key, value)` rows — a straightforward key-value store scoped to
whoever's signed in. `src/lib/storageShim.js` is the only file that talks to Supabase; the rest
of the app (`src/AtmosTracker.jsx`) is unchanged from the Claude artifact version and has no
idea it's not running in Claude anymore.

## Notes

- This is unofficial and has no connection to Alaska Airlines, Hawaiian Airlines, or Atmos
  Rewards — it's just a personal tracker.
- Sign-in is passwordless (email magic link) via Supabase Auth, so there's no password to
  manage, but anyone with access to your email can sign in.
