import {
  DEFAULT_FORMULA,
  SP_PER_STAT_CAP,
  SP_VP_COST,
  type StatFormulaConfig,
  type StatKey,
} from "./types.js";
import { computeStat } from "./stats.js";

/**
 * Minimum SP needed in one stat to reach (>=) a target final value, given the
 * Pokémon's base stat and chosen alignment. Returns null if unreachable within
 * the 32 per-stat cap.
 *
 * This is the building block for benchmark recommendations such as
 * "survive attacker X's spread move" (target a defensive stat) or
 * "outspeed threat Y after Tailwind" (target a Speed value).
 */
export function minSpForTarget(
  stat: StatKey,
  base: number,
  target: number,
  alignmentId: string,
  cfg: StatFormulaConfig = DEFAULT_FORMULA
): number | null {
  for (let sp = 0; sp <= SP_PER_STAT_CAP; sp++) {
    if (computeStat(stat, base, sp, alignmentId, cfg) >= target) return sp;
  }
  return null;
}

export interface BenchmarkResult {
  stat: StatKey;
  target: number;
  spNeeded: number | null;
  vpCost: number | null;
  reachable: boolean;
}

export function benchmark(
  stat: StatKey,
  base: number,
  target: number,
  alignmentId: string,
  cfg: StatFormulaConfig = DEFAULT_FORMULA
): BenchmarkResult {
  const sp = minSpForTarget(stat, base, target, alignmentId, cfg);
  return {
    stat,
    target,
    spNeeded: sp,
    vpCost: sp === null ? null : sp * SP_VP_COST,
    reachable: sp !== null,
  };
}

/**
 * Given a set of independent benchmarks, report the SP each needs and whether
 * the combined spread fits within the 66 total cap. Does not auto-balance
 * leftovers — that is a UI/recommender concern layered on top.
 */
export function planSpread(
  benchmarks: BenchmarkResult[],
  totalCap = 66
): { totalSp: number; withinTotal: boolean; allReachable: boolean } {
  const allReachable = benchmarks.every((b) => b.reachable);
  const totalSp = benchmarks.reduce((sum, b) => sum + (b.spNeeded ?? 0), 0);
  return { totalSp, withinTotal: totalSp <= totalCap, allReachable };
}
