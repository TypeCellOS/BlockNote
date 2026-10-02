import { TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";
import { containerSchema } from "./containers.fixture.js";

const plainNote = createBlockSpec(
  {
    type: "plainNote",
    propSchema: {},
    content: "plain",
    children: { allow: "blocks" },
  },
  {
    render() {
      const dom = document.createElement("pre");
      return { dom, contentDOM: dom };
    },
    renderFrame() {
      const dom = document.createElement("section");
      dom.className = "plain-frame";
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
)();
const schema = containerSchema.extend({ blockSpecs: { plainNote } });
const editors = new Set<ReturnType<typeof editorWith>>();

function editorWith(
  content = "Source",
  children: (typeof schema.PartialBlock)[] = [
    { id: "body", type: "paragraph", content: "Explanation" },
  ],
) {
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      { id: "note", type: "plainNote", content, children },
      { id: "after", type: "paragraph", content: "After" },
    ],
  });
  editors.add(editor);
  editor.mount(document.createElement("div"));
  return editor;
}

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.clear();
});

function press(
  editor: ReturnType<typeof editorWith>,
  key: "Enter" | "Backspace" | "Delete" | "Tab",
  shiftKey = false,
) {
  const view = editor.prosemirrorView;
  return view.someProp("handleKeyDown", (handler) =>
    handler(
      view,
      new KeyboardEvent("keydown", {
        key,
        code: key,
        keyCode: { Enter: 13, Backspace: 8, Delete: 46, Tab: 9 }[key],
        shiftKey,
      }),
    ),
  );
}
function text(editor: ReturnType<typeof editorWith>, id: string) {
  const block = editor.getBlock(id)!;
  if (block.type !== "plainNote" && block.type !== "paragraph") {
    throw new Error("Expected a text block");
  }
  return block.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

describe("plain blocks with owned children", () => {
  it.each(["", "Source"])(
    "Enter starts the body and preserves children for %j",
    (content) => {
      const editor = editorWith(content);
      editor.setTextCursorPosition("note", "end");
      press(editor, "Enter");
      expect(editor.document.map((block) => block.id)).toEqual([
        "note",
        "after",
      ]);
      expect(
        editor.getBlock("note")!.children.map((block) => block.id),
      ).toEqual([expect.any(String), "body"]);
      expect(text(editor, "body")).toBe("Explanation");
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.getBlock("note")!.children[0].id,
      );
      editor.prosemirrorState.doc.check();
    },
  );

  it("Enter moves the remaining plain text into the body", () => {
    const editor = editorWith("Source");
    editor.setTextCursorPosition("note", "start");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + 3)),
    );
    press(editor, "Enter");
    expect(text(editor, "note")).toBe("Sou");
    expect(text(editor, editor.getBlock("note")!.children[0].id)).toBe("rce");
    expect(text(editor, "body")).toBe("Explanation");
  });

  it("Shift-Enter inserts a newline without moving children", () => {
    const editor = editorWith();
    editor.setTextCursorPosition("note", "end");
    press(editor, "Enter", true);
    expect(text(editor, "note")).toBe("Source\n");
    expect(editor.getBlock("note")!.children.map((block) => block.id)).toEqual([
      "body",
    ]);
    editor.prosemirrorState.doc.check();
  });

  it.each(["Backspace", "Delete"] as const)(
    "%s preserves child text when merging into plain content",
    (key) => {
      const editor = editorWith("Source", [
        {
          id: "body",
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", styles: { bold: true } },
            "\nNext",
          ],
          children: [{ id: "nested", type: "paragraph", content: "Nested" }],
        },
      ]);
      editor.setTextCursorPosition("note", "end");
      const joinPosition = editor.prosemirrorState.selection.from;
      editor.setTextCursorPosition(
        key === "Backspace" ? "body" : "note",
        key === "Backspace" ? "start" : "end",
      );
      press(editor, key);
      expect(editor.prosemirrorState.selection.from).toBe(joinPosition);
      expect(text(editor, "note")).toBe("SourceBold\nNext");
      expect(editor.getBlock("note")!.content).toEqual([
        { type: "text", text: "SourceBold\nNext", styles: {} },
      ]);
      expect(
        editor.getBlock("note")!.children.map((block) => block.id),
      ).toEqual(["nested"]);
      expect(editor.getBlock("body")).toBeUndefined();
      editor.prosemirrorState.doc.check();
    },
  );

  it("keeps owned children when Shift-Tab is pressed", () => {
    const editor = editorWith();
    editor.setTextCursorPosition("body", "start");
    press(editor, "Tab", true);
    expect(editor.getBlock("note")!.children.map((block) => block.id)).toEqual([
      "body",
    ]);
  });

  it("renders and round-trips multiline content with its children", () => {
    const editor = editorWith("First\nSecond");
    expect(editor.domElement?.querySelector(".plain-frame")?.textContent).toBe(
      "First\nSecondExplanation",
    );
    const parsed = editor.tryParseHTMLToBlocks(
      editor.blocksToFullHTML(editor.document),
    );
    expect(parsed).toEqual(editor.document);
    expect(editor.blocksToHTMLLossy(editor.document)).toContain("Explanation");
  });

  it("preserves text and children when converting between plain, inline, and container blocks", () => {
    const editor = editorWith("First\nSecond");
    editor.updateBlock("note", { type: "alert" });
    expect(editor.getBlock("note")!.children[0].id).toBe("body");
    editor.updateBlock("note", { type: "plainNote" });
    expect(text(editor, "note")).toBe("First\nSecond");
    editor.updateBlock("note", { type: "callout" });
    const container = editor.document[0];
    expect(text(editor, container.children[0].id)).toBe("First\nSecond");
    expect(container.children[1].id).toBe("body");
    editor.prosemirrorState.doc.check();
  });
});
