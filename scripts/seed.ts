/**
 * Seed script: build the local SQLite cache.
 *
 * Roster source of truth is championsbattledata (the Champions-accurate species
 * list incl. forms + Champions-only Megas, with L50/0-SP stats we invert into
 * base stats). PokéAPI supplies the type chart and movepool enrichment only.
 *
 * Run locally (needs network + Node >= 22.5 for node:sqlite):
 *   node --experimental-sqlite --import tsx scripts/seed.ts
 *   node --experimental-sqlite --import tsx scripts/seed.ts --meta   # + usage
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PokeApiSource } from "../data/sources/pokeapi.js";
import { ChampionsBattleDataSource } from "../data/sources/championsbattledata.js";
import { SqliteCacheStore } from "../data/cache/store.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = join(ROOT, "data", "cache");
const RAW_DIR = join(CACHE_DIR, "raw");
const DB_PATH = join(CACHE_DIR, "champions.sqlite");

const slugify = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "-");

async function main() {
  const withMeta = process.argv.includes("--meta");
  await mkdir(RAW_DIR, { recursive: true });

  const store = new SqliteCacheStore(DB_PATH);
  store.init();

  const pokeapi = new PokeApiSource({ rawCacheDir: RAW_DIR });
  const cbd = new ChampionsBattleDataSource({ rawCacheDir: RAW_DIR });

  console.log("→ Fetching type chart (PokéAPI)…");
  const typeChart = await pokeapi.fetchTypeChart();
  store.saveTypeChart(typeChart);
  console.log(`  saved ${typeChart.length} types`);

  console.log("→ Building Champions roster (championsbattledata)…");
  const roster = await cbd.buildRoster();

  // Enrich movepools from PokéAPI, one fetch per base species (shared by forms).
  console.log("→ Enriching movepools (PokéAPI, per base species)…");
  const movepoolByBase = new Map<string, string[]>();
  for (const rec of roster) {
    const baseSlug = slugify(rec.baseName ?? rec.name);
    if (!movepoolByBase.has(baseSlug)) {
      movepoolByBase.set(baseSlug, await pokeapi.fetchMovepool(baseSlug));
    }
    rec.moves = movepoolByBase.get(baseSlug)!;
  }
  const withMoves = roster.filter((r) => r.moves.length > 0).length;

  store.clearSpecies(); // drop any rows from a previous (e.g. PokéAPI) seed
  store.saveSpecies(roster);
  console.log(
    `  saved ${roster.length} Champions forms (${withMoves} with movepools)`
  );

  if (withMeta) {
    const { defaultSeason } = await cbd.listSeasons();
    console.log(`→ Fetching Doubles usage for season "${defaultSeason}"…`);
    let ok = 0;
    for (const rec of roster) {
      try {
        const rows = await cbd.fetchUsage("Doubles", rec.name, defaultSeason);
        if (rows.length) {
          store.saveMeta("Doubles", defaultSeason, rec.name, rows);
          ok++;
        }
      } catch {
        /* not all forms appear in usage; skip */
      }
    }
    store.setMetadata("metaSeason", defaultSeason);
    store.setMetadata("metaAttribution", cbd.attribution);
    console.log(`  saved usage for ${ok} forms`);
  }

  store.setMetadata("seededAt", new Date().toISOString());
  store.setMetadata("rosterCount", String(roster.length));
  store.setMetadata("rosterAttribution", cbd.attribution);
  store.close();
  console.log("✓ Seed complete →", DB_PATH);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
