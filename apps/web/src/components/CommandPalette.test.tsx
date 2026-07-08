import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette.js";
import { makeTestData } from "../test-utils.js";

const SECTIONS = [
  { id: "team", label: "Team" },
  { id: "meta", label: "Meta" },
];

describe("CommandPalette", () => {
  it("renders as a dialog and lists sections for an empty query", () => {
    const data = makeTestData();
    render(
      <CommandPalette
        species={data.species}
        sections={SECTIONS}
        onPickPokemon={vi.fn()}
        onPickSection={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog", { name: "Search" })).toBeTruthy();
    expect(screen.getByText("Team")).toBeTruthy();
    expect(screen.getByText("Meta")).toBeTruthy();
  });

  it("filters to a matching Pokémon and picks it via Enter", () => {
    const data = makeTestData();
    const onPickPokemon = vi.fn();
    render(
      <CommandPalette
        species={data.species}
        sections={SECTIONS}
        onPickPokemon={onPickPokemon}
        onPickSection={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const input = screen.getByRole("combobox", { name: "Search" });
    fireEvent.change(input, { target: { value: "Beta" } });
    expect(screen.getByText("Beta")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onPickPokemon).toHaveBeenCalledWith("beta");
  });

  it("calls onClose on Escape", () => {
    const data = makeTestData();
    const onClose = vi.fn();
    render(
      <CommandPalette
        species={data.species}
        sections={SECTIONS}
        onPickPokemon={vi.fn()}
        onPickSection={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("picks a section by clicking a result row", () => {
    const data = makeTestData();
    const onPickSection = vi.fn();
    render(
      <CommandPalette
        species={data.species}
        sections={SECTIONS}
        onPickPokemon={vi.fn()}
        onPickSection={onPickSection}
        onClose={vi.fn()}
      />
    );

    fireEvent.mouseDown(screen.getByText("Meta"));
    expect(onPickSection).toHaveBeenCalledWith("meta");
  });
});
