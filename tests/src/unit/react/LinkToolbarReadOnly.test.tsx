import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { LinkToolbarController } from "@blocknote/react";
import { TextSelection } from "@tiptap/pm/state";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

/**
 * A read-only editor must not open the link toolbar: it only offers editing
 * actions, and a version preview keeps the editor read-only for as long as the
 * history panel is open.
 */
describe("LinkToolbarController in a read-only editor", () => {
  afterEach(() => {
    cleanup();
  });

  function setup(editable: boolean) {
    const editor = BlockNoteEditor.create({
      initialContent: [
        {
          type: "paragraph",
          content: [
            {
              type: "link",
              href: "https://example.com",
              content: "a link",
            },
          ],
        },
      ],
    });

    render(
      <BlockNoteView editor={editor} editable={editable} linkToolbar={false}>
        <LinkToolbarController />
      </BlockNoteView>,
    );

    return editor;
  }

  /** The toolbar's own root, rendered only while it's open. */
  function toolbar() {
    return document.querySelector(".bn-link-toolbar");
  }

  /**
   * Put the text cursor inside the link. That's the deterministic half of the
   * controller's two open paths; the mouse path shares the same `isEditable`
   * gate (and the same effect), it just also needs floating-ui's hover delay.
   */
  async function putCursorInLink(editor: BlockNoteEditor) {
    let linkPos: number | undefined;
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (linkPos === undefined && node.isText && node.marks.length > 0) {
        linkPos = pos + 1;
      }
      return linkPos === undefined;
    });

    await act(async () => {
      editor.transact((tr) =>
        tr.setSelection(TextSelection.create(tr.doc, linkPos!)),
      );
    });
  }

  it("opens the toolbar when the editor is editable", async () => {
    const editor = setup(true);

    await putCursorInLink(editor);

    expect(toolbar()).not.toBeNull();
  });

  it("does not open the toolbar when the editor is read-only", async () => {
    const editor = setup(false);

    await putCursorInLink(editor);

    expect(toolbar()).toBeNull();
  });

  it("ignores a hovered link when the editor is read-only", async () => {
    const editor = setup(false);
    const link = editor.domElement!.querySelector("a")!;

    fireEvent.mouseOver(link, { bubbles: true });
    fireEvent.pointerEnter(link, { pointerType: "mouse", bubbles: true });
    fireEvent.mouseEnter(link);
    // Past floating-ui's 250ms open delay.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });

    expect(toolbar()).toBeNull();
  });

  it("closes the toolbar when the editor becomes read-only", async () => {
    const editor = setup(true);
    await putCursorInLink(editor);
    expect(toolbar()).not.toBeNull();

    await act(async () => {
      editor.isEditable = false;
    });

    expect(toolbar()).toBeNull();
  });
});
