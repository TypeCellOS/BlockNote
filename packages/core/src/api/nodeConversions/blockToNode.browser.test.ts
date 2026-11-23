import { describe, expect } from "vite-plus/test";
import type { PartialBlock } from "../../blocks/defaultBlocks.js";

describe("blockToNode: plain-block backwards compatibility (write path)", () => {
  it("mounts an editor with legacy initialContent without throwing", async ({
    setupEditor,
  }) => {
    // @ts-expect-error Legacy JSON still carries styles on a plain block.
    const block: PartialBlock = {
      type: "codeBlock",
      props: { language: "javascript" },
      content: [{ type: "text", text: "const x = 1;", styles: { bold: true } }],
    };
    const { editor } = await setupEditor({
      mountType: "dom",
      initialContent: [block],
    });
    expect(editor.document.map((b) => b.type)).toEqual(["codeBlock"]);
    expect(editor.document[0].content).toEqual([
      { styles: {}, text: "const x = 1;", type: "text" },
    ]);
  });
});
