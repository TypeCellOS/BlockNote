// @vitest-environment jsdom
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";

import { BlockNoteEditor } from "./BlockNoteEditor.js";
import { normalizeBlockNesting } from "./normalizeBlockNesting.js";

let editor: BlockNoteEditor;

beforeEach(() => {
  editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [
          {
            id: "child",
            type: "paragraph",
            content: "Child",
            children: [
              {
                id: "grandchild",
                type: "paragraph",
                content: [
                  { type: "text", text: "Grandchild", styles: { bold: true } },
                ],
              },
            ],
          },
          { id: "cousin", type: "paragraph", content: "Cousin" },
        ],
      },
      { id: "sibling", type: "paragraph", content: "Sibling" },
      {
        id: "target",
        type: "paragraph",
        content: "Target",
        children: [
          { id: "nested", type: "paragraph", content: "Nested target" },
        ],
      },
    ],
    trailingBlock: false,
  });
  editor.mount(document.createElement("div"));
});

afterEach(() => {
  vi.restoreAllMocks();
  editor.unmount();
  editor._tiptapEditor.destroy();
});

function position(id: string, offset: number) {
  let found: number | undefined;
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (node.type.name === "blockContainer" && node.attrs.id === id) {
      found = pos + 2 + offset;
    }
  });
  if (found === undefined) {
    throw new Error(`Missing fixture block: ${id}`);
  }
  return found;
}

function selection(from: readonly [string, number], to = from) {
  return TextSelection.create(
    editor.prosemirrorState.doc,
    position(...from),
    position(...to),
  );
}

function clipboardHTML(source: TextSelection) {
  return editor.prosemirrorView.serializeForClipboard(source.content()).dom
    .innerHTML;
}

function expectUndo(doc: typeof editor.prosemirrorState.doc) {
  editor.prosemirrorState.doc.check();
  expect(editor.undo()).toBe(true);
  expect(editor.prosemirrorState.doc.eq(doc)).toBe(true);
}

it.each([
  ["external", "child"],
  ["external-deep", "child"],
  ["external", "grandchild"],
  ["copy", "child"],
  ["move", "child"],
  ["move", "grandchild"],
] as const)("normalizes a %s drop starting in %s", (mode, from) => {
  const view = editor.prosemirrorView;
  const doc = view.state.doc;
  const source =
    from === "child"
      ? selection(["child", 0], ["sibling", 7])
      : selection(["grandchild", 1], ["cousin", 3]);
  const slice = source.content();
  const normalized = normalizeBlockNesting(slice);
  expect(normalizeBlockNesting(normalized).eq(normalized)).toBe(true);
  const html = clipboardHTML(source);
  const internal = mode === "copy" || mode === "move";
  const destination = internal
    ? source
    : selection([mode === "external-deep" ? "nested" : "parent", 0]);
  editor.transact((tr) => tr.setSelection(destination));
  const remainingText =
    mode === "move"
      ? view.state.tr.deleteSelection().doc.textContent
      : doc.textContent;
  if (internal) {
    view.dragging = { slice, move: mode === "move" };
  }
  // jsdom has no layout: supply only the hit-test result, not drop handling.
  vi.spyOn(view, "posAtCoords").mockReturnValue({
    pos: position("nested", 13),
    inside: -1,
  });
  const event = new MouseEvent("drop", {
    bubbles: true,
    cancelable: true,
    ctrlKey: mode === "copy",
    altKey: mode === "copy",
  });
  Object.defineProperty(event, "dataTransfer", {
    value: {
      types: ["text/html"],
      getData: (format: string) => (format === "text/html" ? html : ""),
      files: [],
    },
  });
  view.dom.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  const inserted =
    from === "child" ? "ChildGrandchildCousinSibling" : "randchildCou";
  expect(view.state.doc.textContent).toBe(
    remainingText.replace("Nested target", "Nested target" + inserted),
  );
  expect(
    editor.getBlock("target")?.children.map((block) => block.content),
  ).toEqual(
    from === "child"
      ? ["Nested targetChild", "Cousin", "Sibling"].map((text) => [
          { type: "text", text, styles: {} },
        ])
      : [
          [
            { type: "text", text: "Nested target", styles: {} },
            { type: "text", text: "randchild", styles: { bold: true } },
          ],
          [{ type: "text", text: "Cou", styles: {} }],
        ],
  );
  expect(view.dragging).toBeNull();
  expectUndo(doc);
});

it.each([
  ["child", 0, "sibling", 7, "target", false, "ChildGrandchildCousinSibling"],
  ["grandchild", 0, "sibling", 7, "target", false, "GrandchildCousinSibling"],
  ["grandchild", 3, "cousin", 3, "target", false, "ndchildCou"],
  ["grandchild", 3, "cousin", 3, "target", true, "ndchildCou"],
  ["child", 0, "sibling", 7, "nested", false, "ChildGrandchildCousinSibling"],
] as const)(
  "pastes %s (offset %i) → %s (offset %i) into %s (replace: %s)",
  (from, offset, to, end, target, replace, inserted) => {
    const doc = editor.prosemirrorState.doc;
    const html = clipboardHTML(selection([from, offset], [to, end]));
    const targetEnd = target === "target" ? 6 : 13;
    const destination = selection(
      [target, replace ? 2 : targetEnd],
      [target, replace ? 4 : targetEnd],
    );
    editor.transact((tr) => tr.setSelection(destination));
    editor.pasteHTML(html, true);

    const result = editor.prosemirrorState.doc;
    const before = doc.textContent;
    const start = before.indexOf(
      target === "target" ? "Target" : "Nested target",
    );
    expect(result.textContent).toBe(
      before.slice(0, start + (replace ? 2 : targetEnd)) +
        inserted +
        before.slice(start + (replace ? 4 : targetEnd)),
    );
    const copiedBold: string[] = [];
    result.descendants((node, pos) => {
      if (
        pos >= destination.from &&
        node.isText &&
        node.marks.some((mark) => mark.type.name === "bold")
      ) {
        copiedBold.push(node.text!);
      }
    });
    expect(copiedBold.join("")).toBe(
      from === "grandchild" ? "Grandchild".slice(offset) : "Grandchild",
    );
    if (target === "nested") {
      // Selected siblings stay together at the destination's nesting level.
      expect(editor.document).toHaveLength(3);
      expect(editor.document[2].children.map((block) => block.content)).toEqual(
        [
          [{ type: "text", text: "Nested targetChild", styles: {} }],
          [{ type: "text", text: "Cousin", styles: {} }],
          [{ type: "text", text: "Sibling", styles: {} }],
        ],
      );
    }
    expectUndo(doc);
  },
);

it("preserves empty selected paragraphs instead of accepting a text-equal no-op", () => {
  editor.removeBlocks(["grandchild", "cousin", "nested"]);
  editor.updateBlock("child", { content: [] });
  editor.updateBlock("sibling", { content: [] });
  const doc = editor.prosemirrorState.doc;
  const source = selection(["child", 0], ["sibling", 0]);
  const html = clipboardHTML(source);
  const destination = selection(["target", 6]);
  editor.transact((tr) => tr.setSelection(destination));
  expect(
    editor.prosemirrorState.tr.replaceSelection(source.content()).doc.eq(doc),
  ).toBe(true);
  editor.pasteHTML(html, true);
  expect(editor.document).toHaveLength(4);
  expect(editor.document[3].content).toEqual([]);
  expect(editor.prosemirrorState.doc.textContent).toBe(doc.textContent);
  editor.prosemirrorState.doc.check();
});

it.each([
  { targetText: "", children: false },
  { targetText: "Target", children: false },
  { targetText: "", children: true },
  { targetText: "Target", children: true },
])(
  "pastes differing paragraph attributes over '$targetText' (children: $children)",
  ({ targetText, children }) => {
    editor.transact((tr) => {
      editor.removeBlocks(["cousin"]);
      editor.updateBlock("child", { props: { textColor: "red" } });
      editor.replaceBlocks(
        ["target"],
        [
          {
            id: "target",
            type: "paragraph",
            content: targetText,
            children: children
              ? [{ id: "existing", type: "paragraph", content: "Existing" }]
              : [],
          },
        ],
      );
      tr.setMeta("addToHistory", false);
    });
    const doc = editor.prosemirrorState.doc;
    const html = clipboardHTML(selection(["child", 0], ["sibling", 7]));
    const destination = selection(["target", 0], ["target", targetText.length]);
    editor.transact((tr) => tr.setSelection(destination));
    editor.pasteHTML(html, true);

    expect(editor.prosemirrorState.doc.textContent).toBe(
      "ParentChildGrandchildSiblingChildGrandchildSibling" +
        (children ? "Existing" : ""),
    );
    // Existing children retain the target paragraph; otherwise source attrs win.
    expect(editor.document[2]).toMatchObject({
      type: "paragraph",
      props: { textColor: children ? "default" : "red" },
    });
    expectUndo(doc);
  },
);
