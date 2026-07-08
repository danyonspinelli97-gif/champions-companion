import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeciesData } from "@champions/team-builder";
import { searchIndex, type Section, type Result } from "../lib/search.js";
import { typeColor } from "../champions.js";
import { Sprite } from "./shared.js";
import { Search } from "./icons.js";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** Global ⌘K / Ctrl-K search overlay: jump to a section or a Pokémon's detail view. */
export function CommandPalette({
  species,
  sections,
  onPickPokemon,
  onPickSection,
  onClose,
}: {
  species: SpeciesData[];
  sections: Section[];
  onPickPokemon: (slug: string) => void;
  onPickSection: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const bySlug = useMemo(() => new Map(species.map((s) => [s.name, s])), [species]);
  const results = useMemo(() => searchIndex(query, species, sections), [query, species, sections]);

  // Reset the highlighted row whenever the query (and thus the result set) changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Remember what had focus before opening, focus the input, and restore on close.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  const select = (r: Result | undefined) => {
    if (!r) return;
    if (r.kind === "section") onPickSection(r.id);
    else onPickPokemon(r.slug);
  };

  // Arrow/Enter/Esc navigation plus a simple Tab focus trap, mirroring PokemonDetail.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (results.length ? Math.min(i + 1, results.length - 1) : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        select(results[activeIndex]);
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
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [results, activeIndex, onClose]);

  return (
    <div
      className="palette-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette-panel" role="dialog" aria-modal="true" aria-label="Search" ref={dialogRef}>
        <div className="palette-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Pokémon or jump to a section…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results.length ? `palette-result-${activeIndex}` : undefined}
          />
        </div>
        <ul className="palette-results" id="palette-results" role="listbox">
          {results.map((r, i) => (
            <li
              key={r.kind === "section" ? `section-${r.id}` : `pokemon-${r.slug}`}
              id={`palette-result-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? "active" : ""}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                select(r);
              }}
            >
              {r.kind === "section" ? (
                <span className="palette-section-label">{r.label}</span>
              ) : (
                <>
                  <Sprite species={bySlug.get(r.slug)} size={28} />
                  <span className="palette-pokemon-name">{r.label}</span>
                  <span className="palette-pokemon-types">
                    {r.types.map((t) => (
                      <span key={t} className="type-badge" style={{ background: typeColor(t) }}>
                        {t}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </li>
          ))}
          {results.length === 0 && <li className="muted palette-empty">No matches</li>}
        </ul>
      </div>
    </div>
  );
}
