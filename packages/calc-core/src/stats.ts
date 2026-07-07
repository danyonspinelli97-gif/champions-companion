import {
  DEFAULT_FORMULA,
  SP_PER_STAT_CAP,
  SP_TOTAL_CAP,
  STAT_KEYS,
  type StatFormulaConfig,
  type StatKey,
  type StatTable,
} from "./types.js";
import { alignmentMultiplier, getAlignment } from "./alignments.js";

/**
 * Common "pre-multiplier" core used by every stat at a given level:
 *   floor(((2 * Base + IV) * Level) / 100)
 * In Champions IV is always 31.
 */
function statCore(base: number, cfg: StatFormulaConfig): number {
  return Math.floor(((2 * base + cfg.iv) * cfg.level) / 100);
}

/**
 * Compute a single final stat for Champions.
 *
 * Default (community-inferred) formula, Level 50, IV 31:
 *   HP      = floor(((2B+31)*50)/100) + 50 + 10 + SP
 *   non-HP  = floor( (floor(((2B+31)*50)/100) + 5 + SP) * alignMult )
 *
 * `alignMult` is 1.1 (boosted), 0.9 (reduced) or 1.0 (neutral / HP).
 */
export function computeStat(
  stat: StatKey,
  base: number,
  sp: number,
  alignmentId: string,
  cfg: StatFormulaConfig = DEFAULT_FORMULA
): number {
  if (sp < 0 || sp > SP_PER_STAT_CAP) {
    throw new RangeError(`SP for ${stat} must be 0–${SP_PER_STAT_CAP}, got ${sp}`);
  }
  const core = statCore(base, cfg);

  if (stat === "hp") {
    return core + cfg.level + 10 + sp;
  }

  const mult = alignmentMultiplier(getAlignment(alignmentId), stat);

  if (cfg.spApplication === "inside") {
    return Math.floor((core + 5 + sp) * mult);
  }
  // "outside": apply alignment to the base, then add a flat +1 per SP.
  return Math.floor((core + 5) * mult) + sp;
}

/** Compute all six final stats at once. */
export function computeStatTable(
  base: StatTable,
  sp: StatTable,
  alignmentId: string,
  cfg: StatFormulaConfig = DEFAULT_FORMULA
): StatTable {
  const out = {} as StatTable;
  for (const key of STAT_KEYS) {
    out[key] = computeStat(key, base[key], sp[key], alignmentId, cfg);
  }
  return out;
}

// ---------------------------------------------------------------------------
// SP validation
// ---------------------------------------------------------------------------

export interface SpValidation {
  ok: boolean;
  total: number;
  errors: string[];
}

/** Enforce the 66-total / 32-per-stat caps. */
export function validateSp(sp: StatTable): SpValidation {
  const errors: string[] = [];
  let total = 0;
  for (const key of STAT_KEYS) {
    const v = sp[key];
    total += v;
    if (v < 0) errors.push(`${key}: SP cannot be negative (${v}).`);
    if (v > SP_PER_STAT_CAP)
      errors.push(`${key}: ${v} SP exceeds the ${SP_PER_STAT_CAP} per-stat cap.`);
    if (!Number.isInteger(v)) errors.push(`${key}: SP must be a whole number (${v}).`);
  }
  if (total > SP_TOTAL_CAP)
    errors.push(`Total ${total} SP exceeds the ${SP_TOTAL_CAP} cap.`);
  return { ok: errors.length === 0, total, errors };
}

// ---------------------------------------------------------------------------
// Battle-time modifiers (stat stages, items) — kept separate from the raw
// L50 stat so the team builder can show the "sheet" stat and the calc can
// layer combat modifiers on top.
// ---------------------------------------------------------------------------

const STAGE_MULTIPLIER: Record<number, number> = {
  "-6": 2 / 8,
  "-5": 2 / 7,
  "-4": 2 / 6,
  "-3": 2 / 5,
  "-2": 2 / 4,
  "-1": 2 / 3,
  "0": 1,
  "1": 3 / 2,
  "2": 4 / 2,
  "3": 5 / 2,
  "4": 6 / 2,
  "5": 7 / 2,
  "6": 8 / 2,
};

/** Apply a stat stage (-6..+6). Stages do not apply to HP. */
export function applyStage(value: number, stage: number): number {
  if (stage < -6 || stage > 6) throw new RangeError(`Stage must be -6..6, got ${stage}`);
  return Math.floor(value * STAGE_MULTIPLIER[String(stage)]);
}
