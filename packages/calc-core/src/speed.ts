import { applyStage } from "./stats.js";

/**
 * Doubles-aware effective Speed for speed-tier comparisons.
 *
 * Order of operations follows the mainline engine: stat stage first, then
 * multiplicative field/item/ability modifiers, then a final floor. Trick Room
 * inverts the comparison (handled by `compareSpeed`, not here).
 */
export interface SpeedContext {
  stage?: number; // -6..+6
  tailwind?: boolean; // ×2
  choiceScarf?: boolean; // ×1.5
  paralysis?: boolean; // ×0.5 (Champions/Gen 7+ value)
  /** Generic extra multiplier (Swift Swim, Chlorophyll, Unburden, etc.). */
  extraMultiplier?: number;
}

export function effectiveSpeed(baseSpeedStat: number, ctx: SpeedContext = {}): number {
  let s = ctx.stage ? applyStage(baseSpeedStat, ctx.stage) : baseSpeedStat;
  let mult = 1;
  if (ctx.tailwind) mult *= 2;
  if (ctx.choiceScarf) mult *= 1.5;
  if (ctx.extraMultiplier) mult *= ctx.extraMultiplier;
  s = Math.floor(s * mult);
  if (ctx.paralysis) s = Math.floor(s * 0.5);
  return s;
}

/**
 * Returns who moves first. Positive = `a` first, negative = `b` first, 0 = tie
 * (speed tie). Under Trick Room the slower Pokémon moves first, so the sign
 * is inverted.
 */
export function compareSpeed(
  aSpeed: number,
  bSpeed: number,
  trickRoom = false
): number {
  const raw = aSpeed - bSpeed;
  if (raw === 0) return 0;
  return trickRoom ? -raw : raw;
}
