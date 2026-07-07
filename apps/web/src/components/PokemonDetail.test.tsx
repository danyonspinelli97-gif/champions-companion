import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PokemonDetail } from "./PokemonDetail.js";
import { makeTestData } from "../test-utils.js";

describe("PokemonDetail", () => {
  it("renders the species name and a matchups section without throwing", () => {
    const data = makeTestData();
    const species = data.byName.get("alpha")!;

    render(<PokemonDetail species={species} data={data} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Alpha" })).toBeTruthy();
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
    expect(screen.getByText("Type matchups")).toBeTruthy();
  });
});
