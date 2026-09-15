import { BlockNoteEditor } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { TextAlignSelect } from "@blocknote/react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("TextAlignSelect", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("renders null when editor is not editable", () => {
    const editor = BlockNoteEditor.create();
    editor.isEditable = false;
    const root = createRoot(container);

    flushSync(() => {
      root.render(
        <BlockNoteView editor={editor} formattingToolbar={false}>
          <TextAlignSelect />
        </BlockNoteView>,
      );
    });

    expect(container.querySelector("button")).toBeNull();

    root.unmount();
    editor._tiptapEditor.destroy();
  });

  it("renders select button for an alignable block", () => {
    const editor = BlockNoteEditor.create();
    const root = createRoot(container);

    flushSync(() => {
      root.render(
        <BlockNoteView editor={editor} formattingToolbar={false}>
          <TextAlignSelect />
        </BlockNoteView>,
      );
    });

    expect(container.querySelector("button")).not.toBeNull();

    root.unmount();
    editor._tiptapEditor.destroy();
  });

  it("reactively updates button label when block alignment changes", () => {
    const editor = BlockNoteEditor.create();
    const root = createRoot(container);

    flushSync(() => {
      root.render(
        <BlockNoteView editor={editor} formattingToolbar={false}>
          <TextAlignSelect />
        </BlockNoteView>,
      );
    });

    expect(container.querySelector("button")?.textContent).toContain("Left");

    const block = editor.document[0];
    flushSync(() => {
      editor.updateBlock(block, { props: { textAlignment: "center" } });
    });

    expect(container.querySelector("button")?.textContent).toContain("Center");

    flushSync(() => {
      editor.updateBlock(block, { props: { textAlignment: "right" } });
    });

    expect(container.querySelector("button")?.textContent).toContain("Right");

    root.unmount();
    editor._tiptapEditor.destroy();
  });
});
