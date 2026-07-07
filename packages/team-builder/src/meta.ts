import type { StatTable } from "@champions/calc-core";

/**
 * Champions meta/usage types + recommender.
 *
 * Shape mirrors what championsbattledata exposes per Pokémon: ranked moves,
 * items, abilities, Stat Alignments, SP spreads (with point arrays), and
 * teammates. (That source does not expose species-level usage %, checks &
 * counters, or a Tera breakdown, so those aren't modelled here.)
 */
export type MetaCategory =
  | "move"
  | "item"
  | "ability"
  | "alignment"
  | "teammate"
  | "spread";

export interface MetaRow {
  category: MetaCategory;
  rank: number;
  name: string; // move/item/ability/alignment/teammate; "" for spread
  percentage: string; // e.g. "89.1%" or "" (teammates often have none)
  percentageValue: number | null;
  /** Present for category "spread": the SP allocation. */
  spread?: StatTable;
  /** Present for category "alignment". */
  statUp?: string;
  statDown?: string;
}

/** All meta rows for one species (any categories). */
export type SpeciesMeta = MetaRow[];

/** Returns the meta rows for a species slug, or null if none cached. */
export type MetaProvider = (speciesSlug: string) => SpeciesMeta | null;

const slugify = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "-");

export function rowsByCategory(meta: SpeciesMeta, category: MetaCategory): MetaRow[] {
  return meta
    .filter((r) => r.category === category)
    .sort((a, b) => a.rank - b.rank);
}

export interface TeammateSuggestion {
  species: string; // slug
  displayName: string; // as listed in usage data
  /** Rank-weighted co-occurrence score across current team members. */
  score: number;
  /** How many current members list this teammate. */
  fromCount: number;
}

/**
 * Suggest teammates for a partial team, weighted by how each current member's
 * usage data ranks them (rank 1 = strongest signal) and how many members share
 * the suggestion. Anything already on the team is excluded.
 */
export function recommendTeammates(
  memberSlugs: string[],
  getMeta: MetaProvider,
  opts: { limit?: number } = {}
): TeammateSuggestion[] {
  const onTeam = new Set(memberSlugs.map((s) => slugify(s)));
  const agg = new Map<string, TeammateSuggestion>();

  for (const member of memberSlugs) {
    const meta = getMeta(member);
    if (!meta) continue;
    for (const row of rowsByCategory(meta, "teammate")) {
      const slug = slugify(row.name);
      if (!slug || onTeam.has(slug)) continue;
      const weight = Math.max(0, 11 - row.rank) / 10; // rank 1 -> 1.0, rank 10 -> 0.1
      const cur =
        agg.get(slug) ??
        { species: slug, displayName: row.name, score: 0, fromCount: 0 };
      cur.score += weight;
      cur.fromCount += 1;
      agg.set(slug, cur);
    }
  }

  return [...agg.values()]
    .sort((a, b) => b.score - a.score || b.fromCount - a.fromCount)
    .slice(0, opts.limit ?? 10);
}

export interface UsageRank {
  species: string; // slug
  score: number;
}

/**
 * Approximate "most-used" species for the format. championsbattledata doesn't
 * expose species-level usage %, so we infer popularity from teammate
 * co-occurrence: a species that shows up (highly-ranked) in many other species'
 * teammate lists is a meta staple. Only species that themselves have meta data
 * are returned, so each result is browsable.
 */
export function topUsedSpecies(
  bySpecies: Record<string, SpeciesMeta>,
  opts: { limit?: number } = {}
): UsageRank[] {
  const score = new Map<string, number>();
  for (const meta of Object.values(bySpecies)) {
    for (const row of rowsByCategory(meta, "teammate")) {
      const slug = slugify(row.name);
      if (!slug) continue;
      score.set(slug, (score.get(slug) ?? 0) + Math.max(0, 11 - row.rank) / 10);
    }
  }
  return [...score.entries()]
    .filter(([slug]) => bySpecies[slug]) // keep only browsable species
    .map(([species, s]) => ({ species, score: Math.round(s * 10) / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit ?? 10);
}

/** Most-used SP spread + alignment for a species, for "apply meta set". */
export function topSpread(
  meta: SpeciesMeta
): { spread: StatTable | null; alignment: string | null } {
  const spread = rowsByCategory(meta, "spread")[0]?.spread ?? null;
  const alignment = rowsByCategory(meta, "alignment")[0]?.name ?? null;
  return { spread, alignment };
}

export interface MetaSet {
  moves: string[]; // up to 4, slugified
  item: string | null; // slug
  ability: string | null; // slug
  alignmentId: string | null; // calc-core alignment id
  spread: StatTable | null;
}

/**
 * The single most-used build for a species, derived from usage data and shaped
 * to drop straight into a TeamMember. Names are slugified to match the species
 * movepool / ability slugs and the Stat Alignment ids.
 */
export function metaSet(meta: SpeciesMeta): MetaSet {
  return {
    moves: rowsByCategory(meta, "move").slice(0, 4).map((r) => slugify(r.name)),
    item: pickSlug(meta, "item"),
    ability: pickSlug(meta, "ability"),
    alignmentId: rowsByCategory(meta, "alignment")[0]?.name?.toLowerCase() ?? null,
    spread: rowsByCategory(meta, "spread")[0]?.spread ?? null,
  };
}

function pickSlug(meta: SpeciesMeta, cat: MetaCategory): string | null {
  const name = rowsByCategory(meta, cat)[0]?.name;
  return name ? slugify(name) : null;
}
