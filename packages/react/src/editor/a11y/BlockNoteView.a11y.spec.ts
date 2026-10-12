import { navigateDefaultSchemaDocument } from "./helpers.js";
import { defaultSchemaDocument } from "../../../../../tests/a11y/documents.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { screenshotFull } from "../../../../../tests/src/utils/screenshotFull.js";
import { openEditor, pressKey } from "../../../../../tests/a11y/helpers.js";

test("default schema: arrow-key document navigation", async () => {
  await openEditor(defaultSchemaDocument);
  await navigateDefaultSchemaDocument();
});

test.skip("editor can receive focus without selecting content", async () => {
  // TODO: Focus the editor as a page element without an editing selection.
  // Tab/arrows should navigate the page; Enter should enter editing.
  // Escape currently blurs to body, which does not preserve this entry point.
});

test.skip("keyboard selection extends to the entire block", async () => {
  // TODO: Extend a text selection to its whole block, leaving neighbours out.
  // Whole-block selection currently requires Cmd+Click; keyboard UX is TBD.
});

test.skip("whole-block selection is visible", async () => {
  // TODO: Once keyboard block selection exists, snapshot its visual indicator.
  // TODO: Text selection, whole-document selection, and non-inline blocks.
});

test("Escape allows Tab to leave the editor", async () => {
  await openEditor([{ type: "paragraph", content: "Editable text" }]);
  await pressKey("Tab");
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  await pressKey("Escape");
  await expect.element(document.body).toHaveFocus();
  await pressKey("Tab");
  await expect
    .element(page.getByRole("button", { name: "After editor", exact: true }))
    .toHaveFocus();
  // Revisit when the editor can retain focus without an editing selection.
});

// Screenshots need human review for clipping/overlap before accepting a
// baseline; matching an existing image alone does not prove accessibility.
async function waitForMedia() {
  // Capture the loaded controls and first video frame, not loading animations.
  for (const media of document.querySelectorAll("audio, video")) {
    if (media instanceof HTMLMediaElement) {
      media.preload = "auto";
      media.load();
      await expect.poll(() => media.readyState).toBeGreaterThanOrEqual(2);
    }
  }
}

test.describe("text spacing and resizing", () => {
  test("default schema remains readable with text spacing overrides", async () => {
    await openEditor(defaultSchemaDocument);
    await waitForMedia();
    // WCAG 1.4.12: override spacing without changing any other style property.
    // https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html
    const style = document.createElement("style");
    style.textContent = `
      .bn-editor, .bn-editor * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      .bn-editor p { margin-block-end: 2em !important; }
    `;
    page.getByRole("main").element().append(style);
    await screenshotFull(document.body, "default-schema-text-spacing.png", {
      comparatorOptions: { allowedMismatchedPixels: 10 },
    });
  });

  test("default schema remains readable at 200% text size", async () => {
    await openEditor(defaultSchemaDocument);
    await waitForMedia();
    const editor = page.getByRole("textbox").element();
    const paragraph = editor.querySelector("p")!;
    const fontSize = Number.parseFloat(getComputedStyle(paragraph).fontSize);

    // WCAG 1.4.4: resize text to 200%, without scaling its containers/images.
    // Read every original size first so inherited sizes aren't doubled twice.
    // https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html
    const sizes = [editor, ...editor.querySelectorAll("*")]
      .filter((node): node is HTMLElement => node instanceof HTMLElement)
      .map((node) => ({
        node,
        size: Number.parseFloat(getComputedStyle(node).fontSize),
      }));
    // Use a stylesheet: changing contenteditable DOM attributes directly makes
    // ProseMirror reconcile the mutations and replace the affected nodes.
    const style = document.createElement("style");
    style.textContent = sizes
      .map(({ node, size }) => {
        const path: string[] = [];
        for (let child = node; child !== editor; child = child.parentElement!) {
          const siblings = Array.from(child.parentElement!.children);
          path.unshift(`> :nth-child(${siblings.indexOf(child) + 1})`);
        }
        return `.bn-editor ${path.join(" ")} { font-size: ${size * 2}px !important; }`;
      })
      .join("\n");
    page.getByRole("main").element().append(style);
    await expect
      .poll(() => getComputedStyle(paragraph).fontSize)
      .toBe(`${fontSize * 2}px`);
    await screenshotFull(
      document.body,
      "default-schema-text-size-200-percent.png",
      {
        comparatorOptions: { allowedMismatchedPixels: 10 },
      },
    );
  });
});
