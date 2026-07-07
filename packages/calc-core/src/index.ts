/**
 * @champions/calc-core
 *
 * Framework-agnostic competitive math for Pokémon Champions (fixed Level 50,
 * perfect 31 IVs, Stat Points instead of EVs, Stat Alignments instead of
 * Natures). No DOM / React dependencies so this package is shared verbatim by
 * the web app and any future Capacitor / React Native build.
 *
 * Damage calculation (Phase 2) will live alongside this, adapted from the
 * open-source Smogon engine with IV handling removed and Champions move-effect
 * deltas audited in.
 */
export * from "./types.js";
export * from "./alignments.js";
export * from "./stats.js";
export * from "./speed.js";
export * from "./spread.js";
export * from "./typechart.js";
export * from "./damage.js";
