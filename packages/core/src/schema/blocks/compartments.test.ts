import { NodeSelection, TextSelection } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createBlockSpec } from "./createSpec.js";

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// A callout with a title: an ordinary block whose own rich text is the title,
// declaring that its children are a compartment (a body), and framing both.
const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "inline" as const,
    children: { allow: "any" as const, min: 0 },
  },
  {
    render: renderDiv,
    renderFrame: () => {
      const dom = document.createElement("div");
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
)();

// A callout without a title: a container block, its own element is the box.
const Box = createBlockSpec(
  {
    type: "box" as const,
    propSchema: {},
    content: "none" as const,
    children: { allow: "any" as const },
  },
  { render: renderDiv },
)();

// A toggle: it frames itself, but declares no `children`, so its children are
// ordinary nesting rather than a body that belongs to it.
const Toggle = createBlockSpec(
  {
    type: "toggle" as const,
    propSchema: {},
    content: "inline" as const,
  },
  {
    render: renderDiv,
    renderFrame: () => {
      const dom = document.createElement("div");
      dom.className = "toggle-frame";
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
    box: Box,
    toggle: Toggle,
  } as const,
});

function press(editor: any, key: string, mods: string[] = []) {
  const view = editor._tiptapEditor.view;
  const codes: Record<string, number> = { Enter: 13, Backspace: 8, Tab: 9 };
  const event = new KeyboardEvent("keydown", {
    key,
    code: key,
    keyCode: codes[key],
    bubbles: true,
    shiftKey: mods.includes("Shift"),
  } as any);
  return !!view.someProp("handleKeyDown", (f: any) => f(view, event));
}

function shape(blocks: any[]): string {
  return blocks
    .map((block) => {
      const text = Array.isArray(block.content)
        ? block.content.map((c: any) => c.text ?? "").join("")
        : "";
      const children = block.children?.length
        ? `[${shape(block.children)}]`
        : "";
      return `${block.type}"${text}"${children}`;
    })
    .join(", ");
}

function getBlockPos(doc: any, id: string): number {
  let pos = -1;
  doc.descendants((node: any, at: number) => {
    if (pos < 0 && node.attrs?.id === id) {
      pos = at;
    }
    return pos < 0;
  });
  return pos;
}

function editorWith(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent } as any);
  editor.mount(document.createElement("div"));
  return editor;
}

const before = { id: "pre", type: "paragraph" as const, content: "Before" };
const after = { id: "post", type: "paragraph" as const, content: "After" };
const body = [
  { id: "b1", type: "paragraph" as const, content: "One" },
  { id: "b2", type: "paragraph" as const, content: "Two" },
];

const withCallout = (children: any[] = body) => [
  before,
  { id: "w", type: "callout" as const, content: "Title", children },
  after,
];
const withBox = (children: any[] = body) => [
  before,
  { id: "w", type: "box" as const, children },
  after,
];

describe("a compartment's keyboard behaviour", () => {
  describe("callout (a title plus a body)", () => {
    it("Enter at the end of the title starts the body, keeping it", () => {
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("w", "end");
      press(editor, "Enter");

      // The new block belongs to the callout, and the body is still the
      // callout's - not carried off by a new sibling.
      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"", paragraph"One", paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Enter in the middle of the title keeps the body on the callout", () => {
      // The bug behind the toggle-block reports (#2020, #2378): splitting a
      // block handed its children to the new block, so a callout's body ended
      // up under whatever the split created.
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("w", "start");
      editor.transact((tr) =>
        tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + 2)),
      );
      press(editor, "Enter");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Ti"[paragraph"tle", paragraph"One", paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Enter in an empty last body block leaves the callout", () => {
      const editor = editorWith(
        withCallout([body[0], { id: "b2", type: "paragraph", content: "" }]),
      );
      editor.setTextCursorPosition("b2", "start");
      press(editor, "Enter");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"One"], paragraph"", paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Enter in an empty body block that is the only one stays put", () => {
      // Nothing to escape from yet: the block is where a new callout's body
      // starts, and leaving would dissolve the callout the user just made.
      const editor = editorWith(
        withCallout([{ id: "b1", type: "paragraph", content: "" }]),
      );
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Enter");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"", paragraph""], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Backspace at the start of the first body block merges into the title", () => {
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Backspace");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"TitleOne"[paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Shift-Tab in the body does not escape the callout", () => {
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Tab", ["Shift"]);

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"One", paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Backspace in the block after moves it into the body, whole", () => {
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("post", "start");
      press(editor, "Backspace");

      // Moved in as its own block: text never merges across the edge.
      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"One", paragraph"Two", paragraph"After"]',
      );
      editor._tiptapEditor.destroy();
    });

    it("Tab still nests inside the body", () => {
      const editor = editorWith(withCallout());
      editor.setTextCursorPosition("b2", "start");
      press(editor, "Tab");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", callout"Title"[paragraph"One"[paragraph"Two"]], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });
  });

  describe("box (a body with no title)", () => {
    it("Enter in an empty last child leaves the box", () => {
      const editor = editorWith(
        withBox([body[0], { id: "b2", type: "paragraph", content: "" }]),
      );
      editor.setTextCursorPosition("b2", "start");
      press(editor, "Enter");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", box""[paragraph"One"], paragraph"", paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("Enter in an empty child that is the only one stays put", () => {
      const editor = editorWith(
        withBox([{ id: "b1", type: "paragraph", content: "" }]),
      );
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Enter");

      expect(shape(editor.document)).toBe(
        'paragraph"Before", box""[paragraph"", paragraph""], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });
  });

  describe("a compartment is still an ordinary block", () => {
    it("round-trips through HTML, keeping its type, title and body", () => {
      // Dragging a block, and copying one, both go through this: a compartment
      // that serialized like a container would come back as a paragraph.
      const editor = editorWith(withCallout());

      const html = editor.blocksToFullHTML(editor.document as any);
      const parsed = editor.tryParseHTMLToBlocks(html);

      expect(shape(parsed)).toBe(
        'paragraph"Before", callout"Title"[paragraph"One", paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("survives the clipboard round-trip that copy and drag use", () => {
      // Dragging a block inside the editor re-parses it from the HTML
      // ProseMirror serializes the dragged slice to, so a compartment whose
      // parse rules don't match that HTML comes back as a paragraph.
      const editor = editorWith(withCallout());
      const view = editor._tiptapEditor.view;

      editor.transact((tr) =>
        tr.setSelection(NodeSelection.create(tr.doc, getBlockPos(tr.doc, "w"))),
      );
      const html = view.serializeForClipboard(view.state.selection.content())
        .dom.innerHTML;

      expect(shape(editor.tryParseHTMLToBlocks(html))).toBe(
        'callout"Title"[paragraph"One", paragraph"Two"]',
      );
      editor._tiptapEditor.destroy();
    });
  });

  describe("blocks that declare no compartment are untouched", () => {
    it("keeps ordinary nesting behaviour for a nested paragraph", () => {
      const editor = editorWith([
        before,
        { id: "w", type: "paragraph", content: "Title", children: body },
        after,
      ]);
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Tab", ["Shift"]);

      // Shift-Tab lifts it out, as it always has.
      expect(shape(editor.document)).toBe(
        'paragraph"Before", paragraph"Title", paragraph"One"[paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("a block that frames itself still nests ordinarily", () => {
      // A toggle wants the frame but not the compartment: Shift-Tab takes a
      // child out of it, the way it does for any nested block. Declaring
      // `children` is what makes the gestures treat them as a body instead.
      const editor = editorWith([
        before,
        { id: "w", type: "toggle", content: "Title", children: body },
        after,
      ]);
      editor.setTextCursorPosition("b1", "start");
      press(editor, "Tab", ["Shift"]);

      expect(shape(editor.document)).toBe(
        'paragraph"Before", toggle"Title", paragraph"One"[paragraph"Two"], paragraph"After"',
      );
      editor._tiptapEditor.destroy();
    });

    it("a frame without a compartment still wraps the children it nests", () => {
      const editor = editorWith([
        { id: "w", type: "toggle", content: "Title", children: body },
      ]);
      const frame = editor.domElement!.querySelector(".toggle-frame");

      expect(frame).not.toBeNull();
      expect(
        frame!.querySelectorAll(".bn-block-group .bn-block-outer").length,
      ).toBe(2);
      editor._tiptapEditor.destroy();
    });
  });
});
