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
    children: { allow: "any" },
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
    children: { allow: "any" },
  },
  {
    render: renderDiv,
    parse: (el) => (el.tagName === "BLOCKQUOTE" ? {} : undefined),
    // Returns inline nodes, the natural thing to build from an element, and
    // relies on `toContainerChildren` to place them.
    parseContent: ({ el, schema }) =>
      Fragment.from(schema.text(el.textContent?.trim() || "empty")),
  },
)();

// A pure container whose render puts non-content UI text next to the children
// host, the table-with-controls shape. That text must never round-trip into
// document content.
const Widget = createBlockSpec(
  {
    type: "widget" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any" },
  },
  {
    render: () => {
      const dom = document.createElement("div");
      const contentDOM = document.createElement("div");
      const controls = document.createElement("div");
      controls.contentEditable = "false";
      controls.textContent = "UI LABEL";
      dom.append(contentDOM, controls);
      return { dom, contentDOM };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    card: Card,
    quote: Quote,
    widget: Widget,
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

describe("container HTML round-trip", () => {
  // Regression: internal HTML renders the block's full DOM, so a render with
  // non-content UI text next to the children host (control buttons, labels)
  // used to leak that text into the document as extra blocks on re-parse.
  // The serializer marks the children host with `data-children-of` and the
  // round-trip rule scopes itself to it.
  it("excludes a render's non-content UI text from a pure container's round-trip", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "w-0",
        type: "widget" as const,
        children: [
          { id: "w-p-0", type: "paragraph" as const, content: "Inside" },
        ],
      },
    ]);

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-children-of="widget"');
    expect(html).toContain("UI LABEL");

    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("widget");
    expect(
      (parsed[0] as any).children.map((child: any) => [
        child.type,
        child.content?.[0]?.text,
      ]),
    ).toEqual([["paragraph", "Inside"]]);
    expect(JSON.stringify(parsed)).not.toContain("UI LABEL");
  });

  // Same regression on the external HTML path, which is what lands on the
  // clipboard — so it's the one a paste actually goes through. The marker used
  // to be emitted only by the internal serializer.
  it("excludes a render's non-content UI text from external HTML too", () => {
    editor.replaceBlocks(editor.document, [
      {
        id: "w-1",
        type: "widget" as const,
        children: [
          { id: "w-p-1", type: "paragraph" as const, content: "Inside" },
        ],
      },
    ]);

    const html = editor.blocksToHTMLLossy(editor.document);
    expect(html).toContain('data-children-of="widget"');
    expect(html).toContain("UI LABEL");

    const parsed = editor.tryParseHTMLToBlocks(html);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("widget");
    expect(
      (parsed[0] as any).children.map((child: any) => [
        child.type,
        child.content?.[0]?.text,
      ]),
    ).toEqual([["paragraph", "Inside"]]);
    expect(JSON.stringify(parsed)).not.toContain("UI LABEL");
  });
});

describe("container fragment root", () => {
  // A container whose render returns a `DocumentFragment` wrapping a single
  // element and no `rootDOM`, the shape a React render produces. The fragment
  // itself can't hold attributes, so `containerRootDOM` must resolve to the
  // wrapped element for the round-trip markers (`data-node-type`, prop
  // `data-*`) to survive serialization.
  const Panel = createBlockSpec(
    {
      type: "panel" as const,
      propSchema: { tone: { default: "neutral" } },
      content: "none",
      children: { allow: "any" },
    },
    {
      render: () => {
        const root = document.createElement("div");
        const fragment = document.createDocumentFragment();
        fragment.append(root);
        return { dom: fragment, contentDOM: root };
      },
    },
  )();

  const panelBlocks = [
    {
      id: "pn-0",
      type: "panel" as const,
      props: { tone: "warning" },
      children: [{ id: "pn-p-0", type: "paragraph" as const, content: "Body" }],
    },
  ];

  const expectRoundTripped = (parsed: any[]) => {
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("panel");
    expect(parsed[0].props.tone).toBe("warning");
    expect(
      parsed[0].children.map((child: any) => [
        child.type,
        child.content?.[0]?.text,
      ]),
    ).toEqual([["paragraph", "Body"]]);
  };

  // Headless: a fragment `dom` is only valid for serialization renders, not
  // as a mounted node view's root, which ProseMirror requires to be an
  // element.
  const makeEditor = () =>
    BlockNoteEditor.create({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { ...defaultBlockSpecs, panel: Panel } as const,
      }),
    }) as BlockNoteEditor<any, any, any>;

  it("round-trips a fragment-rendered container through full HTML", () => {
    const other = makeEditor();
    try {
      other.replaceBlocks(other.document, panelBlocks);

      const html = other.blocksToFullHTML(other.document);
      expect(html).toContain('data-node-type="panel"');
      expect(html).toContain('data-tone="warning"');

      expectRoundTripped(other.tryParseHTMLToBlocks(html));
    } finally {
      other._tiptapEditor.destroy();
    }
  });

  it("round-trips a fragment-rendered container through external HTML", () => {
    const other = makeEditor();
    try {
      other.replaceBlocks(other.document, panelBlocks);

      const html = other.blocksToHTMLLossy(other.document);
      expect(html).toContain('data-node-type="panel"');
      expect(html).toContain('data-tone="warning"');

      expectRoundTripped(other.tryParseHTMLToBlocks(html));
    } finally {
      other._tiptapEditor.destroy();
    }
  });
});

describe("container `runsBefore`", () => {
  const ambiguous = (type: string) =>
    createBlockSpec(
      {
        type,
        propSchema: {},
        content: "none",
        children: { allow: "any" },
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

  it("rejects a `runsBefore` naming a regular block", () => {
    // Container nodes all register below `blockContainer`, so this ordering is
    // not something the schema could ever produce.
    expect(() => makeEditor(["paragraph"])).toThrow(
      /can never be ordered before a regular block/,
    );
  });
});
