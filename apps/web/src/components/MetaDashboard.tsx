import { useMemo, useState } from "react";
import {
  legalSpeciesPool,
  rowsByCategory,
  topUsedSpecies,
  type MetaRow,
} from "@champions/team-builder";
import { STAT_KEYS, STAT_LABEL } from "../champions.js";
import type { ChampionsData } from "../data.js";
import { SpeciesCombobox, Sprite } from "./shared.js";

function UsageList({ title, rows }: { title: string; rows: MetaRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="card usage-card">
      <h3>{title}</h3>
      <table className="stats">
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.rank}-${r.name}`}>
              <td>{r.name}{r.statUp ? ` (+${r.statUp} / -${r.statDown})` : ""}</td>
              <td className="num">{r.percentage || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function spreadLabel(r: MetaRow): string {
  if (!r.spread) return "";
  return STAT_KEYS.filter((k) => r.spread![k] > 0)
    .map((k) => `${r.spread![k]} ${STAT_LABEL[k]}`)
    .join(" / ");
}

export function MetaDashboard({ data }: { data: ChampionsData }) {
  const meta = data.meta;

  // Eligible species that also have usage data (searchable set).
  const eligible = useMemo(() => {
    if (!meta) return [];
    const legal = new Set(legalSpeciesPool(data.species, data.ruleset).map((s) => s.name));
    return data.species.filter((s) => legal.has(s.name) && meta.bySpecies[s.name]);
  }, [data, meta]);

  const top10 = useMemo(
    () => (meta ? topUsedSpecies(meta.bySpecies, { limit: 10 }) : []),
    [meta]
  );

  const [slug, setSlug] = useState(top10[0]?.species ?? eligible[0]?.name ?? "");

  if (!meta) {
    return (
      <div className="panel">
        <h2>Meta</h2>
        <p className="empty">
          No usage data exported yet. Run <code>npm run seed:meta</code> then{" "}
          <code>npm run export:web</code> to pull championsbattledata usage.
        </p>
      </div>
    );
  }

  const rows = meta.bySpecies[slug] ?? [];
  const selected = data.byName.get(slug);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Meta</h2>
        <span className="chip-muted">{meta.season} · {eligible.length} with data</span>
      </div>

      <SpeciesCombobox
        species={eligible}
        value={slug}
        onChange={setSlug}
        label="Search any eligible Pokémon"
      />

      <h3 className="section-label">Top 10 used</h3>
      <div className="meta-grid">
        {top10.map((u, i) => {
          const sp = data.byName.get(u.species);
          const active = u.species === slug;
          return (
            <button
              key={u.species}
              className={`meta-card${active ? " active" : ""}`}
              onClick={() => setSlug(u.species)}
            >
              <span className="rank">#{i + 1}</span>
              <Sprite species={sp} size={56} />
              <span className="meta-card-name">{sp?.displayName ?? u.species}</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <div className="detail-head">
            <Sprite species={selected} size={48} />
            <h3>{selected.displayName}</h3>
            <span className="chip-muted">{selected.types.join(" / ")}</span>
          </div>

          <div className="usage-grid">
            <UsageList title="Moves" rows={rowsByCategory(rows, "move")} />
            <UsageList title="Items" rows={rowsByCategory(rows, "item")} />
            <UsageList title="Abilities" rows={rowsByCategory(rows, "ability")} />
            <UsageList title="Stat Alignments" rows={rowsByCategory(rows, "alignment")} />
            <div className="card usage-card">
              <h3>Top SP Spreads</h3>
              <table className="stats">
                <tbody>
                  {rowsByCategory(rows, "spread").slice(0, 6).map((r) => (
                    <tr key={r.rank}>
                      <td>{spreadLabel(r) || "—"}</td>
                      <td className="num">{r.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card usage-card">
              <h3>Common Teammates</h3>
              <p>
                {rowsByCategory(rows, "teammate").map((t) => (
                  <span key={t.rank} className="tag">{t.name}</span>
                ))}
              </p>
            </div>
          </div>
        </>
      )}

      <p className="footnote">
        {meta.attribution}. Usage % per species, checks &amp; counters, and Tera
        breakdowns aren't exposed by this source; "Top 10" is inferred from
        teammate co-occurrence.
      </p>
    </div>
  );
}
