import { Fragment } from "prosemirror-model";
import { describe, expect } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { createBlockSpec } from "./createSpec.js";

// Every test here goes through `tryParseHTMLToBlocks`, which parses real HTML
// into a real DOM (`document.implementation.createHTMLDocument` in
// `api/parsers/html/util/nestedLists.ts`) before ProseMirror's parser ever
// runs. Parsing HTML is the capability under test, so the whole suite runs
// against a real browser engine rather than jsdom's.

const frameDiv = () => {
  const dom = document.createElement("div");
  return { dom, slot: dom };
};

// A layout block that recognizes its own external HTML. Before layout blocks
// went through `getParseRules`, `parse` was silently dropped for them and this
// produced nothing at all.
const Card = createBlockSpec(
  {
    type: "card" as const,
    propSchema: { tone: { default: "neutral" } },
    content: "none",
    layoutOnly: true,
  },
  {
    renderFrame: frameDiv,
    parse: (el) =>
      el.classList.contains("card")
        ? { tone: el.getAttribute("data-tone") ?? undefined }
        : undefined,
  },
)();

// The same, but taking over the parsing of its own body.
const Quote = createBlockSpec(
  {
    type: "quote" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
  },
  {
    renderFrame: frameDiv,
    parse: (el) => (el.tagName === "BLOCKQUOTE" ? {} : undefined),
    // Returns inline nodes, the natural thing to build from an element, and
    // relies on ProseMirror's parser to wrap them into child blocks.
    parseContent: ({ el, schema }) =>
      Fragment.from(schema.text(el.textContent?.trim() || "empty")),
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    card: Card,
    quote: Quote,
  } as const,
});

describe("layout block `parse`", () => {
  it("parses an external element into a layout block, children intact", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false, schema });
    const blocks = editor.tryParseHTMLToBlocks(
      '<div class="card" data-tone="warning"><p>First</p><h1>Second</h1></div>',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("card");
    expect(blocks[0].props).toHaveProperty("tone", "warning");
    // No `getContent` is supplied, so ProseMirror parses the children with the
    // normal block rules and `findWrapping` adds the `blockContainer`s.
    expect(blocks[0].children.map((child) => child.type)).toEqual([
      "paragraph",
      "heading",
    ]);
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "First", styles: {} },
    ]);
  });

  it("places inline nodes returned by `parseContent` into a child block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false, schema });
    const blocks = editor.tryParseHTMLToBlocks(
      "<blockquote>Quoted text</blockquote>",
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].children.map((child) => child.type)).toEqual([
      "paragraph",
    ]);
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "Quoted text", styles: {} },
    ]);
  });
});

describe("layout block `runsBefore`", () => {
  const ambiguous = (type: string) =>
    createBlockSpec(
      {
        type,
        propSchema: {},
        content: "none",
        layoutOnly: true,
      } as any,
      {
        renderFrame: frameDiv,
        parse: (el: HTMLElement) =>
          el.classList.contains("shared") ? {} : undefined,
      },
    );

  function makeSchema(betaRunsBefore?: string[]) {
    const alpha = ambiguous("alpha")();
    const beta = ambiguous("beta")();
    if (betaRunsBefore) {
      (beta.implementation as any).runsBefore = betaRunsBefore;
    }

    return BlockNoteSchema.create().extend({
      blockSpecs: { ...defaultBlockSpecs, alpha, beta } as any,
    });
  }

  it("orders a layout block's parse rules before another layout block's", async ({
    setupEditor,
  }) => {
    // Declaration order wins by default; `runsBefore` overrides it.
    for (const [runsBefore, winner] of [
      [undefined, "alpha"],
      [["alpha"], "beta"],
    ] as const) {
      const { editor } = await setupEditor({
        mountType: false,
        schema: makeSchema(runsBefore ? [...runsBefore] : undefined),
      });
      expect(
        editor.tryParseHTMLToBlocks('<div class="shared"><p>x</p></div>')[0]
          .type,
      ).toBe(winner);
    }
  });
});
