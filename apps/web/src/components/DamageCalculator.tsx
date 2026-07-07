import { useMemo, useState } from "react";
import {
  computeDamage,
  summarizeKo,
  type CombatantInput,
  type DamageCategory,
  type MoveInput,
  type StatTable,
  type Weather,
} from "@champions/calc-core";
import type { ChampionsData } from "../data.js";
import { emptySp, finalStatsFor } from "../champions.js";
import { SpeciesSelect, AlignmentSelect, SpEditor } from "./shared.js";

interface Side {
  slug: string;
  alignment: string;
  sp: StatTable;
  item: string;
  ability: string;
  teraType: string;
}

function useSide(initial: string): [Side, (patch: Partial<Side>) => void] {
  const [side, setSide] = useState<Side>({
    slug: initial,
    alignment: "serious",
    sp: emptySp(),
    item: "none",
    ability: "",
    teraType: "none",
  });
  return [side, (patch) => setSide((s) => ({ ...s, ...patch }))];
}

export function DamageCalculator({ data }: { data: ChampionsData }) {
  const types = Object.keys(data.chart);
  const [atk, setAtk] = useSide(data.species[0]?.name ?? "");
  const [def, setDef] = useSide(data.species[1]?.name ?? data.species[0]?.name ?? "");
  const [move, setMove] = useState<MoveInput>({
    name: "Custom Move",
    basePower: 100,
    type: types[0] ?? "normal",
    category: "physical",
    isSpread: false,
  });
  const [field, setField] = useState({
    isDoubles: true,
    weather: "none" as Weather,
    reflect: false,
    lightScreen: false,
    helpingHand: false,
    crit: false,
  });

  const atkSpecies = data.byName.get(atk.slug)!;
  const defSpecies = data.byName.get(def.slug)!;

  const result = useMemo(() => {
    const attacker: CombatantInput = {
      finalStats: finalStatsFor(atkSpecies, atk.sp, atk.alignment),
      types: atkSpecies.types,
      teraType: atk.teraType === "none" ? null : atk.teraType,
      ability: atk.ability || undefined,
      item: atk.item === "none" ? undefined : atk.item,
    };
    const defender: CombatantInput = {
      finalStats: finalStatsFor(defSpecies, def.sp, def.alignment),
      types: defSpecies.types,
      teraType: def.teraType === "none" ? null : def.teraType,
      item: def.item === "none" ? undefined : def.item,
    };
    const r = computeDamage(attacker, defender, move, field, data.chart);
    return { r, ko: summarizeKo(r, defender.finalStats.hp), hp: defender.finalStats.hp };
  }, [atkSpecies, defSpecies, atk, def, move, field, data.chart]);

  return (
    <div className="panel">
      <h2>Damage Calculator</h2>

      <div className="row">
        <SpeciesSelect species={data.species} value={atk.slug} onChange={(v) => setAtk({ slug: v })} label="Attacker" />
        <AlignmentSelect value={atk.alignment} onChange={(v) => setAtk({ alignment: v })} />
        <div className="field">
          <label>Attacker item</label>
          <select value={atk.item} onChange={(e) => setAtk({ item: e.target.value })}>
            <option value="none">None</option>
            <option value="choice-band">Choice Band</option>
            <option value="choice-specs">Choice Specs</option>
            <option value="life-orb">Life Orb</option>
          </select>
        </div>
        <div className="field">
          <label>Ability</label>
          <input type="text" placeholder="e.g. adaptability" value={atk.ability} onChange={(e) => setAtk({ ability: e.target.value })} />
        </div>
        <div className="field">
          <label>Tera</label>
          <select value={atk.teraType} onChange={(e) => setAtk({ teraType: e.target.value })}>
            <option value="none">None</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <SpEditor sp={atk.sp} onChange={(v) => setAtk({ sp: v })} />

      <hr style={{ borderColor: "var(--border)", margin: "16px 0" }} />

      <div className="row">
        <SpeciesSelect species={data.species} value={def.slug} onChange={(v) => setDef({ slug: v })} label="Defender" />
        <AlignmentSelect value={def.alignment} onChange={(v) => setDef({ alignment: v })} />
        <div className="field">
          <label>Defender item</label>
          <select value={def.item} onChange={(e) => setDef({ item: e.target.value })}>
            <option value="none">None</option>
            <option value="assault-vest">Assault Vest</option>
          </select>
        </div>
        <div className="field">
          <label>Tera</label>
          <select value={def.teraType} onChange={(e) => setDef({ teraType: e.target.value })}>
            <option value="none">None</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <SpEditor sp={def.sp} onChange={(v) => setDef({ sp: v })} />

      <hr style={{ borderColor: "var(--border)", margin: "16px 0" }} />

      <div className="row">
        <div className="field">
          <label>Move</label>
          <input type="text" value={move.name} onChange={(e) => setMove({ ...move, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Base Power</label>
          <input type="number" min={0} value={move.basePower} onChange={(e) => setMove({ ...move, basePower: Number(e.target.value) })} style={{ width: 90 }} />
        </div>
        <div className="field">
          <label>Type</label>
          <select value={move.type} onChange={(e) => setMove({ ...move, type: e.target.value })}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Category</label>
          <select value={move.category} onChange={(e) => setMove({ ...move, category: e.target.value as DamageCategory })}>
            <option value="physical">Physical</option>
            <option value="special">Special</option>
          </select>
        </div>
        <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={!!move.isSpread} onChange={(e) => setMove({ ...move, isSpread: e.target.checked })} />
          Spread
        </label>
      </div>

      <div className="row" style={{ marginTop: 10 }}>
        {([
          ["isDoubles", "Doubles"],
          ["reflect", "Reflect"],
          ["lightScreen", "Light Screen"],
          ["helpingHand", "Helping Hand"],
          ["crit", "Crit"],
        ] as const).map(([key, label]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={field[key] as boolean}
              onChange={(e) => setField({ ...field, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
        <div className="field">
          <label>Weather</label>
          <select value={field.weather} onChange={(e) => setField({ ...field, weather: e.target.value as Weather })}>
            <option value="none">None</option>
            <option value="sun">Sun</option>
            <option value="rain">Rain</option>
          </select>
        </div>
      </div>

      <div className="panel" style={{ background: "var(--surface-2)", marginTop: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <span className={result.ko.guaranteedOhko ? "bigpct ko-good" : result.ko.defenderSurvives ? "bigpct" : "bigpct"}>
            {result.r.minPct}% – {result.r.maxPct}%
          </span>
          <span>
            ×{result.r.effectiveness} effective ·{" "}
            {result.ko.guaranteedOhko ? (
              <strong className="ko-good">Guaranteed OHKO</strong>
            ) : result.ko.defenderSurvives ? (
              <strong className="ko-bad">Always survives</strong>
            ) : (
              <strong>{result.ko.ohkoChancePct}% OHKO</strong>
            )}
          </span>
        </div>
        <p className="muted">
          {result.r.minDamage}–{result.r.maxDamage} dmg vs {result.hp} HP
        </p>
        <p className="rolls">{result.r.rolls.join(", ")}</p>
      </div>
    </div>
  );
}
