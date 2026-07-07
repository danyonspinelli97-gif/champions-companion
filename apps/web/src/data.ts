import { useEffect, useState } from "react";
import type { TypeChart } from "@champions/calc-core";
import type { SpeciesData, SpeciesMeta } from "@champions/team-builder";
import type { RulesetConfig } from "@champions/ruleset-config";

export interface MetaData {
  season: string | null;
  attribution: string;
  bySpecies: Record<string, SpeciesMeta>;
}

export interface ChampionsData {
  species: SpeciesData[];
  byName: Map<string, SpeciesData>;
  chart: TypeChart;
  ruleset: RulesetConfig;
  /** Null if usage data hasn't been exported (seed:meta + export:web). */
  meta: MetaData | null;
}

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
  return (await res.json()) as T;
}

export function useChampionsData() {
  const [data, setData] = useState<ChampionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [species, chart, ruleset] = await Promise.all([
          loadJson<SpeciesData[]>("/data/species.json"),
          loadJson<TypeChart>("/data/typechart.json"),
          loadJson<RulesetConfig>("/data/ruleset-reg-m-b.json"),
        ]);
        // Meta is optional — present only after `npm run seed:meta`.
        let meta: MetaData | null = null;
        try {
          const m = await loadJson<MetaData>("/data/meta.json");
          if (m && m.bySpecies && Object.keys(m.bySpecies).length) meta = m;
        } catch {
          /* no usage data exported yet */
        }
        if (cancelled) return;
        const byName = new Map(species.map((s) => [s.name, s]));
        setData({ species, byName, chart, ruleset, meta });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}
