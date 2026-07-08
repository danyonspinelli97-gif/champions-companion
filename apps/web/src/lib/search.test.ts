import { describe, it, expect } from "vitest";
import { searchIndex } from "./search";
const species = [
  { name: "garchomp", displayName: "Garchomp", num: 445, types: ["dragon","ground"] },
  { name: "pikachu", displayName: "Pikachu", num: 25, types: ["electric"] },
] as any;
const sections = [{ id: "team", label: "Team" }, { id: "meta", label: "Meta" }];
describe("searchIndex", () => {
  it("finds a pokemon by name prefix", () => {
    const r = searchIndex("garch", species, sections);
    expect(r.find(x => x.kind === "pokemon" && x.slug === "garchomp")).toBeTruthy();
  });
  it("matches a section by label", () => {
    const r = searchIndex("meta", species, sections);
    expect(r.some(x => x.kind === "section" && x.id === "meta")).toBe(true);
  });
  it("returns sections first for empty query", () => {
    const r = searchIndex("", species, sections);
    expect(r.length).toBe(2);
    expect(r[0].kind).toBe("section");
  });
  it("matches a pokemon by type", () => {
    const r = searchIndex("electric", species, sections);
    expect(r.some(x => x.kind === "pokemon" && x.slug === "pikachu")).toBe(true);
  });
});
