import {
  computeStat,
  getAlignment,
  typeEffectiveness,
  type TypeChart,
} from "@champions/calc-core";
import type { SpeciesProvider, Team } from "./types.js";

// ---------------------------------------------------------------------------
// Speed tiers
// ---------------------------------------------------------------------------

export interface SpeedEntry {
  species: string;
  displayName: string;
  speed: number;
  alignmentId: string;
  /** True when this member is built for Trick Room (0 SP + speed-lowering). */
  trickRoom: boolean;
}

export function speedTiers(team: Team, getSpecies: SpeciesProvider): SpeedEntry[] {
  const out: SpeedEntry[] = [];
  for (const m of team.members) {
    const sp = getSpecies(m.species);
    if (!sp) continue;
    let speed = 0;
    try {
      speed = computeStat("spe", sp.baseStats.spe, m.sp.spe, m.alignmentId);
    } catch {
      speed = sp.baseStats.spe;
    }
    let lowersSpeed = false;
    try {
      lowersSpeed = getAlignment(m.alignmentId).reduce === "spe";
    } catch {
      /* invalid alignment handled by legality */
    }
    out.push({
      species: m.species,
      displayName: sp.displayName,
      speed,
      alignmentId: m.alignmentId,
      trickRoom: m.sp.spe === 0 && lowersSpeed,
    });
  }
  return out.sort((a, b) => b.speed - a.speed);
}

// ---------------------------------------------------------------------------
// Defensive analysis (shared weaknesses)
// ---------------------------------------------------------------------------

export interface DefensiveTypeSummary {
  type: string;
  weak: number; // members taking >1x
  resist: number; // members taking <1x but >0
  immune: number; // members taking 0x
}

export interface DefensiveReport {
  perType: DefensiveTypeSummary[];
  /** Types that hit `threshold`+ team members super-effectively. */
  sharedWeaknesses: string[];
}

export function defensiveReport(
  team: Team,
  getSpecies: SpeciesProvider,
  chart: TypeChart,
  threshold = 3
): DefensiveReport {
  const members = team.members
    .map((m) => getSpecies(m.species))
    .filter((s): s is NonNullable<typeof s> => !!s);

  const perType: DefensiveTypeSummary[] = [];
  for (const atkType of Object.keys(chart)) {
    let weak = 0,
      resist = 0,
      immune = 0;
    for (const sp of members) {
      const eff = typeEffectiveness(atkType, sp.types, chart);
      if (eff === 0) immune++;
      else if (eff > 1) weak++;
      else if (eff < 1) resist++;
    }
    perType.push({ type: atkType, weak, resist, immune });
  }
  perType.sort((a, b) => b.weak - a.weak);
  const sharedWeaknesses = perType.filter((t) => t.weak >= threshold).map((t) => t.type);
  return { perType, sharedWeaknesses };
}

// ---------------------------------------------------------------------------
// Offensive coverage
// ---------------------------------------------------------------------------

export type MoveTypeProvider = (moveSlug: string) => string | null;

export interface CoverageReport {
  /** Defending types the team can hit super-effectively. */
  covered: string[];
  /** Defending types nothing on the team is super-effective against. */
  gaps: string[];
}

/**
 * Offensive coverage across all 18 defending types. If `getMoveType` is given
 * it uses actual move types; otherwise it falls back to each member's own
 * (STAB) types as a coarse proxy.
 */
export function coverageReport(
  team: Team,
  getSpecies: SpeciesProvider,
  chart: TypeChart,
  getMoveType?: MoveTypeProvider
): CoverageReport {
  const attackTypes = new Set<string>();
  for (const m of team.members) {
    if (getMoveType) {
      for (const mv of m.moves) {
        const t = getMoveType(mv);
        if (t) attackTypes.add(t.toLowerCase());
      }
    } else {
      const sp = getSpecies(m.species);
      sp?.types.forEach((t) => attackTypes.add(t.toLowerCase()));
    }
  }

  const allDefTypes = Object.keys(chart);
  const covered: string[] = [];
  const gaps: string[] = [];
  for (const def of allDefTypes) {
    const hit = [...attackTypes].some(
      (atk) => typeEffectiveness(atk, [def], chart) > 1
    );
    (hit ? covered : gaps).push(def);
  }
  return { covered, gaps };
}

// ---------------------------------------------------------------------------
// Role tagging (heuristic)
// ---------------------------------------------------------------------------

const SUPPORT_MOVES = new Set(
  [
    "tailwind",
    "fake-out",
    "helping-hand",
    "protect",
    "detect",
    "follow-me",
    "rage-powder",
    "reflect",
    "light-screen",
    "aurora-veil",
    "trick-room",
    "wide-guard",
    "encore",
    "taunt",
    "will-o-wisp",
  ].map((s) => s)
);

export function roleTags(
  member: Team["members"][number],
  getSpecies: SpeciesProvider
): string[] {
  const tags: string[] = [];
  let lowersSpeed = false;
  try {
    lowersSpeed = getAlignment(member.alignmentId).reduce === "spe";
  } catch {
    /* ignore */
  }
  if (member.sp.spe === 0 && lowersSpeed) tags.push("trick-room");

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
  if (member.moves.some((mv) => SUPPORT_MOVES.has(norm(mv)))) tags.push("support");

  if (member.sp.atk >= 24) tags.push("physical-attacker");
  if (member.sp.spa >= 24) tags.push("special-attacker");
  if (member.sp.hp >= 20 && (member.sp.def >= 20 || member.sp.spd >= 20)) tags.push("wall");

  if (tags.length === 0) tags.push("flex");
  return tags;
}
