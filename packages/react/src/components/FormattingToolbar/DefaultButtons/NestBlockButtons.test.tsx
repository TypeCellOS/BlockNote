import { BlockNoteEditor } from "@blocknote/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";

import { BlockNoteContext } from "../../../editor/BlockNoteContext.js";
import type { ComponentProps } from "../../../editor/ComponentsContext.js";
import { NestBlockButton, UnnestBlockButton } from "./NestBlockButtons.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../../editor/ComponentsContext.js", () => {
  function Button(props: ComponentProps["FormattingToolbar"]["Button"]) {
    return (
      <button disabled={props.isDisabled} onClick={props.onClick}>
        {props.label}
      </button>
    );
  }

  return {
    useComponentsContext: () => ({ FormattingToolbar: { Button } }),
  };
});

let editor: BlockNoteEditor;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  editor = BlockNoteEditor.create();
  editor.mount(document.createElement("div"));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  editor._tiptapEditor.destroy();
  container.remove();
});

async function renderButtons() {
  await act(async () => {
    root.render(
      <BlockNoteContext.Provider value={{ editor }}>
        <NestBlockButton />
        <UnnestBlockButton />
      </BlockNoteContext.Provider>,
    );
  });
}

describe("file block indentation controls", () => {
  it.each(["image", "video", "audio", "file"] as const)(
    "indents and unindents a selected %s block",
    async (type) => {
      editor.replaceBlocks(editor.document, [
        { id: "parent", type: "bulletListItem", content: "Parent" },
        { id: "media", type },
      ]);
      editor.setTextCursorPosition("media");
      expect(editor.canNestBlock()).toBe(true);

      await renderButtons();

      const buttons = container.querySelectorAll("button");
      expect(buttons).toHaveLength(2);
      expect(buttons[0].disabled).toBe(false);
      expect(buttons[1].disabled).toBe(true);

      await act(async () => buttons[0].click());

      expect(editor.getBlock("parent")?.children).toMatchObject([
        { id: "media", type },
      ]);
      expect(buttons[1].disabled).toBe(false);

      await act(async () => buttons[1].click());

      expect(editor.document.map((block) => block.id)).toEqual([
        "parent",
        "media",
      ]);
      expect(editor.getBlock("parent")?.children).toEqual([]);
    },
  );

  it("disables both controls for a first, top-level image", async () => {
    editor.replaceBlocks(editor.document, [{ id: "media", type: "image" }]);
    editor.setTextCursorPosition("media");

    await renderButtons();

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect([...buttons].every((button) => button.disabled)).toBe(true);
  });

  it("keeps controls hidden in a read-only editor", async () => {
    editor.replaceBlocks(editor.document, [{ id: "media", type: "image" }]);
    editor.setTextCursorPosition("media");
    editor.isEditable = false;

    await renderButtons();

    expect(container.querySelector("button")).toBeNull();
  });

  it("keeps controls hidden for a non-file block without inline content", async () => {
    editor.replaceBlocks(editor.document, [{ id: "divider", type: "divider" }]);
    editor.setTextCursorPosition("divider");

    await renderButtons();

    expect(container.querySelector("button")).toBeNull();
  });
});
