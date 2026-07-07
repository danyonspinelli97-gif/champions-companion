/**
 * @champions/team-builder
 *
 * Pure logic for building and validating Champions teams: legality against the
 * active ruleset plus team-level analysis (speed tiers, shared weaknesses,
 * offensive coverage, role tagging). No UI or data-layer dependencies — it
 * takes a SpeciesProvider so it runs against the cache, a fixture, or an API.
 */
export * from "./types.js";
export * from "./legality.js";
export * from "./analysis.js";
export * from "./meta.js";
