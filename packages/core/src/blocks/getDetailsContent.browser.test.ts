import { describe, expect, vi } from "vite-plus/test";

describe("getDetailsContent", () => {
  // The HTML parser reads the HTML in a document without a browsing context.
  // In the active document, an element of the HTML can load a resource and
  // run an event handler.
  it("keeps the children of a details element out of the active document", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    // The code must make no element in the active document: a node that
    // goes into such an element is in the active document from then on.
    const createElement = vi.spyOn(document, "createElement");
    onTestFinished(() => {
      createElement.mockRestore();
    });

    const blocks = editor.tryParseHTMLToBlocks(
      `<details><summary>Toggle</summary><img src="image.png" onerror="window.fired = true"></details>`,
    );

    expect(createElement).not.toHaveBeenCalled();
    // The image is in the result, with the URL as the HTML has it.
    expect(blocks[0]).toMatchObject({
      type: "toggleListItem",
      children: [{ type: "image", props: { url: "image.png" } }],
    });
  });
});
