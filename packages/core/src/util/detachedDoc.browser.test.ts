import { DOMParser } from "prosemirror-model";
import { describe, expect, vi } from "vite-plus/test";

// An image without a request: the HTML of this test is in the active document,
// where an image loads its resource.
const IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

describe("the parse rules with HTML that is in the active document", () => {
  // The parse rules do not control the document of the nodes that they get.
  // A clone of a node of the active document is in the active document, where
  // it loads its resource and runs its event handler again.
  it("make no element and no clone in the active document", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const html = document.createElement("div");
    html.innerHTML =
      `<ul><li><img src="${IMAGE}"></li></ul>` +
      `<details><summary><p>Toggle</p></summary><img src="${IMAGE}"></details>` +
      `<p>Paragraph</p>`;
    const cloneNode = vi.spyOn(Node.prototype, "cloneNode");
    const createElement = vi.spyOn(document, "createElement");
    onTestFinished(() => {
      cloneNode.mockRestore();
      createElement.mockRestore();
    });

    const parsed = DOMParser.fromSchema(editor.pmSchema).parse(html, {
      topNode: editor.pmSchema.nodes.blockGroup.create(),
    });

    const clonedInActiveDocument = cloneNode.mock.contexts
      .filter(
        (source): source is Node =>
          source instanceof Node && source.ownerDocument === document,
      )
      .map((source) => source.nodeName);
    expect(clonedInActiveDocument).toEqual([]);
    expect(createElement).not.toHaveBeenCalled();
    // The result is the same as for HTML in `detachedDoc()`.
    const blocks: string[] = [];
    parsed.descendants((node) => {
      if (node.type.isInGroup("blockContent")) {
        blocks.push(node.type.name);
      }
    });
    expect(blocks).toEqual([
      "bulletListItem",
      "image",
      "toggleListItem",
      "image",
      "paragraph",
    ]);
  });
});
