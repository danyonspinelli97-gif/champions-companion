import type { RulesetConfig } from "@champions/ruleset-config";
import type { SpeciesData } from "@champions/team-builder";
import type { ChampionsData } from "./data.js";

/**
 * Minimal fixtures for component tests. Only the fields the components under
 * test actually read are populated — this is not a full data-layer fixture.
 */

const BASE_STATS = { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 };

export function makeSpecies(name: string, displayName: string, overrides: Partial<SpeciesData> = {}): SpeciesData {
  return {
    name,
    displayName,
    types: ["normal"],
    baseStats: BASE_STATS,
    abilities: [{ name: "run-away", isHidden: false }],
    movepool: ["tackle", "protect"],
    isFinalStage: true,
    isStandalone: true,
    isLegendary: false,
    ...overrides,
  };
}

export function makeRuleset(overrides: Partial<RulesetConfig> = {}): RulesetConfig {
  return {
    id: "test-reg",
    name: "Test Regulation",
    format: "doubles",
    activeFrom: "2026-01-01",
    activeUntil: { value: null, provenance: "verified" },
    basePool: { value: "all", provenance: "verified" },
    megasAllowed: { value: true, provenance: "verified" },
    teraAllowed: { value: true, provenance: "verified" },
    restrictedLimit: { value: 6, provenance: "verified" },
    speciesClause: false,
    itemClause: false,
    bannedSpecies: { value: [], provenance: "verified" },
    bannedItems: { value: [], provenance: "verified" },
    bannedMoves: { value: [], provenance: "verified" },
    bannedAbilities: { value: [], provenance: "verified" },
    restrictedSpecies: { value: [], provenance: "verified" },
    ...overrides,
  } as RulesetConfig;
}

/** Minimal ChampionsData: three distinguishable species (Alpha/Beta/Gamma), no meta. */
export function makeTestData(overrides: Partial<ChampionsData> = {}): ChampionsData {
  const species = [
    makeSpecies("alpha", "Alpha"),
    makeSpecies("beta", "Beta"),
    makeSpecies("gamma", "Gamma"),
  ];
  return {
    species,
    byName: new Map(species.map((s) => [s.name, s])),
    chart: {
      normal: { doubleDamageTo: [], halfDamageTo: [], noDamageTo: [] },
    },
    ruleset: makeRuleset(),
    meta: null,
    ...overrides,
  };
}
