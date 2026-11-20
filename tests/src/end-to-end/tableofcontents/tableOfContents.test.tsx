import App from "@examples/08-extensions/03-table-of-contents/src/App";
import { describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import { page } from "../../utils/context.js";

// The `TableOfContents` component in the example's sidebar, over the
// extension: clicking an entry scrolls the editor's own scroll container and
// marks the entry. The scroll spy itself is covered by
// `packages/core/src/extensions/TableOfContents/TableOfContents.browser.test.ts`.
describe("TableOfContents", () => {
  test("clicking an entry scrolls its heading to the top of the editor and marks the entry as the current location", async () => {
    await render(<App />);
    const outline = page.getByRole("navigation", { name: "Contents" });
    const entry = outline.getByRole("button", {
      name: "Planting",
      exact: true,
    });
    const isCurrent = (name: string) =>
      outline.getByRole("button", { name, exact: true }).element()
        .ariaCurrent === "location";
    await vi.waitFor(() => expect(isCurrent("Choosing a site")).toBe(true));

    await entry.click();

    const container = document.querySelector(".bn-container")!;
    const heading = [
      ...document.querySelectorAll('[data-content-type="heading"]'),
    ]
      .find((element) => element.textContent === "Planting")!
      .closest('[data-node-type="blockContainer"]')!;
    await vi.waitFor(() => {
      expect(container.scrollTop).toBeGreaterThan(0);
      expect(
        Math.abs(
          heading.getBoundingClientRect().top -
            container.getBoundingClientRect().top,
        ),
      ).toBeLessThanOrEqual(1);
      expect(isCurrent("Planting")).toBe(true);
    });
    expect(
      outline.element().querySelectorAll('[aria-current="location"]'),
    ).toHaveLength(1);
  });
});
