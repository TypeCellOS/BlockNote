// @vitest-environment node
import { BlockNoteEditor } from "@blocknote/core";
import { renderToString } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { BlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorDirection } from "./useEditorDirection.js";

function Probe() {
  return <output>{useEditorDirection()}</output>;
}

test("server rendering uses the direction fallback without DOM access", () => {
  const editor = BlockNoteEditor.create();
  try {
    expect(
      renderToString(
        <BlockNoteContext.Provider value={{ editor }}>
          <Probe />
        </BlockNoteContext.Provider>,
      ),
    ).toBe("<output>ltr</output>");
  } finally {
    editor._tiptapEditor.destroy();
  }
});
