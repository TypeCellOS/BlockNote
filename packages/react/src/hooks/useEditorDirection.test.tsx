// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect } from "vite-plus/test";
import { BlockNoteContext } from "../editor/BlockNoteContext.js";
import { useEditorDirection } from "./useEditorDirection.js";

function Probe() {
  return <output>{useEditorDirection()}</output>;
}

it("server rendering uses the direction fallback without DOM access", async ({ setupEditor }) => {
  const { editor } = await setupEditor();
    expect(
      renderToString(
        <BlockNoteContext.Provider value={{ editor }}>
          <Probe />
        </BlockNoteContext.Provider>,
      ),
    ).toBe("<output>ltr</output>");
});
