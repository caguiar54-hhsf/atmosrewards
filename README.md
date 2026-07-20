# Atmos Tracker

A standalone, multi-user version of the Atmos Rewards points/status tracker, backed by
Supabase instead of Claude's artifact storage. Anyone can create their own account and see
only their own points — ready to push to GitHub and deploy on Vercel.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. In the SQL editor, run everything in `supabase/schema.sql`. This creates:
   - `kv_store`, a table for each person's activity/goal/beginning-balance data, with
     row-level security so everyone only ever sees their own rows.
   - A public `avatars` Storage bucket (for profile photos), with policies so anyone can view
     a photo but only its owner can upload, replace, or delete it.
3. Under **Authentication → Providers**, make sure **Email** is enabled (it is by default).
   This app uses email + password, with Supabase's standard email confirmation and
   password-reset emails — you don't need to change the default templates.
4. Under **Authentication → URL Configuration**, set **Site URL** to your app's URL (use
   `http://localhost:5173` for now — you'll update this to your real deployed URL in step 4),
   and add the same URL under **Redirect URLs**. This is what confirmation and
   password-reset links point back to.
5. Under **Project Settings → API** (or **Settings → API Keys** on newer dashboards), copy the
   **Project URL** and the **anon / public** (or **Publishable**) key.

## 2. Run it locally

```bash
npm install
cp .env.example .env.local
# paste your Project URL and anon key into .env.local
npm run dev
```

Open the local URL it prints. From there:

- **Create an account** with an email and password. Supabase emails a confirmation link —
  click it, then come back and sign in.
- **Forgot password?** sends a reset-password email; clicking it brings you back to a
  "set new password" screen.
- Once signed in, the hamburger menu (top-left) has **Profile** (name + photo), **Reset
  password**, **Import CSV**, **Beginning balance**, and **Redemption goal**, plus **Sign out**
  at the bottom.
- The app starts empty for each new account — use **Import CSV** from the menu to load an
  Atmos activity export (columns: `date, description, flightPoints, bonusPoints,
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

(Prefer not to use the command line? GitHub Desktop does all of this with buttons — see the
"Going live" guide from earlier in this project if you have it.)

## 4. Deploy on Vercel

1. In Vercel, **Add New → Project**, import the GitHub repo you just pushed.
2. Vercel auto-detects Vite — leave the build command (`vite build`) and output directory
   (`dist`) as default.
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (same values as your `.env.local`)
4. Deploy. Once it's live, go back to Supabase → **Authentication → URL Configuration** and
   update **Site URL** and **Redirect URLs** to your real Vercel URL — this is what makes
   email confirmation and password-reset links work from the deployed site instead of
   `localhost`.

## Multiple people using this

Anyone with your deployed URL can create their own account (email + password). Each account's
data is completely separate — the `kv_store` row-level security policies mean one person's
points, goals, and beginning balance are invisible to everyone else, and profile photos are
stored in that person's own folder in the `avatars` bucket. There's no admin approval step by
default — anyone who signs up and confirms their email can use the app. If you'd rather keep it
private, don't share the URL, or ask me about adding an invite-only gate.

## How data is stored

- **Activity, goal, beginning balance**: one Supabase table, `kv_store`, as
  `(user_id, key, value)` rows — a straightforward key-value store scoped to whoever's signed
  in. `src/lib/storageShim.js` is the only file that talks to this table; the tracker itself
  (`src/AtmosTracker.jsx`) just calls `window.storage` exactly like it did as a Claude
  artifact.
- **Profile (name + photo)**: stored on the Supabase Auth user itself (`user_metadata`), via
  `src/lib/profile.js`. Photos are uploaded to the `avatars` Storage bucket.

## Installing it like an app

This is set up as a installable PWA (`vite-plugin-pwa`), so once it's deployed:

- **iPhone (Safari)**: open the site, tap Share → **Add to Home Screen**.
- **Android (Chrome)**: open the site, tap the menu (⋮) → **Add to Home screen** / **Install
  app** (Chrome sometimes prompts automatically).

It'll then open full-screen with its own icon, no browser address bar. The icon currently
reuses `public/b31sb3lrs6tg1.png` at whatever size it happens to be — perfectly functional,
but for a crisper home-screen icon later, add proper 192x192 and 512x512 PNGs to `public/` and
point the `icons` entries in `vite.config.js` at them instead.

This only works over **https** — `localhost` during local dev is a built-in exception, but
once deployed, Vercel's `https` URL is what makes it installable.

## Notes

- This is unofficial and has no connection to Alaska Airlines, Hawaiian Airlines, or Atmos
  Rewards — it's just a personal tracker.
- Sign-in is email + password now (previously a passwordless magic link). Password reset and
  email confirmation both work through Supabase's built-in email flow — no extra email
  service to configure.
