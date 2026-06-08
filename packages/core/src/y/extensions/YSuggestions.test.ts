import { describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { Fragment } from "prosemirror-model";
import { Decoration } from "prosemirror-view";
import type { Diff } from "@y/prosemirror";
import {
  defaultMapDiffToDecorations,
  findWrappingPath,
  wrapFragmentInDoc,
} from "./YSuggestions.js";

/**
 * @vitest-environment jsdom
 */

describe("findWrappingPath", () => {
  it("finds path [doc, blockGroup, blockContainer] for a checkListItem node", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("ds")],
    );

    const path = findWrappingPath(schema, checkListItem);

    expect(path).not.toBeNull();
    expect(path!.map((t) => t.name)).toEqual([
      "doc",
      "blockGroup",
      "blockContainer",
    ]);
  });

  it("finds path [doc, blockGroup, blockContainer] for a paragraph node", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text("hello"),
    ]);

    const path = findWrappingPath(schema, paragraph);

    expect(path).not.toBeNull();
    expect(path!.map((t) => t.name)).toEqual([
      "doc",
      "blockGroup",
      "blockContainer",
    ]);
  });
});

describe("wrapFragmentInDoc", () => {
  it("wraps a fragment with a single checkListItem", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("ds")],
    );
    const fragment = Fragment.from(checkListItem);

    const result = wrapFragmentInDoc(fragment, schema);

    expect(result).not.toBeNull();
    expect(result!.type.name).toBe("doc");
    // Walk down to verify the content
    const blockGroup = result!.firstChild!;
    expect(blockGroup.type.name).toBe("blockGroup");
    expect(blockGroup.childCount).toBe(1);
    const bc = blockGroup.firstChild!;
    expect(bc.type.name).toBe("blockContainer");
    expect(bc.firstChild!.type.name).toBe("checkListItem");
    expect(bc.firstChild!.textContent).toBe("ds");
  });

  it("wraps a fragment with multiple block content nodes", () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;

    const item1 = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("first")],
    );
    const item2 = schema.nodes.paragraph.create(null, [
      schema.text("second"),
    ]);
    const fragment = Fragment.from([item1, item2]);

    const result = wrapFragmentInDoc(fragment, schema);

    expect(result).not.toBeNull();
    expect(result!.type.name).toBe("doc");
    const blockGroup = result!.firstChild!;
    expect(blockGroup.type.name).toBe("blockGroup");
    // Should have two blockContainers
    expect(blockGroup.childCount).toBe(2);
    expect(blockGroup.child(0).firstChild!.type.name).toBe("checkListItem");
    expect(blockGroup.child(0).firstChild!.textContent).toBe("first");
    expect(blockGroup.child(1).firstChild!.type.name).toBe("paragraph");
    expect(blockGroup.child(1).firstChild!.textContent).toBe("second");
  });

  it("returns null for an empty fragment", () => {
    const editor = BlockNoteEditor.create();
    const result = wrapFragmentInDoc(Fragment.empty, editor.pmSchema);
    expect(result).toBeNull();
  });

});

describe("defaultMapDiffToDecorations", () => {
  /**
   * Helper: create a BlockNoteEditor and build its initial ProseMirror doc.
   * Returns the editor, its schema, and the doc.
   */
  const setup = () => {
    const editor = BlockNoteEditor.create();
    const schema = editor.pmSchema;
    const doc = editor.prosemirrorView!.state.doc;
    return { editor, schema, doc };
  };

  const baseAttribution = {
    type: "added" as const,
    authorIds: ["user-1"],
    timestamp: Date.now(),
  };

  // ── inline-insert ───────────────────────────────────────────────────
  it("returns an inline decoration for inline-insert", () => {
    const { editor, schema, doc } = setup();

    const diff: Diff = {
      type: "inline-insert",
      from: 3,
      to: 5,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    // Should be a single Decoration (not array)
    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(3);
    expect(deco.to).toBe(5);
    expect((deco as any).type.attrs.class).toContain("pm-suggest--inline-insert");
  });

  // ── inline-update ──────────────────────────────────────────────────
  it("returns an inline decoration for inline-update", () => {
    const { editor, schema, doc } = setup();

    const diff: Diff = {
      type: "inline-update",
      from: 3,
      to: 5,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(3);
    expect(deco.to).toBe(5);
    expect((deco as any).type.attrs.class).toContain("pm-suggest--inline-update");
  });

  // ── block-update ───────────────────────────────────────────────────
  it("returns a node decoration for block-update", () => {
    const { editor, schema, doc } = setup();

    // Target the first blockContainer in the doc
    let from = -1;
    let to = -1;
    doc.descendants((node, pos) => {
      if (from === -1 && node.type.name === "blockContainer") {
        from = pos;
        to = pos + node.nodeSize;
        return false;
      }
      return undefined;
    });

    const diff: Diff = {
      type: "block-update",
      from,
      to,
      attribution: baseAttribution,
      attributes: { level: "2" },
      previousAttributes: { level: "1" },
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(from);
    expect(deco.to).toBe(to);
    expect((deco as any).type.attrs.class).toContain("pm-suggest--block-update");
    // Title should contain the attribute change summary
    expect((deco as any).type.attrs.title).toContain("level: 1 → 2");
  });

  // ── block-insert (single node) ────────────────────────────────────
  it("returns a node decoration for block-insert spanning a single node", () => {
    const { editor, schema, doc } = setup();

    let from = -1;
    let to = -1;
    doc.descendants((node, pos) => {
      if (from === -1 && node.type.name === "blockContainer") {
        from = pos;
        to = pos + node.nodeSize;
        return false;
      }
      return undefined;
    });

    const diff: Diff = {
      type: "block-insert",
      from,
      to,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(from);
    expect(deco.to).toBe(to);
    expect((deco as any).type.attrs.class).toContain("pm-suggest--block-insert");
  });

  // ── inline-delete with plain text ─────────────────────────────────
  it("returns a widget decoration for inline-delete with text content", () => {
    const { editor, schema, doc } = setup();

    const fragment = Fragment.from(schema.text("deleted text"));

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(3);
    // Widget decorations have from === to
    expect(deco.to).toBe(3);
    // Invoke the widget toDOM to get the rendered element
    const el = (deco as any).type.toDOM() as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(el.className).toContain("pm-suggest--delete");
    expect(el.getAttribute("data-diff-type")).toBe("inline-delete");
    expect(el.textContent).toContain("deleted text");
    expect(el.contentEditable).toBe("false");
  });

  // ── inline-delete with bold text ──────────────────────────────────
  it("preserves marks (bold) in inline-delete rendering", () => {
    const { editor, schema, doc } = setup();

    const boldMark = schema.marks.bold.create();
    const fragment = Fragment.from(
      schema.text("bold deleted", [boldMark]),
    );

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("bold deleted");
    // The rendered HTML should contain a <strong> element for the bold mark
    expect(el.querySelector("strong")).not.toBeNull();
  });

  // ── inline-delete with empty fragment ─────────────────────────────
  it("returns a widget for inline-delete with empty content", () => {
    const { editor, schema, doc } = setup();

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: Fragment.empty,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const el = (result as any).type.toDOM() as HTMLElement;
    expect(el.tagName).toBe("SPAN");
    expect(el.textContent).toBe("");
  });

  // ── block-delete with a paragraph ─────────────────────────────────
  it("returns a widget decoration for block-delete with paragraph content", () => {
    const { editor, schema, doc } = setup();

    const paragraph = schema.nodes.paragraph.create(null, [
      schema.text("removed block"),
    ]);
    const fragment = Fragment.from(paragraph);

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const deco = result as Decoration;
    expect(deco.from).toBe(0);
    const el = (deco as any).type.toDOM() as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("pm-suggest--delete");
    expect(el.getAttribute("data-diff-type")).toBe("block-delete");
    expect(el.textContent).toContain("removed block");
    expect(el.contentEditable).toBe("false");
  });

  // ── block-delete with empty fragment ──────────────────────────────
  it("returns a widget for block-delete with empty content", () => {
    const { editor, schema, doc } = setup();

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: Fragment.empty,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });

    expect(result).not.toBeNull();
    const el = (result as any).type.toDOM() as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.textContent).toBe("");
  });

  // ── block-delete with heading ─────────────────────────────────────
  it("renders block-delete with a heading node", () => {
    const { editor, schema, doc } = setup();

    const heading = schema.nodes.heading.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        level: 2,
      },
      [schema.text("Deleted Heading")],
    );
    const fragment = Fragment.from(heading);

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("Deleted Heading");
    expect(el.getAttribute("data-diff-type")).toBe("block-delete");
  });

  // ── block-delete with checkListItem (should include checkbox) ─────
  it("renders block-delete checkListItem with checkbox", () => {
    const { editor, schema, doc } = setup();

    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: false,
      },
      [schema.text("task item")],
    );
    const fragment = Fragment.from(checkListItem);

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("task item");
    expect(el.querySelector("input[type='checkbox']")).not.toBeNull();
  });

  // ── block-delete with a blockContainer fragment ────────────────────
  it("renders block-delete when fragment is a blockContainer", () => {
    const { editor, schema, doc } = setup();

    // In real Yjs diffs, the fragment may be a blockContainer node
    const checkListItem = schema.nodes.checkListItem.create(
      {
        backgroundColor: "default",
        textColor: "default",
        textAlignment: "left",
        checked: true,
      },
      [schema.text("a task")],
    );
    const blockContainer = schema.nodes.blockContainer.createAndFill(
      { id: "test-id" },
      checkListItem,
    )!;
    const fragment = Fragment.from(blockContainer);

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("a task");
    expect(el.querySelector("input[type='checkbox']")).not.toBeNull();
  });



  // ── block-delete with table cells (column delete) ─────────────────
  it("renders block-delete with table cells (simulating column delete)", () => {
    const { editor, schema, doc } = setup();

    // A column delete in a table produces tableCell fragments
    const cell1 = schema.nodes.tableCell.create(null, [
      schema.nodes.tableParagraph.create(null, [schema.text("cell A")]),
    ]);
    const cell2 = schema.nodes.tableCell.create(null, [
      schema.nodes.tableParagraph.create(null, [schema.text("cell B")]),
    ]);
    const fragment = Fragment.from([cell1, cell2]);

    const diff: Diff = {
      type: "block-delete",
      from: 0,
      to: 0,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    console.log("Table column delete HTML:", el.outerHTML);
    expect(el.tagName).toBe("DIV");
    expect(el.textContent).toContain("cell A");
    expect(el.textContent).toContain("cell B");
  });

  // ── author color and title propagation ────────────────────────────
  it("sets author color and hover title on inline-delete widgets", () => {
    const { editor, schema, doc } = setup();

    const fragment = Fragment.from(schema.text("colored"));

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: fragment,
      attribution: {
        type: "removed",
        authorIds: ["alice", "bob"],
        timestamp: 1700000000000,
      },
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({
      diff,
      doc,
      schema,
      index: 0,
      color: "#ff0000",
    });

    const el = (result as any).type.toDOM() as HTMLElement;
    expect(el.getAttribute("data-diff-user-id")).toBe("alice,bob");
    expect(el.style.getPropertyValue("--author-color")).toBe("#ff0000");
    expect(el.getAttribute("title")).toContain("alice");
    expect(el.getAttribute("title")).toContain("bob");
  });

  // ── inline-delete with link mark ──────────────────────────────────
  it("preserves link marks in inline-delete rendering", () => {
    const { editor, schema, doc } = setup();

    const linkMark = schema.marks.link.create({
      href: "https://example.com",
    });
    const fragment = Fragment.from(
      schema.text("click here", [linkMark]),
    );

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("click here");
    // Should contain an anchor tag
    expect(el.querySelector("a")).not.toBeNull();
    expect(el.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com",
    );
  });

  // ── inline-delete with multiple marks ─────────────────────────────
  it("preserves multiple marks (bold + italic) in inline-delete", () => {
    const { editor, schema, doc } = setup();

    const marks = [
      schema.marks.bold.create(),
      schema.marks.italic.create(),
    ];
    const fragment = Fragment.from(schema.text("styled", marks));

    const diff: Diff = {
      type: "inline-delete",
      from: 3,
      to: 3,
      content: fragment,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    const el = (result as any).type.toDOM() as HTMLElement;

    expect(el.textContent).toContain("styled");
    expect(el.querySelector("strong")).not.toBeNull();
    expect(el.querySelector("em")).not.toBeNull();
  });

  // ── unknown diff type returns null ────────────────────────────────
  it("returns null for an unknown diff type", () => {
    const { editor, schema, doc } = setup();

    const diff: Diff = {
      type: "unknown-type" as any,
      from: 0,
      to: 0,
      attribution: baseAttribution,
    };

    const mapper = defaultMapDiffToDecorations(editor);
    const result = mapper({ diff, doc, schema, index: 0 });
    expect(result).toBeNull();
  });
});
