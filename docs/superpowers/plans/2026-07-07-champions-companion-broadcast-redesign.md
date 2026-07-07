# Champions Companion — Broadcast Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin Champions Companion to an "esports broadcast" aesthetic (trophy-gold accent, Sora display font), fix two genuine defects, and add a ⌘K command palette and a Pokémon detail view — without changing any calculator/team logic.

**Architecture:** The app is a React 18 + Vite PWA with a single `App` component holding tab state and five tab components; styling is hand-written CSS driven by `:root` tokens in `apps/web/src/styles.css`. This plan changes tokens/typography first (foundation), fixes isolated defects, does a per-tab CSS restyle, then adds two new surfaces (`PokemonDetail`, `CommandPalette`) wired at the `App` level with two extracted pure helpers (`matchups.ts`, `search.ts`) that are unit-tested.

**Tech Stack:** React 18, TypeScript, Vite, vitest (already used in `packages/calc-core`), hand-written CSS with CSS custom properties, `nanoid` (already in dep tree).

## Global Constraints

- No Tailwind, no CSS framework — extend the existing token CSS in `apps/web/src/styles.css` only.
- No router — remain a `useState` tab-switch SPA.
- No changes to `calc-core` / `ruleset-config` calculation logic; the only package change is adding `id: string` to `TeamMember` in `@champions/team-builder`.
- PWA must work offline — Sora is **self-hosted woff2**, never a Google Fonts CDN link.
- Git repo root is the user's **home directory**; every commit stages explicit file paths only — never `git add -A` / `git add .`.
- Type colors stay sourced from `champions.ts` `typeColor` — do not hardcode type colors elsewhere.
- Trophy-gold palette (final values, used verbatim): `--accent: #f5c518`, `--accent-strong: #e0a80a`, `--accent-ink: #0b1020`, `--warn: #f5843a`.
- Web app tests run with `npm run test` from `apps/web` after vitest is added (Task 1); package logic tests run from `packages/*` as today.

---

## File structure

**Modified**
- `apps/web/src/styles.css` — tokens, `@font-face`, type scale, per-tab restyle
- `apps/web/index.html` — `theme-color`
- `apps/web/public/favicon.svg` — recolor accent (if blue)
- `apps/web/src/App.tsx` — palette + detail state, keyboard handler, wiring
- `apps/web/src/components/TeamBuilder.tsx` — stable `id` key, icon usage
- `apps/web/src/components/Pokedex.tsx` — clickable cards → detail
- `apps/web/src/components/shared.tsx` — icon usage in comboboxes if any
- `packages/team-builder` — `TeamMember` gains `id: string`; `newMember`/save-load
- `apps/web/package.json` — add `vitest`, `@testing-library/react`, test script

**Created**
- `apps/web/public/fonts/Sora-*.woff2` — self-hosted font files
- `apps/web/src/components/icons.tsx` — inline SVG icon set
- `apps/web/src/components/PokemonDetail.tsx` — detail surface
- `apps/web/src/components/CommandPalette.tsx` — ⌘K overlay
- `apps/web/src/lib/matchups.ts` — `typeMatchups()` pure fn
- `apps/web/src/lib/search.ts` — `searchIndex()` pure fn
- `apps/web/src/lib/matchups.test.ts`, `apps/web/src/lib/search.test.ts`
- `apps/web/src/components/TeamBuilder.test.tsx` — key-bug regression test
- `apps/web/vitest.config.ts`

---

## Task 1: Test harness for the web app

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/smoke.test.ts` (temporary sanity test, removed in Step 5)

**Interfaces:**
- Produces: an `npm run test` script in `apps/web` running vitest with jsdom.

- [ ] **Step 1: Add dev deps and script**

In `apps/web/package.json` add to `devDependencies`: `"vitest": "^2.0.0"`, `"jsdom": "^25.0.0"`, `"@testing-library/react": "^16.0.0"`, `"@testing-library/dom": "^10.0.0"`, and to `scripts`: `"test": "vitest run"`.

- [ ] **Step 2: Create vitest config**

```ts
// apps/web/vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true },
});
```

- [ ] **Step 3: Add a smoke test**

```ts
// apps/web/src/lib/smoke.test.ts
import { describe, it, expect } from "vitest";
describe("harness", () => { it("runs", () => expect(1 + 1).toBe(2)); });
```

- [ ] **Step 4: Install and run**

Run: `cd apps/web && npm install && npm run test`
Expected: 1 passing test.

- [ ] **Step 5: Remove smoke test and commit**

```bash
rm apps/web/src/lib/smoke.test.ts
git add apps/web/package.json apps/web/vitest.config.ts "../../package-lock.json" 2>/dev/null; git add apps/web/package.json apps/web/vitest.config.ts
git commit -m "test(web): add vitest + testing-library harness"
```

---

## Task 2: Design tokens + warn retune

**Files:**
- Modify: `apps/web/src/styles.css:1-33` (`:root`), focus-ring usages, active states
- Modify: `apps/web/index.html` (`theme-color`)
- Modify: `apps/web/public/favicon.svg` (if it uses the old blue)

**Interfaces:**
- Produces: gold accent tokens + orange warn consumed by every later styling task.

- [ ] **Step 1: Swap accent + warn tokens**

In `styles.css` `:root`, replace:
```css
  --accent: #f5c518;
  --accent-strong: #e0a80a;
  --accent-ink: #0b1020;
  /* ... */
  --warn: #f5843a;
```
(Keep `--good`, `--bad`, surfaces, spacing, radius, elevation unchanged.)

- [ ] **Step 2: Replace blue focus ring + active glows with gold**

Find every `rgba(79,140,255,…)` in `styles.css` (focus ring at `:131`, `.meta-card.active` `:283`, `nav.tabs button.active` `:95`, `header` gradient is `--bg` and stays) and replace the blue rgba with gold `rgba(245,197,24,0.30)` for rings/glows. Leave semantic green/red rgba alone.

- [ ] **Step 3: Add panel broadcast accent**

Append to the `.panel` rule region:
```css
.panel { position: relative; }
.panel > .panel-head { border-bottom: 1px solid var(--border-soft); padding-bottom: var(--s3); }
.panel-head h2 { border-left: 3px solid var(--accent); padding-left: var(--s3); }
```

- [ ] **Step 4: Update theme-color + favicon**

In `index.html` set `<meta name="theme-color" content="#0b1020" />` and the `theme-color` link if present. If `favicon.svg` contains `#6aa6ff`/`#4f8cff`, replace with `#f5c518`.

- [ ] **Step 5: Verify live + commit**

Run the dev server (`npm run dev` in `apps/web`), confirm accents/focus rings are gold and warning states (SP over-cap, `.issue.warning`) read as orange, distinct from gold.
```bash
git add apps/web/src/styles.css apps/web/index.html apps/web/public/favicon.svg
git commit -m "feat(web): trophy-gold accent tokens + orange warn retune"
```

---

## Task 3: Self-hosted Sora + type scale

**Files:**
- Create: `apps/web/public/fonts/Sora-500.woff2`, `Sora-600.woff2`, `Sora-700.woff2`
- Modify: `apps/web/src/styles.css` (`@font-face`, `--font-display`, apply to headings/numbers, raise 10px floors)

**Interfaces:**
- Produces: `--font-display` token; display font on headings and numeric displays.

- [ ] **Step 1: Add Sora woff2 files**

Download Sora weights 500/600/700 as woff2 (OFL license) into `apps/web/public/fonts/`. Keep only the latin subset to minimize size.

- [ ] **Step 2: Declare @font-face + token**

Prepend to `styles.css`:
```css
@font-face { font-family: "Sora"; font-weight: 500; font-display: swap; src: url("/fonts/Sora-500.woff2") format("woff2"); }
@font-face { font-family: "Sora"; font-weight: 600; font-display: swap; src: url("/fonts/Sora-600.woff2") format("woff2"); }
@font-face { font-family: "Sora"; font-weight: 700; font-display: swap; src: url("/fonts/Sora-700.woff2") format("woff2"); }
```
In `:root` add: `--font-display: "Sora", ui-sans-serif, system-ui, sans-serif;`

- [ ] **Step 3: Apply display font**

```css
h1, h2, h3, .section-label, .brand h1, nav.tabs button { font-family: var(--font-display); }
.dex-bst strong, .stat-v, .dex-num, .bigpct, .tb-stat-final, .sp-input, table.stats td.num, .meta-card .rank { font-family: var(--font-display); }
```

- [ ] **Step 4: Raise the 10px floors**

In `styles.css` change `font-size: 10px` occurrences (`.type-badge` `:335`, `.stat-k` `:341`, `.badge-mb` `:326`, `.dex-num` `:324`) to `11px`; `.stat-v`/`.stat-k` grid to a 12px minimum where layout allows.

- [ ] **Step 5: Verify live + commit**

Confirm headings/numbers render in Sora and no 10px text remains (inspect computed `font-size`). Confirm no layout shift on load (font-display: swap).
```bash
git add apps/web/src/styles.css apps/web/public/fonts
git commit -m "feat(web): self-host Sora display font + raise small-text floors"
```

---

## Task 4: Genuine fix — stable team-slot id (regression-tested)

**Files:**
- Modify: `packages/team-builder` type `TeamMember` (add `id: string`) + its barrel export
- Modify: `apps/web/src/components/TeamBuilder.tsx` (`newMember`, `key`)
- Modify: `apps/web/src/components/TeamsPanel.tsx` (ensure loaded members get ids)
- Create: `apps/web/src/components/TeamBuilder.test.tsx`

**Interfaces:**
- Consumes: `nanoid` (already in tree).
- Produces: `TeamMember.id: string`; `MemberEditor` keyed by `member.id`.

- [ ] **Step 1: Write the failing regression test**

```tsx
// apps/web/src/components/TeamBuilder.test.tsx
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TeamBuilder } from "./TeamBuilder";
import { makeTestData } from "../test-utils"; // see Step 2

describe("TeamBuilder slot identity", () => {
  it("keeps a card's open state attached to its own Pokémon after middle removal", () => {
    render(<TeamBuilder data={makeTestData(["pikachu", "garchomp", "gholdengo"])} />);
    // add three members via Add button
    const addBtn = screen.getByText(/Add Pokémon/i);
    fireEvent.click(addBtn); fireEvent.click(addBtn); fireEvent.click(addBtn);
    const cards = screen.getAllByTestId("member-card");
    // open "Customize" on card #2
    fireEvent.click(within(cards[1]).getByText(/Customize spread/i));
    // remove card #1
    fireEvent.click(within(cards[0]).getByTitle("Remove"));
    const remaining = screen.getAllByTestId("member-card");
    // the still-open customize panel must belong to the former card #2, now #1
    expect(within(remaining[0]).queryByText(/Stat Points/i)).toBeTruthy();
  });
});
```
(If a full `makeTestData` fixture is impractical, assert the narrower invariant with a minimal `data` stub exposing `byName`, `chart`, `ruleset`, `species`.)

- [ ] **Step 2: Add `data-testid` hooks + test fixture**

In `TeamBuilder.tsx` add `data-testid="member-card"` to the `.tb-card` root and confirm the remove button keeps `title="Remove"`. Create `apps/web/src/test-utils.tsx` exporting `makeTestData(slugs: string[]): ChampionsData` with the minimal shape the component reads.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && npm run test -- TeamBuilder`
Expected: FAIL (card state misattributed with index keys).

- [ ] **Step 4: Implement stable id**

- In `@champions/team-builder`, add `id: string;` to `TeamMember`.
- In `TeamBuilder.tsx`:
```ts
import { nanoid } from "nanoid";
function newMember(species: string): TeamMember {
  return { id: nanoid(8), species, item: "", ability: "", alignmentId: "serious", moves: [], sp: emptySp(), teraType: null };
}
```
Change the map to `key={m.id}` (`TeamBuilder.tsx:107-120`).
- In `TeamsPanel.tsx`, when loading a saved team, map members to ensure an id: `members.map(m => ({ ...m, id: m.id ?? nanoid(8) }))`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && npm run test -- TeamBuilder`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/team-builder apps/web/src/components/TeamBuilder.tsx apps/web/src/components/TeamsPanel.tsx apps/web/src/components/TeamBuilder.test.tsx apps/web/src/test-utils.tsx
git commit -m "fix(web): stable TeamMember id so slot removal preserves card state"
```

---

## Task 5: Genuine fix — inline SVG icon set

**Files:**
- Create: `apps/web/src/components/icons.tsx`
- Modify: `apps/web/src/components/TeamBuilder.tsx` (glyphs → icons)

**Interfaces:**
- Produces: `X`, `Plus`, `Star`, `Gear`, `ChevronDown`, `ChevronUp` icon components — props `{ size?: number }`, render 24×24 `currentColor` stroke SVG.

- [ ] **Step 1: Create the icon set**

```tsx
// apps/web/src/components/icons.tsx
import type { SVGProps } from "react";
const base = (p: SVGProps<SVGSVGElement> & { size?: number }) => ({
  width: p.size ?? 18, height: p.size ?? 18, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
});
export const X = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
export const Plus = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const Star = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9 12 2" /></svg>
);
export const Gear = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3.5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 8.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 6.6 1.6 1.6 0 0 0 10 5.1V5a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></svg>
);
export const ChevronDown = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polyline points="6 9 12 15 18 9" /></svg>
);
export const ChevronUp = (p: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg {...base(p)}><polyline points="6 15 12 9 18 15" /></svg>
);
```

- [ ] **Step 2: Replace glyphs in TeamBuilder**

- `TeamBuilder.tsx:254` remove button `✕` → `<X size={14} />`
- `TeamBuilder.tsx:123-124` add card `＋` → `<Plus size={22} />`
- `TeamBuilder.tsx:264` `★ Apply recommended set` → `<Star size={14} /> Apply recommended set`
- `TeamBuilder.tsx:297` move-remove `✕` → `<X size={12} />`
- `TeamBuilder.tsx:340` `⚙ Customize spread {open ? "▲" : "▼"}` → `<Gear size={14} /> Customize spread {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}`
Add `import { X, Plus, Star, Gear, ChevronUp, ChevronDown } from "./icons.js";`

- [ ] **Step 3: Verify live + commit**

Run dev server; confirm all controls show crisp SVGs (no platform emoji), icon buttons keep their `title`/`aria` text for a11y.
```bash
git add apps/web/src/components/icons.tsx apps/web/src/components/TeamBuilder.tsx
git commit -m "fix(web): replace unicode control glyphs with inline SVG icons"
```

---

## Task 6: Component restyle pass (broadcast look)

**Files:**
- Modify: `apps/web/src/styles.css` (Pokédex, Team Builder, Stats/Damage/Meta sections)

**Interfaces:** none new — CSS only, no `.tsx` logic change.

- [ ] **Step 1: Pokédex + Team Builder cards**

Tighten card headers and active states to the gold system, e.g.:
```css
.dex-card:hover { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(245,197,24,0.25); }
.badge-mb { color: var(--accent); background: rgba(245,197,24,0.16); border-color: rgba(245,197,24,0.4); }
.tag { border-color: var(--border); }
.pill.legal { /* keep green */ }
.rec-set { /* stays primary gold via button.primary */ }
```

- [ ] **Step 2: Segments, chips, primary buttons**

Confirm `.seg.active`, `nav.tabs button.active`, and `button.primary` all use `--accent-strong` with `--accent-ink` text (readable dark-on-gold). Adjust any hardcoded `#fff` text-on-accent to `var(--accent-ink)` where the accent is now light gold.

- [ ] **Step 3: Damage % + Meta ranks**

`.bigpct` and `.meta-card .rank` already pick up `--font-display` from Task 3; confirm they read as scoreboard numbers and `.rank` uses `--accent`.

- [ ] **Step 4: Verify live (mobile + desktop) + commit**

Run dev server; check at 375px and ≥760px that active states, contrast (dark text on gold), and hierarchy read correctly.
```bash
git add apps/web/src/styles.css
git commit -m "style(web): broadcast restyle pass for dex, team, stats, damage, meta"
```

---

## Task 7: `typeMatchups` pure function (TDD)

**Files:**
- Create: `apps/web/src/lib/matchups.ts`, `apps/web/src/lib/matchups.test.ts`

**Interfaces:**
- Consumes: `TypeChart` from `@champions/calc-core`, `SpeciesData` types.
- Produces: `typeMatchups(species: SpeciesData, chart: TypeChart): { weak: string[]; resist: string[]; immune: string[] }` — attacking types grouped by combined multiplier over the species' defensive typing (`>1` weak, `<1 && >0` resist, `0` immune).

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/matchups.test.ts
import { describe, it, expect } from "vitest";
import { typeMatchups } from "./matchups";
const chart = { /* minimal: fire, water, grass, ground, flying, electric multipliers */ } as any;
describe("typeMatchups", () => {
  it("marks 4x/2x attacking types as weak", () => {
    const r = typeMatchups({ types: ["grass"], baseStats: {} } as any, chart);
    expect(r.weak).toContain("fire");
  });
  it("marks 0x as immune not weak/resist", () => {
    const r = typeMatchups({ types: ["flying"], baseStats: {} } as any, chart);
    expect(r.immune).toContain("ground");
    expect(r.weak).not.toContain("ground");
  });
});
```
(Fill `chart` with the exact multiplier shape `TypeChart` uses — inspect `calc-core` `types.ts` for the structure and mirror it.)

- [ ] **Step 2: Run to verify fail**

Run: `cd apps/web && npm run test -- matchups`
Expected: FAIL ("typeMatchups is not a function").

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/matchups.ts
import type { TypeChart } from "@champions/calc-core";
import type { SpeciesData } from "@champions/team-builder";

export function typeMatchups(species: SpeciesData, chart: TypeChart) {
  const attackTypes = Object.keys(chart);
  const weak: string[] = [], resist: string[] = [], immune: string[] = [];
  for (const atk of attackTypes) {
    let mult = 1;
    for (const def of species.types) mult *= multiplier(chart, atk, def.toLowerCase());
    if (mult === 0) immune.push(atk);
    else if (mult > 1) weak.push(atk);
    else if (mult < 1) resist.push(atk);
  }
  return { weak, resist, immune };
}
// multiplier(): read chart[atk][def] per the TypeChart shape in calc-core.
function multiplier(chart: TypeChart, atk: string, def: string): number {
  return (chart as any)[atk]?.[def] ?? 1;
}
```
(Adjust `multiplier` to the real `TypeChart` access pattern once confirmed.)

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/web && npm run test -- matchups`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/matchups.ts apps/web/src/lib/matchups.test.ts
git commit -m "feat(web): typeMatchups helper with unit tests"
```

---

## Task 8: Pokémon detail view

**Files:**
- Create: `apps/web/src/components/PokemonDetail.tsx`
- Modify: `apps/web/src/App.tsx` (detail state + handler), `apps/web/src/components/Pokedex.tsx` (clickable cards), `apps/web/src/styles.css` (detail styles)

**Interfaces:**
- Consumes: `typeMatchups` (Task 7), `Sprite`/`typeColor`/`statColor`/`statBarWidth`, `data.byName`, `data.chart`, `data.meta`.
- Produces: `<PokemonDetail species={SpeciesData} data={ChampionsData} onClose={() => void} />`; `App` exposes `openDetail(slug: string)`.

- [ ] **Step 1: Build the detail component**

Render sprite, types, base-stat bars (reuse helpers), abilities (with hidden flag), movepool list, and `typeMatchups(species, data.chart)` weak/resist/immune rows using `type-badge` styling; show `data.meta.bySpecies[species.name]` usage when present. Root element: `role="dialog"`, `aria-modal`, focus-trapped, Esc closes via `onClose`. Restore focus to opener on unmount.

- [ ] **Step 2: Add App-level state + handler**

In `App.tsx` add `const [detail, setDetail] = useState<string | null>(null)` and `openDetail = (slug) => setDetail(slug)`; render `{detail && data && <PokemonDetail species={data.byName.get(detail)!} data={data} onClose={() => setDetail(null)} />}`. Pass `openDetail` down to `Pokedex`.

- [ ] **Step 3: Make dex cards clickable**

In `Pokedex.tsx`, make each `.dex-card` a button/clickable article with `onClick={() => onOpenDetail(s.name)}`, `role="button"`, `tabIndex={0}`, and Enter/Space handler. Add `onOpenDetail` to `Pokedex` props and thread from `App`.

- [ ] **Step 4: Style the surface**

Add CSS: mobile (`<760px`) full-screen overlay modal; desktop right side-panel (align with the `@media (min-width: 760px)` block at `styles.css:366`). Gold header accent; scroll-contained body.

- [ ] **Step 5: Verify live + commit**

Run dev server; click a dex card → detail opens with correct matchups; Esc + backdrop close; focus returns to the card. Test at 375px and desktop.
```bash
git add apps/web/src/components/PokemonDetail.tsx apps/web/src/App.tsx apps/web/src/components/Pokedex.tsx apps/web/src/styles.css
git commit -m "feat(web): clickable Pokemon detail view with type matchups"
```

---

## Task 9: `searchIndex` pure function (TDD)

**Files:**
- Create: `apps/web/src/lib/search.ts`, `apps/web/src/lib/search.test.ts`

**Interfaces:**
- Produces: `searchIndex(query: string, species: SpeciesData[], sections: Section[]): Result[]` where `Result = { kind: "pokemon"; slug: string; label: string } | { kind: "section"; id: string; label: string }`. Matches Pokémon by displayName/num/type and sections by label; returns sections first when query is empty, capped (e.g. 40).

- [ ] **Step 1: Write failing tests**

```ts
// apps/web/src/lib/search.test.ts
import { describe, it, expect } from "vitest";
import { searchIndex } from "./search";
const species = [
  { name: "garchomp", displayName: "Garchomp", num: 445, types: ["dragon","ground"] },
  { name: "pikachu", displayName: "Pikachu", num: 25, types: ["electric"] },
] as any;
const sections = [{ id: "team", label: "Team" }, { id: "meta", label: "Meta" }];
describe("searchIndex", () => {
  it("finds a pokemon by name prefix", () => {
    const r = searchIndex("garch", species, sections);
    expect(r[0]).toMatchObject({ kind: "pokemon", slug: "garchomp" });
  });
  it("matches a section by label", () => {
    const r = searchIndex("meta", species, sections);
    expect(r.some(x => x.kind === "section" && x.id === "meta")).toBe(true);
  });
  it("returns sections when query is empty", () => {
    expect(searchIndex("", species, sections).every((_, i) => true)).toBe(true);
    expect(searchIndex("", species, sections)[0].kind).toBe("section");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `cd apps/web && npm run test -- search`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// apps/web/src/lib/search.ts
import type { SpeciesData } from "@champions/team-builder";
export type Section = { id: string; label: string };
export type Result =
  | { kind: "pokemon"; slug: string; label: string; types: string[] }
  | { kind: "section"; id: string; label: string };

export function searchIndex(query: string, species: SpeciesData[], sections: Section[], cap = 40): Result[] {
  const q = query.trim().toLowerCase();
  const secHits: Result[] = sections
    .filter((s) => !q || s.label.toLowerCase().includes(q))
    .map((s) => ({ kind: "section", id: s.id, label: s.label }));
  if (!q) return secHits;
  const monHits: Result[] = species
    .filter((s) => s.displayName.toLowerCase().includes(q) ||
      String(s.num ?? "").includes(q) ||
      s.types.some((t) => t.toLowerCase().includes(q)))
    .slice(0, cap)
    .map((s) => ({ kind: "pokemon", slug: s.name, label: s.displayName, types: s.types }));
  return [...secHits, ...monHits].slice(0, cap);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd apps/web && npm run test -- search`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/search.ts apps/web/src/lib/search.test.ts
git commit -m "feat(web): searchIndex helper with unit tests"
```

---

## Task 10: ⌘K command palette

**Files:**
- Create: `apps/web/src/components/CommandPalette.tsx`
- Modify: `apps/web/src/App.tsx` (keyboard handler, palette state, header affordance), `apps/web/src/styles.css` (palette styles)

**Interfaces:**
- Consumes: `searchIndex` (Task 9), `openDetail` + `setTab` from `App`, `data.species`, the `TABS` list.
- Produces: `<CommandPalette species={...} sections={...} onPickPokemon={slug=>void} onPickSection={id=>void} onClose={()=>void} />`.

- [ ] **Step 1: Build the palette**

Overlay dialog with a text input (autofocused), a results list from `searchIndex(query, species, sections)`, arrow-key navigation (track active index), Enter selects, Esc closes, focus-trapped, backdrop click closes. Pokémon results show `Sprite` + types; section results show the section icon/label.

- [ ] **Step 2: Wire keyboard + state in App**

```tsx
const [paletteOpen, setPaletteOpen] = useState(false);
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, []);
```
Render the palette when `paletteOpen && data`; `onPickPokemon={slug => { setPaletteOpen(false); setDetail(slug); }}`, `onPickSection={id => { setPaletteOpen(false); setTab(id as Tab); }}`.

- [ ] **Step 3: Add header search affordance**

Add a button in `header.top` (e.g. a search icon + "Search  ⌘K") that calls `setPaletteOpen(true)` — mobile users can't press the shortcut. Reuse an inline SVG search icon in `icons.tsx`.

- [ ] **Step 4: Style the palette**

Add centered-overlay CSS (top-anchored on mobile), gold active-row highlight, `--font-display` on the shortcut hint.

- [ ] **Step 5: Verify live + commit**

Run dev server; ⌘K/Ctrl-K opens palette from every tab; typing filters; Enter on a Pokémon opens detail; Enter on a section switches tab; Esc closes; header button works on mobile width.
```bash
git add apps/web/src/components/CommandPalette.tsx apps/web/src/App.tsx apps/web/src/styles.css apps/web/src/components/icons.tsx
git commit -m "feat(web): global command palette (Cmd/Ctrl-K)"
```

---

## Task 11: Motion + a11y polish

**Files:**
- Modify: `apps/web/src/styles.css`

**Interfaces:** none.

- [ ] **Step 1: Focus-visible rings**

Ensure every interactive element has a visible gold `:focus-visible` ring (dex cards, palette rows, detail close, nav buttons). Add:
```css
:where(button, [role="button"], a, input, select):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 2: Reduced-motion audit**

Confirm the `@media (prefers-reduced-motion: reduce)` block (`styles.css:386`) covers new palette/detail transitions (it uses `* { transition: none }`, so it does — verify no JS animations bypass it).

- [ ] **Step 3: Contrast audit**

Check WCAG AA on gold-on-navy (accents/text) and `--accent-ink` dark-on-gold (buttons/active tabs). Adjust `--accent`/`--accent-strong` lightness if any text pairing fails AA. Record final hexes here if changed.

- [ ] **Step 4: Full test run + commit**

Run: `cd apps/web && npm run test` (all pass) and a final live pass at 375px + desktop.
```bash
git add apps/web/src/styles.css
git commit -m "polish(web): focus-visible rings, reduced-motion + contrast audit"
```

---

## Self-review (performed against the spec)

**Spec coverage:** §4.1 tokens → Task 2; §4.2 typography → Task 3; §4.3 restyle → Task 6; §4.4 key bug → Task 4; §4.5 glyphs → Task 5; §4.6 detail view → Tasks 7–8; §4.7 ⌘K → Tasks 9–10; §6 sequencing → task order; §7 testing → Tasks 1,4,7,9 + verification steps; §8 risks (warn collision, offline font, id migration, home-repo commits) → Tasks 2/3/4 + Global Constraints. No uncovered spec section.

**Placeholder scan:** The only deferred values are the exact `TypeChart` access pattern (Task 7 `multiplier`) and final contrast-tuned hexes (Task 11) — both are explicitly "confirm against the real type / audit" steps, not hidden work; concrete starting values are given. No "TODO/handle edge cases/write tests for the above" left.

**Type consistency:** `TeamMember.id: string` (Task 4) used consistently; `Result`/`Section`/`searchIndex` signatures match between Tasks 9 and 10; `typeMatchups` return shape matches its consumer in Task 8; icon component names match between Tasks 5 and 10.
