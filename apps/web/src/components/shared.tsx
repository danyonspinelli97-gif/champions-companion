import { useMemo, useState } from "react";
import {
  SP_PER_STAT_CAP,
  SP_TOTAL_CAP,
  SP_VP_COST,
  type StatKey,
  type StatTable,
} from "@champions/calc-core";
import type { SpeciesData } from "@champions/team-builder";
import { ALIGNMENT_OPTIONS, STAT_KEYS, STAT_LABEL, spTotal } from "../champions.js";

/** Pokémon sprite with a graceful fallback when no image is available. */
export function Sprite({
  species,
  size = 40,
}: {
  species: Pick<SpeciesData, "spriteUrl" | "displayName"> | undefined;
  size?: number;
}) {
  if (!species?.spriteUrl) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: 8,
          background: "var(--surface-2)",
        }}
      />
    );
  }
  return (
    <img
      src={species.spriteUrl}
      alt={species.displayName}
      width={size}
      height={size}
      loading="lazy"
      style={{ objectFit: "contain", imageRendering: "auto" }}
    />
  );
}

/** Type-to-search Pokémon picker with sprites — better than a 350-row dropdown. */
export function SpeciesCombobox({
  species,
  value,
  onChange,
  label = "Pokémon",
  placeholder = "Search Pokémon…",
  hideSprite = false,
}: {
  species: SpeciesData[];
  value: string;
  onChange: (slug: string) => void;
  label?: string;
  placeholder?: string;
  hideSprite?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = species.find((s) => s.name === value);
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const list = q
      ? species.filter(
          (s) =>
            s.displayName.toLowerCase().includes(q) ||
            s.types.some((t) => t.toLowerCase().includes(q))
        )
      : species;
    return list.slice(0, 60);
  }, [species, q]);

  return (
    <div className="field combobox">
      {label && <label>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!hideSprite && <Sprite species={current} size={36} />}
        <input
          type="text"
          value={open ? query : current?.displayName ?? ""}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setOpen(true);
            setQuery(e.target.value);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && (
        <ul className="combo-list">
          {results.map((s) => (
            <li
              key={s.name}
              onMouseDown={() => {
                onChange(s.name);
                setOpen(false);
                setQuery("");
              }}
            >
              <Sprite species={s} size={24} />
              <span>{s.displayName}</span>
              <span className="muted" style={{ marginLeft: "auto", fontSize: 11 }}>
                {s.types.join("/")}
              </span>
            </li>
          ))}
          {results.length === 0 && <li className="muted">No matches</li>}
        </ul>
      )}
    </div>
  );
}

export function SpeciesSelect({
  species,
  value,
  onChange,
  label = "Pokémon",
}: {
  species: SpeciesData[];
  value: string;
  onChange: (slug: string) => void;
  label?: string;
}) {
  const current = species.find((s) => s.name === value);
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Sprite species={current} size={36} />
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {species.map((s) => (
            <option key={s.name} value={s.name}>
              {s.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function AlignmentSelect({
  value,
  onChange,
  label = "Stat Alignment",
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {ALIGNMENT_OPTIONS.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** SP editor with per-stat (32) + total (66) cap enforcement and VP cost. */
export function SpEditor({
  sp,
  onChange,
}: {
  sp: StatTable;
  onChange: (next: StatTable) => void;
}) {
  const total = spTotal(sp);
  const remaining = SP_TOTAL_CAP - total;

  const set = (key: StatKey, raw: number) => {
    const others = total - sp[key];
    // Clamp so we never break either cap.
    const maxForStat = Math.min(SP_PER_STAT_CAP, SP_TOTAL_CAP - others);
    const v = Math.max(0, Math.min(maxForStat, Math.round(raw)));
    onChange({ ...sp, [key]: v });
  };

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>Stat Points</strong>
        <span className={total <= SP_TOTAL_CAP ? "sp-cap-ok" : "sp-cap-bad"}>
          {total} / {SP_TOTAL_CAP} SP · {remaining} left · {total * SP_VP_COST} VP
        </span>
      </div>
      <div className="sp-grid" style={{ marginTop: 8 }}>
        {STAT_KEYS.map((k) => (
          <div className="sp-row" key={k}>
            <span>{STAT_LABEL[k]}</span>
            <input
              type="range"
              min={0}
              max={SP_PER_STAT_CAP}
              value={sp[k]}
              onChange={(e) => set(k, Number(e.target.value))}
            />
            <span className="val">{sp[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
