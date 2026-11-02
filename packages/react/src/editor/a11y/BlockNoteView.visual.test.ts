import { defaultSchemaDocument } from "@root/tests/a11y/documents.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { screenshotFull } from "@root/tests/src/utils/screenshotFull.js";
import { openEditor } from "@root/tests/a11y/helpers.js";

function applyStyles(css: string) {
  const style = document.createElement("style");
  style.textContent = css;
  page.getByRole("main").element().append(style);
}

// Scaling text takes some logic as the scaling has to be applied to each font
// size, not just the base editor font size.
function resizeText(scale: number) {
  function rulesFor(element: Element, selector: string): string {
    const rule =
      element instanceof HTMLElement
        ? `${selector} { font-size: ${Number.parseFloat(getComputedStyle(element).fontSize) * scale}px !important; }`
        : "";
    return [
      rule,
      ...Array.from(element.children, (child, index) =>
        rulesFor(child, `${selector} > :nth-child(${index + 1})`),
      ),
    ].join("\n");
  }

  // Read all sizes before applying overrides, so inherited sizes scale once.
  // A stylesheet avoids ProseMirror reconciling mutations to editable DOM.
  applyStyles(rulesFor(page.getByRole("textbox").element(), ".bn-editor"));
}

async function waitForMedia() {
  // Wait for current-frame media data before the tests take screenshots.
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
    applyStyles(`
      .bn-editor, .bn-editor * {
        line-height: 1.5 !important;
        letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important;
      }
      .bn-editor p { margin-block-end: 2em !important; }
    `);
    await screenshotFull(document.body, "default-schema-text-spacing.png", {
      comparatorOptions: { allowedMismatchedPixels: 10 },
      // Video decoding differs across platforms; keep captions and layout in scope.
      screenshotOptions: {
        mask: [page.elementLocator(document.querySelector("video")!)],
      },
    });
  });

  test("default schema remains readable at 200% text size", async () => {
    await openEditor(defaultSchemaDocument);
    await waitForMedia();
    resizeText(2);
    await screenshotFull(
      document.body,
      "default-schema-text-size-200-percent.png",
      {
        comparatorOptions: { allowedMismatchedPixels: 10 },
        screenshotOptions: {
          mask: [page.elementLocator(document.querySelector("video")!)],
        },
      },
    );
  });
});
