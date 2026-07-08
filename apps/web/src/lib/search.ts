import type { SpeciesData } from "@champions/team-builder";
export type Section = { id: string; label: string };
export type Result =
  | { kind: "pokemon"; slug: string; label: string; types: string[] }
  | { kind: "section"; id: string; label: string };

export function searchIndex(query: string, species: SpeciesData[], sections: Section[], cap = 40): Result[] {
  const q = query.trim().toLowerCase();
  const secHits: Result[] = sections
    .filter((s) => !q || s.label.toLowerCase().includes(q))
    .map((s) => ({ kind: "section", id: s.id, label: s.label }));
  if (!q) return secHits;
  const monHits: Result[] = species
    .filter((s) => s.displayName.toLowerCase().includes(q) ||
      String(s.num ?? "").includes(q) ||
      s.types.some((t) => t.toLowerCase().includes(q)))
    .slice(0, cap)
    .map((s) => ({ kind: "pokemon", slug: s.name, label: s.displayName, types: s.types }));
  return [...secHits, ...monHits].slice(0, cap);
}
