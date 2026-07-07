import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TeamBuilder } from "./TeamBuilder.js";
import { makeTestData } from "../test-utils.js";

/**
 * Regression test for a React reconciliation bug: MemberEditor cards used to
 * be keyed by array index (`key={i}`). Removing a middle/earlier slot shifts
 * every later member down by one index, so React reuses the DOM node (and its
 * local `useState` — the "Customize spread" open/closed flag) for whatever
 * member now lands on that index, instead of following the member it actually
 * belonged to. Keying by a stable per-member id fixes this.
 */

const PLACEHOLDER = "Search Pokémon…";

function cards() {
  return screen.getAllByTestId("member-card");
}

/** The species currently shown in a card's picker (empty string if unset). */
function speciesOf(card: HTMLElement): string {
  return (within(card).getByPlaceholderText(PLACEHOLDER) as HTMLInputElement).value;
}

function selectSpecies(card: HTMLElement, displayName: string) {
  const input = within(card).getByPlaceholderText(PLACEHOLDER);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: displayName } });
  const option = within(card).getByText(displayName);
  fireEvent.mouseDown(option);
}

function cardFor(displayName: string): HTMLElement {
  const found = cards().find((c) => speciesOf(c) === displayName);
  if (!found) throw new Error(`No member-card currently showing "${displayName}"`);
  return found;
}

function isSpreadOpen(card: HTMLElement): boolean {
  return within(card).queryByText("Stat Points") !== null;
}

describe("TeamBuilder — member card identity", () => {
  it("keeps the open Customize-spread panel attached to the same Pokémon after an earlier slot is removed", () => {
    render(<TeamBuilder data={makeTestData()} />);

    // Add three slots and assign distinguishable species to each.
    fireEvent.click(screen.getByText("Add Pokémon"));
    fireEvent.click(screen.getByText("Add Pokémon"));
    fireEvent.click(screen.getByText("Add Pokémon"));
    expect(cards()).toHaveLength(3);

    selectSpecies(cards()[0]!, "Alpha");
    selectSpecies(cards()[1]!, "Beta");
    selectSpecies(cards()[2]!, "Gamma");

    // Open the "Customize spread" panel on the MIDDLE member, Beta.
    const betaCard = cardFor("Beta");
    fireEvent.click(within(betaCard).getByText(/Customize spread/));
    expect(isSpreadOpen(cardFor("Beta"))).toBe(true);
    expect(isSpreadOpen(cardFor("Gamma"))).toBe(false);

    // Remove an EARLIER member, Alpha.
    fireEvent.click(within(cardFor("Alpha")).getByTitle("Remove"));

    expect(cards()).toHaveLength(2);

    // The open panel must still belong to Beta, not have jumped to Gamma.
    expect(isSpreadOpen(cardFor("Beta"))).toBe(true);
    expect(isSpreadOpen(cardFor("Gamma"))).toBe(false);
  });
});
