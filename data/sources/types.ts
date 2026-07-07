/**
 * Source adapter contracts.
 *
 * Every external data source is hidden behind one of these interfaces so feeds
 * can be swapped or added without touching app logic. Two source families:
 *
 *  - StaticDataSource: game-agnostic dex data (PokéAPI today).
 *  - MetaDataSource:   Champions usage/meta data (championsbattledata today).
 */

import type { StatTable } from "@champions/calc-core";

/** A normalized species record after the Champions overlay is applied. */
export interface SpeciesRecord {
  id: number;
  /** Unique slug for this form, e.g. "garchomp", "mega-charizard-x", "rotom-wash". */
  name: string;
  /** Display label incl. form, e.g. "Garchomp", "Charizard [Mega Charizard X]". */
  displayName: string;
  /** The grouping species, e.g. "Charizard" for both Mega X and Mega Y. */
  baseName?: string;
  types: string[]; // ["dragon","ground"]
  baseStats: StatTable; // hp/atk/def/spa/spd/spe (Champions base stats)
  abilities: { name: string; isHidden: boolean }[];
  /** Move slugs this species can learn (movepool, not a chosen set). */
  moves: string[];
  /**
   * Legal in the active Champions roster. For the championsbattledata-sourced
   * roster every listed form is battle-legal, so this is true; the ruleset
   * ban lists trim further. Retained for the final-evo config flag.
   */
  isFinalStage: boolean;
  isStandalone: boolean;
  isLegendary: boolean;
  isMythical: boolean;
  /** Human-readable form label ("Mega X", "Wash", "") where applicable. */
  form?: string;
  spriteUrl?: string;
}

export interface TypeRelation {
  type: string;
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
}

export interface StaticDataSource {
  readonly id: string;
  /** Pull every species (forms included) and normalize to SpeciesRecord. */
  fetchAllSpecies(): Promise<SpeciesRecord[]>;
  /** The full type-effectiveness chart. */
  fetchTypeChart(): Promise<TypeRelation[]>;
}

// The normalized meta row shape is defined once in @champions/team-builder so
// the recommender, the adapter, and the web app all share it.
export type { MetaRow, MetaCategory } from "@champions/team-builder";
import type { MetaRow } from "@champions/team-builder";

export interface MetaDataSource {
  readonly id: string;
  /** Attribution string the UI MUST display (license requirement). */
  readonly attribution: string;
  listSeasons(): Promise<{ seasons: string[]; defaultSeason: string }>;
  fetchUsage(
    format: "Doubles" | "Singles",
    species: string,
    season: string
  ): Promise<MetaRow[]>;
}
