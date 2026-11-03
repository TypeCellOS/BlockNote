import { describe, expect, it } from "vite-plus/test";

import type { PartialBlock } from "../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

/**
 * The contract of the markdown and HTML formats, for all default block types
 * and their props: after one round trip (serialize, parse), a second round
 * trip gives the same text. Then a text from the editor is the canonical
 * form of its document, and a program that writes the text back (for
 * example the text lens of xl-ai) sees no change where the text did not
 * change.
 */

/** A small seeded random number generator (mulberry32). */
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    chance: (p: number) => next() < p,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(items: readonly T[]): T =>
      items[Math.floor(next() * items.length)],
  };
}
type Random = ReturnType<typeof createRandom>;

const WORDS = ["alpha", "beta", "gamma", "delta", "x", "42", "café"];

function words(random: Random, count: number): string {
  return Array.from({ length: count }, () => random.pick(WORDS)).join(" ");
}

function inline(random: Random): PartialBlock["content"] {
  return Array.from({ length: 1 + random.int(3) }, (_, i) => {
    const styles: Record<string, boolean | string> = {};
    if (random.chance(0.2)) {
      styles.bold = true;
    }
    if (random.chance(0.2)) {
      styles.italic = true;
    }
    if (random.chance(0.1)) {
      styles.textColor = "red";
    }
    return {
      type: "text" as const,
      text: (i > 0 ? " " : "") + words(random, 1 + random.int(3)),
      styles,
    };
  }) as PartialBlock["content"];
}

function media(random: Random, type: "image" | "video" | "audio" | "file") {
  return {
    type,
    props: {
      url: random.chance(0.8) ? `https://example.com/${random.int(9)}` : "",
      caption: random.chance(0.5) ? words(random, 2) : "",
      ...(type === "file" ? {} : { showPreview: random.chance(0.7) }),
    },
  } as PartialBlock;
}

function block(random: Random, depth: number): PartialBlock {
  const children = () =>
    depth < 2 && random.chance(0.3)
      ? Array.from({ length: 1 + random.int(2) }, () =>
          block(random, depth + 1),
        )
      : [];
  switch (
    random.pick([
      "paragraph",
      "paragraph",
      "heading",
      "quote",
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "toggleListItem",
      "codeBlock",
      "table",
      "image",
      "video",
      "audio",
      "file",
      "divider",
    ] as const)
  ) {
    case "paragraph":
      return {
        type: "paragraph",
        props: random.chance(0.2) ? { textAlignment: "center" } : {},
        content: inline(random),
        children: children(),
      } as PartialBlock;
    case "heading":
      return {
        type: "heading",
        props: { level: (1 + random.int(3)) as 1 | 2 | 3 },
        content: inline(random),
      } as PartialBlock;
    case "quote":
      return { type: "quote", content: inline(random) } as PartialBlock;
    case "bulletListItem":
    case "numberedListItem":
    case "toggleListItem":
      return {
        type: random.pick([
          "bulletListItem",
          "numberedListItem",
          "toggleListItem",
        ] as const),
        content: inline(random),
        children: children(),
      } as PartialBlock;
    case "checkListItem":
      return {
        type: "checkListItem",
        props: { checked: random.chance(0.5) },
        content: inline(random),
        children: children(),
      } as PartialBlock;
    case "codeBlock":
      return {
        type: "codeBlock",
        props: { language: random.pick(["javascript", "python"]) },
        content: random.chance(0.5)
          ? words(random, 3)
          : `${words(random, 2)}\n\n${words(random, 2)}`,
      } as PartialBlock;
    case "table":
      return {
        type: "table",
        content: {
          type: "tableContent",
          rows: Array.from({ length: 2 + random.int(2) }, () => ({
            cells: [words(random, 1), words(random, 1)],
          })),
        },
      } as PartialBlock;
    case "image":
    case "video":
    case "audio":
    case "file":
      return media(random, random.pick(["image", "video", "audio", "file"]));
    case "divider":
      return { type: "divider" } as PartialBlock;
  }
}

function document(seed: number): PartialBlock[] {
  const random = createRandom(seed);
  return Array.from({ length: 2 + random.int(6) }, () => block(random, 0));
}

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

describe.each([
  {
    name: "markdown",
    serialize: (editor: BlockNoteEditor, blocks: PartialBlock[]) =>
      editor.blocksToMarkdownLossy(blocks),
    parse: (editor: BlockNoteEditor, text: string) =>
      editor.tryParseMarkdownToBlocks(text),
  },
  {
    name: "HTML",
    serialize: (editor: BlockNoteEditor, blocks: PartialBlock[]) =>
      editor.blocksToHTMLLossy(blocks),
    parse: (editor: BlockNoteEditor, text: string) =>
      editor.tryParseHTMLToBlocks(text),
  },
])("the $name format contract", ({ serialize, parse }) => {
  const editor = BlockNoteEditor.create();

  it.each(SEEDS)(
    "gives the same text after a second round trip, for seed %i",
    (seed) => {
      // The document as the editor stores it.
      editor.replaceBlocks(editor.document, document(seed));
      const first = serialize(
        editor,
        parse(editor, serialize(editor, editor.document)),
      );
      const second = serialize(editor, parse(editor, first));
      expect(second).toBe(first);
    },
  );
});
