import type { StatTable } from "@champions/calc-core";

/**
 * Team-builder domain types.
 *
 * Decoupled from the data layer: legality/analysis take a `SpeciesProvider`
 * function so they work against the SQLite cache, a test fixture, or a future
 * API without any direct dependency.
 */

/** The subset of species data the builder needs (a slice of SpeciesRecord). */
export interface SpeciesData {
  name: string;
  displayName: string;
  /** National Dex number (reference Pokédex display/sort). */
  num?: number;
  /** Grouping species (e.g. "Charizard" for its Megas) — used for legality. */
  baseName?: string;
  types: string[];
  baseStats: StatTable;
  abilities: { name: string; isHidden: boolean }[];
  movepool: string[];
  isFinalStage: boolean;
  isStandalone: boolean;
  isLegendary: boolean;
  /** Form display label ("Mega X", "Wash", …) where applicable. */
  form?: string;
  /** Sprite image URL (from championsbattledata). */
  spriteUrl?: string | null;
}

export type SpeciesProvider = (slug: string) => SpeciesData | null;

export interface TeamMember {
  species: string; // slug, e.g. "garchomp"
  item?: string;
  ability?: string;
  alignmentId: string; // Stat Alignment id, e.g. "jolly"
  moves: string[]; // up to 4 move slugs
  sp: StatTable; // Stat Point allocation
  teraType?: string | null;
}

export interface Team {
  name?: string;
  members: TeamMember[];
}

export type Severity = "error" | "warning";

export interface LegalityIssue {
  /** Index into team.members, or null for team-level issues. */
  memberIndex: number | null;
  severity: Severity;
  code: string;
  message: string;
}

export interface LegalityReport {
  legal: boolean; // true if no `error`-severity issues
  issues: LegalityIssue[];
}
