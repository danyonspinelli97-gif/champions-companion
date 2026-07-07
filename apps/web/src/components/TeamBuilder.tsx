import { useMemo, useState, type ReactNode } from "react";
import { nanoid } from "nanoid";
import {
  checkTeam,
  legalSpeciesPool,
  speedTiers,
  defensiveReport,
  coverageReport,
  roleTags,
  recommendTeammates,
  metaSet,
  rowsByCategory,
  type SpeciesData,
  type MetaProvider,
  type SpeciesMeta,
  type SpeciesProvider,
  type Team,
  type TeamMember,
} from "@champions/team-builder";
import { SP_PER_STAT_CAP, SP_TOTAL_CAP, type StatTable } from "@champions/calc-core";
import type { ChampionsData } from "../data.js";
import { emptySp, finalStatsFor, spTotal, STAT_KEYS, STAT_LABEL, typeColor } from "../champions.js";
import { SpeciesCombobox, AlignmentSelect, SpEditor, Sprite } from "./shared.js";
import { TeamsPanel } from "./TeamsPanel.js";

const prettify = (slug: string) =>
  slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

function newMember(species: string): TeamMember {
  return { id: nanoid(8), species, item: "", ability: "", alignmentId: "serious", moves: [], sp: emptySp(), teraType: null };
}

export function TeamBuilder({ data }: { data: ChampionsData }) {
  const provider: SpeciesProvider = (slug) => data.byName.get(slug) ?? null;
  const types = Object.keys(data.chart);

  const legalSpecies: SpeciesData[] = useMemo(() => legalSpeciesPool(data.species, data.ruleset), [data]);
  const legalNames = useMemo(() => new Set(legalSpecies.map((s) => s.name)), [legalSpecies]);

  const [members, setMembers] = useState<TeamMember[]>([]);

  const team: Team = { members };
  const report = useMemo(() => checkTeam(team, data.ruleset, provider), [members, data]);
  const tiers = useMemo(() => speedTiers(team, provider), [members, data]);
  const defense = useMemo(() => defensiveReport(team, provider, data.chart, 3), [members, data]);
  const coverage = useMemo(() => coverageReport(team, provider, data.chart), [members, data]);

  const metaProvider: MetaProvider = (slug) => data.meta?.bySpecies[slug] ?? null;
  const suggestions = useMemo(
    () => (data.meta ? recommendTeammates(members.map((m) => m.species), metaProvider, { limit: 8 }) : []),
    [members, data]
  );

  const patch = (i: number, p: Partial<TeamMember>) =>
    setMembers((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...p } : m)));
  const remove = (i: number) => setMembers((ms) => ms.filter((_, idx) => idx !== i));
  const add = (species = "") => setMembers((ms) => (ms.length < 6 ? [...ms, newMember(species)] : ms));

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Team Builder</h2>
        <span className={`pill ${report.legal ? "legal" : "illegal"}`}>
          {report.legal ? "Legal" : "Needs work"} · {legalSpecies.length} eligible
        </span>
      </div>

      {/* Accounts + saved teams */}
      <TeamsPanel members={members} onLoad={setMembers} />

      {/* Quick Add — meta-suggested teammates */}
      {data.meta && suggestions.length > 0 && (
        <>
          <div className="section-label">Quick add · meta partners for your team</div>
          <div className="qa-row">
            {suggestions.map((s) => {
              const sp = data.byName.get(s.species);
              if (!sp) return null; // skip suggestions we can't resolve to a roster entry
              const legal = legalNames.has(s.species);
              return (
                <div className="qa-card" key={s.species}>
                  <Sprite species={sp} size={40} />
                  <div className="qa-info">
                    <span className="qa-name">{sp?.displayName ?? s.species}</span>
                    <span className="qa-types">
                      {sp?.types.map((t) => (
                        <span key={t} className="type-badge" style={{ background: typeColor(t) }}>{t}</span>
                      ))}
                    </span>
                  </div>
                  <button
                    className="ghost qa-add"
                    disabled={!legal || members.length >= 6}
                    title={legal ? `${s.fromCount} of your mons run this` : "Not legal in this ruleset"}
                    onClick={() => legal && add(s.species)}
                  >
                    Add
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Member cards */}
      <div className="tb-grid">
        {members.map((m, i) => (
          <MemberEditor
            key={m.id}
            index={i}
            member={m}
            data={data}
            pickList={legalSpecies}
            types={types}
            tags={roleTags(m, provider)}
            meta={metaProvider(m.species)}
            onPatch={(p) => patch(i, p)}
            onRemove={() => remove(i)}
          />
        ))}

        {members.length < 6 && (
          <button className="tb-add" onClick={() => add()}>
            <span className="tb-add-plus">＋</span>
            Add Pokémon
            <span className="muted">{members.length}/6</span>
          </button>
        )}
      </div>

      {members.length === 0 && (
        <p className="empty">Add a Pokémon to start building. Search 200+ eligible mons and tune SP, moves, ability, item and Tera.</p>
      )}

      {/* Analysis */}
      {report.issues.length > 0 && (
        <>
          <div className="section-label">Legality</div>
          {report.issues.map((iss, n) => (
            <div key={n} className={`issue ${iss.severity}`}>
              {iss.memberIndex !== null ? `#${iss.memberIndex + 1} ` : ""}
              <strong>{iss.code}</strong> — {iss.message}
            </div>
          ))}
        </>
      )}

      {members.length > 0 && (
        <>
          <div className="section-label">Speed tiers</div>
          <table className="stats">
            <tbody>
              {tiers.map((t) => (
                <tr key={t.species}>
                  <td style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Sprite species={data.byName.get(t.species)} size={28} />
                    {t.displayName}
                  </td>
                  <td className="num">{t.speed}</td>
                  <td>{t.trickRoom ? <span className="tag">Trick Room</span> : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="section-label">Shared weaknesses</div>
          {defense.sharedWeaknesses.length ? (
            <p>
              {defense.sharedWeaknesses.map((t) => (
                <span key={t} className="type-badge" style={{ background: typeColor(t), marginRight: 4 }}>{t}</span>
              ))}
              <span className="muted"> (3+ members weak)</span>
            </p>
          ) : (
            <p className="muted">No type hits 3+ of your team super-effectively.</p>
          )}

          <div className="section-label">Offensive coverage gaps</div>
          <p className="muted">{coverage.gaps.length ? coverage.gaps.join(", ") : "none — full coverage"}</p>
        </>
      )}

      {data.meta && <p className="footnote">{data.meta.attribution}.</p>}
    </div>
  );
}

function MemberEditor({
  index,
  member,
  data,
  pickList,
  types,
  tags,
  meta,
  onPatch,
  onRemove,
}: {
  index: number;
  member: TeamMember;
  data: ChampionsData;
  pickList: SpeciesData[];
  types: string[];
  tags: string[];
  meta: SpeciesMeta | null;
  onPatch: (p: Partial<TeamMember>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const species = data.byName.get(member.species);
  const finals = species ? finalStatsFor(species, member.sp, member.alignmentId) : null;
  const slugItem = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const itemOptions = data.ruleset.allowedItems?.value.length
    ? [...data.ruleset.allowedItems.value].sort().map((n) => ({ slug: slugItem(n), label: n }))
    : null;
  const total = spTotal(member.sp);

  const setSp = (key: (typeof STAT_KEYS)[number], raw: number) => {
    const others = total - member.sp[key];
    const max = Math.min(SP_PER_STAT_CAP, SP_TOTAL_CAP - others);
    const v = Math.max(0, Math.min(max, Math.round(raw || 0)));
    onPatch({ sp: { ...member.sp, [key]: v } });
  };

  const applyMetaSet = () => {
    if (!meta) return;
    const set = metaSet(meta);
    onPatch({
      moves: set.moves.length ? set.moves : member.moves,
      item: set.item ?? member.item,
      ability: set.ability ?? member.ability,
      alignmentId: set.alignmentId ?? member.alignmentId,
      sp: set.spread ?? member.sp,
    });
  };

  const toggleMove = (mv: string) => {
    if (member.moves.includes(mv)) onPatch({ moves: member.moves.filter((x) => x !== mv) });
    else if (member.moves.length < 4) onPatch({ moves: [...member.moves, mv] });
  };
  const spreadLabel = (sp: StatTable) =>
    STAT_KEYS.filter((k) => sp[k] > 0).map((k) => `${sp[k]} ${STAT_LABEL[k]}`).join(" / ");

  const addableMoves = (species?.movepool ?? []).filter((mv) => !member.moves.includes(mv));

  return (
    <div className="tb-card" data-testid="member-card">
      <div className="tb-card-head">
        <Sprite species={species} size={52} />
        <div className="tb-head-main">
          <SpeciesCombobox species={pickList} value={member.species} onChange={(v) => onPatch({ species: v })} label="" hideSprite />
          <span className="tb-tags">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</span>
        </div>
        <button className="icon-btn" title="Remove" onClick={onRemove}>✕</button>
      </div>

      {meta && (
        <button
          className="primary rec-set"
          onClick={applyMetaSet}
          title="Fill this slot with the most common moves, item, ability, Stat Alignment and SP spread from usage data"
        >
          ★ Apply recommended set
        </button>
      )}

      <div className="tb-body">
        {/* Left: identity + moves */}
        <div className="tb-left">
          <label className="mini-label">Item</label>
          {itemOptions ? (
            <select value={member.item ?? ""} onChange={(e) => onPatch({ item: e.target.value })}>
              <option value="">—</option>
              {itemOptions.map((it) => (
                <option key={it.slug} value={it.slug}>{it.label}</option>
              ))}
            </select>
          ) : (
            <input type="text" value={member.item ?? ""} placeholder="Held item" onChange={(e) => onPatch({ item: e.target.value })} />
          )}

          <label className="mini-label">Ability</label>
          <select value={member.ability ?? ""} disabled={!species} onChange={(e) => onPatch({ ability: e.target.value })}>
            <option value="">—</option>
            {species?.abilities.map((a) => (
              <option key={a.name} value={a.name}>{prettify(a.name)}{a.isHidden ? " (Hidden)" : ""}</option>
            ))}
          </select>

          <label className="mini-label">Stat Alignment</label>
          <AlignmentSelect value={member.alignmentId} onChange={(v) => onPatch({ alignmentId: v })} label="" />

          <label className="mini-label">Moves ({member.moves.length}/4)</label>
          <ul className="move-list">
            {member.moves.map((mv) => (
              <li key={mv}>
                <button className="icon-btn sm" onClick={() => toggleMove(mv)} title="Remove move">✕</button>
                <span>{prettify(mv)}</span>
              </li>
            ))}
          </ul>
          {species && member.moves.length < 4 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) toggleMove(e.target.value); }}
            >
              <option value="">+ Add move…</option>
              {addableMoves.map((mv) => (
                <option key={mv} value={mv}>{prettify(mv)}</option>
              ))}
            </select>
          )}
        </div>

        {/* Right: stat block */}
        <div className="tb-stats">
          <div className="tb-stats-head">
            <span>SP</span>
            <span className={total <= SP_TOTAL_CAP ? "sp-cap-ok" : "sp-cap-bad"}>{total}/{SP_TOTAL_CAP}</span>
          </div>
          {STAT_KEYS.map((k) => (
            <div className="tb-stat-row" key={k}>
              <span className="tb-stat-k">{STAT_LABEL[k]}</span>
              <input
                className="sp-input"
                type="number"
                min={0}
                max={SP_PER_STAT_CAP}
                value={member.sp[k]}
                disabled={!species}
                onChange={(e) => setSp(k, Number(e.target.value))}
              />
              <span className="tb-stat-final">{finals ? finals[k] : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tb-foot">
        <button className="ghost" onClick={() => setOpen((o) => !o)}>⚙ Customize spread {open ? "▲" : "▼"}</button>
        <div className="tb-foot-right">
          <select value={member.teraType ?? "none"} onChange={(e) => onPatch({ teraType: e.target.value === "none" ? null : e.target.value })} title="Tera type">
            <option value="none">Tera: none</option>
            {types.map((t) => <option key={t} value={t}>Tera: {t}</option>)}
          </select>
        </div>
      </div>

      {open && (
        <div className="tb-customize">
          {meta && (
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 13 }}>Most-used build</strong>
              <button className="primary" onClick={applyMetaSet}>Apply most-used set</button>
            </div>
          )}
          <SpEditor sp={member.sp} onChange={(v: StatTable) => onPatch({ sp: v })} />
          {meta && (
            <MetaSuggestions
              meta={meta}
              member={member}
              onToggleMove={toggleMove}
              onSetItem={(v) => onPatch({ item: v })}
              onSetAbility={(v) => onPatch({ ability: v })}
              onSetAlignment={(v) => onPatch({ alignmentId: v })}
              onSetSpread={(v) => onPatch({ sp: v })}
              spreadLabel={spreadLabel}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className="ghost" onClick={onClick} style={{ margin: 2, fontSize: 12, ...(active ? { borderColor: "var(--accent)", color: "var(--text)" } : {}) }}>
      {label}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ margin: "6px 0" }}>
      <span className="muted" style={{ fontSize: 11, marginRight: 6 }}>{label}:</span>
      {children}
    </div>
  );
}

function MetaSuggestions({
  meta,
  member,
  onToggleMove,
  onSetItem,
  onSetAbility,
  onSetAlignment,
  onSetSpread,
  spreadLabel,
}: {
  meta: SpeciesMeta;
  member: TeamMember;
  onToggleMove: (mv: string) => void;
  onSetItem: (v: string) => void;
  onSetAbility: (v: string) => void;
  onSetAlignment: (v: string) => void;
  onSetSpread: (v: StatTable) => void;
  spreadLabel: (sp: StatTable) => string;
}) {
  const slug = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");
  return (
    <div style={{ marginTop: 8 }}>
      <Group label="Moves">
        {rowsByCategory(meta, "move").slice(0, 8).map((r) => {
          const s = slug(r.name);
          return <Chip key={s} label={`${r.name} ${r.percentage}`} active={member.moves.includes(s)} onClick={() => onToggleMove(s)} />;
        })}
      </Group>
      <Group label="Items">
        {rowsByCategory(meta, "item").slice(0, 5).map((r) => {
          const s = slug(r.name);
          return <Chip key={s} label={`${r.name} ${r.percentage}`} active={member.item === s} onClick={() => onSetItem(s)} />;
        })}
      </Group>
      <Group label="Abilities">
        {rowsByCategory(meta, "ability").map((r) => {
          const s = slug(r.name);
          return <Chip key={s} label={`${r.name} ${r.percentage}`} active={member.ability === s} onClick={() => onSetAbility(s)} />;
        })}
      </Group>
      <Group label="Alignment">
        {rowsByCategory(meta, "alignment").slice(0, 4).map((r) => {
          const id = r.name.toLowerCase();
          return <Chip key={id} label={`${r.name} ${r.percentage}`} active={member.alignmentId === id} onClick={() => onSetAlignment(id)} />;
        })}
      </Group>
      <Group label="Spreads">
        {rowsByCategory(meta, "spread").slice(0, 4).map((r, i) =>
          r.spread ? (
            <Chip key={i} label={`${spreadLabel(r.spread)} (${r.percentage})`} active={JSON.stringify(member.sp) === JSON.stringify(r.spread)} onClick={() => onSetSpread(r.spread!)} />
          ) : null
        )}
      </Group>
    </div>
  );
}
