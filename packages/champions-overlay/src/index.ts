/**
 * @champions/overlay
 *
 * The Champions difference layer that sits on top of game-agnostic PokéAPI
 * data. PokéAPI gives us base stats, types, abilities, items, moves and the
 * type chart; this package re-expresses that data under Champions rules:
 *
 *   1. No IVs — every Pokémon is a perfect 31 (handled in calc-core).
 *   2. Final-evolution-only species pool (config flag for future expansion).
 *   3. Stat Alignments instead of Natures (re-exported from calc-core).
 *   4. Altered move effects — a small, auditable override registry.
 *
 * Everything that can differ from mainline lives here so the base layer stays
 * a clean PokéAPI mirror.
 */

/** Champions never exposes IVs; this is the single source of that truth. */
export const CHAMPIONS_IV = 31;

/**
 * Recover a Pokémon's base stats from the Level-50 / 0-SP / neutral stats that
 * championsbattledata exposes (its "Battle Data" stats).
 *
 * Because the Champions L50 formula with IV 31 and 0 SP simplifies exactly:
 *   non-HP final = floor((2B+31)/2) + 5 = B + 20
 *   HP    final  = floor((2B+31)/2) + 60 = B + 75
 * the inversion is exact (no rounding loss). This is what lets us obtain
 * correct base stats for Champions-only Mega forms that PokéAPI doesn't have.
 *
 * Verified against championsbattledata: Rotom-Wash, Charizard, Mega Charizard X.
 */
export function baseStatsFromDisplayed(d: {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}): { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } {
  return {
    hp: d.hp - 75,
    atk: d.atk - 20,
    def: d.def - 20,
    spa: d.spa - 20,
    spd: d.spd - 20,
    spe: d.spe - 20,
  };
}

// ---------------------------------------------------------------------------
// Species pool policy
// ---------------------------------------------------------------------------

export interface SpeciesPoolPolicy {
  /**
   * When true (launch behaviour), only fully-evolved species are legal.
   * Flip to false if Champions later adds earlier evolutions.
   */
  finalEvolutionsOnly: boolean;
}

export const DEFAULT_SPECIES_POLICY: SpeciesPoolPolicy = {
  finalEvolutionsOnly: true,
};

/** Minimal evolution info we need from the seed layer to apply the policy. */
export interface EvolutionInfo {
  speciesId: number;
  name: string;
  /** True if this species has no further evolution (leaf of its chain). */
  isFinalStage: boolean;
  /**
   * True for species that have no evolutionary relations at all
   * (legendaries, single-stage mons). These are always "final".
   */
  isStandalone: boolean;
}

export function isSpeciesPoolLegal(
  evo: EvolutionInfo,
  policy: SpeciesPoolPolicy = DEFAULT_SPECIES_POLICY
): boolean {
  if (!policy.finalEvolutionsOnly) return true;
  return evo.isFinalStage || evo.isStandalone;
}

// ---------------------------------------------------------------------------
// Altered move effects
// ---------------------------------------------------------------------------

/**
 * Champions reportedly changes some move effects relative to mainline. Each
 * override is tagged with provenance so the damage calc (Phase 2) and the UI
 * can surface "this differs from mainline / unverified" honestly.
 *
 * IMPORTANT: entries marked `verified: false` are placeholders to be confirmed
 * against the in-game Battle Data before they affect any damage output.
 */
export interface MoveOverride {
  move: string;
  /** Human-readable description of how Champions differs from mainline. */
  note: string;
  /** Optional numeric/flag patches the calc layer can read. */
  patch?: Partial<{
    basePower: number;
    spreadInDoubles: boolean;
    category: "physical" | "special" | "status";
  }>;
  verified: boolean;
  source?: string;
}

/** Registry keyed by lowercase move name. Starts intentionally empty-ish. */
export const MOVE_OVERRIDES: Record<string, MoveOverride> = {
  // Example scaffold entry — NOT yet applied to calc output until verified.
  // "knock-off": {
  //   move: "Knock Off",
  //   note: "Confirm boosted-power behaviour vs item-holding target in Champions.",
  //   verified: false,
  //   source: "pending in-game Battle Data",
  // },
};

export function getMoveOverride(move: string): MoveOverride | undefined {
  return MOVE_OVERRIDES[move.toLowerCase()];
}

/**
 * Apply any *verified* Champions override onto a calc-core MoveInput before it
 * reaches the damage calculator. Unverified overrides are intentionally NOT
 * applied — they only surface as a warning in the UI until confirmed in-game.
 */
export function applyMoveOverride<T extends MoveInputLike>(move: T): T {
  const ov = getMoveOverride(move.name);
  if (!ov || !ov.verified || !ov.patch) return move;
  return {
    ...move,
    ...(ov.patch.basePower !== undefined ? { basePower: ov.patch.basePower } : {}),
    ...(ov.patch.category !== undefined ? { category: ov.patch.category } : {}),
    ...(ov.patch.spreadInDoubles !== undefined ? { isSpread: ov.patch.spreadInDoubles } : {}),
  };
}

/** Minimal shape the override merger needs (matches calc-core's MoveInput). */
export interface MoveInputLike {
  name: string;
  basePower: number;
  category: "physical" | "special" | "status";
  isSpread?: boolean;
}

// Re-export the alignment set so consumers have one import surface for
// "everything Champions-specific about stats".
export { STAT_ALIGNMENTS, getAlignment } from "@champions/calc-core";
