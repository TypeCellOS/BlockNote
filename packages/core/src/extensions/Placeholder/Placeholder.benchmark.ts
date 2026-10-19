/* eslint-disable no-console -- This opt-in benchmark reports timings to the terminal. */
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { en } from "../../i18n/locales/en.js";
import { PlaceholderExtension } from "./Placeholder.js";
import { PlaceholderExtension as OldPlaceholderExtension } from "./Placeholder.old.js";
import { expect, test } from "vite-plus/test";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

function nextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function median(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

// Count both implementations outside the timed region to verify that the
// expected placeholders are rendered after each operation.
function countPlaceholders(host: HTMLElement, implementation: "CSS" | "DOM") {
  if (implementation === "DOM") {
    return host.querySelectorAll(".bn-placeholder").length;
  }
  return [...host.querySelectorAll(".bn-block-content")].filter((block) => {
    const content = getComputedStyle(block, "::after").content;
    return content !== "none" && content !== "normal" && content !== '""';
  }).length;
}

// Opt-in benchmark, excluded from normal tests. Run the script in tests/a11y.
// Each operation includes synchronous rendering and forced style/layout, but
// excludes the following animation frames and validation (and does not time paint).
test("compare CSS and DOM placeholders with 1,000 empty blocks", async () => {
  // Preserve the old implementation's presentation without shipping its CSS.
  const legacyStyle = document.createElement("style");
  legacyStyle.textContent = `
    .bn-block-content:has(.ProseMirror-trailingBreak:only-child):after {
      font-style: italic;
      margin-inline: -2px;
      pointer-events: none;
      max-width: 100%;
      color: var(--bn-colors-side-menu);
    }
  `;
  document.head.append(legacyStyle);
  await document.fonts.load("16px Inter");
  await document.fonts.ready;

  try {
    for (const type of ["paragraph", "bulletListItem"] as const) {
      const initialContent = Array.from({ length: 1000 }, (_, index) => ({
        id: `block-${index}`,
        type,
      }));
      const samples = {
        CSS: {
          initial: [] as number[],
          selection: [] as number[],
          content: [] as number[],
        },
        DOM: {
          initial: [] as number[],
          selection: [] as number[],
          content: [] as number[],
        },
      };
      // Five warm-up pairs, then 30 measured pairs; alternate execution order.
      for (let iteration = 0; iteration < 35; iteration++) {
        const order =
          iteration % 2 ? (["DOM", "CSS"] as const) : (["CSS", "DOM"] as const);
        for (const implementation of order) {
          const host = document.createElement("div");
          host.className = "bn-container bn-root";
          host.dataset.colorScheme = "light";
          host.style.width = "900px";
          document.body.append(host);
          await nextPaint();
          const extension =
            implementation === "CSS"
              ? OldPlaceholderExtension
              : PlaceholderExtension;
          const start = performance.now();
          const editor = BlockNoteEditor.create({
            initialContent,
            disableExtensions: ["placeholder"],
            extensions: [
              ({ editor }) => ({
                ...extension({ placeholders: en.placeholders })({ editor }),
                key: "benchmark-placeholder",
              }),
            ],
          });
          try {
            editor.mount(host);
            const height = host.getBoundingClientRect().height;
            const layout = performance.now() - start;
            await nextPaint();
            // Validate outside the timed region so missing placeholders cannot
            // masquerade as a performance improvement.
            expect(host.querySelectorAll(".bn-block-content")).toHaveLength(
              1000,
            );
            expect(height).toBeGreaterThan(1000);
            const expectedPlaceholders = type === "paragraph" ? 1 : 1000;
            expect(countPlaceholders(host, implementation)).toBe(
              expectedPlaceholders,
            );

            // Move from the first block to the middle of the same document.
            await nextPaint();
            const selectionStart = performance.now();
            editor.setTextCursorPosition("block-500");
            host.getBoundingClientRect();
            const selectionLayout = performance.now() - selectionStart;
            await nextPaint();
            expect(editor.getTextCursorPosition().block.id).toBe("block-500");
            expect(countPlaceholders(host, implementation)).toBe(
              expectedPlaceholders,
            );

            // Insert one character into that empty block. This changes the
            // document and removes its placeholder, exercising cache invalidation.
            await nextPaint();
            const contentStart = performance.now();
            const view = editor.prosemirrorView;
            view.dispatch(view.state.tr.insertText("x"));
            host.getBoundingClientRect();
            const contentLayout = performance.now() - contentStart;
            await nextPaint();
            expect(view.state.selection.$anchor.parent.textContent).toBe("x");
            expect(countPlaceholders(host, implementation)).toBe(
              expectedPlaceholders - 1,
            );

            if (iteration >= 5) {
              samples[implementation].initial.push(layout);
              samples[implementation].selection.push(selectionLayout);
              samples[implementation].content.push(contentLayout);
            }
          } finally {
            editor._tiptapEditor.destroy();
            host.remove();
          }
        }
      }
      for (const phase of ["initial", "selection", "content"] as const) {
        const oldMedian = median(samples.CSS[phase]);
        const newMedian = median(samples.DOM[phase]);
        const delta = (newMedian / oldMedian - 1) * 100;
        console.log(
          `${type} ${phase}: median render time — CSS ${oldMedian.toFixed(2)} ms, DOM ${newMedian.toFixed(2)} ms; delta ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
        );
      }
    }
  } finally {
    legacyStyle.remove();
  }
});
