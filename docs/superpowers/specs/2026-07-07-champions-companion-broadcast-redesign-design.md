# Champions Companion — Broadcast Redesign (Design Spec)

**Date:** 2026-07-07
**App:** `champions-companion/apps/web` (React 18 + Vite PWA, hand-written CSS)
**Status:** Approved design — pending implementation plan

---

## 1. Context & motivation

Champions Companion is a VGC (Pokémon "Champions" ruleset) companion tool: a
single-page app with five tabs — **Pokédex, Stats, Damage, Team, Meta** — driven
by `useState` (no router). The engineering is solid: a real CSS design-token
system, mobile-first fixed bottom tab bar, 44px touch targets, `tabular-nums`,
`content-visibility` on the dex grid, and `prefers-reduced-motion` support.

A prior external review criticized the app for being a "Tailwind-default dev
tool" with emoji icons, missing CSS variables, a nested-button bug, a
1,077-row Speed Tiers page, a Type Chart stub, and no mobile nav. **None of that
matches this codebase** — there is no Tailwind, no router, no such pages, and the
bottom nav already exists. The review described a different or imagined app.

What *does* stand up from that review:
- The **aesthetic ambition** — the app looks functional but visually generic
  (blue accent, system font), and could read as a polished "broadcast" tool.
- The **⌘K global-search idea** — the whole app is fundamentally a lookup tool.
- Two **genuine defects** found during a fresh read (below).

This spec covers a focused redesign in the chosen direction: **"esports
broadcast overlay"** — dark navy base, single trophy-gold accent, Sora display
typeface — plus the two real fixes and two new surfaces (⌘K palette, detail view).

## 2. Goals / non-goals

**Goals**
- Reskin to a cohesive broadcast aesthetic without changing calculator/team logic.
- Fix the two genuine defects (team-slot key bug, unicode-glyph controls).
- Add a global ⌘K command palette (Pokémon + section jumps).
- Add a clickable Pokémon detail view (the ⌘K destination).

**Non-goals**
- No change to `calc-core`, `team-builder`, or `ruleset-config` package logic.
- No router migration — remain a tab-switch SPA.
- No data-model/schema changes to the exported JSON.
- No Tailwind, no CSS framework — stay with the existing hand-written token CSS.

## 3. Design decisions (locked)

| Decision | Choice |
|---|---|
| Direction | **A — esports broadcast overlay** (evolve current dark look) |
| Base | Keep dark navy surfaces, 4/8 spacing, radius & elevation scales |
| Accent | **Trophy gold** (`#f5c518` family); `--accent-strong` deeper gold; `--accent-ink` near-black for text-on-gold |
| Warn color | **Shift to orange** (~`#f5843a`) so caution ≠ brand gold. `--good`/`--bad` unchanged |
| Display font | **Sora**, self-hosted local woff2 (weights 500/600/700), `font-display: swap` — **not** a Google Fonts link (PWA must work offline) |
| Body font | Existing system stack (no second web font on data-dense pages) |
| Icons | Inline SVG in the existing hand-drawn nav-icon style — **zero new dependency** |

## 4. Detailed design

### 4.1 Design tokens — `styles.css` `:root`
- Replace `--accent`/`--accent-strong` with trophy-gold values; keep
  `--accent-ink` dark for legible text on gold buttons/active states.
- Replace `--warn` with an orange value; audit all `--warn` usages
  (SP-cap text, `.issue.warning`, `.sp-input` color) still read as "caution."
- Replace the blue focus ring (`box-shadow: 0 0 0 3px rgba(79,140,255,.3)`)
  with a gold-tinted ring; same treatment for `.meta-card.active`, `.seg.active`,
  `nav.tabs button.active`, `button.primary`.
- Add a "broadcast" panel treatment: hairline gold top-accent on `.panel`
  headers and a faint gold glow on active/focus. Subtle — no gradients-as-drama.
- Update `index.html` `theme-color` and `<meta name="theme-color">` to the new
  base; update `favicon.svg` accent if it uses blue.

### 4.2 Typography
- Add self-hosted Sora woff2 files under `apps/web/public/fonts/` (or `src/`
  assets imported by Vite) + `@font-face` rules in `styles.css`.
- New token `--font-display: "Sora", var(--font-body)`.
- Apply `--font-display` to: `h1/h2/h3`, `.section-label`, nav labels, and all
  **numeric stat displays** — BST, dex stat values, speed-tier speeds, damage
  `%`, final stats, SP totals — pairing Sora with existing `tabular-nums`.
- **Type-scale floor:** raise 10px labels (`.stat-k`, `.type-badge`, `.dex-num`,
  `.badge-mb`) to an 11–12px minimum; body stays 16px.

### 4.3 Component restyle (broadcast pass — CSS + className only, no logic)
Restyle as "tournament stat cards" across all tabs:
- **Pokédex:** dex cards get a stronger header row (num + reg badge), gold
  hover/active, refined type badges and stat bars.
- **Team Builder:** member cards get a clearer head/accent, gold pills/tags,
  restyled SP/stat block; the "Apply recommended set" becomes the primary gold CTA.
- **Stats / Damage / Meta:** consistent panel headers, gold active segments,
  the big damage `%` in Sora.
Component `.tsx` logic is untouched except where §4.4/§4.5/§4.6 require it.

### 4.4 Genuine fix — team-slot key bug
`TeamBuilder` renders `<MemberEditor key={i}>` using the array index
(`TeamBuilder.tsx:107-120`). Removing a middle slot reattaches each card's
internal React state (the "Customize spread" open/closed toggle in
`MemberEditor`, and the `SpeciesCombobox` input state) to the wrong Pokémon.

**Fix:** give each `TeamMember` a stable `id` at creation time (`newMember`)
using `nanoid` (already present in the dependency tree), and key on `m.id`.
- Touch points: `newMember()` in `TeamBuilder.tsx`; the `TeamMember` type in
  `@champions/team-builder` (add `id: string`); `TeamsPanel` save/load must
  preserve/regenerate ids for loaded teams; `checkTeam`/`speedTiers`/etc. are
  keyed by species and unaffected.
- **Test:** a small unit/DOM test — build a 3-member team, toggle "Customize"
  on member #2, remove member #1, assert member #2's open state and identity
  stay correct.

### 4.5 Genuine fix — glyphs → icons
Replace unicode control glyphs with inline SVG icons matching the existing
`App.tsx` nav-icon style (24×24, `currentColor`, `stroke-width 2`):
- `✕` remove (`icon-btn`, move-remove) → X icon
- `＋` add member (`tb-add-plus`) → plus icon
- `★` apply recommended set → star icon
- `⚙` customize + `▲/▼` disclosure → gear + chevron icons
Create `apps/web/src/components/icons.tsx` exporting these as small components.

### 4.6 Pokémon detail view (new surface)
Clicking a dex card (and selecting a Pokémon in ⌘K) opens a detail surface:
- **Layout:** modal/overlay on mobile (`<760px`), right side-panel on desktop —
  matching the existing responsive breakpoint at `styles.css:366`.
- **Content:** sprite, types, full base-stat bars (reuse `statColor`/
  `statBarWidth`), abilities (with hidden flag), movepool, and **type matchups
  computed from `data.chart`**, plus meta usage when `data.meta.bySpecies[slug]`
  exists.
- **New pure function** `typeMatchups(species, chart)` → `{ weak, resist,
  immune }` type lists. Extracted and **unit-tested** against `calc-core`'s
  `TypeChart`.
- Reuses `Sprite`, `typeColor`; no new data fetching (all data already loaded).
- Focus-trapped, Esc to close, restores focus to the invoking card.

### 4.7 ⌘K command palette (new surface)
- Global overlay opened by **⌘K / Ctrl-K**, plus a visible search affordance in
  the header for mouse/touch (mobile can't type a shortcut).
- **Index:** all Pokémon (name, types, num) + the five section jumps. Built from
  the already-loaded species list; reuse the existing combobox/Pokédex filter
  logic — extract the filter into a pure `searchIndex(query, species, sections)`
  function and **unit-test** it.
- **Behavior:** selecting a Pokémon opens the §4.6 detail view; selecting a
  section switches the active tab. Arrow-key navigation, Enter to select, Esc to
  close, focus-trapped, focus restored on close.
- Lives at the `App` level so it's reachable from every tab; tab-switch and
  detail-open are lifted to `App` state (or a small context) as needed.

## 5. Architecture / state changes
- `App` gains: command-palette open state, and a "selected detail species" +
  handlers, so both ⌘K and dex-card clicks route to the same detail surface.
  Tab state already lives in `App`.
- Pure helpers extracted for testability: `typeMatchups`, `searchIndex`.
- New files: `components/icons.tsx`, `components/CommandPalette.tsx`,
  `components/PokemonDetail.tsx`, `lib/search.ts`, `lib/matchups.ts`.
- `TeamMember` type gains `id: string` (`@champions/team-builder`).

## 6. Sequencing (each phase = one clean commit)
1. **Tokens + typography** — palette, warn retune, Sora self-host, type-scale floor.
2. **Genuine fixes** — team-slot `id` key; glyphs → `icons.tsx`.
3. **Component restyle pass** — per-tab broadcast styling.
4. **Detail view** — `PokemonDetail` + `matchups.ts` (+ test); wire dex-card click.
5. **⌘K palette** — `CommandPalette` + `search.ts` (+ test); wire shortcut & header affordance; route to detail/tabs.
6. **Motion / a11y polish** — gold focus rings, reduced-motion audit, WCAG
   contrast check on gold-on-navy and text-on-gold.

## 7. Testing
- `calc-core` uses vitest; the web app is currently untested.
- Add focused unit tests for the two extracted pure functions: `typeMatchups`
  and `searchIndex`.
- Add one DOM/interaction test for the team-slot key fix (§4.4).
- Restyle/visual phases verified by running the Vite dev server and inspecting
  live (computed styles + DOM), plus a mobile-width pass.

## 8. Risks & mitigations
- **Gold/warn collision** → resolved by shifting warn to orange (§4.1); verify
  with a contrast/legibility pass in Phase 6.
- **Offline PWA + web font** → self-host Sora; never a CDN link.
- **`TeamMember.id` migration** → loaded/saved teams must gain ids on load so
  older saved teams don't crash; covered in §4.4 touch points.
- **Home-directory git repo** → the repo root is the user's home folder; commit
  only explicit file paths, never `git add -A`.

## 9. Open items
- Exact hex values for gold / warn finalized during Phase 1 against a contrast check.
- Sora weight subset (500/600/700 vs fewer) confirmed once real headings are styled.
