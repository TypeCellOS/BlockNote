import { Fragment } from "prosemirror-model";
import { AllSelection } from "prosemirror-state";
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
// `api/parsers/html/util/nestedLists.ts`) before ProseMirror's parser ever runs
// — and the clipboard test additionally needs a mounted view for
// `view.serializeForClipboard`. Parsing HTML *is* the capability under test, so
// this whole suite runs against a real browser engine rather than jsdom's.

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
    // Returns inline nodes — the natural thing to build from an element — and
    // relies on `toContainerChildren` to place them.
    parseContent: ({ el, schema }) =>
      Fragment.from(schema.text(el.textContent?.trim() || "empty")),
  },
)();

// A container with its own content, to exercise the two generated nodes
// through the clipboard.
const Toggle = createBlockSpec(
  {
    type: "toggle" as const,
    propSchema: { open: { default: true } },
    content: "inline",
    children: { allow: "any" },
  },
  { render: renderDiv },
)();

// A content-bearing container whose `parseContent` returns a leading run of
// inline nodes followed by a block — the shape that has to split across the
// two generated nodes.
const Section = createBlockSpec(
  {
    type: "section" as const,
    propSchema: {},
    content: "inline",
    children: { allow: "any" },
  },
  {
    render: renderDiv,
    parse: (el) => (el.tagName === "SECTION" ? {} : undefined),
    parseContent: ({ el, schema }) =>
      Fragment.fromArray([
        schema.text(el.getAttribute("data-title") || "untitled"),
        schema.nodes["paragraph"].create(
          null,
          schema.text(el.textContent?.trim() || "empty"),
        ),
      ]),
  },
)();

// A pure container whose render puts non-content UI text next to the children
// host — the table-with-controls shape. That text must never round-trip into
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
    toggle: Toggle,
    section: Section,
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

  it("splits `parseContent` across a content-bearing container's two regions", () => {
    const blocks = editor.tryParseHTMLToBlocks(
      '<section data-title="Title">Body</section>',
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("section");
    // The leading inline run is the block's own content; the block that
    // follows it is a child.
    expect(blocks[0].content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(blocks[0].children.map((child: any) => child.type)).toEqual([
      "paragraph",
    ]);
    expect(blocks[0].children[0].content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
  });
});

describe("container HTML round-trip", () => {
  const toggleBlocks = [
    {
      id: "t-0",
      type: "toggle" as const,
      props: { open: false },
      content: "Title",
      children: [
        { id: "t-p-0", type: "paragraph" as const, content: "Body" },
        { id: "t-p-1", type: "heading" as const, content: "Sub" },
      ],
    },
  ];

  const expectRoundTripped = (parsed: any[]) => {
    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("toggle");
    expect(parsed[0].props.open).toBe(false);
    expect(parsed[0].content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
    expect(
      parsed[0].children.map((child: any) => [
        child.type,
        child.content?.[0]?.text,
      ]),
    ).toEqual([
      ["paragraph", "Body"],
      ["heading", "Sub"],
    ]);
  };

  it("round-trips a content-bearing container through full HTML", () => {
    editor.replaceBlocks(editor.document, toggleBlocks);

    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain('data-node-type="toggle"');

    expectRoundTripped(editor.tryParseHTMLToBlocks(html));
  });

  it("round-trips a content-bearing container through the clipboard", () => {
    editor.replaceBlocks(editor.document, toggleBlocks);

    // What a copy actually puts on the clipboard: ProseMirror's own
    // serialization, which renders the generated content & children nodes.
    const view = editor._tiptapEditor.view;
    view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)));
    const clipboardHTML = view.serializeForClipboard(
      view.state.selection.content(),
    ).dom.innerHTML;

    expect(clipboardHTML).toContain('data-content-type="toggle"');
    expect(clipboardHTML).toContain('data-children-of="toggle"');

    expectRoundTripped(editor.tryParseHTMLToBlocks(clipboardHTML));
  });

  it("round-trips a content-bearing container through external HTML", () => {
    editor.replaceBlocks(editor.document, toggleBlocks);

    const html = editor.blocksToHTMLLossy(editor.document);
    expect(html).toContain('data-node-type="toggle"');

    expectRoundTripped(editor.tryParseHTMLToBlocks(html));
  });

  // Two children, because the one-child case passes either way. External HTML
  // has no marker element for the container's own content, so an empty title
  // leaves the parser reading a block element first — with nothing to satisfy
  // the content node, it can't open the children node and every child used to
  // land *after* the container.
  it("round-trips an empty-titled container's children through external HTML", () => {
    editor.replaceBlocks(editor.document, [
      { ...toggleBlocks[0], content: undefined },
    ]);

    const html = editor.blocksToHTMLLossy(editor.document);
    const parsed = editor.tryParseHTMLToBlocks(html);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].type).toBe("toggle");
    expect(
      (parsed[0] as any).children.map((child: any) => [
        child.type,
        child.content?.[0]?.text,
      ]),
    ).toEqual([
      ["paragraph", "Body"],
      ["heading", "Sub"],
    ]);
  });

  // Regression: internal HTML renders the block's full DOM, so a render with
  // non-content UI text (control buttons, labels — the container-table shape)
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

  it("leaves the declaration order alone by default", () => {
    const other = makeEditor();
    try {
      expect(
        other.tryParseHTMLToBlocks('<div class="shared"><p>x</p></div>')[0]
          .type,
      ).toBe("alpha");
    } finally {
      other._tiptapEditor.destroy();
    }
  });

  it("orders a container's parse rules before another container's", () => {
    const other = makeEditor(["alpha"]);
    try {
      expect(
        other.tryParseHTMLToBlocks('<div class="shared"><p>x</p></div>')[0]
          .type,
      ).toBe("beta");
    } finally {
      other._tiptapEditor.destroy();
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
