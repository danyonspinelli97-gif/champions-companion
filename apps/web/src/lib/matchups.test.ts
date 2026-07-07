import { describe, it, expect } from "vitest";
import type { TypeChart } from "@champions/calc-core";
import type { SpeciesData } from "@champions/team-builder";
import { typeMatchups } from "./matchups.js";

/**
 * Minimal type chart covering the matchups exercised below. Shape matches
 * the real `TypeChart` from packages/calc-core/src/typechart.ts:
 * Record<attackingType, { doubleDamageTo, halfDamageTo, noDamageTo }>.
 */
const CHART: TypeChart = {
  fire: { doubleDamageTo: ["grass", "bug", "ice", "steel"], halfDamageTo: ["fire", "water", "rock", "dragon"], noDamageTo: [] },
  water: { doubleDamageTo: ["fire", "ground", "rock"], halfDamageTo: ["water", "grass", "dragon"], noDamageTo: [] },
  ground: { doubleDamageTo: ["fire", "electric", "poison", "rock", "steel"], halfDamageTo: ["grass", "bug"], noDamageTo: ["flying"] },
  electric: { doubleDamageTo: ["water", "flying"], halfDamageTo: ["grass", "electric", "dragon"], noDamageTo: ["ground"] },
  ice: { doubleDamageTo: ["grass", "ground", "flying", "dragon"], halfDamageTo: ["fire", "water", "ice", "steel"], noDamageTo: [] },
  grass: { doubleDamageTo: ["water", "ground", "rock"], halfDamageTo: ["fire", "grass", "flying", "bug", "dragon", "steel"], noDamageTo: [] },
  flying: { doubleDamageTo: ["grass", "fighting", "bug"], halfDamageTo: ["electric", "rock", "steel"], noDamageTo: [] },
  normal: { doubleDamageTo: [], halfDamageTo: ["rock", "steel"], noDamageTo: ["ghost"] },
  ghost: { doubleDamageTo: ["ghost", "psychic"], halfDamageTo: ["dark"], noDamageTo: ["normal"] },
};

function species(types: string[]): SpeciesData {
  return {
    name: types.join("-"),
    displayName: types.join("-"),
    types,
    baseStats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
    abilities: [],
    movepool: [],
    isFinalStage: true,
    isStandalone: true,
    isLegendary: false,
  };
}

describe("typeMatchups", () => {
  it("puts a single 2x weakness in weak", () => {
    // Grass/Ground is a mono-type stand-in: Ground alone is 2x weak to water,
    // 2x weak to ice, and immune to electric.
    const result = typeMatchups(species(["ground"]), CHART);
    expect(result.weak).toContain("water");
    expect(result.weak).toContain("ice");
  });

  it("puts a dual-type 4x (double) weakness in weak exactly once", () => {
    // Ground/Flying: ice hits ground for 2x AND flying for 2x -> 4x total.
    const result = typeMatchups(species(["ground", "flying"]), CHART);
    expect(result.weak).toContain("ice");
    expect(result.weak.filter((t) => t === "ice")).toHaveLength(1);
  });

  it("puts a resist (<1x) in resist", () => {
    // Grass resists fire? No: fire is 2x vs grass (weak). Use fire type
    // defending against fire attacks: fire->fire is halfDamageTo (0.5x).
    const result = typeMatchups(species(["fire"]), CHART);
    expect(result.resist).toContain("fire");
  });

  it("puts a 0x immunity in immune, not weak or resist", () => {
    // Ground is immune to electric (noDamageTo).
    const result = typeMatchups(species(["ground"]), CHART);
    expect(result.immune).toContain("electric");
    expect(result.weak).not.toContain("electric");
    expect(result.resist).not.toContain("electric");
  });

  it("leaves a neutral (1x) matchup out of all three lists", () => {
    // Normal has no relations to "normal" attacks defined in this fixture
    // (not in doubleDamageTo/halfDamageTo/noDamageTo of the "normal" entry),
    // so ground defending against a "normal" attack is neutral (1x).
    const result = typeMatchups(species(["ground"]), CHART);
    expect(result.weak).not.toContain("normal");
    expect(result.resist).not.toContain("normal");
    expect(result.immune).not.toContain("normal");
  });
});
