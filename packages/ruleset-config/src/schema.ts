/**
 * Ruleset / regulation schema for Pokémon Champions.
 *
 * Regulations rotate (Reg M-A, M-B, …). The whole point is that this is DATA,
 * not code: you update a JSON file under `rulesets/` and the app follows
 * without a rebuild. Each field carries provenance so the UI can flag anything
 * not yet confirmed against the in-game Battle Data.
 */

export type Provenance = "verified" | "unverified" | "inferred";

export interface ProvenanceField<T> {
  value: T;
  provenance: Provenance;
  /** Where the value came from / what to check to verify it. */
  note?: string;
}

export interface RulesetConfig {
  /** Stable id, e.g. "reg-m-b". */
  id: string;
  /** Display name, e.g. "Regulation Set M-B". */
  name: string;
  format: "doubles" | "singles";
  /** ISO dates; `activeUntil` may be presumed. */
  activeFrom: string;
  activeUntil: ProvenanceField<string | null>;

  /** Base species pool the bans/limits are applied on top of. */
  basePool: ProvenanceField<"final-evolutions" | "all">;

  megasAllowed: ProvenanceField<boolean>;
  teraAllowed: ProvenanceField<boolean>;

  /** How many "restricted" (box-legend tier) Pokémon a team may include. */
  restrictedLimit: ProvenanceField<number>;

  /** Species/Item clauses — no duplicate species or items on a team. */
  speciesClause: boolean;
  itemClause: boolean;

  /** Explicit ban lists layered on top of the base pool. */
  bannedSpecies: ProvenanceField<string[]>;
  bannedItems: ProvenanceField<string[]>;
  bannedMoves: ProvenanceField<string[]>;
  bannedAbilities: ProvenanceField<string[]>;
  /** Species treated as "restricted" for the restrictedLimit count. */
  restrictedSpecies: ProvenanceField<string[]>;

  /**
   * Allow-list of legal species names for the format (base-species level, plus
   * any explicitly-listed Megas). When present, the builder restricts its
   * picker to roster forms whose base species is in this list. Omit/empty to
   * allow the whole base pool.
   */
  legalSpecies?: ProvenanceField<string[]>;

  /** Allow-list of legal held items. When present, other items are illegal. */
  allowedItems?: ProvenanceField<string[]>;
  /** Allow-list of legal moves. When present, moves outside it are illegal. */
  allowedMoves?: ProvenanceField<string[]>;

  /** Where to pull live meta/usage data for this regulation. */
  metaDataSource?: {
    adapter: string;
    season: string;
  };
}

const PROVENANCE_KEYS: (keyof RulesetConfig)[] = [
  "activeUntil",
  "basePool",
  "megasAllowed",
  "teraAllowed",
  "restrictedLimit",
  "bannedSpecies",
  "bannedItems",
  "bannedMoves",
  "bannedAbilities",
  "restrictedSpecies",
];

export interface ConfigValidation {
  ok: boolean;
  errors: string[];
  /** Fields that still need human confirmation against the game. */
  unverified: string[];
}

/** Structural validation + a report of which fields are not yet verified. */
export function validateRuleset(cfg: RulesetConfig): ConfigValidation {
  const errors: string[] = [];
  const unverified: string[] = [];

  if (!cfg.id) errors.push("id is required.");
  if (cfg.format !== "doubles" && cfg.format !== "singles")
    errors.push(`format must be "doubles" or "singles", got "${cfg.format}".`);
  if (Number.isNaN(Date.parse(cfg.activeFrom)))
    errors.push(`activeFrom is not a valid date: "${cfg.activeFrom}".`);

  for (const key of PROVENANCE_KEYS) {
    const field = cfg[key] as ProvenanceField<unknown> | undefined;
    if (!field || typeof field !== "object" || !("provenance" in field)) {
      errors.push(`${String(key)} must be a provenance field.`);
      continue;
    }
    if (field.provenance !== "verified") unverified.push(String(key));
  }

  const rl = cfg.restrictedLimit?.value;
  if (typeof rl === "number" && rl < 0)
    errors.push("restrictedLimit cannot be negative.");

  return { ok: errors.length === 0, errors, unverified };
}
