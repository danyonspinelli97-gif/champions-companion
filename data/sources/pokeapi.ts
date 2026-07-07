/**
 * PokéAPI static data adapter.
 *
 * Pulls game-agnostic dex data and normalizes it to SpeciesRecord. Champions
 * overlay rules (final-evo flag) are derived here from PokéAPI evolution chains.
 *
 * Politeness: PokéAPI's fair-use policy asks for local caching, so every raw
 * response is cached to disk (data/cache/raw) and requests are concurrency-
 * limited. Re-running the seed is cheap and offline after the first pull.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type {
  SpeciesRecord,
  StaticDataSource,
  TypeRelation,
} from "./types.js";
import type { StatTable } from "@champions/calc-core";
import { isSpeciesPoolLegal } from "@champions/overlay";

const BASE = "https://pokeapi.co/api/v2";

const STAT_MAP: Record<string, keyof StatTable> = {
  hp: "hp",
  attack: "atk",
  defense: "def",
  "special-attack": "spa",
  "special-defense": "spd",
  speed: "spe",
};

interface PokeApiOptions {
  rawCacheDir: string;
  concurrency?: number;
}

export class PokeApiSource implements StaticDataSource {
  readonly id = "pokeapi";
  private readonly rawCacheDir: string;
  private readonly concurrency: number;

  constructor(opts: PokeApiOptions) {
    this.rawCacheDir = opts.rawCacheDir;
    this.concurrency = opts.concurrency ?? 6;
  }

  /** Fetch JSON with on-disk caching keyed by URL. */
  private async getJson<T>(url: string): Promise<T> {
    await mkdir(this.rawCacheDir, { recursive: true });
    const key = createHash("sha1").update(url).digest("hex");
    const file = join(this.rawCacheDir, `${key}.json`);
    try {
      return JSON.parse(await readFile(file, "utf8")) as T;
    } catch {
      /* cache miss */
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`PokéAPI ${res.status} for ${url}`);
    const data = (await res.json()) as T;
    await writeFile(file, JSON.stringify(data));
    return data;
  }

  /** Run async tasks with a fixed concurrency cap. */
  private async pool<T, R>(
    items: T[],
    fn: (item: T, i: number) => Promise<R>
  ): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: this.concurrency }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await fn(items[i]!, i);
      }
    });
    await Promise.all(workers);
    return out;
  }

  /**
   * Movepool (learnable move slugs) for a base species. Used to enrich the
   * championsbattledata roster, which doesn't ship full movepools. Returns []
   * if the slug isn't found in PokéAPI (e.g. a Champions-only form name).
   */
  async fetchMovepool(slug: string): Promise<string[]> {
    try {
      const mon = await this.getJson<any>(`${BASE}/pokemon/${slug.toLowerCase()}`);
      return mon.moves.map((m: any) => m.move.name);
    } catch {
      return [];
    }
  }

  /**
   * The full National Dex (one clean entry per species / dex number) for the
   * reference Pokédex. Uses each species' default variety for stats/types/
   * abilities/sprite. Independent of the Champions legal roster.
   */
  async fetchNationalDex(): Promise<SpeciesRecord[]> {
    const list = await this.getJson<{ results: { name: string; url: string }[] }>(
      `${BASE}/pokemon-species?limit=20000`
    );

    const records = await this.pool(list.results, async (entry) => {
      const species = await this.getJson<any>(entry.url);
      const def =
        species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
      if (!def) return null;
      const mon = await this.getJson<any>(def.pokemon.url);

      const baseStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as StatTable;
      for (const s of mon.stats) {
        const k = STAT_MAP[s.stat.name];
        if (k) baseStats[k] = s.base_stat;
      }

      const sprite =
        mon.sprites?.other?.["official-artwork"]?.front_default ??
        mon.sprites?.front_default ??
        null;

      const rec: SpeciesRecord = {
        id: species.id, // National Dex number — used for ordering
        name: species.name,
        displayName: toDisplay(species.name),
        types: mon.types
          .sort((a: any, b: any) => a.slot - b.slot)
          .map((t: any) => t.type.name),
        baseStats,
        abilities: mon.abilities.map((a: any) => ({
          name: a.ability.name,
          isHidden: a.is_hidden,
        })),
        moves: [],
        isFinalStage: false,
        isStandalone: false,
        isLegendary: !!species.is_legendary,
        isMythical: !!species.is_mythical,
        spriteUrl: sprite,
      };
      return rec;
    });

    return records
      .filter((r): r is SpeciesRecord => r !== null)
      .sort((a, b) => a.id - b.id);
  }

  async fetchTypeChart(): Promise<TypeRelation[]> {
    const list = await this.getJson<{ results: { name: string; url: string }[] }>(
      `${BASE}/type?limit=100`
    );
    const types = await this.pool(list.results, async (t) => {
      const d = await this.getJson<any>(t.url);
      const rel = d.damage_relations;
      return {
        type: d.name,
        doubleDamageTo: rel.double_damage_to.map((x: any) => x.name),
        halfDamageTo: rel.half_damage_to.map((x: any) => x.name),
        noDamageTo: rel.no_damage_to.map((x: any) => x.name),
      } as TypeRelation;
    });
    // Drop non-battle types (e.g. "unknown", "shadow").
    return types.filter((t) => t.type !== "unknown" && t.type !== "shadow");
  }

  /** Build the set of final-stage species names from one evolution chain. */
  private collectFinalStages(
    node: any,
    rootName: string,
    finals: Set<string>,
    standalone: Set<string>
  ): void {
    const isLeaf = !node.evolves_to || node.evolves_to.length === 0;
    if (isLeaf) {
      finals.add(node.species.name);
      if (node.species.name === rootName) standalone.add(node.species.name);
    }
    for (const child of node.evolves_to ?? []) {
      this.collectFinalStages(child, rootName, finals, standalone);
    }
  }

  async fetchAllSpecies(): Promise<SpeciesRecord[]> {
    const list = await this.getJson<{ results: { name: string; url: string }[] }>(
      `${BASE}/pokemon?limit=20000`
    );

    // Resolve evolution data once per chain, memoized.
    const finals = new Set<string>();
    const standalone = new Set<string>();
    const seenChains = new Set<string>();

    const records = await this.pool(list.results, async (entry) => {
      const mon = await this.getJson<any>(entry.url);
      const species = await this.getJson<any>(mon.species.url);

      const chainUrl: string = species.evolution_chain?.url;
      if (chainUrl && !seenChains.has(chainUrl)) {
        seenChains.add(chainUrl);
        const chain = await this.getJson<any>(chainUrl);
        this.collectFinalStages(chain.chain, chain.chain.species.name, finals, standalone);
      }

      const baseStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } as StatTable;
      for (const s of mon.stats) {
        const k = STAT_MAP[s.stat.name];
        if (k) baseStats[k] = s.base_stat;
      }

      const rec: SpeciesRecord = {
        id: mon.id,
        name: mon.name,
        displayName: toDisplay(species.name ?? mon.name),
        types: mon.types
          .sort((a: any, b: any) => a.slot - b.slot)
          .map((t: any) => t.type.name),
        baseStats,
        abilities: mon.abilities.map((a: any) => ({
          name: a.ability.name,
          isHidden: a.is_hidden,
        })),
        moves: mon.moves.map((m: any) => m.move.name),
        isFinalStage: false, // set after chains resolved
        isStandalone: false,
        isLegendary: !!species.is_legendary,
        isMythical: !!species.is_mythical,
        spriteUrl: mon.sprites?.front_default ?? undefined,
      };
      return { rec, speciesName: species.name as string };
    });

    // Second pass: apply final/standalone flags now that all chains are known.
    return records.map(({ rec, speciesName }) => {
      rec.isFinalStage = finals.has(speciesName);
      rec.isStandalone = standalone.has(speciesName);
      return rec;
    });
  }

  /** Convenience: only the species legal under the final-evo policy. */
  async fetchLegalPool(): Promise<SpeciesRecord[]> {
    const all = await this.fetchAllSpecies();
    return all.filter((r) =>
      isSpeciesPoolLegal({
        speciesId: r.id,
        name: r.name,
        isFinalStage: r.isFinalStage,
        isStandalone: r.isStandalone,
      })
    );
  }
}

function toDisplay(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
