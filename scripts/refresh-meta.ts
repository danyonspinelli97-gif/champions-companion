/**
 * Lightweight meta/usage refresh — keeps the live site's usage data current
 * without rebuilding the whole roster.
 *
 * Unlike `seed:meta` (which rebuilds championsbattledata metadata + PokéAPI
 * movepools + type chart), only usage changes day-to-day, so this script:
 *   - reads the committed species list (so meta keys line up with the app),
 *   - resolves the current season,
 *   - re-pulls Doubles usage per species from championsbattledata,
 *   - rewrites apps/web/public/data/meta.json in the shape the app loads.
 *
 * No SQLite. Runs in CI (see .github/workflows/refresh-meta.yml).
 *   node --import tsx scripts/refresh-meta.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ChampionsBattleDataSource } from "../data/sources/championsbattledata.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPECIES = join(ROOT, "apps", "web", "public", "data", "species.json");
const OUT = join(ROOT, "apps", "web", "public", "data", "meta.json");

async function main() {
  const species = JSON.parse(await readFile(SPECIES, "utf8")) as { name: string }[];
  const cbd = new ChampionsBattleDataSource();
  const { defaultSeason } = await cbd.listSeasons();

  const bySpecies: Record<string, unknown> = {};
  let ok = 0;
  for (const s of species) {
    try {
      const rows = await cbd.fetchUsage("Doubles", s.name, defaultSeason);
      if (rows.length) {
        bySpecies[s.name] = rows;
        ok++;
      }
    } catch {
      /* not all forms have usage; skip quietly */
    }
  }

  await writeFile(
    OUT,
    JSON.stringify({ season: defaultSeason, attribution: cbd.attribution, bySpecies })
  );
  console.log(`✓ refreshed meta for ${ok}/${species.length} species (${defaultSeason}) → ${OUT}`);
}

main().catch((e) => {
  console.error("Meta refresh failed:", e);
  process.exit(1);
});
