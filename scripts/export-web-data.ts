/**
 * Export the local SQLite cache into static JSON the PWA can fetch.
 *
 * Keeps the web app self-contained (no API needed yet) and offline-capable.
 * Run after seeding:
 *   node --experimental-sqlite --import tsx scripts/export-web-data.ts
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SqliteCacheStore } from "../data/cache/store.js";
import type { TypeChart } from "@champions/calc-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = join(ROOT, "data", "cache", "champions.sqlite");
const OUT_DIR = join(ROOT, "apps", "web", "public", "data");
const RULESET = join(ROOT, "packages", "ruleset-config", "rulesets", "reg-m-b.json");
const RULESET_MA = join(ROOT, "packages", "ruleset-config", "rulesets", "reg-m-a.json");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const store = new SqliteCacheStore(DB_PATH);
  store.init();

  // Legal pool -> SpeciesData shape used by team-builder/UI (moves -> movepool).
  const species = store.legalPool().map((r) => ({
    name: r.name,
    displayName: r.displayName,
    baseName: r.baseName,
    types: r.types,
    baseStats: r.baseStats,
    abilities: r.abilities,
    movepool: r.moves,
    isFinalStage: r.isFinalStage,
    isStandalone: r.isStandalone,
    isLegendary: r.isLegendary,
    form: r.form ?? undefined,
    spriteUrl: r.spriteUrl ?? null,
  }));
  species.sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Type chart -> TypeChart record keyed by attacking type.
  const chart: TypeChart = {};
  for (const t of store.getTypeChart()) {
    chart[t.type] = {
      doubleDamageTo: t.doubleDamageTo,
      halfDamageTo: t.halfDamageTo,
      noDamageTo: t.noDamageTo,
    };
  }

  const ruleset = JSON.parse(await readFile(RULESET, "utf8"));

  // Regulations for the Pokédex filter (each with its legal-species list).
  const rulesetMA = JSON.parse(await readFile(RULESET_MA, "utf8"));
  const regulations = {
    regs: [ruleset, rulesetMA].map((r: any) => ({
      id: r.id,
      name: r.name,
      legalSpecies: r.legalSpecies?.value ?? [],
    })),
  };

  // Meta/usage (only present if `npm run seed:meta` was run).
  const season = store.getMetadata("metaSeason");
  const attribution = store.getMetadata("metaAttribution") ?? "";
  const bySpecies: Record<string, unknown> = {};
  let metaCount = 0;
  if (season) {
    for (const s of species) {
      const rows = store.getMeta("Doubles", season, s.name);
      if (rows.length) {
        bySpecies[s.name] = rows;
        metaCount++;
      }
    }
  }

  await writeFile(join(OUT_DIR, "species.json"), JSON.stringify(species));
  await writeFile(join(OUT_DIR, "typechart.json"), JSON.stringify(chart));
  await writeFile(join(OUT_DIR, "ruleset-reg-m-b.json"), JSON.stringify(ruleset));
  await writeFile(join(OUT_DIR, "regulations.json"), JSON.stringify(regulations));
  await writeFile(
    join(OUT_DIR, "meta.json"),
    JSON.stringify({ season: season ?? null, attribution, bySpecies })
  );

  store.close();
  console.log(
    `✓ Exported ${species.length} species, ${Object.keys(chart).length} types, ` +
      `${metaCount} species with usage → ${OUT_DIR}`
  );
}

main().catch((e) => {
  console.error("Export failed:", e);
  process.exit(1);
});
