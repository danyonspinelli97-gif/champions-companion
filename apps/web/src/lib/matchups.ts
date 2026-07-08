import { typeEffectiveness, type TypeChart } from "@champions/calc-core";
import type { SpeciesData } from "@champions/team-builder";

export interface TypeMatchups {
  weak: string[];
  resist: string[];
  immune: string[];
}

/**
 * For each attacking type in `chart`, computes its effectiveness against
 * `species.types` (product across dual types, via calc-core's
 * `typeEffectiveness`) and buckets the attacking type name into `weak`
 * (>1x), `resist` (0 < x < 1), or `immune` (0x). Neutral (1x) attacking
 * types are omitted from all three lists.
 */
export function typeMatchups(species: SpeciesData, chart: TypeChart): TypeMatchups {
  const weak: string[] = [];
  const resist: string[] = [];
  const immune: string[] = [];

  for (const atkType of Object.keys(chart)) {
    const mult = typeEffectiveness(atkType, species.types, chart);
    if (mult === 0) immune.push(atkType);
    else if (mult > 1) weak.push(atkType);
    else if (mult < 1) resist.push(atkType);
    // mult === 1 -> neutral, omitted from all lists
  }

  return { weak, resist, immune };
}
