import {
  BlockNoteEditor,
  defaultBlockSpecs,
  type PartialBlock,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { SyntaxHighlightingExtension } from "@blocknote/core/extensions";
import {
  blocksToYDoc,
  createYVersionView,
  withCollaboration,
} from "@blocknote/core/y";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createBundledHighlighter } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { testDocument } from "@shared/testDocument.js";
import * as Y from "@y/y";
import { expect, test } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { browserName, page } from "../../utils/context.js";
import { sleep } from "../../utils/editor.js";
import { screenshotFull } from "../../utils/screenshotFull.js";

const createHighlighter = createBundledHighlighter({
  langs: { javascript: () => import("@shikijs/langs-precompiled/javascript") },
  themes: {
    "dark-plus": () => import("@shikijs/themes/dark-plus"),
    "light-plus": () => import("@shikijs/themes/light-plus"),
  },
  engine: () => createJavaScriptRegexEngine(),
});

// Reuse the same document and media as the static all-blocks screenshots.
// Page breaks and column wrappers are not default blocks; retain column contents.
function defaultSchemaDocument(blocks: typeof testDocument): PartialBlock[] {
  const result: PartialBlock[] = [];
  for (const block of blocks) {
    if (block.type === "pageBreak") {
      continue;
    }
    if (block.type === "column" || block.type === "columnList") {
      result.push(...defaultSchemaDocument(block.children ?? []));
      continue;
    }
    result.push({
      ...block,
      children: defaultSchemaDocument(block.children ?? []),
    });
  }
  return result;
}

type IdentifiedBlock = PartialBlock & {
  id: string;
  children: IdentifiedBlock[];
};

function identify(blocks: PartialBlock[], prefix: string): IdentifiedBlock[] {
  return blocks.map((block, index) => ({
    ...block,
    id: `${prefix}-${index}`,
    children: identify(block.children ?? [], `${prefix}-${index}`),
  }));
}

function blockTypes(blocks: PartialBlock[]): string[] {
  return blocks.flatMap((block) => [
    block.type ?? "paragraph",
    ...blockTypes(block.children ?? []),
  ]);
}

const showcase: PartialBlock[] = [
  ...defaultSchemaDocument(testDocument),
  {
    type: "codeBlock",
    props: { language: "text" },
    content: "Plain code without syntax highlighting\nremains readable too.",
  },
];

for (const theme of ["light", "dark"] as const) {
  // Match the static all-blocks test's browser and full-resolution capture setup.
  // The comparison styling is browser-independent; iframe captures are not.
  test.skipIf(browserName !== "chromium")(
    `default schema comparison in ${theme}`,
    { timeout: 90000 },
    async () => {
      expect(new Set(blockTypes(showcase))).toEqual(
        new Set(Object.keys(defaultBlockSpecs)),
      );
      const removed = identify(showcase, "removed");
      const added = identify(showcase, "added");
      const schemaEditor = BlockNoteEditor.create();
      const doc = blocksToYDoc(
        schemaEditor,
        [
          { id: "before-label", type: "heading", content: "Deleted content" },
          ...removed,
          { id: "after-label", type: "heading", content: "Inserted content" },
          { id: "inline-label", type: "heading", content: "Inline code edits" },
          {
            id: "inline-code",
            type: "codeBlock",
            props: { language: "javascript" },
            content: 'const value = "old";\nconsole.log(value);',
          },
        ],
        "doc",
      );
      doc.clientID = 1;
      const before = Y.encodeStateAsUpdateV2(doc);
      const editor = BlockNoteEditor.create(
        withCollaboration({
          extensions: [
            SyntaxHighlightingExtension({
              createHighlighter: () =>
                createHighlighter({
                  themes: ["dark-plus", "light-plus"],
                  langs: [],
                }),
            }),
          ],
          collaboration: {
            fragment: doc.get("doc"),
            provider: undefined,
            user: { name: "Reviewer", color: "#167b80" },
          },
        }),
      );
      const screen = await render(
        <section
          style={{
            width: 900,
            padding: 16,
            background: theme === "dark" ? "#1f1f1f" : "white",
          }}
        >
          <BlockNoteView editor={editor} theme={theme} />
        </section>,
      );
      let view:
        | ReturnType<ReturnType<typeof createYVersionView>["open"]>
        | undefined;
      try {
        editor.removeBlocks(removed.map((block) => block.id));
        editor.insertBlocks(added, "after-label", "after");
        editor.updateBlock("inline-code", {
          content:
            'const value = "new";\nconsole.log(value);\n// inserted line',
        });
        view = createYVersionView(editor, doc.get("doc")).open();
        editor.isEditable = false;
        view.show({
          content: Y.encodeStateAsUpdateV2(doc),
          comparison: { content: before },
          target: { type: "current" },
        });
        const root = screen.container.querySelector("section")!;
        await expect
          .poll(() => root.querySelectorAll("ins").length)
          .toBeGreaterThan(0);
        await expect
          .poll(() => root.querySelectorAll("del").length)
          .toBeGreaterThan(0);
        for (const toggle of root.querySelectorAll<HTMLElement>(
          '.bn-toggle-wrapper[data-show-children="false"]',
        )) {
          // Expand without scrolling the outer Vitest UI to each toggle.
          toggle.querySelector<HTMLButtonElement>("button")!.click();
          expect(toggle.getAttribute("data-show-children")).toBe("true");
        }
        await document.fonts.ready;
        await Promise.all(
          Array.from(root.querySelectorAll("img"), (img) => img.decode()),
        );
        // Restore the runner's scroll position after the preceding tall capture.
        await page.viewport(
          1280,
          Math.ceil(root.getBoundingClientRect().bottom) + 40,
        );
        window.scrollTo(0, 0);
        for (
          let parent = window.frameElement;
          parent;
          parent = parent.parentElement
        ) {
          parent.scrollTop = 0;
          parent.scrollLeft = 0;
        }
        window.parent.scrollTo(0, 0);
        for (const audio of root.querySelectorAll("audio")) {
          expect(audio.getBoundingClientRect().width).toBeGreaterThan(500);
        }
        const codeBlocks = root.querySelectorAll<HTMLElement>(
          '[data-content-type="codeBlock"]',
        );
        expect(codeBlocks).toHaveLength(5);
        for (const block of codeBlocks) {
          expect(getComputedStyle(block).backgroundColor).toBe(
            "rgb(22, 22, 22)",
          );
        }
        await expect
          .poll(() => root.querySelectorAll(".shiki").length)
          .toBeGreaterThan(0);
        for (const token of root.querySelectorAll<HTMLElement>(
          '[data-content-type="codeBlock"] > pre .bn-suggestion-mark .shiki',
        )) {
          expect(getComputedStyle(token).color).toBe(
            getComputedStyle(token.closest(".bn-suggestion-mark")!).color,
          );
        }
        // Match the shared document's render-settling step in static.test.tsx.
        await sleep(500);
        await screenshotFull(root, `comparison-default-schema-${theme}`, {
          comparatorOptions: { allowedMismatchedPixelRatio: 0.0001 },
          // Match static.test.tsx: native players vary as media loads. Mask only
          // the players, retaining the diff cards, captions, and other widgets.
          screenshotOptions: {
            scale: "css",
            mask: Array.from(root.querySelectorAll("video, audio"), (element) =>
              page.elementLocator(element),
            ),
          },
        });
      } finally {
        await page.viewport(1280, 720);
        view?.close();
        await screen.unmount();
        doc.destroy();
        for (const key of Object.keys(localStorage)) {
          if (
            key.startsWith("toggle-removed-") ||
            key.startsWith("toggle-added-")
          ) {
            localStorage.removeItem(key);
          }
        }
      }
    },
  );
}
