import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createBlockSpecFromTiptapNode } from "../../blocks/internal.js";
import { combinatorContentType } from "./factory.js";
import { c } from "./types.js";

/**
 * End-to-end smoke test for the combinator content-schema pipeline:
 *
 * 1. Build a custom block whose content is `record({ title, body })` of inline
 *    regions, compiled through `combinatorContentType`.
 * 2. Mount an editor with this block in its schema.
 * 3. Insert a block instance with title and body content as JSON.
 * 4. Read the document back and verify the JSON shape matches the schema.
 *
 * This is the proof point that the design works end-to-end at the data layer:
 * a POJO content schema → ProseMirror nodes → JSON, round-tripped through a
 * real editor.
 */
describe("combinatorContentType: alert (record of inlines)", () => {
  // Build a content schema and content type for a multi-slot alert block.
  const alertSchema = c.record({
    title: c.inline(),
    body: c.inline(),
  });
  const alertContentType = combinatorContentType("demoAlert", alertSchema);

  const demoAlertBlockSpec = createBlockSpecFromTiptapNode(
    {
      node: alertContentType.containerNode,
      type: "demoAlert",
      content: alertContentType,
    },
    {},
  );

  let editor: BlockNoteEditor<any, any, any>;
  let div: HTMLElement;

  beforeEach(() => {
    div = document.createElement("div");
    editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          demoAlert: demoAlertBlockSpec,
        },
      }),
    });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  it("registers the block's container and inner Tiptap nodes", () => {
    const pmSchema = editor.pmSchema;
    expect(pmSchema.nodes.demoAlert).toBeDefined();
    expect(pmSchema.nodes.demoAlert__title).toBeDefined();
    expect(pmSchema.nodes.demoAlert__body).toBeDefined();

    expect(pmSchema.nodes.demoAlert.spec.content).toBe(
      "demoAlert__title demoAlert__body",
    );
    expect(pmSchema.nodes.demoAlert__title.spec.content).toBe("inline*");
    expect(pmSchema.nodes.demoAlert__body.spec.content).toBe("inline*");
  });

  it("round-trips JSON content through the editor", () => {
    const inputContent = {
      title: [{ type: "text", text: "Heads up", styles: { bold: true } }],
      body: [{ type: "text", text: "This is the body.", styles: {} }],
    };

    editor.replaceBlocks(editor.document, [
      {
        type: "demoAlert" as const,
        content: inputContent as any,
      } as any,
    ]);

    const block = editor.document[0] as any;
    expect(block.type).toBe("demoAlert");
    expect(block.content).toMatchObject({
      title: [{ type: "text", text: "Heads up", styles: { bold: true } }],
      body: [{ type: "text", text: "This is the body.", styles: {} }],
    });
  });

  it("accepts structured content via `initialContent` (no editor warm-up)", () => {
    // Regression: `BlockNoteEditor.create()` converts `initialContent` to PM
    // nodes through `blockToNode` -> `blockContentToNodes` before its back-
    // pointer onto `pmSchema.cached.blockNoteEditor` is wired up. Earlier
    // tests round-tripped via `editor.replaceBlocks` *after* creation, which
    // missed this path. With the fix, structured content in `initialContent`
    // round-trips just like content inserted later.
    const localDiv = document.createElement("div");
    const localEditor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          demoAlert: demoAlertBlockSpec,
        },
      }),
      initialContent: [
        {
          type: "demoAlert" as const,
          content: {
            title: [{ type: "text", text: "Initial title", styles: {} }],
            body: [{ type: "text", text: "Initial body", styles: {} }],
          } as any,
        } as any,
      ],
    });
    localEditor.mount(localDiv);
    const block = localEditor.document[0] as any;
    expect(block.type).toBe("demoAlert");
    expect(block.content).toMatchObject({
      title: [{ type: "text", text: "Initial title", styles: {} }],
      body: [{ type: "text", text: "Initial body", styles: {} }],
    });
    localEditor._tiptapEditor.destroy();
  });

  it("preserves content shape when retrieved after mutation", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoAlert" as const,
        content: {
          title: [{ type: "text", text: "First title", styles: {} }],
          body: [{ type: "text", text: "First body", styles: {} }],
        } as any,
      } as any,
    ]);

    // Edit the body via updateBlock
    const original = editor.document[0] as any;
    editor.updateBlock(original, {
      content: {
        title: [{ type: "text", text: "Edited title", styles: {} }],
        body: [
          { type: "text", text: "Edited body, ", styles: {} },
          {
            type: "text",
            text: "with bold",
            styles: { bold: true },
          },
        ],
      } as any,
    });

    const updated = editor.document[0] as any;
    expect(updated.content.title).toEqual([
      { type: "text", text: "Edited title", styles: {} },
    ]);
    expect(updated.content.body).toEqual([
      { type: "text", text: "Edited body, ", styles: {} },
      { type: "text", text: "with bold", styles: { bold: true } },
    ]);
  });
});

/**
 * End-to-end smoke tests for the `list` combinator: a variable-arity sequence
 * of identically-shaped items. The motivating shape is a tab group, where
 * each tab has a title and a body, and tabs can be added, removed, and
 * reordered at runtime.
 */
describe("combinatorContentType: tabs (list of records)", () => {
  const tabsSchema = c.list(
    c.record({
      title: c.inline(),
      body: c.inline(),
    }),
  );
  const tabsContentType = combinatorContentType("demoTabs", tabsSchema);

  const demoTabsBlockSpec = createBlockSpecFromTiptapNode(
    {
      node: tabsContentType.containerNode,
      type: "demoTabs",
      content: tabsContentType,
    },
    {},
  );

  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    const div = document.createElement("div");
    editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          demoTabs: demoTabsBlockSpec,
        },
      }),
    });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  it("registers the container and the per-item Tiptap nodes", () => {
    const pmSchema = editor.pmSchema;
    expect(pmSchema.nodes.demoTabs).toBeDefined();
    // The list compiles to a single shared item node, plus the item's children.
    expect(pmSchema.nodes.demoTabs__item).toBeDefined();
    expect(pmSchema.nodes.demoTabs__item__title).toBeDefined();
    expect(pmSchema.nodes.demoTabs__item__body).toBeDefined();

    // The list's content expression references the item node `*`-many times.
    expect(pmSchema.nodes.demoTabs.spec.content).toBe("demoTabs__item*");
    // The item itself is a record of title and body.
    expect(pmSchema.nodes.demoTabs__item.spec.content).toBe(
      "demoTabs__item__title demoTabs__item__body",
    );
  });

  it("round-trips a list of records through the editor", () => {
    const inputContent = [
      {
        title: [{ type: "text", text: "Overview", styles: {} }],
        body: [{ type: "text", text: "Welcome to the overview.", styles: {} }],
      },
      {
        title: [{ type: "text", text: "Details", styles: { bold: true } }],
        body: [{ type: "text", text: "Lots of details here.", styles: {} }],
      },
      {
        title: [{ type: "text", text: "FAQ", styles: {} }],
        body: [{ type: "text", text: "Common questions answered.", styles: {} }],
      },
    ];

    editor.replaceBlocks(editor.document, [
      {
        type: "demoTabs" as const,
        content: inputContent as any,
      } as any,
    ]);

    const block = editor.document[0] as any;
    expect(block.type).toBe("demoTabs");
    expect(Array.isArray(block.content)).toBe(true);
    expect(block.content).toHaveLength(3);
    expect(block.content[0].title).toEqual([
      { type: "text", text: "Overview", styles: {} },
    ]);
    expect(block.content[1].title).toEqual([
      { type: "text", text: "Details", styles: { bold: true } },
    ]);
    expect(block.content[2].body).toEqual([
      { type: "text", text: "Common questions answered.", styles: {} },
    ]);
  });

  it("supports adding, removing, and reordering items via updateBlock", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoTabs" as const,
        content: [
          {
            title: [{ type: "text", text: "A", styles: {} }],
            body: [{ type: "text", text: "Body A", styles: {} }],
          },
          {
            title: [{ type: "text", text: "B", styles: {} }],
            body: [{ type: "text", text: "Body B", styles: {} }],
          },
        ] as any,
      } as any,
    ]);

    // Reorder + add a third tab via a single update.
    const original = editor.document[0] as any;
    editor.updateBlock(original, {
      content: [
        {
          title: [{ type: "text", text: "B", styles: {} }],
          body: [{ type: "text", text: "Body B", styles: {} }],
        },
        {
          title: [{ type: "text", text: "A", styles: {} }],
          body: [{ type: "text", text: "Body A", styles: {} }],
        },
        {
          title: [{ type: "text", text: "C", styles: {} }],
          body: [{ type: "text", text: "Body C", styles: {} }],
        },
      ] as any,
    });

    const updated = editor.document[0] as any;
    expect(updated.content).toHaveLength(3);
    expect(updated.content[0].title[0].text).toBe("B");
    expect(updated.content[1].title[0].text).toBe("A");
    expect(updated.content[2].title[0].text).toBe("C");
  });

  it("accepts an empty list when min is unspecified (defaults to 0)", () => {
    editor.replaceBlocks(editor.document, [
      { type: "demoTabs" as const, content: [] as any } as any,
    ]);
    const block = editor.document[0] as any;
    expect(block.content).toEqual([]);
  });
});

/**
 * End-to-end smoke tests for the `blocks` combinator: a region whose content
 * is editor blocks (paragraphs, headings, custom blocks…), not inline text.
 * The motivating shapes are tab bodies, accordion panels, and callouts —
 * any composite block whose interior is itself a stretch of editor blocks.
 */
describe("combinatorContentType: callout (blocks region)", () => {
  // A simple callout block: its content is just a sequence of editor blocks.
  const calloutSchema = c.blocks();
  const calloutContentType = combinatorContentType("demoCallout", calloutSchema);
  const demoCalloutBlockSpec = createBlockSpecFromTiptapNode(
    {
      node: calloutContentType.containerNode,
      type: "demoCallout",
      content: calloutContentType,
    },
    {},
  );

  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    const div = document.createElement("div");
    editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          demoCallout: demoCalloutBlockSpec,
        },
      }),
    });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  it("uses blockContainer as the slot's content type", () => {
    const pmSchema = editor.pmSchema;
    expect(pmSchema.nodes.demoCallout).toBeDefined();
    // The blocks combinator references the editor's existing blockContainer
    // schema; no new per-item node is generated.
    expect(pmSchema.nodes.demoCallout.spec.content).toBe("blockContainer*");
  });

  it("round-trips an array of full Block JSON through the editor", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoCallout" as const,
        content: [
          {
            type: "heading",
            props: { level: 2 },
            content: [{ type: "text", text: "Heading inside callout", styles: {} }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Body paragraph with ", styles: {} },
              { type: "text", text: "bold", styles: { bold: true } },
              { type: "text", text: " text.", styles: {} },
            ],
          },
        ] as any,
      } as any,
    ]);

    const block = editor.document[0] as any;
    expect(block.type).toBe("demoCallout");
    expect(Array.isArray(block.content)).toBe(true);
    expect(block.content).toHaveLength(2);

    const inner1 = block.content[0];
    expect(inner1.type).toBe("heading");
    expect(inner1.props.level).toBe(2);
    expect(inner1.content[0].text).toBe("Heading inside callout");

    const inner2 = block.content[1];
    expect(inner2.type).toBe("paragraph");
    expect(inner2.content).toHaveLength(3);
    expect(inner2.content[1].styles.bold).toBe(true);
  });

  it("preserves nested-block content through updateBlock", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoCallout" as const,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First", styles: {} }],
          },
        ] as any,
      } as any,
    ]);

    const original = editor.document[0] as any;
    editor.updateBlock(original, {
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Edited", styles: {} }],
        },
        {
          type: "bulletListItem",
          content: [{ type: "text", text: "New bullet", styles: {} }],
        },
      ] as any,
    });

    const updated = editor.document[0] as any;
    expect(updated.content).toHaveLength(2);
    expect(updated.content[0].type).toBe("paragraph");
    expect(updated.content[0].content[0].text).toBe("Edited");
    expect(updated.content[1].type).toBe("bulletListItem");
    expect(updated.content[1].content[0].text).toBe("New bullet");
  });
});

/**
 * The combinator stack `c.list(c.props(_, c.blocks()))` is the motivating
 * shape for a tab group: an array of items, each carrying its own `label`
 * prop plus a body of editor blocks. This test exercises all three layers
 * working together end-to-end (variable-arity items, per-item attrs,
 * full-Block contents).
 */
describe("combinatorContentType: tabs (list of props-wrapped block regions)", () => {
  const tabsSchema = c.list(
    c.props(
      { label: { default: "Tab" } },
      c.blocks(),
    ),
  );
  const tabsContentType = combinatorContentType("demoTabsRich", tabsSchema);
  const demoTabsRichBlockSpec = createBlockSpecFromTiptapNode(
    {
      node: tabsContentType.containerNode,
      type: "demoTabsRich",
      content: tabsContentType,
    },
    {},
  );

  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    const div = document.createElement("div");
    editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          demoTabsRich: demoTabsRichBlockSpec,
        },
      }),
    });
    editor.mount(div);
  });

  afterEach(() => {
    editor._tiptapEditor.destroy();
  });

  it("compiles with `props` collapsing into the item node's attrs", () => {
    const pmSchema = editor.pmSchema;
    expect(pmSchema.nodes.demoTabsRich).toBeDefined();
    expect(pmSchema.nodes.demoTabsRich__item).toBeDefined();
    // c.props wrapping c.blocks doesn't introduce a new PM node — the props
    // become attrs on the item node, and the item's content is blockContainer*.
    expect(pmSchema.nodes.demoTabsRich.spec.content).toBe("demoTabsRich__item*");
    expect(pmSchema.nodes.demoTabsRich__item.spec.content).toBe(
      "blockContainer*",
    );
    expect(pmSchema.nodes.demoTabsRich__item.spec.attrs).toHaveProperty("label");
  });

  it("round-trips the full {props, content} item shape with editor blocks", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoTabsRich" as const,
        content: [
          {
            props: { label: "Overview" },
            content: [
              {
                type: "heading",
                props: { level: 2 },
                content: [{ type: "text", text: "Welcome", styles: {} }],
              },
              {
                type: "paragraph",
                content: [{ type: "text", text: "Intro text.", styles: {} }],
              },
            ],
          },
          {
            props: { label: "Details" },
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Body of ", styles: {} },
                  { type: "text", text: "details", styles: { italic: true } },
                  { type: "text", text: " tab.", styles: {} },
                ],
              },
            ],
          },
        ] as any,
      } as any,
    ]);

    const block = editor.document[0] as any;
    expect(block.type).toBe("demoTabsRich");
    expect(block.content).toHaveLength(2);

    expect(block.content[0].props.label).toBe("Overview");
    expect(block.content[0].content).toHaveLength(2);
    expect(block.content[0].content[0].type).toBe("heading");
    expect(block.content[0].content[0].props.level).toBe(2);

    expect(block.content[1].props.label).toBe("Details");
    expect(block.content[1].content[0].content[1].styles.italic).toBe(true);
  });

  it("getTextCursorPosition walks past intermediate combinator slot nodes to find the parent bnBlock", () => {
    // Regression test: when the cursor is inside an inner block (paragraph)
    // that lives inside a `tabs__item > tabs > blockContainer` chain,
    // `getTextCursorPosition` used to walk up only one level looking for a
    // bnBlock — and failed for combinator slots that introduce more than one
    // intermediate node. The walk-up must keep going until it finds one.
    editor.replaceBlocks(editor.document, [
      {
        type: "demoTabsRich" as const,
        content: [
          {
            props: { label: "Only" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Inside body", styles: {} }],
              },
            ],
          },
        ] as any,
      } as any,
    ]);

    // Place the cursor at the start of the inner paragraph by id.
    const tabsBlock = editor.document[0] as any;
    const innerParagraph = tabsBlock.content[0].content[0];
    editor.setTextCursorPosition(innerParagraph.id, "start");

    // Should not throw — the parent walk has to traverse `tabs__item` → `tabs`
    // before reaching the outer blockContainer.
    const cursor = editor.getTextCursorPosition();
    expect(cursor.block.id).toBe(innerParagraph.id);
    // The parent block, walking up past the slot wrappers, is the tabs block.
    expect(cursor.parentBlock?.type).toBe("demoTabsRich");
  });

  it("supports per-tab edits via updateBlock without losing other tabs", () => {
    editor.replaceBlocks(editor.document, [
      {
        type: "demoTabsRich" as const,
        content: [
          {
            props: { label: "A" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Body A", styles: {} }],
              },
            ],
          },
          {
            props: { label: "B" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Body B", styles: {} }],
              },
            ],
          },
        ] as any,
      } as any,
    ]);

    // Add a third tab + rename the first.
    const original = editor.document[0] as any;
    const current = original.content as any[];
    editor.updateBlock(original, {
      content: [
        {
          props: { label: "Renamed A" },
          content: current[0].content,
        },
        current[1],
        {
          props: { label: "C" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Body C", styles: {} }],
            },
          ],
        },
      ] as any,
    });

    const updated = editor.document[0] as any;
    expect(updated.content).toHaveLength(3);
    expect(updated.content[0].props.label).toBe("Renamed A");
    expect(updated.content[0].content[0].content[0].text).toBe("Body A");
    expect(updated.content[1].props.label).toBe("B");
    expect(updated.content[2].props.label).toBe("C");
  });
});
