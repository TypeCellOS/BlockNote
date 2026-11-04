import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
} from "@blocknote/core";
import { withMultiColumn } from "@blocknote/xl-multi-column";
import { afterEach, describe, expect, test } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import { expectElement } from "../../utils/editor.js";

// These tests need real NodeViews, frame slots, and HTML parsing. Automated
// accessibility-tree assertions do not replace manual screen-reader testing.
const editors: { _tiptapEditor: { destroy(): void } }[] = [];
const roots: HTMLElement[] = [];

afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
  for (const root of roots.splice(0)) {
    root.remove();
  }
});

function host() {
  const root = document.createElement("div");
  document.body.append(root);
  roots.push(root);
  return root;
}

function mount() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      { id: "a", type: "bulletListItem", content: "Alpha" },
      {
        id: "b",
        type: "bulletListItem",
        content: "Beta",
        children: [
          { id: "p", type: "paragraph", content: "Nested paragraph" },
          { id: "c", type: "checkListItem", content: "Charlie" },
          { id: "d", type: "checkListItem", content: "Delta" },
        ],
      },
      { id: "n1", type: "numberedListItem", content: "One" },
      {
        id: "n2",
        type: "numberedListItem",
        props: { start: 7 },
        content: "Seven",
      },
      { id: "t", type: "toggleListItem", content: "Toggle" },
      { id: "end", type: "paragraph", content: "After" },
    ],
  });
  editors.push(editor);
  const root = host();
  editor.mount(root);
  return { editor, root };
}

function item(root: HTMLElement, id: string) {
  const node = [...root.querySelectorAll<HTMLElement>(".bn-block")].find(
    (element) => element.dataset.id === id,
  );
  if (!node) {
    throw new Error(`Missing block ${id}`);
  }
  return node;
}

function owner(root: HTMLElement, id: string) {
  return item(root, id).closest<HTMLElement>(".bn-block-outer")!;
}

function assertReferences(root: HTMLElement) {
  const ids = [...root.querySelectorAll<HTMLElement>("[role=listitem]")].map(
    (element) => element.id,
  );
  expect(ids.every(Boolean)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  const owned = new Set<string>();
  for (const list of root.querySelectorAll<HTMLElement>("[role=list]")) {
    for (const id of (list.getAttribute("aria-owns") || "")
      .split(" ")
      .filter(Boolean)) {
      expect(owned.has(id)).toBe(false);
      owned.add(id);
      const target = document.getElementById(id);
      expect(target?.getAttribute("role")).toBe("listitem");
      expect(root.contains(target)).toBe(true);
      expect(target?.contains(list)).toBe(false);
    }
  }
}

describe("list accessibility through real core views", () => {
  test("browser accessibility tree exposes each owned item once and in order", async () => {
    const editor = BlockNoteEditor.create({
      // Isolate list ownership from the editor's default root-role policy.
      domAttributes: { editor: { role: "document" } },
      initialContent: [
        { type: "bulletListItem", content: "Alpha" },
        { type: "bulletListItem", content: "Beta" },
      ],
    });
    editors.push(editor);
    const root = host();
    editor.mount(root);
    for (const editable of [true, false]) {
      editor.isEditable = editable;
      await expectElement(root.querySelector('[role="list"]'))
        .toMatchAriaInlineSnapshot(`
        - list:
          - listitem:
            - paragraph: Alpha
          - listitem:
            - paragraph: Beta
      `);
    }
    // Snapshot the entire reading surface, not just the owner: a stale visible
    // sibling would otherwise escape a subtree-only assertion.
    await expectElement(editor.prosemirrorView.dom).toMatchAriaInlineSnapshot(`
      - document:
        - list:
          - listitem:
            - paragraph: Alpha
          - listitem:
            - paragraph: Beta
    `);
    const exported = host();
    exported.innerHTML = editor.blocksToFullHTML(editor.document);
    await expectElement(exported).toMatchAriaInlineSnapshot(`
      - list:
        - listitem:
          - paragraph: Alpha
        - listitem:
          - paragraph: Beta
    `);
  });

  test("groups exact sibling types, including singleton and nested whole items", async () => {
    const { editor, root } = mount();
    for (const editable of [true, false, true]) {
      editor.isEditable = editable;
      expect(root.querySelectorAll("[role=list]")).toHaveLength(4);
      expect(root.querySelectorAll("[role=listitem]")).toHaveLength(7);
      expect(owner(root, "a").getAttribute("aria-owns")).toBe(
        item(root, "b").id,
      );
      expect(owner(root, "c").getAttribute("aria-owns")).toBe(
        item(root, "d").id,
      );
      expect(owner(root, "n1").getAttribute("aria-owns")).toBe(
        item(root, "n2").id,
      );
      expect(owner(root, "t").hasAttribute("aria-owns")).toBe(false);
      expect(item(root, "b").contains(item(root, "p"))).toBe(true);
      expect(item(root, "b").contains(owner(root, "c"))).toBe(true);
      expect(item(root, "p").hasAttribute("role")).toBe(false);
      assertReferences(root);
    }
    await expectElement(owner(root, "a")).toMatchAriaInlineSnapshot(`
      - list:
        - listitem:
          - paragraph: Alpha
        - listitem:
          - paragraph: Beta
          - paragraph: Nested paragraph
          - list:
            - listitem:
              - checkbox
              - paragraph: Charlie
            - listitem:
              - checkbox
              - paragraph: Delta
    `);
    // Existing indexing counts through a later explicit start; accessibility
    // must neither change that behavior nor split the accessible run.
    expect(item(root, "n2").querySelector('[data-index="2"]')).not.toBeNull();
    expect(item(root, "n2").querySelector('[data-start="7"]')).not.toBeNull();
  });

  test("transfers ownership after prepend, split, removal, undo and redo", () => {
    const { editor, root } = mount();
    editor.insertBlocks(
      [{ id: "first", type: "bulletListItem", content: "First" }],
      "a",
      "before",
    );
    expect(owner(root, "first").getAttribute("role")).toBe("list");
    expect(owner(root, "a").hasAttribute("role")).toBe(false);
    expect(owner(root, "first").getAttribute("aria-owns")).toBe(
      `${item(root, "a").id} ${item(root, "b").id}`,
    );
    editor.updateBlock("a", { type: "paragraph" });
    expect(owner(root, "first").hasAttribute("aria-owns")).toBe(false);
    expect(owner(root, "b").getAttribute("role")).toBe("list");
    editor.removeBlocks(["first"]);
    assertReferences(root);
    editor.undo();
    assertReferences(root);
    editor.redo();
    assertReferences(root);
  });

  test("keyboard split and merge retain the caret inside the accessible run", async () => {
    const { editor, root } = mount();
    editor.setTextCursorPosition("a", "end");
    editor.focus();
    await userEvent.keyboard("{Enter}");
    const inserted = editor.getTextCursorPosition().block;
    expect(inserted.type).toBe("bulletListItem");
    expect(root.querySelectorAll("[role=listitem]")).toHaveLength(8);
    expect(owner(root, "a").getAttribute("aria-owns")).toBe(
      `${item(root, inserted.id).id} ${item(root, "b").id}`,
    );
    await userEvent.keyboard("New");
    editor.setTextCursorPosition(inserted, "start");
    await userEvent.keyboard("{Backspace}");
    expect(editor.getTextCursorPosition().block.id).toBe(inserted.id);
    expect(editor.getTextCursorPosition().block.type).toBe("paragraph");
    expect(owner(root, "a").hasAttribute("aria-owns")).toBe(false);
    expect(owner(root, "b").getAttribute("role")).toBe("list");
    assertReferences(root);
    await userEvent.keyboard("{Backspace}");
    expect(editor.getTextCursorPosition().block.id).toBe("a");
    expect(root.querySelectorAll("[role=listitem]")).toHaveLength(7);
    expect(owner(root, "a").getAttribute("aria-owns")).toBe(item(root, "b").id);
    assertReferences(root);
  });

  test("uses distinct namespaces for simultaneously mounted identical documents", () => {
    const first = mount();
    const second = mount();
    const ids = [
      ...document.querySelectorAll<HTMLElement>("[role=listitem]"),
    ].map((node) => node.id);
    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(ids.length);
    assertReferences(first.root);
    assertReferences(second.root);
  });

  test("preserves consumer block attributes outside list participation", () => {
    const editor = BlockNoteEditor.create({
      domAttributes: {
        block: {
          role: "group",
          id: "consumer-block",
          "aria-label": "Consumer label",
        },
      },
      initialContent: [{ id: "p", type: "paragraph", content: "Paragraph" }],
    });
    editors.push(editor);
    const root = host();
    editor.mount(root);
    function expectConsumerAttributes() {
      expect(item(root, "p").getAttribute("role")).toBe("group");
      expect(item(root, "p").id).toBe("consumer-block");
      expect(item(root, "p").getAttribute("aria-label")).toBe("Consumer label");
    }
    expectConsumerAttributes();
    editor.updateBlock("p", { type: "bulletListItem" });
    expect(item(root, "p").getAttribute("role")).toBe("listitem");
    expect(item(root, "p").id).not.toBe("consumer-block");
    editor.updateBlock("p", { type: "paragraph" });
    expectConsumerAttributes();
  });

  test("typing, marks and selection preserve item nodes and ownership attributes", () => {
    const { editor, root } = mount();
    const before = item(root, "b");
    expect(before.getAttribute("role")).toBe("listitem");
    const beforeID = before.id;
    const beforeOwns = owner(root, "a").getAttribute("aria-owns");
    const observer = new MutationObserver(() => {});
    observer.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["role", "id", "aria-owns"],
    });
    try {
      editor.setTextCursorPosition("b", "end");
      editor.insertInlineContent(" typed");
      editor.addStyles({ bold: true });
      editor.insertInlineContent(" bold");
      expect(item(root, "b")).toBe(before);
      expect(before.id).toBe(beforeID);
      expect(owner(root, "a").getAttribute("aria-owns")).toBe(beforeOwns);
      expect(observer.takeRecords()).toHaveLength(0);
      expect(editor.getTextCursorPosition().block.id).toBe("b");
    } finally {
      observer.disconnect();
    }
  });

  test("custom-only schema gets list semantics without numbered lists", () => {
    const custom = createBlockSpec(
      { type: "custom", propSchema: {}, content: "inline" },
      {
        meta: { listItem: true },
        render() {
          const dom = document.createElement("p");
          return { dom, contentDOM: dom };
        },
      },
    )();
    const editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({ blockSpecs: { custom } }),
      initialContent: [
        { id: "custom-a", type: "custom", content: "Custom A" },
        { id: "custom-b", type: "custom", content: "Custom B" },
      ],
    });
    editors.push(editor);
    const root = host();
    editor.mount(root);
    expect(root.querySelectorAll("[role=list]")).toHaveLength(1);
    expect(root.querySelectorAll("[role=listitem]")).toHaveLength(2);
    assertReferences(root);
  });

  test("layout children form independent runs in live and static HTML", () => {
    const editor = BlockNoteEditor.create({
      schema: withMultiColumn(BlockNoteSchema.create()),
      initialContent: [
        {
          type: "columnList",
          children: [
            {
              type: "column",
              children: [
                { type: "bulletListItem", content: "Left A" },
                { type: "bulletListItem", content: "Left B" },
              ],
            },
            {
              type: "column",
              children: [{ type: "bulletListItem", content: "Right A" }],
            },
          ],
        },
      ],
    });
    editors.push(editor);
    const root = host();
    editor.mount(root);
    expect(root.querySelectorAll("[role=list]")).toHaveLength(2);
    const html = editor.blocksToFullHTML(editor.document);
    const exported = host();
    exported.innerHTML = html;
    expect(exported.querySelectorAll("[role=list]")).toHaveLength(2);
    assertReferences(root);
    assertReferences(exported);
    expect(editor.tryParseHTMLToBlocks(html)).toEqual(editor.document);
  });

  test("static HTML survives real parsing without changing document or external export", () => {
    const { editor, root } = mount();
    const before = editor.document;
    const external = editor.blocksToHTMLLossy(before);
    const exported = host();
    exported.innerHTML = editor.blocksToFullHTML(before);
    expect(exported.querySelectorAll("[role=list]")).toHaveLength(4);
    expect(exported.querySelectorAll("[role=listitem]")).toHaveLength(7);
    assertReferences(exported);
    assertReferences(root);
    expect(editor.tryParseHTMLToBlocks(exported.innerHTML)).toEqual(before);
    expect(editor.blocksToHTMLLossy(editor.document)).toBe(external);
  });
});
