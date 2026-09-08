import { Fragment } from "prosemirror-model";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "./createSpec.js";

// Every test here goes through `tryParseHTMLToBlocks`, which parses real HTML
// into a real DOM (`document.implementation.createHTMLDocument` in
// `api/parsers/html/util/nestedLists.ts`) before ProseMirror's parser ever
// runs. Parsing HTML is the capability under test, so the whole suite runs
// against a real browser engine rather than jsdom's.

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// A pure container that recognizes its own external HTML. Before containers
// went through `getParseRules`, `parse` was silently dropped for them and this
// produced nothing at all.
const Card = createBlockSpec(
  {
    type: "card" as const,
    propSchema: { tone: { default: "neutral" } },
    content: "none",
    children: { allow: "blocks" },
  },
  {
    render: renderDiv,
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
    children: { allow: "blocks" },
  },
  {
    render: renderDiv,
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

let editor: BlockNoteEditor<any, any, any>;
const div = document.createElement("div");

beforeAll(() => {
  document.body.appendChild(div);
  editor = BlockNoteEditor.create({ schema }) as any;
  editor.mount(div);
});

afterAll(() => {
  editor._tiptapEditor.destroy();
  div.remove();
  editor = undefined as any;
});

beforeEach(() => {
  editor.replaceBlocks(editor.document, [
    { id: "p-0", type: "paragraph", content: "Paragraph 0" },
  ]);
});

describe("container `parse`", () => {
  it("parses an external element into a container, children intact", () => {
    const blocks = editor.tryParseHTMLToBlocks(
      '<div class="card" data-tone="warning"><p>First</p><h1>Second</h1></div>',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("card");
    expect(blocks[0].props.tone).toBe("warning");
    // No `getContent` is supplied, so ProseMirror parses the children with the
    // normal block rules and `findWrapping` adds the `blockContainer`s.
    expect(blocks[0].children.map((child: any) => child.type)).toEqual([
      "paragraph",
      "heading",
    ]);
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "First", styles: {} },
    ]);
  });

  it("places inline nodes returned by `parseContent` into a child block", () => {
    const blocks = editor.tryParseHTMLToBlocks(
      "<blockquote>Quoted text</blockquote>",
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("quote");
    expect(blocks[0].children.map((child: any) => child.type)).toEqual([
      "paragraph",
    ]);
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "Quoted text", styles: {} },
    ]);
  });
});

describe("container `runsBefore`", () => {
  const ambiguous = (type: string) =>
    createBlockSpec(
      {
        type,
        propSchema: {},
        content: "none",
        children: { allow: "blocks" },
      } as any,
      {
        render: renderDiv,
        parse: (el: HTMLElement) =>
          el.classList.contains("shared") ? {} : undefined,
      },
    );

  const makeEditor = (betaRunsBefore?: string[]) => {
    const alpha = ambiguous("alpha")();
    const beta = ambiguous("beta")();
    if (betaRunsBefore) {
      (beta.implementation as any).runsBefore = betaRunsBefore;
    }

    return BlockNoteEditor.create({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { ...defaultBlockSpecs, alpha, beta } as any,
      }),
    }) as BlockNoteEditor<any, any, any>;
  };

  it("orders a container's parse rules before another container's", () => {
    // Declaration order wins by default; `runsBefore` overrides it.
    for (const [runsBefore, winner] of [
      [undefined, "alpha"],
      [["alpha"], "beta"],
    ] as const) {
      const other = makeEditor(runsBefore ? [...runsBefore] : undefined);
      try {
        expect(
          other.tryParseHTMLToBlocks('<div class="shared"><p>x</p></div>')[0]
            .type,
        ).toBe(winner);
      } finally {
        other._tiptapEditor.destroy();
      }
    }
  });
});
