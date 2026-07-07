/**
 * Core stat types for Pokémon Champions.
 *
 * Champions runs at a fixed Level 50, all IVs are treated as a perfect 31,
 * and EVs are replaced by Stat Points (SP). These types are deliberately
 * game-agnostic in shape so the same module can power the web app and a
 * future mobile (Capacitor / React Native) build.
 */

/** The six battle stats. `hp` uses a different final-stat formula than the rest. */
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

export const STAT_KEYS: readonly StatKey[] = [
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
] as const;

/** A full set of six stat values (base stats, SP allocation, final stats, …). */
export type StatTable<T = number> = Record<StatKey, T>;

/**
 * Champions training limits. These are gameplay constants, not config —
 * but they are exported so the UI and validators share a single source.
 */
export const SP_TOTAL_CAP = 66; // total Stat Points per Pokémon
export const SP_PER_STAT_CAP = 32; // max Stat Points in any one stat
export const SP_VP_COST = 5; // Victory Points per 1 SP (retraining cost)
export const FIXED_LEVEL = 50; // Champions is always Level 50
export const FIXED_IV = 31; // every Pokémon is treated as perfect 31 IVs

/** Stat Alignment = the Champions name for a Nature. */
export interface StatAlignment {
  id: string;
  /** Display name, e.g. "Adamant". */
  name: string;
  /** Stat boosted by ~10% (×1.1), or null for the neutral alignment. */
  boost: Exclude<StatKey, "hp"> | null;
  /** Stat reduced by ~10% (×0.9), or null for the neutral alignment. */
  reduce: Exclude<StatKey, "hp"> | null;
}

/**
 * Rounding / operation-order model for the final-stat formula.
 *
 * Champions' exact internal rounding is NOT officially documented. The default
 * below matches the community-inferred formula published by ChampsDex
 * (last verified 2026-06-11) and is structurally identical to the mainline
 * Gen 3+ formula with `floor(EV/4)` replaced by `+SP` and IV pinned at 31.
 *
 * It is intentionally configurable so we can swap it the moment we confirm
 * the real behaviour against the in-game Battle Data / training preview.
 */
export interface StatFormulaConfig {
  level: number;
  iv: number;
  /**
   * Where SP is applied relative to the alignment multiplier.
   * - "inside": SP is added before the ×align multiplier (community default).
   * - "outside": SP is added as a flat +1 per point AFTER the multiplier.
   */
  spApplication: "inside" | "outside";
}

export const DEFAULT_FORMULA: StatFormulaConfig = {
  level: FIXED_LEVEL,
  iv: FIXED_IV,
  spApplication: "inside",
};
