import { TextSelection } from "prosemirror-state";
import { describe, expect } from "vite-plus/test";

import {
  installHeadlessPlugins,
  pressHeadlessKey,
} from "../../../extensions/testHeadlessEditor.js";
import { isLayoutNode } from "../../../schema/blocks/children.js";
import { getBlockInfoAt } from "../../getBlockInfoFromPos.js";
import { getNodeById } from "../../nodeUtil.js";
import { layoutSchema } from "./layoutBlocks.fixture.js";

// Behaviour of titled blocks: an ordinary block with inline content
// (the title) whose `children` are a body that belongs to it. The `alert`
// fixture block is the specimen; `callout` (a layout block) is the control.

const schema = layoutSchema;
const it = globalThis.it.extend<{
  withKeyboardEditor: (
    initialContent: (typeof schema.PartialBlock)[],
  ) => Promise<typeof schema.BlockNoteEditor>;
}>({
  withKeyboardEditor: async ({ setupEditor }, use) => {
    await use(async (initialContent) => {
      const { editor } = await setupEditor({ schema, initialContent });
      installHeadlessPlugins(editor);
      return editor;
    });
  },
});

function press(
  editor: typeof schema.BlockNoteEditor,
  key: "Enter" | "Backspace" | "Tab" | "Delete",
  mods: string[] = [],
) {
  return pressHeadlessKey(editor, {
    key,
    code: key,
    keyCode: { Enter: 13, Backspace: 8, Tab: 9, Delete: 46 }[key],
    shiftKey: mods.includes("Shift"),
  });
}

function shape(blocks: (typeof schema.Block)[]): string {
  return blocks
    .map((block) => {
      const text = Array.isArray(block.content)
        ? block.content.map((c) => (c.type === "text" ? c.text : "")).join("")
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

const withAlert = (children: (typeof schema.PartialBlock)[] = body) => [
  before,
  { id: "w", type: "alert" as const, content: "Title", children },
  after,
];

describe("titled-block schema shape", () => {
  it("is an ordinary block whose keyboard settings keep its body together", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema,
      initialContent: withAlert(),
    });

    function keyboardOf(id: string) {
      const { blockSpecs } = editor.schema;
      const block = editor.getBlock(id)!;
      return blockSpecs[block.type].implementation.keyboard?.(block);
    }

    editor.transact((tr) => {
      const alert = getNodeById("w", tr.doc)!;
      // An ordinary blockContainer: its node holds content, not children.
      expect(alert.node.type.name).toBe("blockContainer");
      expect(isLayoutNode(alert.node.type)).toBe(false);
      expect(keyboardOf("w")).toMatchObject({
        enter: "into-children",
        childrenCanOutdent: false,
        emptyChildEnter: "exit-at-end",
      });
      expect(alert.node.attrs.id).toBe("w");
      expect(alert.node.firstChild!.attrs).not.toHaveProperty("id");

      expect(keyboardOf("pre")).toMatchObject({
        enter: "split",
        childrenCanOutdent: true,
        emptyChildEnter: "outdent",
      });

      // The body is the blockGroup the alert nests, resolved with positions.
      const info = getBlockInfoAt(tr.doc, alert.posBeforeNode);
      expect(info.children?.node.type.name).toBe("blockGroup");
      expect(info.children?.beforePos).toBe(info.content?.afterPos);
    });
  });
});

describe("a titled block's keyboard behaviour", () => {
  it.for([{ children: [] }, { children: body }])(
    "Enter in an empty title preserves its body (%j)",
    async ({ children }, { withKeyboardEditor }) => {
      const editor = await withKeyboardEditor([
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
      expect(
        editor.document[1].children.slice(1).map((block) => block.id),
      ).toEqual(children.map((block) => block.id));
      expect(editor.getTextCursorPosition().block.id).toBe(
        editor.document[1].children[0].id,
      );
    },
  );

  it("Enter at the end of the title starts the body, keeping it", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("w", "end");
    press(editor, "Enter");

    // The new block belongs to the alert, and the body is still the
    // alert's — not carried off by a new sibling.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter in the middle of the title keeps the body on the alert", async ({
    withKeyboardEditor,
  }) => {
    // The bug behind the toggle-block reports: splitting a block handed its
    // children to the new block, so a callout's body ended up under whatever
    // the split created.
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("w", "start");
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, tr.selection.from + 2)),
    );
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Ti"[paragraph"tle", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter in an empty last body block leaves the alert", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor(
      withAlert([body[0], { id: "b2", type: "paragraph", content: "" }]),
    );
    editor.setTextCursorPosition("b2", "start");
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One"], paragraph"", paragraph"After"',
    );
  });

  it("Enter in an empty body block that is the only one stays put", async ({
    withKeyboardEditor,
  }) => {
    // Nothing to escape from yet: the block is where a new alert's body
    // starts, and leaving would dissolve the alert the user just made.
    const editor = await withKeyboardEditor(
      withAlert([{ id: "b1", type: "paragraph", content: "" }]),
    );
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Enter");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"", paragraph""], paragraph"After"',
    );
  });

  it("Backspace at the start of the first body block merges into the title", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Backspace");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"TitleOne"[paragraph"Two"], paragraph"After"',
    );
  });

  it("Shift-Tab in the body does not escape the alert", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("b1", "start");
    press(editor, "Tab", ["Shift"]);

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("Backspace in the block after merges it into the body's last block", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("post", "start");
    press(editor, "Backspace");

    // As after any block with children: the text is appended to the last
    // block above it.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One", paragraph"TwoAfter"]',
    );
  });

  it("Tab still nests inside the body", async ({ withKeyboardEditor }) => {
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("b2", "start");
    press(editor, "Tab");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"Title"[paragraph"One"[paragraph"Two"]], paragraph"After"',
    );
  });

  it("Delete at the end of the title merges the first body block into it", async ({
    withKeyboardEditor,
  }) => {
    // The mirror of Backspace at the start of the first body block: the
    // body's first block is consumed and its text joins the title.
    const editor = await withKeyboardEditor(withAlert());
    editor.setTextCursorPosition("w", "end");
    press(editor, "Delete");

    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert"TitleOne"[paragraph"Two"], paragraph"After"',
    );
  });

  it("Enter with a non-collapsed selection in the title takes the generic split path", async ({
    withKeyboardEditor,
  }) => {
    // The titled block's Enter handler only fires for a collapsed selection,
    // so a range selection falls through to the generic split: the selected
    // text is deleted and the title splits, keeping the body on the alert.
    const editor = await withKeyboardEditor(withAlert());
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

describe("converting between a titled block and a layout block", () => {
  it("carries the title into the body when an alert becomes a callout", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema,
      initialContent: withAlert(),
    });
    editor.updateBlock("w", { type: "callout" });

    // A layout block holds no content of its own, so the title moves into the
    // body as its first paragraph; the existing children stay after it, in
    // order.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", callout""[paragraph"Title", paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });

  it("invents an empty title when a callout becomes an alert", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      schema,
      initialContent: [
        before,
        { id: "w", type: "callout", children: body },
        after,
      ],
    });
    editor.updateBlock("w", { type: "alert" });

    // The layout block had no title to carry, so the alert starts empty; its
    // children move across untouched.
    expect(shape(editor.document)).toBe(
      'paragraph"Before", alert""[paragraph"One", paragraph"Two"], paragraph"After"',
    );
  });
});

describe("blocks that declare no children are untouched", () => {
  it("keeps ordinary nesting behaviour for a nested paragraph", async ({
    withKeyboardEditor,
  }) => {
    const editor = await withKeyboardEditor([
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
});
