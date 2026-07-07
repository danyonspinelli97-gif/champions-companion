import { useEffect, useRef } from "react";
import type { SpeciesData, MetaRow } from "@champions/team-builder";
import { rowsByCategory } from "@champions/team-builder";
import type { ChampionsData } from "../data.js";
import { STAT_KEYS, STAT_LABEL, typeColor, statColor, statBarWidth } from "../champions.js";
import { typeMatchups } from "../lib/matchups.js";
import { Sprite } from "./shared.js";
import { X } from "./icons.js";

const bst = (s: SpeciesData) => STAT_KEYS.reduce((t, k) => t + s.baseStats[k], 0);
const pad = (n?: number) => "#" + String(n ?? 0).padStart(4, "0");
const prettify = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Full-screen (mobile) / right-side panel (desktop) detail view for one species. */
export function PokemonDetail({
  species,
  data,
  onClose,
}: {
  species: SpeciesData;
  data: ChampionsData;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Remember what had focus before opening, focus the dialog, and restore on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Esc-to-close and a simple focus trap while the dialog is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const matchups = typeMatchups(species, data.chart);
  const weak = [...matchups.weak].sort();
  const resist = [...matchups.resist].sort();
  const immune = [...matchups.immune].sort();
  const hasMatchups = weak.length + resist.length + immune.length > 0;
  const meta = data.meta?.bySpecies[species.name];

  return (
    <div
      className="detail-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-label={species.displayName}
        ref={dialogRef}
      >
        <div className="detail-panel-head">
          <span className="dex-num">{species.num ? pad(species.num) : ""}</span>
          <button className="icon-btn" title="Close" aria-label="Close" onClick={onClose} ref={closeRef}>
            <X size={16} />
          </button>
        </div>

        <div className="detail-sprite">
          <Sprite species={species} size={160} />
        </div>
        <h2 className="detail-name">{species.displayName}</h2>
        <div className="dex-types" style={{ justifyContent: "center" }}>
          {species.types.map((t) => (
            <span key={t} className="type-badge" style={{ background: typeColor(t) }}>
              {t}
            </span>
          ))}
        </div>

        <div className="section-label">Base stats</div>
        <div className="dex-stats">
          {STAT_KEYS.map((k) => (
            <div className="stat-row" key={k}>
              <span className="stat-k">{STAT_LABEL[k]}</span>
              <span className="bar">
                <i
                  style={{
                    width: `${statBarWidth(species.baseStats[k])}%`,
                    background: statColor(species.baseStats[k]),
                  }}
                />
              </span>
              <span className="stat-v">{species.baseStats[k]}</span>
            </div>
          ))}
        </div>
        <div className="dex-bst">
          BST <strong>{bst(species)}</strong>
        </div>

        <div className="section-label">Abilities</div>
        <ul className="detail-list">
          {species.abilities.map((a) => (
            <li key={a.name}>
              {prettify(a.name)}
              {a.isHidden ? " (Hidden)" : ""}
            </li>
          ))}
        </ul>

        <div className="section-label">Movepool</div>
        <ul className="detail-list movepool">
          {species.movepool.map((mv) => (
            <li key={mv}>{prettify(mv)}</li>
          ))}
        </ul>

        <div className="section-label">Type matchups</div>
        {hasMatchups ? (
          <>
            <MatchupRow label="Weak to" types={weak} />
            <MatchupRow label="Resists" types={resist} />
            <MatchupRow label="Immune to" types={immune} />
          </>
        ) : (
          <p className="muted">No notable matchups.</p>
        )}

        {meta && (
          <>
            <div className="section-label">Usage</div>
            <div className="usage-grid">
              <UsageList title="Moves" rows={rowsByCategory(meta, "move")} />
              <UsageList title="Items" rows={rowsByCategory(meta, "item")} />
              <UsageList title="Abilities" rows={rowsByCategory(meta, "ability")} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchupRow({ label, types }: { label: string; types: string[] }) {
  if (!types.length) return null;
  return (
    <div className="matchup-row">
      <span className="mini-label">{label}</span>
      <span className="dex-types" style={{ justifyContent: "flex-start" }}>
        {types.map((t) => (
          <span key={t} className="type-badge" style={{ background: typeColor(t) }}>
            {t}
          </span>
        ))}
      </span>
    </div>
  );
}

function UsageList({ title, rows }: { title: string; rows: MetaRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="card usage-card">
      <h3>{title}</h3>
      <table className="stats">
        <tbody>
          {rows.slice(0, 5).map((r) => (
            <tr key={`${r.rank}-${r.name}`}>
              <td>{r.name}</td>
              <td className="num">{r.percentage || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
