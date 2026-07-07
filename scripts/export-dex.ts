/**
 * Export the full National Dex (1000+ species) for the reference Pokédex tab.
 *
 * Independent of the Champions legal roster: pulls every species from PokéAPI
 * (base stats, types, abilities, sprite) and writes apps/web/public/data/dex.json.
 * Cached to disk, so re-runs are fast. Run locally (needs network):
 *   node --import tsx scripts/export-dex.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PokeApiSource } from "../data/sources/pokeapi.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "data", "cache", "raw");
const OUT_DIR = join(ROOT, "apps", "web", "public", "data");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const pokeapi = new PokeApiSource({ rawCacheDir: RAW_DIR });

  console.log("→ Fetching National Dex (first run is slow; cached after)…");
  const dex = (await pokeapi.fetchNationalDex()).map((r) => ({
    name: r.name,
    displayName: r.displayName,
    num: r.id,
    types: r.types,
    baseStats: r.baseStats,
    abilities: r.abilities,
    movepool: [],
    isFinalStage: r.isFinalStage,
    isStandalone: r.isStandalone,
    isLegendary: r.isLegendary,
    spriteUrl: r.spriteUrl ?? null,
  }));

  await writeFile(join(OUT_DIR, "dex.json"), JSON.stringify(dex));
  console.log(`✓ Exported ${dex.length} species → ${join(OUT_DIR, "dex.json")}`);
}

main().catch((e) => {
  console.error("Dex export failed:", e);
  process.exit(1);
});
