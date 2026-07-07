import { useMemo, useState } from "react";
import type { ChampionsData } from "../data.js";
import { STAT_KEYS, STAT_LABEL, emptySp, finalStatsFor } from "../champions.js";
import { SpeciesSelect, AlignmentSelect, SpEditor } from "./shared.js";

export function StatCalculator({ data }: { data: ChampionsData }) {
  const [slug, setSlug] = useState(data.species[0]?.name ?? "");
  const [alignment, setAlignment] = useState("serious");
  const [sp, setSp] = useState(emptySp());

  const species = data.byName.get(slug) ?? data.species[0]!;
  const finals = useMemo(
    () => finalStatsFor(species, sp, alignment),
    [species, sp, alignment]
  );

  return (
    <div className="panel">
      <h2>Stat Calculator</h2>
      <div className="row">
        <SpeciesSelect species={data.species} value={slug} onChange={setSlug} />
        <AlignmentSelect value={alignment} onChange={setAlignment} />
      </div>

      <div style={{ marginTop: 16 }}>
        <SpEditor sp={sp} onChange={setSp} />
      </div>

      <table className="stats">
        <thead>
          <tr>
            <th>Stat</th>
            <th className="num">Base</th>
            <th className="num">SP</th>
            <th className="num">Final @ L50</th>
          </tr>
        </thead>
        <tbody>
          {STAT_KEYS.map((k) => (
            <tr key={k}>
              <td>{STAT_LABEL[k]}</td>
              <td className="num">{species.baseStats[k]}</td>
              <td className="num">{sp[k]}</td>
              <td className="num">
                <strong>{finals[k]}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        Every Pokémon is treated as a perfect 31 IV. 1 SP = +1 to that stat at
        Level 50 (applied before the alignment multiplier).
      </p>
    </div>
  );
}
