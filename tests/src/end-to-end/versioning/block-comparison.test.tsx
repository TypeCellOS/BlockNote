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
import "@blocknote/math-block/style.css";
import { createBundledHighlighter } from "@shikijs/core";
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript";
import { testDocument } from "../../fixtures/exporters/testDocument.js";
import * as Y from "@y/y";
import { expect, onTestFinished, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";
import { browserName, commands, page, userEvent } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

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

function prepareToggleState(blocks: IdentifiedBlock[]) {
  for (const block of blocks) {
    if (
      block.type === "toggleListItem" ||
      (block.type === "heading" && block.props?.isToggleable)
    ) {
      const key = `toggle-${block.id}`;
      const previous = localStorage.getItem(key);
      onTestFinished(() => {
        if (previous === null) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, previous);
        }
      });
      localStorage.removeItem(key);
    }
    prepareToggleState(block.children);
  }
}

for (const theme of ["light", "dark"] as const) {
  // Match the static all-blocks test's browser and full-resolution capture.
  // The comparison styling is browser-independent; iframe captures are not.
  test.skipIf(browserName !== "chromium")(
    `default schema comparison in ${theme}`,
    { timeout: 90000 },
    async () => {
      onTestFinished(() => commands.mockCustomBlockImages("remove"));
      onTestFinished(() => commands.mockVersioningMedia("remove"));
      await commands.mockCustomBlockImages("install");
      await commands.mockVersioningMedia("install");

      expect(new Set(blockTypes(showcase))).toEqual(
        new Set(Object.keys(defaultBlockSpecs)),
      );
      const removed = identify(showcase, "removed");
      const added = identify(showcase, "added");
      // Retries and the other theme reuse these IDs; start only these toggles closed.
      prepareToggleState([...removed, ...added]);
      const schemaEditor = BlockNoteEditor.create();
      onTestFinished(() => schemaEditor._tiptapEditor.destroy());
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
      onTestFinished(() => doc.destroy());
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
      // Finish hooks unwind in reverse order: host, editor, doc, then routes.
      onTestFinished(() => editor._tiptapEditor.destroy());
      // The attempt renderer owns the root even if render rejects before returning it.
      onTestFinished(cleanup);
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
        // Only the final state is compared. Publish the fixture edits together
        // instead of rendering and syncing each intermediate document.
        editor.transact(() => {
          editor.removeBlocks(removed.map((block) => block.id));
          editor.insertBlocks(added, "after-label", "after");
          editor.updateBlock("inline-code", {
            content:
              'const value = "new";\nconsole.log(value);\n// inserted line',
          });
        });
        view = createYVersionView(editor, doc.get("doc")).open();
        editor.isEditable = false;
        view.show({
          content: Y.encodeStateAsUpdateV2(doc),
          comparison: { content: before },
          target: { type: "current" },
        });
        const root = screen.container.querySelector("section")!;
        await expect.poll(() => root.querySelector("ins")).not.toBeNull();
        expect(root.querySelector("del")).not.toBeNull();
        // A preceding test can leave the pointer over the diff, whose changes
        // show a tooltip on hover. Park it on the padding, outside the editor.
        await userEvent.hover(root, { position: { x: 2, y: 2 } });
        await expect
          .poll(() => document.querySelector(".bn-suggestion-tooltip"))
          .toBeNull();
        const collapsed = root.querySelectorAll<HTMLButtonElement>(
          '.bn-toggle-button[aria-expanded="false"]',
        );
        expect(collapsed.length).toBeGreaterThan(0);
        for (const button of collapsed) {
          // Expand without scrolling the outer Vitest UI to each toggle.
          button.click();
          expect(button.getAttribute("aria-expanded")).toBe("true");
        }
        await Promise.all([
          ...Array.from(root.querySelectorAll("img"), (img) => img.decode()),
          ...Array.from(
            root.querySelectorAll<HTMLMediaElement>("video[src], audio[src]"),
            (media) =>
              expect
                .poll(
                  () =>
                    media.readyState >= HTMLMediaElement.HAVE_METADATA ||
                    media.error !== null,
                )
                .toBe(true),
          ),
          expect
            .poll(() =>
              root.querySelector(
                '[data-id="inline-code"] .bn-suggestion-mark .shiki',
              ),
            )
            .not.toBeNull(),
        ]);
        await document.fonts.ready;
        // Size the iframe once for the full-resolution capture, then restore
        // the runner's scroll position after the preceding tall capture.
        await page.viewport(
          1280,
          Math.max(720, Math.ceil(root.getBoundingClientRect().bottom) + 40),
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
        for (const token of root.querySelectorAll<HTMLElement>(
          '[data-content-type="codeBlock"] > pre .bn-suggestion-mark .shiki',
        )) {
          expect(getComputedStyle(token).color).toBe(
            getComputedStyle(token.closest(".bn-suggestion-mark")!).color,
          );
        }
        await expectElement(root).toMatchScreenshot(
          `comparison-default-schema-${theme}`,
          {
            comparatorOptions: { allowedMismatchedPixelRatio: 0.0001 },
            // Match static.test.tsx: native players vary as media loads. Mask only
            // the players, retaining the diff cards, captions, and other widgets.
            screenshotOptions: {
              scale: "css",
              mask: Array.from(
                root.querySelectorAll("video, audio"),
                (element) => page.elementLocator(element),
              ),
            },
          },
        );
      } finally {
        try {
          await page.viewport(1280, 720);
        } finally {
          try {
            // Closing restores live blocks. Unmount first so that can't start
            // new media requests; the route leases still cover this teardown.
            await screen.unmount();
          } finally {
            view?.close();
          }
        }
      }
    },
  );
}
