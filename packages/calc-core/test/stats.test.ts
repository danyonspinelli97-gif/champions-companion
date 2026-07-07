import { describe, it, expect } from "vitest";
import {
  computeStat,
  computeStatTable,
  validateSp,
  applyStage,
  effectiveSpeed,
  compareSpeed,
  minSpForTarget,
  STAT_ALIGNMENTS,
  speedLoweringAlignments,
  type StatTable,
} from "../src/index.js";

// Garchomp base stats (final-evo, legal in Champions Reg M-B).
const GARCHOMP: StatTable = {
  hp: 108,
  atk: 130,
  def: 95,
  spa: 80,
  spd: 85,
  spe: 102,
};

describe("computeStat — Garchomp, Jolly (spe+/spa-), 32 Atk / 32 Spe / 2 HP", () => {
  // Hand-derived from the community formula (Level 50, IV 31):
  //   Atk (neutral): floor((floor((2*130+31)*50/100)+5+32)*1.0) = 182
  //   Spe (boost):   floor((floor((2*102+31)*50/100)+5+32)*1.1) = 169
  //   HP:            floor((2*108+31)*50/100)+60+2             = 185
  //   Def (neutral): floor((floor((2*95+31)*50/100)+5+0))      = 115
  //   SpA (reduced): floor((floor((2*80+31)*50/100)+5+0)*0.9)  = 90
  //   SpD (neutral): floor((floor((2*85+31)*50/100)+5+0))      = 105
  it("matches the hand-derived final stats", () => {
    expect(computeStat("hp", GARCHOMP.hp, 2, "jolly")).toBe(185);
    expect(computeStat("atk", GARCHOMP.atk, 32, "jolly")).toBe(182);
    expect(computeStat("spe", GARCHOMP.spe, 32, "jolly")).toBe(169);
    expect(computeStat("def", GARCHOMP.def, 0, "jolly")).toBe(115);
    expect(computeStat("spa", GARCHOMP.spa, 0, "jolly")).toBe(90);
    expect(computeStat("spd", GARCHOMP.spd, 0, "jolly")).toBe(105);
  });

  it("computeStatTable produces the same values", () => {
    const sp: StatTable = { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 };
    expect(computeStatTable(GARCHOMP, sp, "jolly")).toEqual({
      hp: 185,
      atk: 182,
      def: 115,
      spa: 90,
      spd: 105,
      spe: 169,
    });
  });
});

describe("IVs are always 31 (no IV inputs anywhere)", () => {
  it("a 0-SP neutral stat reflects the perfect-31 floor", () => {
    // SpA neutral, 0 SP: floor((2*80+31)*50/100)+5 = 95+5 = 100
    expect(computeStat("spa", 80, 0, "serious")).toBe(100);
  });
});

describe("Stat Alignment set", () => {
  it("has exactly 21 alignments with one neutral (Serious)", () => {
    expect(STAT_ALIGNMENTS).toHaveLength(21);
    const neutral = STAT_ALIGNMENTS.filter((a) => a.boost === null && a.reduce === null);
    expect(neutral.map((a) => a.id)).toEqual(["serious"]);
  });

  it("Serious is neutral (no change)", () => {
    expect(computeStat("atk", 130, 32, "serious")).toBe(
      computeStat("atk", 130, 32, "serious")
    );
    // boost==reduce==null => mult 1.0 everywhere
    expect(computeStat("spe", 102, 0, "serious")).toBe(117 + 5);
  });

  it("exposes the Trick Room (speed-lowering) alignment set", () => {
    const ids = speedLoweringAlignments().map((a) => a.id).sort();
    expect(ids).toEqual(["brave", "quiet", "relaxed", "sassy"]);
  });
});

describe("SP cap enforcement (66 total / 32 per stat)", () => {
  it("accepts a legal 32/32/2 spread", () => {
    const v = validateSp({ hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 });
    expect(v.ok).toBe(true);
    expect(v.total).toBe(66);
  });

  it("rejects over-cap per stat", () => {
    const v = validateSp({ hp: 0, atk: 33, def: 0, spa: 0, spd: 0, spe: 0 });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toMatch(/per-stat cap/);
  });

  it("rejects over-cap total", () => {
    const v = validateSp({ hp: 32, atk: 32, def: 32, spa: 0, spd: 0, spe: 0 });
    expect(v.ok).toBe(false);
    expect(v.errors.join(" ")).toMatch(/exceeds the 66/);
  });
});

describe("benchmark recommender", () => {
  it("finds the minimum Speed SP to outspeed a target", () => {
    // Garchomp Jolly needs to hit >= 169 Speed.
    const sp = minSpForTarget("spe", GARCHOMP.spe, 169, "jolly");
    expect(sp).toBe(32);
  });

  it("returns null when a target is unreachable within 32 SP", () => {
    expect(minSpForTarget("spe", 50, 999, "jolly")).toBeNull();
  });
});

describe("doubles speed helpers", () => {
  it("applies Tailwind (x2) and a +1 stage", () => {
    // 169 speed, +1 stage => floor(169*1.5)=253, x2 tailwind => 506
    expect(effectiveSpeed(169, { stage: 1, tailwind: true })).toBe(506);
  });

  it("Trick Room inverts the speed comparison", () => {
    expect(compareSpeed(169, 50, false)).toBeGreaterThan(0); // faster first normally
    expect(compareSpeed(169, 50, true)).toBeLessThan(0); // slower first in TR
  });
});

describe("stat stages", () => {
  it("+2 doubles, -2 halves (floored)", () => {
    expect(applyStage(100, 2)).toBe(200);
    expect(applyStage(101, -2)).toBe(50);
  });
});
