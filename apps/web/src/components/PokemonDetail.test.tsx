import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("does not re-subscribe its keydown listener on re-render, and Escape calls the latest onClose", () => {
    const data = makeTestData();
    const species = data.byName.get("alpha")!;
    const addSpy = vi.spyOn(document, "addEventListener");
    const onCloseA = vi.fn();
    const onCloseB = vi.fn();

    const { rerender } = render(<PokemonDetail species={species} data={data} onClose={onCloseA} />);
    const keydownSubscriptions = addSpy.mock.calls.filter(([type]) => type === "keydown").length;
    expect(keydownSubscriptions).toBe(1);

    // Re-render with a new inline onClose (as a parent re-render would produce).
    rerender(<PokemonDetail species={species} data={data} onClose={onCloseB} />);
    const keydownSubscriptionsAfter = addSpy.mock.calls.filter(([type]) => type === "keydown").length;
    expect(keydownSubscriptionsAfter).toBe(1); // still just the one from mount, no re-subscribe

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCloseA).not.toHaveBeenCalled();
    expect(onCloseB).toHaveBeenCalledTimes(1);

    addSpy.mockRestore();
  });
});
