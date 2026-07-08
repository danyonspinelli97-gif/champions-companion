import { validateSp, getAlignment } from "@champions/calc-core";
import type { RulesetConfig } from "@champions/ruleset-config";
import type {
  LegalityIssue,
  LegalityReport,
  SpeciesData,
  SpeciesProvider,
  Team,
  TeamMember,
} from "./types.js";

/**
 * The species a team may CHOOSE FROM under a ruleset: the base pool minus the
 * species ban list. (Restricted species are still selectable — the team-level
 * `restrictedLimit` governs how many may be used, not whether they're legal.)
 *
 * Use this to filter a builder's species picker. The full roster is unaffected,
 * so a Pokédex can still list everything.
 */
/** Normalize a Pokémon name for matching (lowercase, non-alphanumerics → "-"). */
function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function legalSpeciesPool(
  species: SpeciesData[],
  cfg: RulesetConfig
): SpeciesData[] {
  const banned = new Set(cfg.bannedSpecies.value.map((s) => normName(s)));
  const finalOnly = cfg.basePool.value === "final-evolutions";

  // Optional allow-list. Matched at the base-species level so all forms/Megas
  // of a legal species are selectable (and explicitly-listed Megas too).
  const allow =
    cfg.legalSpecies && cfg.legalSpecies.value.length
      ? new Set(cfg.legalSpecies.value.map((s) => normName(s)))
      : null;

  return species.filter((s) => {
    if (banned.has(normName(s.name))) return false;
    if (finalOnly && !(s.isFinalStage || s.isStandalone)) return false;
    if (allow) {
      const base = s.baseName ? normName(s.baseName) : "";
      if (!allow.has(base) && !allow.has(normName(s.name))) return false;
    }
    return true;
  });
}

const MAX_TEAM_SIZE = 6;
const MAX_MOVES = 4;

/**
 * Validate a whole team against the active ruleset.
 *
 * Errors make a team illegal; warnings are advisory (e.g. fewer than 4 moves).
 * All ruleset lookups read `.value` from the provenance-wrapped config, so an
 * unverified/placeholder ban list simply means "nothing banned yet" — the UI
 * is responsible for surfacing that those fields are unconfirmed.
 */
export function checkTeam(
  team: Team,
  cfg: RulesetConfig,
  getSpecies: SpeciesProvider,
  /**
   * Optional: the moves that appear in a species' Champions usage data. Any
   * move listed here is empirically legal, so it overrides a mainline-movepool
   * miss (which is known-imperfect for Champions). Returns names/slugs; matched
   * case-insensitively.
   */
  getMetaMoves?: (slug: string) => string[]
): LegalityReport {
  const issues: LegalityIssue[] = [];
  const push = (
    memberIndex: number | null,
    severity: "error" | "warning",
    code: string,
    message: string
  ) => issues.push({ memberIndex, severity, code, message });

  // --- Team-level ---------------------------------------------------------
  if (team.members.length === 0) push(null, "error", "empty-team", "Team has no members.");
  if (team.members.length > MAX_TEAM_SIZE)
    push(null, "error", "team-too-large", `A team may have at most ${MAX_TEAM_SIZE} Pokémon.`);

  if (cfg.speciesClause) {
    const seen = new Map<string, number>();
    team.members.forEach((m, i) => {
      const key = m.species.toLowerCase();
      if (seen.has(key))
        push(i, "error", "species-clause", `Duplicate species "${m.species}" (Species Clause).`);
      else seen.set(key, i);
    });
  }
  if (cfg.itemClause) {
    const seen = new Map<string, number>();
    team.members.forEach((m, i) => {
      if (!m.item) return;
      const key = m.item.toLowerCase();
      if (seen.has(key))
        push(i, "error", "item-clause", `Duplicate item "${m.item}" (Item Clause).`);
      else seen.set(key, i);
    });
  }

  const restricted = new Set(cfg.restrictedSpecies.value.map((s) => s.toLowerCase()));
  const restrictedCount = team.members.filter((m) =>
    restricted.has(m.species.toLowerCase())
  ).length;
  if (restrictedCount > cfg.restrictedLimit.value)
    push(
      null,
      "error",
      "restricted-limit",
      `${restrictedCount} restricted Pokémon exceeds the limit of ${cfg.restrictedLimit.value}.`
    );

  // --- Per-member ---------------------------------------------------------
  team.members.forEach((m, i) => checkMember(m, i, cfg, getSpecies, push, getMetaMoves));

  const legal = !issues.some((x) => x.severity === "error");
  return { legal, issues };
}

function checkMember(
  m: TeamMember,
  i: number,
  cfg: RulesetConfig,
  getSpecies: SpeciesProvider,
  push: (mi: number | null, sev: "error" | "warning", code: string, msg: string) => void,
  getMetaMoves?: (slug: string) => string[]
): void {
  if (!m.species || !m.species.trim()) {
    push(i, "warning", "no-species", "Select a Pokémon for this slot.");
    return;
  }
  const species = getSpecies(m.species);
  if (!species) {
    push(i, "error", "unknown-species", `Unknown species "${m.species}".`);
    return;
  }

  // Final-evolution-only pool.
  if (cfg.basePool.value === "final-evolutions" && !(species.isFinalStage || species.isStandalone))
    push(i, "error", "non-final-evo", `${species.displayName} is not a fully-evolved Pokémon.`);

  // Ban lists.
  if (cfg.bannedSpecies.value.map((s) => s.toLowerCase()).includes(m.species.toLowerCase()))
    push(i, "error", "banned-species", `${species.displayName} is banned in ${cfg.name}.`);
  if (m.item && cfg.bannedItems.value.map((s) => s.toLowerCase()).includes(m.item.toLowerCase()))
    push(i, "error", "banned-item", `Item "${m.item}" is banned in ${cfg.name}.`);
  if (m.item && cfg.allowedItems && cfg.allowedItems.value.length) {
    const allowedItems = new Set(cfg.allowedItems.value.map((s) => normName(s)));
    if (!allowedItems.has(normName(m.item)))
      push(i, "error", "illegal-item", `Item "${m.item}" is not legal in ${cfg.name}.`);
  }

  // Ability legality.
  if (m.ability) {
    const owns = species.abilities.some(
      (a) => a.name.toLowerCase() === m.ability!.toLowerCase()
    );
    if (!owns)
      push(i, "error", "illegal-ability", `${species.displayName} cannot have ability "${m.ability}".`);
    if (cfg.bannedAbilities.value.map((s) => s.toLowerCase()).includes(m.ability.toLowerCase()))
      push(i, "error", "banned-ability", `Ability "${m.ability}" is banned in ${cfg.name}.`);
  }

  // Moves: movepool membership, ban list, count, duplicates.
  const movepool = new Set(species.movepool.map((s) => s.toLowerCase()));
  const movepoolKnown = movepool.size > 0;
  // Moves proven legal by usage data (Champions-accurate), normalised for match.
  const metaMoves = new Set((getMetaMoves?.(m.species) ?? []).map(normName));
  const bannedMoves = new Set(cfg.bannedMoves.value.map((s) => s.toLowerCase()));
  const allowedMoves =
    cfg.allowedMoves && cfg.allowedMoves.value.length
      ? new Set(cfg.allowedMoves.value.map((s) => normName(s)))
      : null;
  const seenMoves = new Set<string>();
  if (m.moves.length > MAX_MOVES)
    push(i, "error", "too-many-moves", `${species.displayName} has more than ${MAX_MOVES} moves.`);
  if (m.moves.length < MAX_MOVES)
    push(i, "warning", "few-moves", `${species.displayName} has fewer than ${MAX_MOVES} moves.`);
  if (!movepoolKnown && m.moves.length > 0)
    push(i, "warning", "movepool-unknown", `Movepool for ${species.displayName} is unavailable — moves not validated.`);
  for (const mv of m.moves) {
    const key = mv.toLowerCase();
    // The mainline (PokéAPI) movepool is known-imperfect for Champions, which
    // has its own per-regulation learnsets. So a movepool miss is only advisory,
    // and a move that appears in usage data is treated as empirically legal
    // (no issue at all). True bans below stay hard errors.
    if (movepoolKnown && !movepool.has(key) && !metaMoves.has(normName(mv)))
      push(i, "warning", "unverified-move", `Couldn't verify "${mv}" for ${species.displayName} — not in its known movepool.`);
    if (bannedMoves.has(key))
      push(i, "error", "banned-move", `Move "${mv}" is banned in ${cfg.name}.`);
    if (allowedMoves && !allowedMoves.has(normName(mv)))
      push(i, "error", "illegal-move-format", `Move "${mv}" is not legal in ${cfg.name}.`);
    if (seenMoves.has(key))
      push(i, "warning", "duplicate-move", `Duplicate move "${mv}".`);
    seenMoves.add(key);
  }

  // Stat Alignment validity.
  try {
    getAlignment(m.alignmentId);
  } catch {
    push(i, "error", "invalid-alignment", `Unknown Stat Alignment "${m.alignmentId}".`);
  }

  // SP caps.
  const sp = validateSp(m.sp);
  for (const err of sp.errors) push(i, "error", "sp-cap", err);

  // Tera.
  if (m.teraType && m.teraType !== "none" && !cfg.teraAllowed.value)
    push(i, "error", "tera-not-allowed", `Terastallization is not allowed in ${cfg.name}.`);
}
