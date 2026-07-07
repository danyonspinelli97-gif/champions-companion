/**
 * championsbattledata.com adapter — the authoritative Champions roster + meta.
 *
 * This is the Champions-accurate source for WHICH species/forms/megas are in
 * the game (PokéAPI is generation-agnostic and lacks Champions-only megas). It
 * also supplies Level-50 / 0-SP "Battle Data" stats, from which we recover base
 * stats exactly (see @champions/overlay baseStatsFromDisplayed).
 *
 * License: personal / educational / competitive-analysis use WITH attribution
 * and a link back — surfaced in the UI via `attribution`. Responses are cached
 * to disk to stay polite.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { baseStatsFromDisplayed } from "@champions/overlay";
import type { MetaDataSource, MetaRow, SpeciesRecord } from "./types.js";

const BASE = "https://championsbattledata.com";

const slugify = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, "-");

export interface RosterEntry {
  name: string;
  slug: string;
  battleName: string;
  baseName: string;
  isForm: boolean;
}

interface MetaFormRow {
  title: string;
  base_name: string;
  saved_name: string;
  types: string;
  abilities: string;
  image_path: string;
  form: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  total: number;
}

export class ChampionsBattleDataSource implements MetaDataSource {
  readonly id = "championsbattledata";
  readonly attribution =
    "Roster & usage data from Pokémon Champions Battle Data (championsbattledata.com)";

  private readonly rawCacheDir?: string;

  constructor(opts: { baseUrl?: string; rawCacheDir?: string } = {}) {
    this.baseUrl = opts.baseUrl ?? BASE;
    this.rawCacheDir = opts.rawCacheDir;
  }
  private readonly baseUrl: string;

  private async getJson<T>(path: string): Promise<T> {
    if (this.rawCacheDir) {
      await mkdir(this.rawCacheDir, { recursive: true });
      const key = createHash("sha1").update(this.baseUrl + path).digest("hex");
      const file = join(this.rawCacheDir, `cbd-${key}.json`);
      try {
        return JSON.parse(await readFile(file, "utf8")) as T;
      } catch {
        /* miss */
      }
      const res = await fetch(`${this.baseUrl}${path}`);
      if (!res.ok) throw new Error(`championsbattledata ${res.status} for ${path}`);
      const data = (await res.json()) as T;
      await writeFile(file, JSON.stringify(data));
      return data;
    }
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new Error(`championsbattledata ${res.status} for ${path}`);
    return (await res.json()) as T;
  }

  // --- Roster ------------------------------------------------------------

  async fetchRoster(): Promise<{
    pokemonPages: RosterEntry[];
    seasons: string[];
    defaultSeason: string;
  }> {
    const index = await this.getJson<{
      pokemonPages: RosterEntry[];
      seasons: string[];
      defaultSeason: string;
    }>("/api");
    return {
      pokemonPages: index.pokemonPages,
      seasons: index.seasons,
      defaultSeason: index.defaultSeason,
    };
  }

  /**
   * Metadata is keyed by a page *slug* (e.g. "charizard", "basculegion-female"),
   * not always the base name — for species whose default-form slug differs from
   * the base name, fetching by base name returns nothing. Always fetch by slug.
   */
  private async fetchForms(slug: string): Promise<MetaFormRow[]> {
    const data = await this.getJson<{ rows: MetaFormRow[] }>(
      `/api/metadata/${encodeURIComponent(slug.toLowerCase())}`
    );
    return data.rows ?? [];
  }

  /**
   * Build the full Champions species roster (every form, incl. megas) as
   * SpeciesRecords with recovered base stats. `moves` is left empty here and
   * enriched from PokéAPI movepools in the seed step.
   */
  async buildRoster(): Promise<SpeciesRecord[]> {
    const { pokemonPages } = await this.fetchRoster();

    // One representative metadata slug per base species (prefer the default,
    // non-form page). /api/metadata/<slug> returns every form for that species.
    const repSlug = new Map<string, string>();
    for (const p of pokemonPages) {
      if (!repSlug.has(p.baseName) || p.isForm === false) repSlug.set(p.baseName, p.slug);
    }

    const records: SpeciesRecord[] = [];
    const seen = new Set<string>();
    let id = 1;
    for (const slug of repSlug.values()) {
      let rows: MetaFormRow[];
      try {
        rows = await this.fetchForms(slug);
      } catch {
        continue; // skip a species whose metadata 404s rather than abort
      }
      for (const r of rows) {
        const name = slugify(r.saved_name);
        if (seen.has(name)) continue; // guard against forms shared across pages
        seen.add(name);
        records.push({
          id: id++,
          name: slugify(r.saved_name),
          displayName: r.title,
          baseName: r.base_name,
          types: r.types.split("/").map((t) => t.trim().toLowerCase()).filter(Boolean),
          baseStats: baseStatsFromDisplayed(r),
          abilities: r.abilities
            .split("|")
            .map((a) => ({ name: slugify(a), isHidden: false }))
            .filter((a) => a.name),
          moves: [],
          isFinalStage: true,
          isStandalone: true,
          isLegendary: false,
          isMythical: false,
          form: r.form || undefined,
          spriteUrl: encodeURI(`${this.baseUrl}/${r.image_path.replace(/\\/g, "/")}`),
        });
      }
    }
    return records;
  }

  // --- Usage / meta ------------------------------------------------------

  async listSeasons(): Promise<{ seasons: string[]; defaultSeason: string }> {
    const r = await this.fetchRoster();
    return { seasons: r.seasons, defaultSeason: r.defaultSeason };
  }

  async fetchUsage(
    format: "Doubles" | "Singles",
    species: string,
    season: string
  ): Promise<MetaRow[]> {
    const q = `?season=${encodeURIComponent(season)}`;
    const data = await this.getJson<{ rows: any[] }>(
      `/api/battle/${format}/${encodeURIComponent(species.toLowerCase())}${q}`
    );
    const out: MetaRow[] = [];
    for (const r of data.rows ?? []) {
      const base = {
        rank: r.rank as number,
        name: (r.name ?? "") as string,
        percentage: (r.percentage ?? "") as string,
        percentageValue: (r.percentage_value ?? null) as number | null,
      };
      switch (r.category) {
        case "move":
          out.push({ category: "move", ...base });
          break;
        case "held_item":
          out.push({ category: "item", ...base });
          break;
        case "ability":
          out.push({ category: "ability", ...base });
          break;
        case "teammate":
          out.push({ category: "teammate", ...base });
          break;
        case "stat_alignment":
          out.push({
            category: "alignment",
            ...base,
            statUp: r.stat_up || undefined,
            statDown: r.stat_down || undefined,
          });
          break;
        case "stat_points":
          out.push({
            category: "spread",
            ...base,
            spread: {
              hp: Number(r.hp_points) || 0,
              atk: Number(r.attack_points) || 0,
              def: Number(r.defense_points) || 0,
              spa: Number(r.sp_atk_points) || 0,
              spd: Number(r.sp_def_points) || 0,
              spe: Number(r.speed_points) || 0,
            },
          });
          break;
        default:
          break; // ignore unknown categories
      }
    }
    return out;
  }
}
