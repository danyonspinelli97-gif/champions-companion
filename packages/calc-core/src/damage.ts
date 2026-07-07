/**
 * Doubles-aware damage calculator for Pokémon Champions.
 *
 * Implements the standard Gen 9 damage formula directly (rather than depending
 * on @smogon/calc), because Champions replaces the IV/EV/Nature stat layer that
 * @smogon/calc is built around. We feed it the exact Champions final stats from
 * this same package and reproduce Showdown's 4096 fixed-point modifier chain +
 * pokeRound so results match the Smogon calculator (our parity oracle).
 *
 * Champions move-effect deltas are applied UPSTREAM (via @champions/overlay's
 * MOVE_OVERRIDES) before calling here, so this module stays dependency-free and
 * the overlay relationship doesn't become circular.
 */
import { FIXED_LEVEL, type StatTable } from "./types.js";
import { applyStage } from "./stats.js";
import { typeEffectiveness, type TypeChart } from "./typechart.js";

const M = 4096;

/** Round half *down* — Pokémon's rounding, not JavaScript's Math.round. */
export function pokeRound(n: number): number {
  return n % 1 > 0.5 ? Math.ceil(n) : Math.floor(n);
}

/** Apply one modifier expressed in 4096ths. */
function applyMod(value: number, mod: number): number {
  return pokeRound((value * mod) / M);
}

/** Chain several 4096th-modifiers into one (Showdown's chainModify). */
function chain(mods: number[]): number {
  let chained = M;
  for (const mod of mods) chained = Math.floor((chained * mod + 2048) / M);
  return chained;
}

export type DamageCategory = "physical" | "special";
export type Weather = "sun" | "rain" | "none";

export interface MoveInput {
  name: string;
  basePower: number;
  type: string;
  category: DamageCategory;
  /** Hits 2+ targets — triggers the 0.75× spread reduction in doubles. */
  isSpread?: boolean;
}

export interface CombatantInput {
  finalStats: StatTable;
  /** Original (pre-Tera) types. */
  types: string[];
  /** Tera type if terastallized this turn, else null/undefined. */
  teraType?: string | null;
  ability?: string;
  item?: string;
  statStages?: Partial<Record<keyof StatTable, number>>;
  status?: "brn" | "none";
}

export interface FieldInput {
  isDoubles: boolean;
  weather?: Weather;
  reflect?: boolean;
  lightScreen?: boolean;
  auroraVeil?: boolean;
  helpingHand?: boolean;
  /** Force a critical hit (UI "what if crit"). */
  crit?: boolean;
}

export interface DamageResult {
  /** 16 damage values for rolls 85%…100%. */
  rolls: number[];
  minDamage: number;
  maxDamage: number;
  /** Damage as % of the defender's max HP. */
  minPct: number;
  maxPct: number;
  effectiveness: number;
}

function stage(stages: CombatantInput["statStages"], key: keyof StatTable): number {
  return stages?.[key] ?? 0;
}

export function computeDamage(
  attacker: CombatantInput,
  defender: CombatantInput,
  move: MoveInput,
  field: FieldInput,
  chart: TypeChart
): DamageResult {
  const crit = !!field.crit;

  // --- Offensive / defensive stats with stage + crit rules ---------------
  const physical = move.category === "physical";
  let aStage = stage(attacker.statStages, physical ? "atk" : "spa");
  let dStage = stage(defender.statStages, physical ? "def" : "spd");
  // Crits ignore the attacker's negative drops and the defender's positive boosts.
  if (crit) {
    aStage = Math.max(aStage, 0);
    dStage = Math.min(dStage, 0);
  }
  let A = applyStage(attacker.finalStats[physical ? "atk" : "spa"], aStage);
  let D = applyStage(defender.finalStats[physical ? "def" : "spd"], dStage);

  // Choice item / Assault Vest stat modifiers.
  if (attacker.item === "choice-band" && physical) A = applyMod(A, 6144);
  if (attacker.item === "choice-specs" && !physical) A = applyMod(A, 6144);
  if (defender.item === "assault-vest" && !physical) D = applyMod(D, 6144);

  // --- Base damage --------------------------------------------------------
  const lvlFactor = Math.floor((2 * FIXED_LEVEL) / 5) + 2; // 22 at L50
  let base = Math.floor(
    Math.floor((lvlFactor * move.basePower * A) / D) / 50
  ) + 2;

  // Spread reduction (doubles, multi-target move).
  if (field.isDoubles && move.isSpread) base = applyMod(base, 3072); // 0.75

  // Weather.
  const w = field.weather ?? "none";
  if ((w === "sun" && move.type === "fire") || (w === "rain" && move.type === "water"))
    base = applyMod(base, 6144); // 1.5
  else if ((w === "sun" && move.type === "water") || (w === "rain" && move.type === "fire"))
    base = applyMod(base, 2048); // 0.5

  // Critical hit.
  if (crit) base = applyMod(base, 6144); // 1.5

  // --- STAB --------------------------------------------------------------
  const moveType = move.type.toLowerCase();
  const isStab = attacker.types.map((t) => t.toLowerCase()).includes(moveType);
  const teraMatch = !!attacker.teraType && attacker.teraType.toLowerCase() === moveType;
  const adaptability = attacker.ability === "adaptability";
  let stabMod = M;
  if (isStab || teraMatch) {
    if (adaptability) stabMod = isStab && teraMatch ? 9216 : 8192; // 2.25 or 2.0
    else stabMod = isStab && teraMatch ? 8192 : 6144; // 2.0 or 1.5
  }

  // --- Type effectiveness (defender Tera replaces its types) -------------
  const defenseTypes =
    defender.teraType && defender.teraType !== "none"
      ? [defender.teraType]
      : defender.types;
  const eff = typeEffectiveness(moveType, defenseTypes, chart);

  // --- Burn --------------------------------------------------------------
  const burned =
    physical && attacker.status === "brn" && attacker.ability !== "guts";

  // --- Final modifier chain (screens, items, Helping Hand) ---------------
  const finalMods: number[] = [];
  if (!crit) {
    const screenUp =
      (physical && field.reflect) ||
      (!physical && field.lightScreen) ||
      field.auroraVeil;
    if (screenUp) finalMods.push(field.isDoubles ? 2732 : 2048); // 0.667 / 0.5
  }
  if (field.helpingHand) finalMods.push(6144); // 1.5
  if (attacker.item === "life-orb") finalMods.push(5324); // ~1.3
  const finalMod = chain(finalMods);

  // --- Roll out the 16 values --------------------------------------------
  const hp = defender.finalStats.hp;
  const rolls: number[] = [];
  for (let r = 85; r <= 100; r++) {
    let dmg = Math.floor((base * r) / 100);
    dmg = applyMod(dmg, stabMod);
    dmg = Math.floor(dmg * eff);
    if (burned) dmg = applyMod(dmg, 2048);
    dmg = applyMod(dmg, finalMod);
    if (eff > 0 && move.basePower > 0) dmg = Math.max(1, dmg);
    rolls.push(dmg);
  }

  const minDamage = rolls[0]!;
  const maxDamage = rolls[rolls.length - 1]!;
  return {
    rolls,
    minDamage,
    maxDamage,
    minPct: round1((minDamage / hp) * 100),
    maxPct: round1((maxDamage / hp) * 100),
    effectiveness: eff,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// "Do I OHKO / do I survive" query helpers
// ---------------------------------------------------------------------------

export interface KoSummary {
  effectiveness: number;
  minDamage: number;
  maxDamage: number;
  minPct: number;
  maxPct: number;
  /** Fraction of the 16 rolls that reach the defender's HP (0–100). */
  ohkoChancePct: number;
  guaranteedOhko: boolean;
  /** True if even the max roll leaves the defender alive. */
  defenderSurvives: boolean;
}

export function summarizeKo(result: DamageResult, defenderHp: number): KoSummary {
  const kos = result.rolls.filter((d) => d >= defenderHp).length;
  return {
    effectiveness: result.effectiveness,
    minDamage: result.minDamage,
    maxDamage: result.maxDamage,
    minPct: result.minPct,
    maxPct: result.maxPct,
    ohkoChancePct: Math.round((kos / result.rolls.length) * 1000) / 10,
    guaranteedOhko: result.minDamage >= defenderHp,
    defenderSurvives: result.maxDamage < defenderHp,
  };
}
