import { NodeSelection, TextSelection } from "prosemirror-state";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import {
  hasOwnedChildren,
  isContainerNode,
} from "../../../schema/blocks/children.js";
import { getBlockInfoAt } from "../../getBlockInfoFromPos.js";
import { getNodeById } from "../../nodeUtil.js";
import { containerSchema } from "./containers.fixture.js";

// Behaviour of titled blocks: an ordinary block with inline content
// (the title) whose `children` are a body that belongs to it. The `alert`
// fixture block is the specimen; `callout` (a pure container) is the control.

const schema = containerSchema;
const editors = new Set<ReturnType<typeof editorWith>>();

afterEach(() => {
  for (const editor of editors) {
    editor._tiptapEditor.destroy();
  }
  editors.clear();
});

function editorWith(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent } as any);
  editors.add(editor);
  editor.mount(document.createElement("div"));
  return editor;
}

function press(editor: any, key: string, mods: string[] = []) {
  const view = editor._tiptapEditor.view;
  const codes: Record<string, number> = {
    Enter: 13,
    Backspace: 8,
    Tab: 9,
    Delete: 46,
  };
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

const before = { id: "pre", type: "paragraph" as const, content: "Before" };
const after = { id: "post", type: "paragraph" as const, content: "After" };
const body = [
  { id: "b1", type: "paragraph" as const, content: "One" },
  { id: "b2", type: "paragraph" as const, content: "Two" },
];

const withAlert = (children: any[] = body) => [
  before,
  { id: "w", type: "alert" as const, content: "Title", children },
  after,
];

describe("titled-block schema shape", () => {
  it("recognizes declared ownership on ordinary blocks", () => {
    const editor = editorWith(withAlert());

    editor.transact((tr) => {
      const alert = getNodeById("w", tr.doc)!;
      // An ordinary blockContainer: its node holds content, not children.
      expect(alert.node.type.name).toBe("blockContainer");
      expect(isContainerNode(alert.node.type)).toBe(false);
      expect(hasOwnedChildren(alert.node)).toBe(true);
      expect(alert.node.attrs.id).toBe("w");
      expect(alert.node.firstChild!.attrs).not.toHaveProperty("id");

      expect(hasOwnedChildren(getNodeById("pre", tr.doc)!.node)).toBe(false);

      // The body is the blockGroup the alert nests, resolved with positions.
      const info = getBlockInfoAt(tr.doc, alert.posBeforeNode);
      expect(info.children?.node.type.name).toBe("blockGroup");
      expect(info.children?.beforePos).toBe(info.content?.afterPos);
    });
  });

  it("frames the title and the body together in the live DOM", () => {
    const editor = editorWith(withAlert());

    const frame = editor.domElement!.querySelector(".alert-frame");
    expect(frame).not.toBeNull();
    const slot = frame!.querySelector(".alert-slot");
    expect(slot).not.toBeNull();
    // The title's text and both body blocks render inside the slot.
    expect(slot!.textContent).toContain("Title");
    expect(slot!.textContent).toContain("One");
    expect(slot!.textContent).toContain("Two");
  });
});

describe("a titled block's keyboard behaviour", () => {
  it.each([{ children: [] }, { children: body }])(
    "Enter in an empty title preserves its body (%j)",
    ({ children }) => {
      const editor = editorWith([
        before,
        { id: "w", type: "alert", content: "", children },
        after,
      ]);
      editor.setTextCursorPosition("w", "start");
      expect(press(editor, "Enter")).toBe(true);
      expect(editor.document.map((block) => block.id)).toEqual([
        "pre",
        "w",
        "post",
      ]);
      expect(shape(editor.document[1].children)).toBe(
        [
          'paragraph""',
          ...children.map((block) => `paragraph"${block.content}"`),
        ].join(", "),
      );
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[1].children[0].id,
      );
    },
  );

  it("Enter at the end of the title starts the body, keeping it", () => {
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("w", "end");
    press(editor, "Enter");

    // The new block belongs to the alert, and the body is still the
    // alert's — not carried off by a new sibling.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter in the middle of the title keeps the body on the alert", () => {
    // The bug behind the toggle-block reports: splitting a block handed its
    // children to the new block, so a callout's body ended up under whatever
    // the split created.
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("w", "start");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + 2)),
    );
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Ti"[paragraph"tle", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter in an empty last body block leaves the alert", () => {
    const editor = editorWith(
      withAlert([body[0], { id: "b2", type: "paragraph", content: "" }]),
    );
    editor.setTextCursorPosition("b2", "start");
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One"], paragraph"", paragraph"After"',
    );
  });

  it("Enter in an empty body block that is the only one stays put", () => {
    // Nothing to escape from yet: the block is where a new alert's body
    // starts, and leaving would dissolve the alert the user just made.
    const editor = editorWith(
      withAlert([{ id: "b1", type: "paragraph", content: "" }]),
    );
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"", paragraph""], paragraph"After"',
    );
  });

  it("Backspace at the start of the first body block merges into the title", () => {
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Backspace");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"TitleOne"[paragraph"Two"], paragraph"After"',
    );
  });

  it("Shift-Tab in the body does not escape the alert", () => {
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Tab", ["Shift"]);

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Backspace in the block after moves it into the body, whole", () => {
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("post", "start");
    press(editor, "Backspace");

    // Moved in as its own block: text never merges across the edge.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One", paragraph"Two", paragraph"After"]',
    );
  });

  it("Tab still nests inside the body", () => {
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("b2", "start");
    press(editor, "Tab");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One"[paragraph"Two"]], paragraph"After"',
    );
  });

  it("Delete at the end of the title merges the first body block into it", () => {
    // The mirror of Backspace at the start of the first body block: the
    // body's first block is consumed and its text joins the title.
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("w", "end");
    press(editor, "Delete");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"TitleOne"[paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter with a non-collapsed selection in the title takes the generic split path", () => {
    // The titled block's Enter handler only fires for a collapsed selection,
    // so a range selection falls through to the generic split: the selected
    // text is deleted and the title splits, keeping the body on the alert.
    const editor = editorWith(withAlert());
    editor.setTextCursorPosition("w", "start");
    editor.transact((tr) =>
      tr.setSelection(
        TextSelection.create(
          tr.doc,
          tr.selection.from + 1,
          tr.selection.from + 3,
        ),
      ),
    );
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"T"[paragraph"One", paragraph"Two"], paragraph"le", paragraph"After"',
    );
  });
});

describe("converting between a titled block and a pure container", () => {
  it("carries the title into the body when an alert becomes a callout", () => {
    const editor = editorWith(withAlert());
    editor.updateBlock("w" as any, { type: "callout" } as any);

    // A container holds no content of its own, so the title moves into the
    // body as its first paragraph; the existing children stay after it, in
    // order.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", callout""[paragraph"Title", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("invents an empty title when a callout becomes an alert", () => {
    const editor = editorWith([
      before,
      {
        id: "w",
        type: "callout" as const,
        children: [
          { id: "b1", type: "paragraph" as const, content: "One" },
          { id: "b2", type: "paragraph" as const, content: "Two" },
        ],
      },
      after,
    ]);
    editor.updateBlock("w" as any, { type: "alert" } as any);

    // The container had no title to carry, so the alert starts empty; its
    // children move across untouched.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert""[paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });
});

describe("blocks that declare no children are untouched", () => {
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
  });

  it("survives the clipboard round-trip that copy and drag use", () => {
    // Dragging a block inside the editor re-parses it from the HTML
    // ProseMirror serializes the dragged slice to, so a titled block whose
    // parse rules don't match that HTML comes back as a paragraph.
    const editor = editorWith(withAlert());
    const view = editor._tiptapEditor.view;

    editor.transact((tr) => {
      let pos = -1;
      tr.doc.descendants((node: any, at: number) => {
        if (pos < 0 && node.attrs?.id === "w") {
          pos = at;
        }
        return pos < 0;
      });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
    });
    const html = view.serializeForClipboard(view.state.selection.content()).dom
      .innerHTML;

    expect(shape(editor.tryParseHTMLToBlocks(html))).toBe(
      'alert"Title"[paragraph"One", paragraph"Two"]',
    );
  });
});
