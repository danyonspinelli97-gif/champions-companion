import { describe, it, expect } from "vitest";
import {
  computeDamage,
  summarizeKo,
  typeEffectiveness,
  pokeRound,
  type TypeChart,
  type CombatantInput,
  type MoveInput,
} from "../src/index.js";

// Minimal type chart covering the matchups used below.
const CHART: TypeChart = {
  fighting: { doubleDamageTo: ["normal", "rock", "steel"], halfDamageTo: ["flying", "psychic"], noDamageTo: ["ghost"] },
  ground: { doubleDamageTo: ["fire", "rock", "steel", "electric", "poison"], halfDamageTo: ["grass", "bug"], noDamageTo: ["flying"] },
  normal: { doubleDamageTo: [], halfDamageTo: ["rock", "steel"], noDamageTo: ["ghost"] },
};

const atkOnly = (atk: number, types: string[], extra: Partial<CombatantInput> = {}): CombatantInput => ({
  finalStats: { hp: 0, atk, def: 0, spa: 0, spd: 0, spe: 0 },
  types,
  ...extra,
});
const defOnly = (hp: number, def: number, types: string[]): CombatantInput => ({
  finalStats: { hp, atk: 0, def, spa: 0, spd: 0, spe: 0 },
  types,
});

describe("pokeRound (round half down)", () => {
  it("rounds .5 down and >.5 up", () => {
    expect(pokeRound(67.5)).toBe(67);
    expect(pokeRound(67.5001)).toBe(68);
    expect(pokeRound(67.4)).toBe(67);
  });
});

describe("computeDamage — verified against hand-derived rolls", () => {
  it("neutral, no STAB, singles: 150 Atk vs 100 Def, BP100 → 57–68", () => {
    const move: MoveInput = { name: "X", basePower: 100, type: "fighting", category: "physical" };
    const r = computeDamage(atkOnly(150, ["normal"]), defOnly(175, 100, ["water"]), move, { isDoubles: false }, CHART);
    expect(r.effectiveness).toBe(1);
    expect(r.minDamage).toBe(57);
    expect(r.maxDamage).toBe(68);
    expect(r.rolls).toHaveLength(16);
  });

  it("STAB + super-effective + doubles spread: 200 Atk vs 120 Def, BP120 → 168–200", () => {
    const move: MoveInput = { name: "Earthquake", basePower: 120, type: "ground", category: "physical", isSpread: true };
    const r = computeDamage(atkOnly(200, ["ground"]), defOnly(180, 120, ["fire"]), move, { isDoubles: true }, CHART);
    expect(r.effectiveness).toBe(2);
    expect(r.minDamage).toBe(168);
    expect(r.maxDamage).toBe(200);
  });

  it("spread move does NOT get the 0.75 reduction in singles", () => {
    const move: MoveInput = { name: "Earthquake", basePower: 120, type: "ground", category: "physical", isSpread: true };
    const singles = computeDamage(atkOnly(200, ["ground"]), defOnly(180, 120, ["fire"]), move, { isDoubles: false }, CHART);
    const doubles = computeDamage(atkOnly(200, ["ground"]), defOnly(180, 120, ["fire"]), move, { isDoubles: true }, CHART);
    expect(singles.maxDamage).toBeGreaterThan(doubles.maxDamage);
  });

  it("immunity yields zero damage", () => {
    const move: MoveInput = { name: "EQ", basePower: 120, type: "ground", category: "physical" };
    const r = computeDamage(atkOnly(200, ["ground"]), defOnly(180, 120, ["flying"]), move, { isDoubles: true }, CHART);
    expect(r.effectiveness).toBe(0);
    expect(r.maxDamage).toBe(0);
  });
});

describe("typeEffectiveness", () => {
  it("stacks across dual types and respects immunity", () => {
    expect(typeEffectiveness("ground", ["fire"], CHART)).toBe(2);
    expect(typeEffectiveness("ground", ["fire", "flying"], CHART)).toBe(0);
    expect(typeEffectiveness("ground", ["grass"], CHART)).toBe(0.5);
    expect(typeEffectiveness("fighting", ["water"], CHART)).toBe(1);
  });
});

describe("summarizeKo", () => {
  it("reports a partial OHKO chance", () => {
    const move: MoveInput = { name: "Earthquake", basePower: 120, type: "ground", category: "physical", isSpread: true };
    const r = computeDamage(atkOnly(200, ["ground"]), defOnly(180, 120, ["fire"]), move, { isDoubles: true }, CHART);
    const ko = summarizeKo(r, 180);
    expect(ko.guaranteedOhko).toBe(false);
    expect(ko.defenderSurvives).toBe(false);
    expect(ko.ohkoChancePct).toBeGreaterThan(0);
    expect(ko.ohkoChancePct).toBeLessThan(100);
  });

  it("flags a guaranteed survive when max roll < HP", () => {
    const move: MoveInput = { name: "X", basePower: 40, type: "fighting", category: "physical" };
    const r = computeDamage(atkOnly(100, ["normal"]), defOnly(300, 150, ["water"]), move, { isDoubles: false }, CHART);
    const ko = summarizeKo(r, 300);
    expect(ko.defenderSurvives).toBe(true);
    expect(ko.guaranteedOhko).toBe(false);
  });
});
