import { DOMParser } from "prosemirror-model";
import { describe, expect, vi } from "vite-plus/test";

import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../blocks/defaultBlocks.js";
import { isDOMNode } from "./browser.js";
import { detachedDoc } from "./detachedDoc.js";

// An image without a request: the HTML of this test is in the active document,
// where an image loads its resource.
const IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

describe("detachedDoc", () => {
  it("provides a document without a browsing context", () => {
    expect(detachedDoc().defaultView).toBeNull();
  });
});

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
          isDOMNode(source) && source.ownerDocument === document,
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

describe("the parse of an HTML string", () => {
  // The string is from outside. In an element of the active document, its
  // images load and its event handlers run before the parse reads them.
  it("passes only detached DOM to the ProseMirror parser", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { editor } = await setupEditor({ mountType: false });
    const parse = vi.spyOn(DOMParser.prototype, "parse");
    const createElement = vi.spyOn(document, "createElement");
    onTestFinished(() => {
      parse.mockRestore();
      createElement.mockRestore();
    });

    const blocks = editor.tryParseHTMLToBlocks(
      `<p>Text <img src="image.png"> more</p>` +
        `<ul><li>Item<ul><li>Nested</li></ul></li></ul>`,
    );

    expect(createElement).not.toHaveBeenCalled();
    expect(parse).toHaveBeenCalled();
    for (const [root] of parse.mock.calls) {
      expect(root.ownerDocument?.defaultView).toBeNull();
    }
    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "image",
      "paragraph",
      "bulletListItem",
    ]);
  });

  // A schema without the image block drops an image in the parse. The text
  // around the image must then stay one block.
  it("does not split a paragraph at an image if the schema has no image block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({
      mountType: false,
      schema: BlockNoteSchema.create({
        blockSpecs: { paragraph: defaultBlockSpecs.paragraph },
      }),
    });

    const blocks = editor.tryParseHTMLToBlocks(
      `<p>Before <img src="https://example.com/a.png"> after</p>`,
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Before  after", styles: {} }],
    });
  });
});
