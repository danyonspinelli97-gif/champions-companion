import {
  STAT_ALIGNMENTS,
  computeStatTable,
  type StatKey,
  type StatTable,
} from "@champions/calc-core";
import type { SpeciesData } from "@champions/team-builder";

export const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spa", "spd", "spe"];

export const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export const ALIGNMENT_OPTIONS = STAT_ALIGNMENTS.map((a) => ({
  id: a.id,
  name: a.name,
  label:
    a.boost && a.reduce
      ? `${a.name} (+${STAT_LABEL[a.boost]} / -${STAT_LABEL[a.reduce]})`
      : `${a.name} (neutral)`,
}));

export const ZERO_SP: StatTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export function emptySp(): StatTable {
  return { ...ZERO_SP };
}

export function finalStatsFor(
  species: SpeciesData,
  sp: StatTable,
  alignmentId: string
): StatTable {
  return computeStatTable(species.baseStats, sp, alignmentId);
}

export function spTotal(sp: StatTable): number {
  return STAT_KEYS.reduce((t, k) => t + (sp[k] || 0), 0);
}

/** Standard Pokémon type colours for badges/chips. */
export const TYPE_COLORS: Record<string, string> = {
  normal: "#9099a1", fire: "#ff9d55", water: "#4d90d5", electric: "#f3d23b",
  grass: "#63bb5b", ice: "#73cec0", fighting: "#ce4069", poison: "#ab6ac8",
  ground: "#d97845", flying: "#8fa8dd", psychic: "#f97176", bug: "#90c12c",
  rock: "#c7b78b", ghost: "#5269ac", dragon: "#0b6dc3", dark: "#5a5366",
  steel: "#5a8ea1", fairy: "#ec8fe6",
};

export function typeColor(t: string): string {
  return TYPE_COLORS[t.toLowerCase()] ?? "#6f7da3";
}

/** Colour a stat value low→high (red→green), matching dex stat bars. */
export function statColor(v: number): string {
  if (v < 50) return "#ff6b6b";
  if (v < 75) return "#ff9d55";
  if (v < 90) return "#f3d23b";
  if (v < 110) return "#9bd44a";
  return "#4ed6a8";
}

/** Bar width as a % of a ~180 base-stat reference, capped at 100. */
export function statBarWidth(v: number): number {
  return Math.min(100, Math.round((v / 180) * 100));
}
