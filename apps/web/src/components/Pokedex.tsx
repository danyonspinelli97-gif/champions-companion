import { useEffect, useMemo, useState } from "react";
import type { ChampionsData } from "../data.js";
import { STAT_KEYS, STAT_LABEL, typeColor, statColor, statBarWidth } from "../champions.js";
import { Sprite } from "./shared.js";
import type { SpeciesData } from "@champions/team-builder";

const bst = (s: SpeciesData) => STAT_KEYS.reduce((t, k) => t + s.baseStats[k], 0);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pad = (n?: number) => "#" + String(n ?? 0).padStart(4, "0");
const shortReg = (name: string) => name.replace("Regulation Set", "Reg");
const regCode = (name: string) => name.split(" ").pop() ?? name; // "…M-B" -> "M-B"

type SortKey = "num" | "name" | "bst" | (typeof STAT_KEYS)[number];
interface Reg { id: string; name: string; legalSpecies: string[] }

const SORTS: { key: SortKey; label: string }[] = [
  { key: "num", label: "#" },
  { key: "name", label: "Name" },
  { key: "bst", label: "BST" },
  { key: "spe", label: "Speed" },
  { key: "hp", label: "HP" },
  { key: "atk", label: "Atk" },
  { key: "def", label: "Def" },
  { key: "spa", label: "SpA" },
  { key: "spd", label: "SpD" },
];

export function Pokedex({ data }: { data: ChampionsData }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("num");
  const [type, setType] = useState<string | null>(null);
  const [regId, setRegId] = useState<string>(data.ruleset.id); // default = active reg
  const [dex, setDex] = useState<SpeciesData[] | null>(null);
  const [regs, setRegs] = useState<Reg[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/dex.json");
        if (!res.ok) throw new Error("no dex");
        const d = (await res.json()) as SpeciesData[];
        if (!cancelled) setDex(d);
      } catch {
        if (!cancelled) setDex(data.species);
      }
      try {
        const r = await fetch("/data/regulations.json");
        if (r.ok) {
          const j = (await r.json()) as { regs: Reg[] };
          if (!cancelled && j.regs?.length) setRegs(j.regs);
        } else throw new Error("no regs");
      } catch {
        if (!cancelled)
          setRegs([{ id: data.ruleset.id, name: data.ruleset.name, legalSpecies: data.ruleset.legalSpecies?.value ?? [] }]);
      }
    })();
    return () => { cancelled = true; };
  }, [data]);

  const types = useMemo(() => Object.keys(data.chart).sort(), [data.chart]);
  const regSets = useMemo(
    () => new Map(regs.map((r) => [r.id, new Set(r.legalSpecies.map(norm))])),
    [regs]
  );
  const mbSet = regSets.get(data.ruleset.id) ?? null;

  const inSet = (s: SpeciesData, set: Set<string> | null) =>
    !!set && (set.has(norm(s.displayName)) || set.has(norm(s.name)) || (s.baseName ? set.has(norm(s.baseName)) : false));

  const source = dex ?? [];
  const activeSet = regId === "all" ? null : regSets.get(regId) ?? null;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = source.filter((s) => {
      if (activeSet && !inSet(s, activeSet)) return false;
      if (type && !s.types.map((t) => t.toLowerCase()).includes(type)) return false;
      if (!needle) return true;
      return s.displayName.toLowerCase().includes(needle) || String(s.num ?? "").includes(needle) ||
        s.abilities.some((a) => a.name.includes(needle));
    });
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.displayName.localeCompare(b.displayName);
      if (sort === "num") return (a.num ?? 0) - (b.num ?? 0);
      if (sort === "bst") return bst(b) - bst(a);
      return b.baseStats[sort] - a.baseStats[sort];
    });
  }, [source, q, sort, type, activeSet]);

  const regLabel = regId === "all" ? "All Pokémon" : regs.find((r) => r.id === regId)?.name ?? "";

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Pokédex</h2>
        <span className="chip-muted">{dex ? `${rows.length} Pokémon` : "loading…"} · {regLabel}</span>
      </div>

      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or #…" style={{ marginBottom: 12 }} />

      <div className="seg-row">
        {regs.map((r) => (
          <button key={r.id} className={`seg ${regId === r.id ? "active" : ""}`} onClick={() => setRegId(r.id)}>
            {shortReg(r.name)}{r.id === data.ruleset.id ? " (Current)" : ""}
          </button>
        ))}
        <button className={`seg ${regId === "all" ? "active" : ""}`} onClick={() => setRegId("all")}>All Pokémon</button>
      </div>

      <div className="seg-row" style={{ alignItems: "center" }}>
        <span className="muted" style={{ marginRight: 4 }}>Sort:</span>
        {SORTS.map((s) => (
          <button key={s.key} className={`seg sm ${sort === s.key ? "active" : ""}`} onClick={() => setSort(s.key)}>
            {s.label}{s.key === "num" && sort === "num" ? " ↑" : ""}
          </button>
        ))}
      </div>

      <div className="type-row">
        {types.map((t) => (
          <button key={t} className={`type-chip ${type === t ? "active" : ""}`} style={{ background: typeColor(t) }} onClick={() => setType(type === t ? null : t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="dex-grid">
        {rows.map((s) => (
          <article className="dex-card" key={s.name}>
            <div className="dex-card-top">
              <span className="dex-num">{s.num ? pad(s.num) : ""}</span>
              {inSet(s, mbSet) && <span className="badge-mb">{regCode(data.ruleset.name)}</span>}
            </div>
            <div className="dex-sprite"><Sprite species={s} size={84} /></div>
            <div className="dex-name">{s.displayName}</div>
            <div className="dex-types">
              {s.types.map((t) => (
                <span key={t} className="type-badge" style={{ background: typeColor(t) }}>{t}</span>
              ))}
            </div>
            <div className="dex-stats">
              {STAT_KEYS.map((k) => (
                <div className="stat-row" key={k}>
                  <span className="stat-k">{STAT_LABEL[k]}</span>
                  <span className="bar"><i style={{ width: `${statBarWidth(s.baseStats[k])}%`, background: statColor(s.baseStats[k]) }} /></span>
                  <span className="stat-v">{s.baseStats[k]}</span>
                </div>
              ))}
            </div>
            <div className="dex-bst">BST <strong>{bst(s)}</strong></div>
          </article>
        ))}
      </div>

      <p className="footnote">
        Base stats from PokéAPI (identical to Champions base stats). Reg M-B (224
        legal) and Reg M-A (derived) legal lists are community-sourced (MetaVGC /
        StrataDex) and flagged for in-game verification. "All Pokémon" is the full
        National Dex.
      </p>
    </div>
  );
}
