import { BlockNoteEditor } from "@blocknote/core";
import { TableOfContentsExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import App from "@examples/08-extensions/03-table-of-contents/src/App";
import { describe, expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";

import {
  BLOCK_CONTAINER_SELECTOR,
  EDITOR_SELECTOR,
  PARAGRAPH_SELECTOR,
} from "../../utils/const.js";
import { page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

/** Passes once `block` has scrolled to the top of `container`. */
async function expectScrolledToTop(block: Element, container: Element) {
  // Smooth scrolling takes a moment.
  await vi.waitFor(
    () => {
      expect(container.scrollTop).toBeGreaterThan(0);
      expect(
        Math.abs(
          block.getBoundingClientRect().top -
            container.getBoundingClientRect().top,
        ),
      ).toBeLessThanOrEqual(1);
    },
    { timeout: 5000 },
  );
}

// The example's Mantine outline over `TableOfContentsExtension`: it lists the
// headings, follows edits to them, and scrolls to a heading on click.
describe("TableOfContents example", () => {
  test("clicking an entry scrolls its heading to the top of the editor", async () => {
    await render(<App />);
    const editor = await waitForSelector(EDITOR_SELECTOR);
    const outline = page.getByRole("navigation", { name: "Contents" });

    await outline
      .getByRole("button", { name: "Planting", exact: true })
      .click();

    const heading = [
      ...editor.querySelectorAll('[data-content-type="heading"]'),
    ]
      .find((element) => element.textContent === "Planting")!
      .closest(BLOCK_CONTAINER_SELECTOR)!;
    await expectScrolledToTop(heading, editor.closest(".bn-container")!);
  });

  test("lists a heading as soon as it's typed", async () => {
    await render(<App />);

    await userEvent.click(
      await waitForSelector(
        `${EDITOR_SELECTOR} ${PARAGRAPH_SELECTOR} .bn-inline-content`,
      ),
    );
    await userEvent.keyboard("{Enter}## Fresh heading");

    // Wherever the caret landed, the outline lists every heading, the new one
    // included.
    await vi.waitFor(
      () => {
        const headings = [
          ...document.querySelectorAll('[data-content-type="heading"]'),
        ].map((element) => element.textContent);
        const entries = [
          ...document.querySelectorAll('nav[aria-label="Contents"] button'),
        ].map((element) => element.textContent);
        expect(headings.some((text) => text?.startsWith("Fresh heading"))).toBe(
          true,
        );
        expect(entries).toEqual(headings);
      },
      { timeout: 5000 },
    );
  });
});

// The extension alone, where it depends on real layout.
describe("TableOfContentsExtension", () => {
  test("scrolls to the toggle around a heading that's collapsed inside it", async () => {
    // A toggle is open when `localStorage` says so, keyed by block id.
    localStorage.removeItem("toggle-toggle");
    const editor = BlockNoteEditor.create({
      extensions: [TableOfContentsExtension()],
      initialContent: [
        ...Array.from({ length: 30 }, (_, i) => ({
          type: "paragraph" as const,
          content: `Before ${i}`,
        })),
        {
          id: "toggle",
          type: "heading",
          props: { level: 2, isToggleable: true },
          content: "Toggle",
          children: [{ id: "hidden", type: "heading", content: "Hidden" }],
        },
        ...Array.from({ length: 30 }, (_, i) => ({
          type: "paragraph" as const,
          content: `After ${i}`,
        })),
      ],
    });
    await render(
      <div style={{ height: 300, overflow: "auto" }} data-testid="scroller">
        <BlockNoteView editor={editor} />
      </div>,
    );
    const toggle = await waitForSelector(
      `${BLOCK_CONTAINER_SELECTOR}[data-id="toggle"]`,
    );
    const hidden = await waitForSelector(
      `${BLOCK_CONTAINER_SELECTOR}[data-id="hidden"]`,
    );
    expect(hidden.getClientRects()).toHaveLength(0);
    const tableOfContents = editor.getExtension(TableOfContentsExtension)!;

    // The collapsed heading is still listed.
    expect(
      tableOfContents.store.state.entries.map((entry) => entry.blockId),
    ).toEqual(["toggle", "hidden"]);
    expect(tableOfContents.scrollToEntry("hidden")).toBe(true);

    await expectScrolledToTop(toggle, page.getByTestId("scroller").element());
  });
});
