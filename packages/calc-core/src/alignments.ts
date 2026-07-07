import type { StatAlignment, StatKey } from "./types.js";

/**
 * The 21 Stat Alignments in Pokémon Champions.
 *
 * Champions removed the four redundant neutral natures (Hardy, Docile, Bashful,
 * Quirky); only Serious remains neutral. Boost = ×1.1, reduce = ×0.9.
 *
 * Source: ChampsDex full Stat Alignment chart (last verified 2026-06-11).
 */
export const STAT_ALIGNMENTS: readonly StatAlignment[] = [
  { id: "lonely", name: "Lonely", boost: "atk", reduce: "def" },
  { id: "adamant", name: "Adamant", boost: "atk", reduce: "spa" },
  { id: "naughty", name: "Naughty", boost: "atk", reduce: "spd" },
  { id: "brave", name: "Brave", boost: "atk", reduce: "spe" },
  { id: "bold", name: "Bold", boost: "def", reduce: "atk" },
  { id: "impish", name: "Impish", boost: "def", reduce: "spa" },
  { id: "lax", name: "Lax", boost: "def", reduce: "spd" },
  { id: "relaxed", name: "Relaxed", boost: "def", reduce: "spe" },
  { id: "modest", name: "Modest", boost: "spa", reduce: "atk" },
  { id: "mild", name: "Mild", boost: "spa", reduce: "def" },
  { id: "rash", name: "Rash", boost: "spa", reduce: "spd" },
  { id: "quiet", name: "Quiet", boost: "spa", reduce: "spe" },
  { id: "calm", name: "Calm", boost: "spd", reduce: "atk" },
  { id: "gentle", name: "Gentle", boost: "spd", reduce: "def" },
  { id: "careful", name: "Careful", boost: "spd", reduce: "spa" },
  { id: "sassy", name: "Sassy", boost: "spd", reduce: "spe" },
  { id: "timid", name: "Timid", boost: "spe", reduce: "atk" },
  { id: "hasty", name: "Hasty", boost: "spe", reduce: "def" },
  { id: "jolly", name: "Jolly", boost: "spe", reduce: "atk" /* see note */ },
  { id: "naive", name: "Naive", boost: "spe", reduce: "spd" },
  { id: "serious", name: "Serious", boost: null, reduce: null },
] as const;

// NOTE: Jolly is Speed+ / Sp.Atk- in mainline and per the ChampsDex prose
// ("Jolly: Speed+, Attack-" appears in one sentence but the canonical chart
// lists Jolly as Speed boost / Sp.Atk reduce). We follow the mainline-correct
// mapping below and OVERRIDE the table entry to avoid the typo in the source.
const ALIGNMENT_OVERRIDES: Record<string, Partial<StatAlignment>> = {
  jolly: { boost: "spe", reduce: "spa" },
};

const ALIGNMENT_MAP: Map<string, StatAlignment> = new Map(
  STAT_ALIGNMENTS.map((a) => {
    const override = ALIGNMENT_OVERRIDES[a.id];
    return [a.id, override ? { ...a, ...override } : a];
  })
);

export function getAlignment(id: string): StatAlignment {
  const a = ALIGNMENT_MAP.get(id.toLowerCase());
  if (!a) throw new Error(`Unknown Stat Alignment: "${id}"`);
  return a;
}

/** Multiplier (1.1 / 0.9 / 1.0) this alignment applies to a given stat. */
export function alignmentMultiplier(
  alignment: StatAlignment,
  stat: StatKey
): number {
  if (stat === "hp") return 1; // HP is never affected by alignment
  if (alignment.boost === stat) return 1.1;
  if (alignment.reduce === stat) return 0.9;
  return 1;
}

/** Alignments that lower Speed — the Trick Room set. */
export function speedLoweringAlignments(): StatAlignment[] {
  return [...ALIGNMENT_MAP.values()].filter((a) => a.reduce === "spe");
}
