# Champions Companion

A competitive team-building and battle companion for **Pokémon Champions** (the
PvP-focused game; released 8 Apr 2026 on Switch / Switch 2, 17 Jun 2026 on
mobile). Built PWA-first so it can later be wrapped for Android (Pixel 9) and
iOS via Capacitor with no rewrite.

> Champions is **not** mainline Pokémon. This project encodes those differences
> as first-class rules — see "Champions mechanics" below.

## Status

Phase 1 (data layer foundation + stat calculator) is underway.

| Piece | State |
| --- | --- |
| `@champions/calc-core` — stat formula, alignments, SP caps, speed, recommender | ✅ implemented + verified |
| `@champions/overlay` — no-IV, final-evo pool, move overrides | ✅ implemented |
| `@champions/ruleset-config` — Reg M-B config + validator | ✅ seeded (some fields need your in-game confirmation) |
| Seed script (PokéAPI → SQLite cache) + source adapters | ✅ implemented (run locally; logic verified) |
| Damage calc — doubles-aware, Gen 9 formula, KO/survive queries | ✅ implemented + verified |
| Team builder — legality engine + team analysis | ✅ implemented + verified |
| Web PWA — Pokédex, stat calc, damage calc, team builder, meta | ✅ implemented (refreshed UI) |
| Meta dashboard + teammate recommender + meta-driven set prefill | ✅ implemented + verified |
| Sprites across the app (cached offline) | ✅ implemented |
| Accounts (Supabase) + save up to 5 teams | ✅ implemented (needs your Supabase project) |
| API layer · tournament feed | ⏳ planned |

## Champions mechanics (how this differs from mainline)

- **Stat Points (SP) replace EVs.** 66 SP total, max 32 per stat, **1 SP = +1 at
  Level 50**. No 510/252/4 system, no IV inputs — every Pokémon is a perfect 31.
- **Fixed Level 50**, doubles environment (spread reduction, Trick Room, Tailwind,
  redirection) assumed throughout. Singles support is architected for but off by
  default.
- **Stat Alignments** = Natures. 21 of them (the 4 redundant neutrals are gone);
  **Serious** is the only neutral.
- **Final-evolution-only** species pool at launch (config flag to relax later).
- **Trick Room** pattern: low base Speed + 0 SP Speed + a Speed-lowering alignment
  (Brave / Quiet / Relaxed / Sassy) — no 0-IV trick.
- **VP cost** of a spread is modelled (5 VP per SP).

### Stat formula (the one thing to confirm in-game)

Implemented default (Level 50, IV 31), community-inferred from ChampsDex
(verified 2026-06-11) and structurally identical to mainline with `floor(EV/4)`
replaced by `+SP`:

```
non-HP = floor( (floor(((2·Base + 31)·50)/100) + 5 + SP) × alignmentMod )
HP     = floor(((2·Base + 31)·50)/100) + 50 + 10 + SP
```

`alignmentMod` = 1.1 (boosted) / 0.9 (reduced) / 1.0 (neutral). SP is applied
**inside** the multiplier by default; this is configurable (`spApplication`) so
we can switch the instant the in-game Battle Data confirms the real rounding.

**Verified** two ways: (1) a hand-derived Garchomp build (Jolly, 32 Atk / 32 Spe
/ 2 HP → 185 / 182 / 115 / 90 / 105 / 169; run `node scripts/verify-formula.mjs`);
and (2) independently against championsbattledata's Level-50 / 0-SP "Battle Data"
stats, which reproduce exactly from the formula (Rotom-Wash, Charizard, Mega
Charizard X). The 0-SP relationship is clean — displayed = base + 20 (base + 75
for HP) — which is how base stats are recovered for Champions-only Mega forms.

## Roster (legal pool) — sourced from championsbattledata

PokéAPI is generation-agnostic and has neither the Champions roster nor its
Champions-only Mega Evolutions, so the legal pool is built from
**championsbattledata** instead (~357 forms incl. megas, with proper form names
like `Rotom [Wash Rotom]` and `Charizard [Mega Charizard X]`). Base stats are
recovered by inverting the L50/0-SP formula. PokéAPI is used only for the type
chart and movepool enrichment. (Forms whose movepool can't be sourced skip move
validation with a warning rather than false-flagging every move.)

## Architecture

Monorepo (npm workspaces). All competitive math lives in `calc-core` with zero
UI dependencies, so the future mobile app reuses it verbatim.

```
packages/
  calc-core/        # pure TS: stats, alignments, SP caps, speed, recommender (+ vitest)
  champions-overlay/# no-IV, final-evo policy, altered move-effect registry
  ruleset-config/   # regulation JSON + schema + validator (the file you update)
apps/
  web/              # React + TS + Vite PWA            (Phase 2+)
  api/              # Fastify: seed + cache + adapters  (Phase 2+)
data/
  sources/          # adapters: pokeapi, championsbattledata
  cache/            # local SQLite + raw asset cache (offline)
scripts/
  verify-formula.mjs# dependency-free formula check
```

**Stack:** React + TypeScript + Vite (PWA) · Fastify (Node) API · SQLite cache ·
adapter pattern per data source. Justification and the full data-source plan are
in the approved project brief discussion.

## Data sources & terms

- **PokéAPI** — base, game-agnostic data. Free, fair-use, caching encouraged.
  No Champions-specific data, so the overlay layer sits on top.
- **championsbattledata.com** — primary Champions meta/usage source. Public,
  documented API; [license](https://championsbattledata.com/license.html) permits
  personal / educational / competitive-analysis use **with attribution + a link
  back**. The app must credit it in the UI.
- **ChampDex** — reference only (no public API/reuse license; re-scrapes Serebii).
- **Serebii** — excluded by policy.

## Getting started (local, with network)

```bash
npm install
npm test                 # calc-core vitest suite
npm run verify:formula   # no-deps formula sanity check

# Build the local data cache (first run pulls PokéAPI; cached + offline after).
# Needs Node >= 22.5 for the built-in node:sqlite.
npm run seed             # static dex data only
npm run seed:meta        # also pull championsbattledata usage
```

The seed writes `data/cache/champions.sqlite`. Raw PokéAPI responses are cached
under `data/cache/raw/` so re-runs are fast and respect PokéAPI's fair-use
policy. The final-evolution legal pool is derived from PokéAPI evolution chains
at seed time (verified against linear, branching, and standalone chains).

### Run the web app (PWA)

```bash
npm run seed         # 1) build the SQLite cache (roster + type chart + movepools)
npm run seed:meta    #    optional: also pull championsbattledata usage data
npm run export:web   # 2) export cache -> apps/web/public/data/*.json
npm run export:dex   #    full National Dex (1000+) for the Pokédex tab
npm run web          # 3) start the Vite dev server (http://localhost:5173)
```

The **Pokédex** tab loads the full National Dex from PokéAPI (1000+ species,
filterable by type, sortable by any stat/BST). It falls back to the Champions
roster until `export:dex` has been run.

Tabs: **Pokédex** (entire roster — sprites, types, base stats, BST, abilities,
searchable/sortable), Stat Calculator, Damage Calculator, Team Builder, and
**Meta**. The Team Builder's species picker is a type-to-search box filtered to
ruleset-legal mons (via `legalSpeciesPool`): the Reg M-B **legal-species
allow-list of 224** (community-sourced from MetaVGC, matched at base-species
level so Megas and alternate forms resolve), minus any species ban list. Mons
outside the format (restricted legendaries, paradox mons, etc.) are hidden. The
**held-item field is a dropdown of the 148 legal items** (Mega Stones included);
items outside the list are flagged. Moves a species can't learn are already
flagged via its movepool. The legal lists are flagged `inferred` in the config —
verify against the in-game lists.

The **Pokédex** has a three-way regulation toggle — **Reg M-B (Current)**,
**Reg M-A** (derived as M-B minus the 22 species + 16 Megas M-B added), and
**All Pokémon** (full National Dex). Regulations live in
`packages/ruleset-config/rulesets/*.json` and are exported to
`data/regulations.json`, so adding a future reg is just another config file. The Team Builder pulls usage data per member — an **Apply most-used
set** button and tap-to-pick chips for moves/items/abilities/alignment/spreads —
and suggests teammates. The Meta tab opens on a **Top 10 most-used** card grid (inferred from teammate
co-occurrence, since this source has no usage %) and has a search box to look up
any eligible Pokémon's sets. In the Team Builder, each member's **Ability** is a
dropdown of only that species' legal abilities (no free text). The Meta tab and
suggestions appear once `seed:meta` + `export:web` have been run; without them
the app still works, just without usage data. Usage attribution to
championsbattledata is shown in-app, as its license requires.

The UI is mobile-first: a fixed bottom tab bar with SVG icons on phones (the
Pixel 9 install target), pill tabs on desktop, an 8px spacing rhythm, 44px touch
targets, and accessible dark-mode contrast.

> Re-seeding note: `npm run seed` now clears the species table first, so it
> fully replaces the roster. If you ever saw duplicate entries, they were stale
> rows from the earlier PokéAPI seed — a fresh `npm run seed && npm run export:web`
> clears them (or delete `data/cache/champions.sqlite` to start clean).

The app is a React + TS PWA with three tools — Stat Calculator, Damage
Calculator, Team Builder — wired directly to the shared `calc-core` /
`team-builder` packages, so all math runs in-browser. It's installable to a
phone home screen and works offline (the exported data is cached by the service
worker). For a polished install icon, drop `icon-192.png` and `icon-512.png`
into `apps/web/public/` (an SVG favicon is included as a placeholder).

## Deploy to your phone (Pixel 9)

The app is a PWA, so the simplest install is "build → host over HTTPS → Add to
Home Screen". A service worker needs a secure context, so plain `http://<LAN-IP>`
won't register for offline/installation — use one of the HTTPS options below.

```bash
# Build the static site (outputs apps/web/dist)
npm run export:web && npm run export:dex   # make sure data is exported first
npm run build --workspace @champions/web
```

**Option A — free static host (recommended).** Deploy `apps/web/dist` to any
static host with HTTPS:
- Netlify: `npx netlify deploy --dir=apps/web/dist --prod`
- Cloudflare Pages: `npx wrangler pages deploy apps/web/dist`
- Vercel: `npx vercel deploy apps/web/dist --prod`

Then open the URL in Chrome on the Pixel 9 → ⋮ menu → **Add to Home screen /
Install app**. It installs as a standalone app and works offline (data + sprites
are cached by the service worker).

**Option B — quick HTTPS tunnel (no account).** Serve the build locally and
expose it over HTTPS with a tunnel:
```bash
npm run preview --workspace @champions/web   # serves dist on :4173
npx cloudflared tunnel --url http://localhost:4173
```
Open the printed `https://…trycloudflare.com` URL on the phone → Install.

**Option C — real APK via Capacitor.** For a sideloaded native app (no browser):
```bash
cd apps/web && npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Champions Companion" com.you.champions --web-dir=dist
npm run build && npx cap add android && npx cap copy
npx cap open android   # build/run the APK from Android Studio onto the Pixel 9
```
Because the PWA already wraps the shared TS packages, Capacitor reuses the same
build with no code changes.

## Keep meta data fresh automatically (weekly poller)

The live site's usage/meta data can refresh on its own — no PC or Claude session
needed — via GitHub Actions, which re-pulls usage and redeploys to Netlify.

- Workflow: `.github/workflows/refresh-meta.yml` runs **weekly** (Mondays 06:00
  UTC) and on manual dispatch. It's intentionally weekly, not daily, so the
  scheduled build stays comfortably inside GitHub Actions / Netlify free-tier
  limits — usage data moves slowly. To change the cadence, edit the `cron:` line.
- What runs: `npm run refresh:meta` (script `scripts/refresh-meta.ts`) reads the
  committed `apps/web/public/data/species.json`, re-pulls Doubles usage per
  species from championsbattledata, and rewrites `apps/web/public/data/meta.json`
  (only usage — much lighter than `seed:meta`, which rebuilds the whole roster).
  Then it builds the web app, deploys to Netlify, and commits the refreshed JSON.
- Run it locally any time: `npm run refresh:meta`.

**One-time owner setup:**
1. This project must be a GitHub repo, and `apps/web/public/data/*.json` must be
   committed (they are not git-ignored; `.env` stays ignored).
2. Add these GitHub repo **secrets** (Settings → Secrets and variables → Actions):
   - `NETLIFY_AUTH_TOKEN` — Netlify → User settings → Applications → new token.
   - `NETLIFY_SITE_ID` — Netlify site → Site configuration → Site ID.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — the same public values as
     `apps/web/.env` (so the deployed build keeps auth; the anon key is
     public-safe).
3. Trigger it once from the **Actions** tab (Run workflow) to confirm it deploys;
   the weekly schedule then runs on its own.

## Save teams (accounts, optional)

Saving teams is gated behind a login, backed by **Supabase** (free). The app
works fully without it — only the "Save current" feature needs an account. Auth
is handled by Supabase (no hand-rolled passwords); each account only sees its
own teams via row-level security, capped at 5.

1. Create a free project at https://supabase.com.
2. In **Project Settings → API**, copy the **Project URL** and the **anon public**
   key (both are client-safe — never use the `service_role` key). Put them in
   `apps/web/.env` (see `apps/web/.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
   For Netlify, also add these two as environment variables (they're inlined at
   build time).
3. In the Supabase **SQL editor**, run:
   ```sql
   create table teams (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null default auth.uid() references auth.users on delete cascade,
     name text not null,
     data jsonb not null,
     created_at timestamptz not null default now()
   );
   alter table teams enable row level security;
   create policy "own teams: select" on teams for select using (auth.uid() = user_id);
   create policy "own teams: insert" on teams for insert with check (auth.uid() = user_id);
   create policy "own teams: delete" on teams for delete using (auth.uid() = user_id);

   -- Grant table access to the logged-in role. Supabase usually auto-grants this
   -- on new public tables, but if it doesn't you get "permission denied for
   -- table teams" (a GRANT error, checked before RLS). RLS above still limits
   -- each user to their own rows.
   grant select, insert, delete on table teams to authenticated;

   -- Enforce the 5-team cap server-side too (not just in the UI).
   create or replace function enforce_team_limit() returns trigger as $$
   begin
     if (select count(*) from teams where user_id = auth.uid()) >= 5 then
       raise exception 'Team limit (5) reached';
     end if;
     return new;
   end; $$ language plpgsql;
   create trigger team_limit before insert on teams
     for each row execute function enforce_team_limit();
   ```
4. (Optional) In **Authentication → Providers → Email**, turn off "Confirm email"
   for instant sign-in, or leave it on and confirm via the email link.
5. `npm install`, rebuild, redeploy. The Team Builder's Teams panel now shows a
   login; sign up once and save up to 5 teams that sync across devices.

## What needs your confirmation

The Reg M-B config (`packages/ruleset-config/rulesets/reg-m-b.json`) marks every
field with provenance. Currently **verified**: base pool (final evolutions),
Megas allowed. **Needs your in-game check**: Tera allowed?, restricted limit,
the four ban lists, restricted-species list, and the presumed end date. Until
confirmed, those are flagged `unverified` and the UI should surface that.
