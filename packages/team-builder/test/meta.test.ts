import { describe, it, expect } from "vitest";
import {
  recommendTeammates,
  rowsByCategory,
  topSpread,
  topUsedSpecies,
  metaSet,
  type MetaProvider,
  type SpeciesMeta,
} from "../src/index.js";

const garchomp: SpeciesMeta = [
  { category: "item", rank: 1, name: "Life Orb", percentage: "57.4%", percentageValue: 57.4 },
  { category: "alignment", rank: 1, name: "Jolly", percentage: "66.2%", percentageValue: 66.2, statUp: "Speed", statDown: "Sp. Atk" },
  { category: "spread", rank: 1, name: "", percentage: "47.3%", percentageValue: 47.3, spread: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } },
  { category: "teammate", rank: 1, name: "Whimsicott", percentage: "", percentageValue: null },
  { category: "teammate", rank: 2, name: "Charizard", percentage: "", percentageValue: null },
  { category: "teammate", rank: 3, name: "Kingambit", percentage: "", percentageValue: null },
];
const charizard: SpeciesMeta = [
  { category: "teammate", rank: 1, name: "Whimsicott", percentage: "", percentageValue: null },
  { category: "teammate", rank: 2, name: "Garchomp", percentage: "", percentageValue: null },
  { category: "teammate", rank: 3, name: "Sylveon", percentage: "", percentageValue: null },
];
const getMeta: MetaProvider = (s) =>
  s === "garchomp" ? garchomp : s === "charizard" ? charizard : null;

describe("recommendTeammates", () => {
  it("ranks shared teammates highest and excludes on-team mons", () => {
    const recs = recommendTeammates(["garchomp", "charizard"], getMeta, { limit: 5 });
    expect(recs[0]!.species).toBe("whimsicott");
    expect(recs[0]!.fromCount).toBe(2);
    expect(recs.some((r) => ["garchomp", "charizard"].includes(r.species))).toBe(false);
  });

  it("returns nothing when no members have meta", () => {
    expect(recommendTeammates(["unknown"], getMeta)).toEqual([]);
  });
});

describe("topUsedSpecies", () => {
  it("ranks by teammate co-occurrence and only returns browsable species", () => {
    const tm = (rank: number, name: string): SpeciesMeta[number] => ({
      category: "teammate", rank, name, percentage: "", percentageValue: null,
    });
    const bySpecies: Record<string, SpeciesMeta> = {
      garchomp: [tm(1, "Whimsicott"), tm(2, "Charizard")],
      charizard: [tm(1, "Whimsicott"), tm(2, "Garchomp")],
      whimsicott: [tm(1, "Garchomp")],
    };
    const top = topUsedSpecies(bySpecies, { limit: 5 });
    expect(top[0]!.species).toBe("whimsicott"); // listed by both others at rank 1
    expect(top.map((t) => t.species)).toEqual(["whimsicott", "garchomp", "charizard"]);
    // "Sylveon" never appears as a key, so even if referenced it wouldn't list
    expect(top.every((t) => bySpecies[t.species])).toBe(true);
  });
});

describe("metaSet", () => {
  it("builds a drop-in member set with slugified names", () => {
    const set = metaSet([
      { category: "move", rank: 1, name: "Dragon Claw", percentage: "", percentageValue: null },
      { category: "move", rank: 2, name: "Rock Slide", percentage: "", percentageValue: null },
      { category: "item", rank: 1, name: "Life Orb", percentage: "", percentageValue: null },
      { category: "ability", rank: 1, name: "Rough Skin", percentage: "", percentageValue: null },
      { category: "alignment", rank: 1, name: "Jolly", percentage: "", percentageValue: null },
      { category: "spread", rank: 1, name: "", percentage: "", percentageValue: null, spread: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 } },
    ]);
    expect(set.moves).toEqual(["dragon-claw", "rock-slide"]);
    expect(set.item).toBe("life-orb");
    expect(set.ability).toBe("rough-skin");
    expect(set.alignmentId).toBe("jolly");
    expect(set.spread).toEqual({ hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 });
  });
});

describe("topSpread", () => {
  it("returns the most-used spread + alignment", () => {
    const { spread, alignment } = topSpread(garchomp);
    expect(alignment).toBe("Jolly");
    expect(spread).toEqual({ hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 });
  });
});

describe("rowsByCategory", () => {
  it("filters and sorts by rank", () => {
    expect(rowsByCategory(garchomp, "teammate").map((r) => r.name)).toEqual([
      "Whimsicott",
      "Charizard",
      "Kingambit",
    ]);
  });
});
