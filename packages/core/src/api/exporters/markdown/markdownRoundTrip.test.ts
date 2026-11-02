import { afterAll, describe, expect, it } from "vite-plus/test";

import type {
  Block,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "../../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { markdownToHTML } from "../../parsers/markdown/parseMarkdown.js";
import { cleanHTMLToMarkdown } from "./markdownExporter.js";
import type {
  PartialInlineContent,
  PartialLink,
  StyledText,
} from "../../../schema/index.js";

/**
 * Tests for the markdown round trip: serialize the blocks to markdown, parse
 * the markdown, and serialize again. The first serialization can lose data
 * (markdown has no underline, colors or toggles). After that, the markdown
 * must not change: `serialize(parse(serialize(doc)))` must be equal to
 * `serialize(doc)`.
 *
 * @vitest-environment jsdom
 */

type InlineContent = PartialInlineContent<
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;
type InlineElement = Exclude<InlineContent, string>[number];
type Styles = StyledText<DefaultStyleSchema>["styles"];

/** The number of random documents in the property test. */
const SEED_COUNT = 500;

/** The number of random documents in each known-failure property test. */
const KNOWN_FAILURE_SEED_COUNT = 100;

// ─── Seeded random generator ─────────────────────────────────────────────────

/** A small seeded random number generator (mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Random {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = mulberry32(seed);
  }

  /** Returns true with the probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Returns an integer from `min` to `max` (both included). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

// ─── Document generator ──────────────────────────────────────────────────────

/**
 * The features that the generator can put in a document. Each feature here
 * is not stable yet, so the property test does not use it. Each feature has
 * a known-failure test below.
 */
type GeneratorOptions = {
  /**
   * List items with a nested list and also a different child block (for
   * example a paragraph).
   */
  mixedListItemChildren: boolean;
  /**
   * Adjacent text runs that both have bold or italic style, with no space
   * between them (for example `*a***b**`).
   */
  adjacentEmphasisRuns: boolean;
};

const STABLE_FEATURES: GeneratorOptions = {
  mixedListItemChildren: false,
  adjacentEmphasisRuns: false,
};

/**
 * Words for the text. Many of them contain markdown syntax, at the start and
 * inside the word.
 */
const WORDS = [
  "alpha",
  "beta",
  "x",
  "42",
  "snake_case",
  "a_b_c",
  "_lead",
  "trail_",
  "2*3",
  "**bold**",
  "*em*",
  "_em_",
  "__strong__",
  "~~strike~~",
  "~",
  "`code`",
  "``",
  "\\",
  "\\*",
  "C:\\path\\",
  "[a]",
  "[a](b)",
  "![a](b)",
  "]",
  "(x)",
  "!",
  "#",
  "##",
  "#tag",
  "-",
  "--",
  "---",
  "+",
  "*",
  "_",
  "=",
  "===",
  "***",
  "___",
  "1.",
  "2)",
  "10.",
  ">",
  "<",
  "<div>",
  "<br>",
  "</p>",
  "<!--",
  "1 < 2",
  "&amp;",
  "|",
  "a|b",
  "| --- |",
  "```",
  "~~~",
  "$",
  ":",
  "[ ]",
  "[x]",
  "www.example.com",
  "https://example.com/a_b",
  "<https://example.com>",
];

/** Text for the start of a line, where markdown has block syntax. */
const LINE_STARTS = [
  "# ",
  "## ",
  "> ",
  "- ",
  "+ ",
  "* ",
  "1. ",
  "3) ",
  "---",
  "===",
  "- - -",
  "```",
  "~~~",
  "| a | b |",
  "    ",
  "[ ] ",
  "<div>",
];

const HREFS = [
  "https://example.com",
  "https://example.com/a_b?c=1&d=2",
  "https://example.com/(x)",
  "/relative/path",
  "#anchor",
];

const CODE_LINES = [
  "const x = 1;",
  "  indented",
  "```",
  "````",
  "~~~",
  "# not a heading",
  "- not a list",
  "a\\b",
  "",
  "<div>",
];

const TEXT_COLORS = ["red", "blue"];

const LIST_ITEM_TYPES = [
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
] as const;

/** Returns true if the element has bold or italic style. */
function hasEmphasis(element: InlineElement): boolean {
  if (typeof element === "string") {
    return false;
  }
  if (element.type === "link") {
    return (
      typeof element.content !== "string" && element.content.some(hasEmphasis)
    );
  }
  return element.styles.bold === true || element.styles.italic === true;
}

/** Makes a random document from a seed. The same seed gives the same document. */
class DocumentGenerator {
  private readonly random: Random;

  constructor(
    seed: number,
    private readonly options: GeneratorOptions,
  ) {
    this.random = new Random(seed);
  }

  document(): PartialBlock[] {
    const count = this.random.int(1, 5);
    const blocks: PartialBlock[] = [];
    for (let i = 0; i < count; i++) {
      blocks.push(this.block());
    }
    return blocks;
  }

  private block(): PartialBlock {
    const kind = this.random.pick([
      "paragraph",
      "paragraph",
      "heading",
      "quote",
      "codeBlock",
      "listItem",
      "listItem",
      "listItem",
    ] as const);

    switch (kind) {
      case "paragraph":
        return { type: "paragraph", content: this.inlineContent() };
      case "heading":
        return {
          type: "heading",
          props: { level: this.random.pick([1, 2, 3] as const) },
          content: this.inlineContent(),
        };
      case "quote":
        return { type: "quote", content: this.inlineContent() };
      case "codeBlock":
        return { type: "codeBlock", content: this.code() };
      case "listItem":
        return this.listItem(0);
    }
  }

  private listItem(depth: number): PartialBlock {
    const type = this.random.pick(LIST_ITEM_TYPES);
    const content = this.inlineContent();
    const children = this.listItemChildren(depth);
    if (type === "checkListItem") {
      return {
        type,
        props: { checked: this.random.chance(0.5) },
        content,
        children,
      };
    }
    return { type, content, children };
  }

  private listItemChildren(depth: number): PartialBlock[] {
    if (depth >= 2 || !this.random.chance(0.4)) {
      return [];
    }
    // Make the children all list items or all other blocks, if the
    // generator cannot mix them.
    const kind = this.options.mixedListItemChildren
      ? "mixed"
      : this.random.pick(["lists", "others"] as const);
    const count = this.random.int(1, 3);
    const children: PartialBlock[] = [];
    for (let i = 0; i < count; i++) {
      const isList =
        kind === "lists" || (kind === "mixed" && this.random.chance(0.5));
      if (isList) {
        children.push(this.listItem(depth + 1));
      } else {
        children.push(
          this.random.chance(0.8)
            ? { type: "paragraph", content: this.inlineContent() }
            : { type: "codeBlock", content: this.code() },
        );
      }
    }
    return children;
  }

  /** The content of a block. Sometimes it is empty. */
  private inlineContent(): InlineContent {
    if (this.random.chance(0.05)) {
      return [];
    }
    const count = this.random.int(1, 4);
    const elements: InlineElement[] = [];
    for (let i = 0; i < count; i++) {
      const element = this.random.chance(0.15)
        ? this.link()
        : this.styledText(this.text(i === 0));
      const previous = elements.at(-1);
      if (
        !this.options.adjacentEmphasisRuns &&
        previous !== undefined &&
        hasEmphasis(previous) &&
        hasEmphasis(element)
      ) {
        elements.push({ type: "text", text: " ", styles: {} });
      }
      elements.push(element);
    }
    return elements;
  }

  private link(): PartialLink<DefaultStyleSchema> {
    const href = this.random.pick(HREFS);
    // Sometimes the link text is the URL, which the serializer writes as a
    // bare URL.
    const text = this.random.chance(0.2) ? href : this.text(false);
    return {
      type: "link",
      href,
      // The code style excludes links, so link text has no code style.
      content: [{ type: "text", text, styles: this.styles(false) }],
    };
  }

  private styledText(text: string): StyledText<DefaultStyleSchema> {
    return { type: "text", text, styles: this.styles(true) };
  }

  private styles(allowCode: boolean): Styles {
    if (allowCode && this.random.chance(0.15)) {
      // The code style excludes most other styles.
      return { code: true };
    }
    const styles: Styles = {};
    if (this.random.chance(0.25)) {
      styles.bold = true;
    }
    if (this.random.chance(0.25)) {
      styles.italic = true;
    }
    if (this.random.chance(0.15)) {
      styles.strike = true;
    }
    if (this.random.chance(0.1)) {
      styles.underline = true;
    }
    if (this.random.chance(0.1)) {
      styles.textColor = this.random.pick(TEXT_COLORS);
    }
    return styles;
  }

  /**
   * Random text. In BlockNote, a `\n` in the text of a block (not a code
   * block) is a hard break.
   */
  private text(atBlockStart: boolean): string {
    let text = "";
    if (atBlockStart && this.random.chance(0.3)) {
      text += this.random.pick(LINE_STARTS);
    }
    if (this.random.chance(0.15)) {
      text = this.random.pick([" ", "  ", "\t"]) + text;
    }
    const count = this.random.int(1, 4);
    for (let i = 0; i < count; i++) {
      if (i > 0) {
        if (this.random.chance(0.15)) {
          text += this.random.pick(["\n", " \n", "\n ", "\n\n"]);
          if (this.random.chance(0.4)) {
            text += this.random.pick(LINE_STARTS);
          }
        } else {
          text += this.random.pick([" ", " ", "", "  "]);
        }
      }
      text += this.random.pick(WORDS);
    }
    if (this.random.chance(0.15)) {
      text += this.random.pick([" ", "  ", "\t"]);
    }
    if (this.random.chance(0.05)) {
      text += "\n";
    }
    return text;
  }

  private code(): string {
    const count = this.random.int(0, 4);
    const lines: string[] = [];
    for (let i = 0; i < count; i++) {
      lines.push(this.random.pick(CODE_LINES));
    }
    return lines.join("\n");
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Markdown round trip", () => {
  const editor = BlockNoteEditor.create();

  afterAll(() => {
    editor._tiptapEditor.destroy();
  });

  function serialize(blocks: PartialBlock[]): string {
    return editor.blocksToMarkdownLossy(blocks);
  }

  function parse(markdown: string): Block[] {
    return editor.tryParseMarkdownToBlocks(markdown);
  }

  /** Serialize, parse and serialize again. Returns both serializations. */
  function roundTrip(blocks: PartialBlock[]): {
    first: string;
    second: string;
  } {
    // Put the blocks in the editor first, so that they are a valid document
    // (for example, ProseMirror merges adjacent text with the same styles).
    editor.replaceBlocks(editor.document, blocks);
    const first = serialize(editor.document);
    const second = serialize(parse(first));
    return { first, second };
  }

  function expectStable(blocks: PartialBlock[]) {
    const { first, second } = roundTrip(blocks);
    expect(second).toBe(first);
  }

  /** Returns the seeds from 1 to `count` where the round trip is not stable. */
  function findUnstableSeeds(options: GeneratorOptions, count: number) {
    const unstable: number[] = [];
    for (let seed = 1; seed <= count; seed++) {
      const { first, second } = roundTrip(
        new DocumentGenerator(seed, options).document(),
      );
      if (first !== second) {
        unstable.push(seed);
      }
    }
    return unstable;
  }

  describe("hard breaks", () => {
    it.each([
      ["a backslash", "a\\\nb"],
      ["two spaces", "a  \nb"],
      ["a single newline", "a\nb"],
    ])("parses a hard break from %s without a space after it", (_, md) => {
      expect(parse(md)[0].content).toEqual([
        { type: "text", text: "a\nb", styles: {} },
      ]);
    });

    it("removes a hard break at the end of a paragraph", () => {
      const markdown = serialize([
        { type: "paragraph", content: "a\n " },
        { type: "paragraph", content: "b\n" },
      ]);
      expect(markdown).toBe("a\n\nb\n");
      const blocks = parse(serialize(parse(markdown)));
      expect(blocks.map((block) => block.content)).toEqual([
        [{ type: "text", text: "a", styles: {} }],
        [{ type: "text", text: "b", styles: {} }],
      ]);
    });

    it("writes a hard break in a heading as a <br> tag", () => {
      const markdown = serialize([{ type: "heading", content: "a\nb" }]);
      expect(markdown).toBe("# a<br>b\n");
      expect(parse(markdown)[0]).toMatchObject({
        type: "heading",
        content: [{ type: "text", text: "a\nb", styles: {} }],
      });
    });

    it("indents the line after a hard break in a list item", () => {
      const markdown = serialize([
        { type: "bulletListItem", content: "a\nb" },
        { type: "numberedListItem", content: "c\nd" },
      ]);
      expect(markdown).toBe("* a\\\n  b\n\n1. c\\\n   d\n");
      expect(parse(markdown).map((block) => block.content)).toEqual([
        [{ type: "text", text: "a\nb", styles: {} }],
        [{ type: "text", text: "c\nd", styles: {} }],
      ]);
    });
  });

  describe("markdown syntax in text", () => {
    it.each([
      "# x",
      "###### x",
      "#",
      "> x",
      "- x",
      "+ x",
      "* x",
      "1. x",
      "2) x",
      "---",
      "- - -",
      "===",
      "***",
      "___",
      "```js",
      "~~~",
      "| a | b |",
      "[ ] x",
      "<div>",
    ])("keeps the paragraph text %j as text", (text) => {
      const markdown = serialize([{ type: "paragraph", content: text }]);
      expect(parse(markdown)).toMatchObject([
        { type: "paragraph", content: [{ type: "text", text }] },
      ]);
      expectStable([{ type: "paragraph", content: text }]);
    });

    it("keeps block syntax after a hard break as text", () => {
      const text = "a\n# b\n- c\n1. d\n> e\n---\n===\n--- | ---";
      const markdown = serialize([{ type: "paragraph", content: text }]);
      expect(parse(markdown)).toMatchObject([
        { type: "paragraph", content: [{ type: "text", text }] },
      ]);
    });

    it("keeps inline syntax as text", () => {
      const text =
        "*a* **b** _c_ __d__ `e` ~~f~~ [g](h) ![i](j) \\* \\ C:\\path\\ <k> a|b snake_case 2*3 https://example.com www.example.com";
      const markdown = serialize([{ type: "paragraph", content: text }]);
      expect(parse(markdown)).toMatchObject([
        { type: "paragraph", content: [{ type: "text", text, styles: {} }] },
      ]);
    });

    it("escapes a # sequence at the end of a heading", () => {
      const markdown = serialize([{ type: "heading", content: "a #" }]);
      expect(markdown).toBe("# a \\#\n");
      expect(parse(markdown)[0].content).toEqual([
        { type: "text", text: "a #", styles: {} },
      ]);
    });

    it("escapes a ! before a link", () => {
      const blocks: PartialBlock[] = [
        {
          type: "paragraph",
          content: [
            "a!",
            { type: "link", href: "https://example.com", content: "b" },
          ],
        },
      ];
      expect(serialize(blocks)).toBe("a\\![b](https://example.com)\n");
      expectStable(blocks);
    });

    it("keeps a code span at the start of a line in a quote", () => {
      const blocks: PartialBlock[] = [
        {
          type: "quote",
          content: [{ type: "text", text: "a``b", styles: { code: true } }],
        },
      ];
      expect(serialize(blocks)).toBe("> ```a``b```\n");
      expect(parse(serialize(blocks))[0]).toMatchObject({ type: "quote" });
    });
  });

  describe("whitespace", () => {
    it("removes the whitespace at the start and at the end of the text", () => {
      const blocks: PartialBlock[] = [
        { type: "paragraph", content: "  a  " },
        { type: "heading", content: "\tb " },
        { type: "bulletListItem", content: " c " },
        { type: "paragraph", content: "    d" },
      ];
      expect(serialize(blocks)).toBe("a\n\n# b\n\n* c\n\nd\n");
      expectStable(blocks);
    });

    it("removes the whitespace after a hard break", () => {
      const blocks: PartialBlock[] = [{ type: "paragraph", content: "a\n  b" }];
      expect(serialize(blocks)).toBe("a\\\nb\n");
      expectStable(blocks);
    });

    it("keeps the spaces at the start and at the end of a code span", () => {
      const blocks: PartialBlock[] = [
        {
          type: "paragraph",
          content: [{ type: "text", text: " a ", styles: { code: true } }],
        },
      ];
      expect(serialize(blocks)).toBe("`  a  `\n");
      expect(parse(serialize(blocks))[0].content).toEqual([
        { type: "text", text: " a ", styles: { code: true } },
      ]);
    });
  });

  describe("nested blocks", () => {
    it("nests the children of a toggle list item", () => {
      const markdown = serialize([
        {
          type: "toggleListItem",
          content: "t",
          children: [{ type: "paragraph", content: "c" }],
        },
        { type: "paragraph", content: "after" },
      ]);
      expect(markdown).toBe("* t\n\n  c\n\nafter\n");
      const blocks = parse(markdown);
      expect(blocks).toMatchObject([
        { type: "bulletListItem", children: [{ type: "paragraph" }] },
        { type: "paragraph" },
      ]);
      expect(serialize(blocks)).toBe(markdown);
    });

    it("keeps the order of the children of a toggle list item", () => {
      const blocks: PartialBlock[] = [
        {
          type: "toggleListItem",
          content: "t",
          children: [
            {
              type: "bulletListItem",
              content: "a",
              children: [{ type: "paragraph", content: "b" }],
            },
            { type: "bulletListItem", content: "c" },
          ],
        },
      ];
      expect(serialize(blocks)).toBe("* t\n  * a\n\n    b\n  * c\n");
      expectStable(blocks);
    });

    it("nests a paragraph in a bullet list item", () => {
      const markdown = serialize([
        {
          type: "bulletListItem",
          content: "a",
          children: [{ type: "paragraph", content: "b" }],
        },
        { type: "paragraph", content: "after" },
      ]);
      expect(markdown).toBe("* a\n\n  b\n\nafter\n");
      const blocks = parse(markdown);
      expect(blocks).toMatchObject([
        { type: "bulletListItem", children: [{ type: "paragraph" }] },
        { type: "paragraph" },
      ]);
      expect(serialize(blocks)).toBe(markdown);
    });

    it("nests a paragraph in a check list item", () => {
      const markdown = serialize([
        {
          type: "checkListItem",
          content: "a",
          children: [{ type: "paragraph", content: "b" }],
        },
      ]);
      expect(markdown).toBe("* [ ] a\n\n  b\n");
      expect(parse(markdown)).toMatchObject([
        { type: "checkListItem", children: [{ type: "paragraph" }] },
      ]);
    });

    it("continues the numbered list after a nested paragraph", () => {
      const blocks: PartialBlock[] = [
        {
          type: "numberedListItem",
          content: "a",
          children: [{ type: "paragraph", content: "b" }],
        },
        { type: "numberedListItem", content: "c" },
      ];
      expect(serialize(blocks)).toBe("1. a\n\n   b\n2. c\n");
      expectStable(blocks);
    });

    it("keeps the nesting level of the list item after a nested paragraph", () => {
      const blocks: PartialBlock[] = [
        {
          type: "bulletListItem",
          content: "a",
          children: [
            {
              type: "bulletListItem",
              content: "b",
              children: [{ type: "paragraph", content: "c" }],
            },
            { type: "bulletListItem", content: "d" },
          ],
        },
        { type: "bulletListItem", content: "e" },
      ];
      expect(serialize(blocks)).toBe("* a\n  * b\n\n    c\n  * d\n* e\n");
      expectStable(blocks);
    });

    it("keeps an empty list item at the end of the document", () => {
      const blocks: PartialBlock[] = [
        {
          type: "numberedListItem",
          content: "a",
          children: [{ type: "bulletListItem", content: "" }],
        },
      ];
      expect(parse(serialize(blocks))).toMatchObject([
        {
          type: "numberedListItem",
          children: [{ type: "bulletListItem", content: [] }],
        },
      ]);
      expectStable(blocks);
    });
  });

  describe("empty blocks", () => {
    it("writes an empty paragraph as a <br> line and reads it back", () => {
      const blocks: PartialBlock[] = [
        { type: "paragraph", content: "a" },
        { type: "paragraph", content: "" },
        { type: "paragraph", content: "b" },
        { type: "paragraph", content: "" },
      ];
      const markdown = serialize(blocks);
      expect(markdown).toBe("a\n\n<br>\n\nb\n\n<br>\n");
      expect(parse(markdown).map((block) => block.content)).toEqual([
        [{ type: "text", text: "a", styles: {} }],
        [],
        [{ type: "text", text: "b", styles: {} }],
        [],
      ]);
      expectStable(blocks);
    });

    it("writes an empty heading as the # sequence and reads it back", () => {
      const blocks: PartialBlock[] = [
        { type: "heading", props: { level: 2 }, content: "" },
        { type: "paragraph", content: "a" },
        { type: "heading", props: { level: 3 }, content: "" },
      ];
      const markdown = serialize(blocks);
      expect(markdown).toBe("##\n\na\n\n###\n");
      expect(parse(markdown)).toMatchObject([
        { type: "heading", props: { level: 2 }, content: [] },
        { type: "paragraph" },
        { type: "heading", props: { level: 3 }, content: [] },
      ]);
      expectStable(blocks);
    });

    it("keeps an empty paragraph in a list item", () => {
      const blocks: PartialBlock[] = [
        {
          type: "bulletListItem",
          content: "a",
          children: [
            { type: "paragraph", content: "" },
            { type: "paragraph", content: "b" },
          ],
        },
      ];
      expect(serialize(blocks)).toBe("* a\n\n  <br>\n\n  b\n");
      expect(parse(serialize(blocks))).toMatchObject([
        {
          type: "bulletListItem",
          children: [
            { type: "paragraph", content: [] },
            { type: "paragraph", content: [{ type: "text", text: "b" }] },
          ],
        },
      ]);
      expectStable(blocks);
    });
  });

  describe("links, runs and code blocks", () => {
    it("reads the backslash escapes in a link URL", () => {
      const blocks: PartialBlock[] = [
        {
          type: "paragraph",
          content: [
            { type: "link", href: "https://example.com/(x)", content: "a" },
          ],
        },
      ];
      const markdown = serialize(blocks);
      expect(markdown).toBe("[a](https://example.com/\\(x\\))\n");
      expect(parse(markdown)[0].content).toMatchObject([
        { type: "link", href: "https://example.com/(x)" },
      ]);
    });

    it("writes a URL in angle brackets if text comes right after it", () => {
      const blocks: PartialBlock[] = [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://example.com",
              content: "https://example.com",
            },
            "x",
          ],
        },
      ];
      expect(serialize(blocks)).toBe("<https://example.com>x\n");
      expectStable(blocks);
    });

    it("merges adjacent runs that are different only in color", () => {
      const blocks: PartialBlock[] = [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a", styles: { bold: true } },
            {
              type: "text",
              text: "b",
              styles: { bold: true, textColor: "red" },
            },
          ],
        },
      ];
      expect(serialize(blocks)).toBe("**ab**\n");
      expectStable(blocks);
    });

    it("removes the newlines at the end of a code block", () => {
      const blocks: PartialBlock[] = [{ type: "codeBlock", content: "a\n\n" }];
      expect(serialize(blocks)).toBe("```text\na\n```\n");
      expectStable(blocks);
    });
  });

  describe("images in text", () => {
    it("splits a paragraph around an image", () => {
      const blocks = parse("a ![x](https://example.com/x.png) b");
      expect(blocks).toMatchObject([
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        {
          type: "image",
          props: { url: "https://example.com/x.png", name: "x" },
        },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
      ]);
      expect(serialize(blocks)).toBe(
        "a\n\n![x](https://example.com/x.png)\n\nb\n",
      );
    });

    it("splits a paragraph around an image after a hard break", () => {
      expect(parse("a\n![x](https://example.com/x.png)")).toMatchObject([
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        { type: "image", props: { url: "https://example.com/x.png" } },
      ]);
    });

    it("keeps the link of an image in a link as a link with the alt text", () => {
      const blocks = parse(
        "[![build](https://example.com/badge.svg)](https://example.com/ci)",
      );
      expect(blocks).toMatchObject([
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://example.com/ci",
              content: [{ type: "text", text: "build" }],
            },
          ],
        },
      ]);
    });

    it.each([
      ["emphasis", "**a ![x](https://example.com/x.png)**"],
      ["a heading", "# a ![x](https://example.com/x.png)"],
      ["the text of a list item", "* a ![x](https://example.com/x.png)"],
    ])("changes an image in %s into a link", (_, markdown) => {
      expect(JSON.stringify(parse(markdown))).toContain(
        '"type":"link","href":"https://example.com/x.png"',
      );
    });

    it("does not change the HTML from markdownToHTML", () => {
      expect(markdownToHTML("a ![x](https://example.com/x.png) b")).toBe(
        '<p>a <img src="https://example.com/x.png" alt="x"> b</p>',
      );
    });
  });

  describe("plain text for the clipboard", () => {
    const blocks: PartialBlock[] = [
      { type: "paragraph", content: "# Not a heading" },
      { type: "paragraph", content: "" },
      {
        type: "paragraph",
        content: "*details* in snake_case at https://example.com, 1 < 2 <b>",
      },
    ];

    it("writes text without escapes", () => {
      expect(
        cleanHTMLToMarkdown(editor.blocksToHTMLLossy(blocks), {
          escapes: "none",
        }),
      ).toBe(
        "# Not a heading\n\n\n\n*details* in snake_case at https://example.com, 1 < 2 <b>\n",
      );
    });

    it("writes text with escapes by default", () => {
      expect(cleanHTMLToMarkdown(editor.blocksToHTMLLossy(blocks))).toBe(
        "\\# Not a heading\n\n<br>\n\n\\*details\\* in snake_case at https\\://example.com, 1 < 2 \\<b>\n",
      );
    });
  });

  describe("property test: serialize, parse and serialize again gives the same markdown", () => {
    // To run one seed again, use a filter with the test name, for example:
    //   vp test --run src/api/exporters/markdown/markdownRoundTrip.test.ts -t "seed 42$"
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      it(`seed ${seed}`, () => {
        expectStable(new DocumentGenerator(seed, STABLE_FEATURES).document());
      });
    }

    it("the generator makes the same document from the same seed", () => {
      expect(new DocumentGenerator(7, STABLE_FEATURES).document()).toEqual(
        new DocumentGenerator(7, STABLE_FEATURES).document(),
      );
    });
  });

  describe("known failures", () => {
    // Cause: the HTML parser (`nestedListsToBlockNoteStructure` in
    // `parsers/html/util/nestedLists.ts`) moves a nested list out of its
    // `<li>`. It puts the blocks after the nested list into new list items.
    // Also, if a block comes before the nested list, the nested list does not
    // become a child of the list item. As a result, a list item with a
    // paragraph and a nested list loses its structure.
    it.fails("keeps a list item with a paragraph and a nested list", () => {
      expectStable([
        {
          type: "bulletListItem",
          content: "a",
          children: [
            { type: "paragraph", content: "b" },
            { type: "bulletListItem", content: "c" },
          ],
        },
      ]);
    });

    it.fails("gives the same markdown for mixed list item children (property test)", () => {
      expect(
        findUnstableSeeds(
          { ...STABLE_FEATURES, mixedListItemChildren: true },
          KNOWN_FAILURE_SEED_COUNT,
        ),
      ).toEqual([]);
    });

    // Cause: the markdown parser (`parseDelimited` in `markdownToHtml.ts`)
    // does not use the CommonMark rules for delimiter runs. It cannot close
    // `*` emphasis with the first `*` of a run like `***`. As a result, the
    // parser does not read italic text right before bold text (`*a***b**`)
    // correctly.
    it.fails("keeps italic text right before bold text", () => {
      expectStable([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "a", styles: { italic: true } },
            { type: "text", text: "b", styles: { bold: true } },
          ],
        },
      ]);
    });

    it.fails("gives the same markdown for adjacent bold and italic runs (property test)", () => {
      expect(
        findUnstableSeeds(
          { ...STABLE_FEATURES, adjacentEmphasisRuns: true },
          KNOWN_FAILURE_SEED_COUNT,
        ),
      ).toEqual([]);
    });
  });
});
