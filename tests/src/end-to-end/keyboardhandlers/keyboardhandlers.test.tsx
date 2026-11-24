import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { describe, expect } from "vite-plus/test";
import { MOD, userEvent } from "../../utils/context.js";
import type { SetupEditor } from "../../commands/browser/setupEditor.js";
import { insertHeading, insertParagraph } from "../../utils/copypaste.js";
import { focusOnEditor } from "../../utils/editor.js";

// The android browser instance runs this suite too (see
// vite.config.browser.ts); a couple of tests use idioms that don't transfer:
const onAndroid = /android/i.test(navigator.userAgent);

function text(text: string, styles: { italic?: true } = {}) {
  return { type: "text", text, styles };
}

function paragraph(
  content: string | ReturnType<typeof text>[] = "",
  children: unknown[] = [],
) {
  return {
    type: "paragraph",
    content:
      typeof content === "string" ? (content ? [text(content)] : []) : content,
    children,
  };
}

function heading(level: number, content: string, styles?: { italic?: true }) {
  return {
    type: "heading",
    props: { level },
    content: content ? [text(content, styles)] : [],
    children: [],
  };
}

function listItem(
  type: "numberedListItem" | "bulletListItem" | "checkListItem",
  content: string,
) {
  return { type, content: [text(content)], children: [] };
}

async function setupAt(
  setupEditor: SetupEditor,
  initialContent: PartialBlock[],
  id: string,
  placement: "start" | "end" = "end",
) {
  const { editor } = await setupEditor({ initialContent });
  editor.setTextCursorPosition(id, placement);
  editor.focus();
  return editor;
}

function paragraphBlock(id: string, children?: PartialBlock[]): PartialBlock {
  return { id, type: "paragraph", content: "Paragraph", children };
}

function headingBlock(
  id: string,
  level: 1 | 2 | 3,
  content = "Heading",
  children?: PartialBlock[],
): PartialBlock {
  return { id, type: "heading", props: { level }, content, children };
}

describe("Check Keyboard Handlers' Behaviour", () => {
  // Enter on a selection across blocks is a no-op on Android: prosemirror-view
  // ignores the keydown there and its keypress handler cancels the browser
  // default for cross-parent selections without doing anything. A rare
  // pattern, deliberately not worked around; see mobile/androidEnter.test.tsx.
  it.skipIf(onAndroid)(
    "Check Enter when selection is not empty",
    async ({ setupEditor }) => {
      const { editor } = await setupEditor();
      await focusOnEditor();
      await insertHeading(1);
      await userEvent.keyboard("{Enter}");
      await insertHeading(2);

      await userEvent.keyboard("{ArrowUp}");
      await userEvent.keyboard(`{${MOD}>}{ArrowLeft}{/${MOD}}`);
      await userEvent.keyboard("{ArrowRight}");
      await userEvent.keyboard(
        `{Shift>}{ArrowDown}{${MOD}>}{ArrowRight}{/${MOD}}{ArrowLeft}{/Shift}`,
      );

      await userEvent.keyboard("{Enter}");

      expect(editor.document).toMatchObject([heading(1, "H"), paragraph("g")]);
    },
  );
  it("Check Enter preserves marks", async ({ setupEditor, selectText }) => {
    const { editor } = await setupEditor({
      initialContent: [
        {
          type: "heading",
          props: { level: 1 },
          content: [
            { type: "text", text: "Heading", styles: { italic: true } },
          ],
        },
      ],
    });
    selectText(editor, "eading").collapseToStart();
    editor.focus();

    await userEvent.keyboard("{Enter}");

    expect(editor.document).toMatchObject([
      heading(1, "H", { italic: true }),
      paragraph([text("eading", { italic: true })]),
    ]);
  });
  it("Check Enter preserves nested blocks", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        headingBlock("parent", 1, "Heading", [
          headingBlock("first", 2),
          headingBlock("second", 3),
        ]),
      ],
    });
    selectText(editor, "eading", { startBlockId: "parent" }).collapseToStart();
    editor.focus();

    await userEvent.keyboard("{Enter}");

    expect(editor.document).toMatchObject([
      heading(1, "H"),
      paragraph("eading", [heading(2, "Heading"), heading(3, "Heading")]),
    ]);
  });
  it("Check Enter preserves nested blocks for empty block", async ({
    setupEditor,
  }) => {
    const editor = await setupAt(
      setupEditor,
      [
        headingBlock("parent", 1, "", [
          headingBlock("first", 2),
          headingBlock("second", 3),
        ]),
      ],
      "parent",
      "start",
    );

    await userEvent.keyboard("{Enter}");

    expect(editor.document).toMatchObject([
      heading(1, ""),
      paragraph("", [heading(2, "Heading"), heading(3, "Heading")]),
    ]);
  });
  it("Check Backspace at the start of a block", async ({ setupEditor }) => {
    const editor = await setupAt(
      setupEditor,
      [headingBlock("heading", 1)],
      "heading",
      "start",
    );

    await userEvent.keyboard("{Backspace}");

    expect(editor.document).toMatchObject([paragraph("Heading")]);
  });
  it("Check Backspace preserves nested blocks", async ({ setupEditor }) => {
    const editor = await setupAt(
      setupEditor,
      [
        paragraphBlock("previous"),
        paragraphBlock("parent", [
          paragraphBlock("child", [paragraphBlock("grandchild")]),
        ]),
      ],
      "parent",
      "start",
    );

    await userEvent.keyboard("{Backspace}");

    expect(editor.document).toMatchObject([
      paragraph("ParagraphParagraph"),
      paragraph("Paragraph", [paragraph("Paragraph")]),
    ]);
  });
  it("Check Delete at the end of a block", async ({ setupEditor }) => {
    const editor = await setupAt(setupEditor, [paragraphBlock("only")], "only");
    const before = editor.document;

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toEqual(before);
  });
  it("Check Delete while selection not empty", async ({
    setupEditor,
    selectText,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [paragraphBlock("text")],
    });
    selectText(editor, "ph");
    editor.focus();

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([paragraph("Paragra")]);
  });
  it("Check Delete before inline content block", async ({ setupEditor }) => {
    const editor = await setupAt(
      setupEditor,
      [paragraphBlock("first"), paragraphBlock("second")],
      "first",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([paragraph("ParagraphParagraph")]);
  });
  it("Check Delete selected image block", async ({ setupEditor }) => {
    const editor = await setupAt(
      setupEditor,
      [
        { id: "image", type: "image" },
        { id: "remaining", type: "paragraph" },
      ],
      "image",
    );
    const remaining = editor.document[1];

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toEqual([remaining]);
  });
  it("Check Delete end of block with inline content child", async ({
    setupEditor,
  }) => {
    const editor = await setupAt(
      setupEditor,
      [paragraphBlock("parent", [paragraphBlock("child")])],
      "parent",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([paragraph("ParagraphParagraph")]);
  });
  it("Check Delete end of block with multiple children", async ({
    setupEditor,
  }) => {
    const editor = await setupAt(
      setupEditor,
      [
        paragraphBlock("parent", [
          paragraphBlock("first"),
          paragraphBlock("second"),
        ]),
      ],
      "parent",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([
      paragraph("ParagraphParagraph", [paragraph("Paragraph")]),
    ]);
  });
  it("Check Delete end of block with nested children", async ({
    setupEditor,
  }) => {
    const editor = await setupAt(
      setupEditor,
      [
        paragraphBlock("parent", [
          paragraphBlock("child", [paragraphBlock("grandchild")]),
        ]),
      ],
      "parent",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([
      paragraph("ParagraphParagraph", [paragraph("Paragraph")]),
    ]);
  });
  it("Check Delete before shallower block", async ({ setupEditor }) => {
    const editor = await setupAt(
      setupEditor,
      [
        paragraphBlock("parent", [paragraphBlock("child")]),
        paragraphBlock("following"),
      ],
      "child",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([
      paragraph("Paragraph", [paragraph("ParagraphParagraph")]),
    ]);
  });
  it("Check Delete before shallower block with children", async ({
    setupEditor,
  }) => {
    const editor = await setupAt(
      setupEditor,
      [
        paragraphBlock("parent", [paragraphBlock("child")]),
        paragraphBlock("following", [paragraphBlock("following-child")]),
      ],
      "child",
    );

    await userEvent.keyboard("{Delete}");

    expect(editor.document).toMatchObject([
      paragraph("Paragraph", [paragraph("ParagraphParagraph")]),
      paragraph("Paragraph"),
    ]);
  });
  it("Check heading 1 shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}1{/Alt}{/${MOD}}`);

    expect(editor.document).toMatchObject([heading(1, "Paragraph")]);
  });
  it("Check heading 2 shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}2{/Alt}{/${MOD}}`);

    expect(editor.document).toMatchObject([heading(2, "Paragraph")]);
  });
  it("Check heading 3 shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Alt>}3{/Alt}{/${MOD}}`);

    expect(editor.document).toMatchObject([heading(3, "Paragraph")]);
  });
  it("Check numbered list item shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}7{/Shift}{/${MOD}}`);

    expect(editor.document).toMatchObject([
      listItem("numberedListItem", "Paragraph"),
    ]);
  });
  it("Check bullet list item shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}8{/Shift}{/${MOD}}`);

    expect(editor.document).toMatchObject([
      listItem("bulletListItem", "Paragraph"),
    ]);
  });
  it("Check checked list item shortcut", async ({ setupEditor }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await userEvent.keyboard("Paragraph");
    await userEvent.keyboard(`{${MOD}>}{Shift>}9{/Shift}{/${MOD}}`);

    expect(editor.document).toMatchObject([
      { ...listItem("checkListItem", "Paragraph"), props: { checked: false } },
    ]);
  });
  it("Check arrow up on checklist item moves to element above", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    await insertParagraph();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(`{${MOD}>}{Shift>}9{/Shift}{/${MOD}}`);
    await userEvent.keyboard("Checklist item");

    // Move cursor to the start of the checklist item
    await userEvent.keyboard("{Control>}{ArrowLeft}{/Control}");
    // Press arrow up - should move to the paragraph above
    await userEvent.keyboard("{ArrowUp}");
    // Type to verify cursor is in the paragraph above
    await userEvent.keyboard("Above");

    expect(editor.document).toMatchObject([
      paragraph("ParagraphAbove"),
      {
        ...listItem("checkListItem", "Checklist item"),
        props: { checked: false },
      },
    ]);
  });

  it("Check checkListItem inputRule preserves content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    // Type [ ] followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a checkListItem and preserve the content we type after
    await userEvent.keyboard("[[ ] My task");

    expect(editor.document).toMatchObject([
      { ...listItem("checkListItem", "My task"), props: { checked: false } },
    ]);
  });
  it("Check checkListItem inputRule with checked preserves content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    // Type [x] followed by space at the start to trigger inputRule with checked=true, then add content
    // This should convert the paragraph to a checkListItem with checked=true and preserve the content
    await userEvent.keyboard("[[x] Completed task");

    expect(editor.document).toMatchObject([
      {
        ...listItem("checkListItem", "Completed task"),
        props: { checked: true },
      },
    ]);
  });
  it("Check bulletListItem inputRule preserves content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    // Type - followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a bulletListItem and preserve the content
    await userEvent.keyboard("- My task");

    expect(editor.document).toMatchObject([
      listItem("bulletListItem", "My task"),
    ]);
  });
  it("Check numberedListItem inputRule preserves content", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor();
    await focusOnEditor();
    // Type 1. followed by space at the start to trigger inputRule, then add content
    // The inputRule should convert the paragraph to a numberedListItem and preserve the content
    await userEvent.keyboard("1. My task");

    expect(editor.document).toMatchObject([
      listItem("numberedListItem", "My task"),
    ]);
  });
});

describe("Backspace at the start of a paragraph", () => {
  it("Check Backspace preserves marks", async ({ setupEditor, pressKey }) => {
    const { editor } = await setupEditor({
      initialContent: [
        { id: "0", type: "paragraph", content: "Paragraph" },
        {
          id: "1",
          type: "paragraph",
          content: [
            "Pa",
            { type: "text", text: "ragra", styles: { italic: true } },
            "ph",
          ],
        },
      ],
    });
    editor.setTextCursorPosition("1", "start");
    editor.focus();

    await pressKey("Backspace");

    expect(editor.document).toMatchObject([
      {
        ...paragraph([
          text("ParagraphPa"),
          text("ragra", { italic: true }),
          text("ph"),
        ]),
        id: "0",
      },
    ]);
  });

  it("Check Backspace preserves nested blocks for empty block", async ({
    setupEditor,
    pressKey,
  }) => {
    const { editor } = await setupEditor({
      initialContent: [
        { id: "0", type: "paragraph", content: "Paragraph" },
        {
          id: "1",
          type: "paragraph",
          children: [
            {
              id: "2",
              type: "paragraph",
              content: "Paragraph",
              children: [{ id: "3", type: "paragraph", content: "Paragraph" }],
            },
          ],
        },
      ],
    });
    const [first, empty] = editor.document;
    editor.setTextCursorPosition("1", "start");
    editor.focus();

    await pressKey("Backspace");

    expect(editor.document).toEqual([first, ...empty.children]);
  });
});

describe("Delete around image and table blocks", () => {
  const image: PartialBlock = { id: "1", type: "image" };
  const table: PartialBlock = {
    id: "1",
    type: "table",
    content: {
      type: "tableContent",
      rows: [{ cells: ["", "", ""] }, { cells: ["", "", ""] }],
    },
  };

  for (const { name, target, nested } of [
    {
      name: "Check Delete before image block",
      target: image,
      nested: false,
    },
    {
      name: "Check Delete before table",
      target: table,
      nested: false,
    },
    {
      name: "Check Delete end of block with image child",
      target: image,
      nested: true,
    },
    {
      name: "Check Delete end of block with table child",
      target: table,
      nested: true,
    },
  ]) {
    it(name, async ({ setupEditor, pressKey }) => {
      const paragraph: PartialBlock = {
        id: "0",
        type: "paragraph",
        content: "Paragraph",
      };
      const initialContent = nested
        ? [{ ...paragraph, children: [target] }]
        : [paragraph, target];
      if (target.type === "image") {
        initialContent.push({ id: "2", type: "paragraph" });
      }
      const { editor } = await setupEditor({ initialContent });
      const [parent] = editor.document;
      const trailing = editor.getBlock("2");
      // The original ArrowUp selected the image node, but put the caret at the
      // end of the paragraph when coming from the table.
      editor.setTextCursorPosition(target.type === "image" ? "1" : "0", "end");
      editor.focus();

      await pressKey("Delete");

      expect(editor.document).toEqual([
        { ...parent, children: [] },
        ...(trailing ? [trailing] : []),
      ]);
    });
  }
});
