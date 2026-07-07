import { describe, it, expect } from "vitest";
import {
  checkTeam,
  legalSpeciesPool,
  speedTiers,
  defensiveReport,
  coverageReport,
  roleTags,
  type SpeciesData,
  type SpeciesProvider,
  type Team,
} from "../src/index.js";
import type { RulesetConfig } from "@champions/ruleset-config";

// --- Fixtures --------------------------------------------------------------

const SPECIES: Record<string, SpeciesData> = {
  garchomp: {
    name: "garchomp",
    displayName: "Garchomp",
    types: ["dragon", "ground"],
    baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    abilities: [
      { name: "sand-veil", isHidden: false },
      { name: "rough-skin", isHidden: true },
    ],
    movepool: ["earthquake", "dragon-claw", "protect", "rock-slide"],
    isFinalStage: true,
    isStandalone: false,
    isLegendary: false,
  },
  gible: {
    name: "gible",
    displayName: "Gible",
    types: ["dragon", "ground"],
    baseStats: { hp: 58, atk: 70, def: 45, spa: 40, spd: 45, spe: 42 },
    abilities: [{ name: "sand-veil", isHidden: false }],
    movepool: ["earthquake", "dragon-claw"],
    isFinalStage: false,
    isStandalone: false,
    isLegendary: false,
  },
  torkoal: {
    name: "torkoal",
    displayName: "Torkoal",
    types: ["fire"],
    baseStats: { hp: 70, atk: 85, def: 140, spa: 85, spd: 70, spe: 20 },
    abilities: [{ name: "drought", isHidden: false }],
    movepool: ["eruption", "heat-wave", "protect", "body-press"],
    isFinalStage: true,
    isStandalone: true,
    isLegendary: false,
  },
};
const provider: SpeciesProvider = (slug) => SPECIES[slug.toLowerCase()] ?? null;

const CHART = {
  dragon: { doubleDamageTo: ["dragon"], halfDamageTo: ["steel"], noDamageTo: ["fairy"] },
  ground: { doubleDamageTo: ["fire", "electric", "poison", "rock", "steel"], halfDamageTo: ["grass", "bug"], noDamageTo: ["flying"] },
  fire: { doubleDamageTo: ["grass", "bug", "ice", "steel"], halfDamageTo: ["fire", "water", "rock", "dragon"], noDamageTo: [] },
  ice: { doubleDamageTo: ["dragon", "ground", "flying", "grass"], halfDamageTo: ["steel", "fire", "water", "ice"], noDamageTo: [] },
  water: { doubleDamageTo: ["fire", "ground", "rock"], halfDamageTo: ["water", "grass", "dragon"], noDamageTo: [] },
};

// Reg M-B-like config (provenance wrappers, with Tera disabled).
const cfg = {
  id: "reg-m-b",
  name: "Regulation Set M-B",
  format: "doubles",
  activeFrom: "2026-06-17",
  activeUntil: { value: "2026-09-02", provenance: "inferred" },
  basePool: { value: "final-evolutions", provenance: "verified" },
  megasAllowed: { value: true, provenance: "verified" },
  teraAllowed: { value: false, provenance: "unverified" },
  restrictedLimit: { value: 0, provenance: "unverified" },
  speciesClause: true,
  itemClause: true,
  bannedSpecies: { value: [], provenance: "unverified" },
  bannedItems: { value: [], provenance: "unverified" },
  bannedMoves: { value: [], provenance: "unverified" },
  bannedAbilities: { value: [], provenance: "unverified" },
  restrictedSpecies: { value: [], provenance: "unverified" },
} as unknown as RulesetConfig;

const legalChomp = {
  species: "garchomp",
  item: "life-orb",
  ability: "rough-skin",
  alignmentId: "jolly",
  moves: ["earthquake", "dragon-claw", "protect", "rock-slide"],
  sp: { hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32 },
  teraType: null,
};

// --- Legality --------------------------------------------------------------

describe("checkTeam legality", () => {
  it("passes a legal single-member team", () => {
    const r = checkTeam({ members: [legalChomp] }, cfg, provider);
    expect(r.legal).toBe(true);
  });

  it("rejects a non-final-evo species", () => {
    const r = checkTeam(
      { members: [{ ...legalChomp, species: "gible", moves: ["earthquake", "dragon-claw"], ability: "sand-veil" }] },
      cfg,
      provider
    );
    expect(r.legal).toBe(false);
    expect(r.issues.some((x) => x.code === "non-final-evo")).toBe(true);
  });

  it("enforces the Species Clause", () => {
    const r = checkTeam({ members: [legalChomp, legalChomp] }, cfg, provider);
    expect(r.issues.some((x) => x.code === "species-clause")).toBe(true);
  });

  it("flags an illegal move, illegal ability and SP over cap", () => {
    const r = checkTeam(
      {
        members: [
          {
            ...legalChomp,
            ability: "levitate", // not Garchomp's
            moves: ["earthquake", "surf", "protect", "rock-slide"], // surf not in pool
            sp: { hp: 0, atk: 40, def: 0, spa: 0, spd: 0, spe: 32 }, // 40 > 32 and total 72 > 66
          },
        ],
      },
      cfg,
      provider
    );
    const codes = r.issues.map((x) => x.code);
    expect(codes).toContain("illegal-ability");
    expect(codes).toContain("illegal-move");
    expect(codes).toContain("sp-cap");
    expect(r.legal).toBe(false);
  });

  it("blocks Tera when the ruleset disallows it", () => {
    const r = checkTeam({ members: [{ ...legalChomp, teraType: "steel" }] }, cfg, provider);
    expect(r.issues.some((x) => x.code === "tera-not-allowed")).toBe(true);
  });

  it("flags an item outside the allowed-items list", () => {
    const withItems = { ...cfg, allowedItems: { value: ["Life Orb"], provenance: "inferred" } } as typeof cfg;
    const legal = checkTeam({ members: [{ ...legalChomp, item: "life-orb" }] }, withItems, provider);
    expect(legal.issues.some((x) => x.code === "illegal-item")).toBe(false);
    const illegal = checkTeam({ members: [{ ...legalChomp, item: "choice-scarf" }] }, withItems, provider);
    expect(illegal.issues.some((x) => x.code === "illegal-item")).toBe(true);
  });
});

describe("legalSpeciesPool (builder picker filter)", () => {
  const all = Object.values(SPECIES);

  it("excludes non-final-evo species under the final-evo pool", () => {
    const pool = legalSpeciesPool(all, cfg);
    const names = pool.map((s) => s.name).sort();
    expect(names).toEqual(["garchomp", "torkoal"]); // gible (pre-evo) dropped
  });

  it("excludes banned species", () => {
    const banned = { ...cfg, bannedSpecies: { value: ["garchomp"], provenance: "verified" } } as typeof cfg;
    const names = legalSpeciesPool(all, banned).map((s) => s.name);
    expect(names).not.toContain("garchomp");
    expect(names).toContain("torkoal");
  });

  it("restricts to the legalSpecies allow-list when present", () => {
    const withAllow = {
      ...cfg,
      legalSpecies: { value: ["Garchomp"], provenance: "inferred" },
    } as typeof cfg;
    const names = legalSpeciesPool(all, withAllow).map((s) => s.name);
    expect(names).toEqual(["garchomp"]); // torkoal not on the list
  });
});

// --- Analysis --------------------------------------------------------------

describe("team analysis", () => {
  const team: Team = {
    members: [
      legalChomp,
      {
        species: "torkoal",
        ability: "drought",
        alignmentId: "brave",
        moves: ["eruption", "heat-wave", "protect", "body-press"],
        sp: { hp: 32, atk: 4, def: 30, spa: 0, spd: 0, spe: 0 },
        teraType: null,
      },
    ],
  };

  it("orders speed tiers fastest-first and flags Trick Room mons", () => {
    const tiers = speedTiers(team, provider);
    expect(tiers[0]!.species).toBe("garchomp");
    const torkoal = tiers.find((t) => t.species === "torkoal")!;
    expect(torkoal.trickRoom).toBe(true); // 0 SP speed + Brave (speed-lowering)
  });

  it("counts shared weaknesses across the team", () => {
    const rep = defensiveReport(team, provider, CHART, 1);
    // Ice hits Garchomp (dragon/ground) x4; threshold 1 should surface it.
    expect(rep.sharedWeaknesses).toContain("ice");
  });

  it("computes offensive coverage and gaps", () => {
    const rep = coverageReport(team, provider, CHART);
    expect(rep.covered.length + rep.gaps.length).toBe(Object.keys(CHART).length);
  });

  it("tags roles heuristically", () => {
    expect(roleTags(legalChomp, provider)).toContain("physical-attacker");
    expect(roleTags(team.members[1]!, provider)).toContain("trick-room");
  });
});
