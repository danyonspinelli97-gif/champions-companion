import { useState, type ReactNode } from "react";
import { useChampionsData } from "./data.js";
import { StatCalculator } from "./components/StatCalculator.js";
import { DamageCalculator } from "./components/DamageCalculator.js";
import { TeamBuilder } from "./components/TeamBuilder.js";
import { MetaDashboard } from "./components/MetaDashboard.js";
import { Pokedex } from "./components/Pokedex.js";
import { PokemonDetail } from "./components/PokemonDetail.js";

type Tab = "dex" | "stats" | "damage" | "team" | "meta";

const icons: Record<Tab, ReactNode> = {
  dex: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><line x1="3" y1="12" x2="21" y2="12" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2.2" fill="var(--bg)" />
      <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2.2" fill="var(--bg)" />
      <line x1="4" y1="18" x2="20" y2="18" /><circle cx="8" cy="18" r="2.2" fill="var(--bg)" />
    </svg>
  ),
  damage: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 4a3 3 0 0 1 0 6" /><path d="M18 15c2 .5 3 2.2 3 5" />
    </svg>
  ),
  meta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="4" y2="11" /><line x1="10" y1="20" x2="10" y2="4" /><line x1="16" y1="20" x2="16" y2="8" /><line x1="22" y1="20" x2="2" y2="20" />
    </svg>
  ),
};

const TABS: { id: Tab; label: string }[] = [
  { id: "dex", label: "Pokédex" },
  { id: "stats", label: "Stats" },
  { id: "damage", label: "Damage" },
  { id: "team", label: "Team" },
  { id: "meta", label: "Meta" },
];

export function App() {
  const { data, error } = useChampionsData();
  const [tab, setTab] = useState<Tab>("dex");
  const [detail, setDetail] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="top">
        <img src="/favicon.svg" width={30} height={30} alt="" />
        <div className="brand">
          <h1>Champions Companion</h1>
          <span className="reg">
            {data ? `${data.ruleset.name}` : "loading…"}
          </span>
        </div>
      </header>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span className="tab-icon">{icons[t.id]}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        {error && (
          <div className="panel">
            <strong>Couldn't load data.</strong>
            <p className="empty">
              {error}. Run <code>npm run seed</code>, <code>npm run export:web</code>{" "}
              and <code>npm run export:dex</code> to generate the data files.
            </p>
          </div>
        )}

        {!data && !error && <div className="panel skeleton-panel">Loading Champions data…</div>}

        {data && (
          <>
            {tab === "dex" && <Pokedex data={data} onOpenDetail={setDetail} />}
            {tab === "stats" && <StatCalculator data={data} />}
            {tab === "damage" && <DamageCalculator data={data} />}
            {tab === "team" && <TeamBuilder data={data} />}
            {tab === "meta" && <MetaDashboard data={data} />}
          </>
        )}

        {detail && data && data.byName.get(detail) && (
          <PokemonDetail species={data.byName.get(detail)!} data={data} onClose={() => setDetail(null)} />
        )}
      </main>
    </div>
  );
}
