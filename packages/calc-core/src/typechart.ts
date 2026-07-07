/**
 * Type-effectiveness helper.
 *
 * The chart itself is seeded from PokéAPI (game-agnostic, identical to
 * Champions' type matchups). This module only needs the relations, so it
 * defines a minimal shape rather than importing the data layer.
 */

export interface TypeRelations {
  doubleDamageTo: string[];
  halfDamageTo: string[];
  noDamageTo: string[];
}

/** Keyed by attacking type, e.g. chart["fire"].doubleDamageTo = ["grass", ...]. */
export type TypeChart = Record<string, TypeRelations>;

/**
 * Effectiveness multiplier of `moveType` against one or two defending types.
 * Returns 0 (immune), 0.25, 0.5, 1, 2, or 4. Tera handling is the caller's job
 * (pass the Tera type as the sole defending type when terastallized).
 */
export function typeEffectiveness(
  moveType: string,
  defenderTypes: string[],
  chart: TypeChart
): number {
  const rel = chart[moveType.toLowerCase()];
  if (!rel) return 1; // unknown / typeless move
  let mult = 1;
  for (const def of defenderTypes.map((t) => t.toLowerCase())) {
    if (rel.noDamageTo.includes(def)) return 0;
    if (rel.doubleDamageTo.includes(def)) mult *= 2;
    else if (rel.halfDamageTo.includes(def)) mult *= 0.5;
  }
  return mult;
}
