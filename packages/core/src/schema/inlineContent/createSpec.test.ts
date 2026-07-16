import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { createInlineContentSpec } from "./createSpec.js";

// A minimal "plain" inline content, matched from external HTML by a `parse`
// function (the `tag: "*"` parse rule).
const customPlainIC = createInlineContentSpec(
  {
    type: "customPlainIC",
    propSchema: {},
    content: "plain",
  },
  {
    parse: (el) => (el.classList?.contains("custom-plain-ic") ? {} : undefined),
    render: () => {
      const dom = document.createElement("span");
      const contentDOM = document.createElement("span");
      dom.append(contentDOM);
      return { dom, contentDOM };
    },
  },
);

const createEditor = () =>
  BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: defaultBlockSpecs,
      inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        customPlainIC,
      },
    }),
  });

describe("plain inline content", () => {
  it("holds its text as a string in the block model", () => {
    const editor = createEditor();

    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: [
          {
            type: "customPlainIC",
            props: {},
            content: "hello world",
          } as any,
        ],
      },
    ]);

    const inlineContent = (editor.document[0] as any).content[0];
    expect(inlineContent.type).toBe("customPlainIC");
    expect(inlineContent.content).toBe("hello world");

    editor._tiptapEditor.destroy();
  });

  it("round-trips a newline in its string content", () => {
    const editor = createEditor();

    // Plain content holds raw text, so newlines are kept as characters rather
    // than being split into (disallowed) `hardBreak` nodes.
    editor.replaceBlocks(editor.document, [
      {
        type: "paragraph",
        content: [
          {
            type: "customPlainIC",
            props: {},
            content: "first\nsecond",
          } as any,
        ],
      },
    ]);

    const inlineContent = (editor.document[0] as any).content[0];
    expect(inlineContent.type).toBe("customPlainIC");
    expect(inlineContent.content).toBe("first\nsecond");

    editor._tiptapEditor.destroy();
  });

  it("keeps text and drops formatting marks when parsed", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<p><span class="custom-plain-ic">hello <b>world</b></span></p>`,
    );

    const inlineContent = (blocks[0] as any).content[0];
    expect(inlineContent.type).toBe("customPlainIC");
    expect(inlineContent.content).toBe("hello world");

    editor._tiptapEditor.destroy();
  });

  it("converts line breaks to newline characters when parsed", () => {
    const editor = createEditor();

    const blocks = editor.tryParseHTMLToBlocks(
      `<p><span class="custom-plain-ic">first<br>second</span></p>`,
    );

    const inlineContent = (blocks[0] as any).content[0];
    expect(inlineContent.type).toBe("customPlainIC");
    expect(inlineContent.content).toBe("first\nsecond");

    editor._tiptapEditor.destroy();
  });

  it("disallows formatting marks but allows annotation marks", () => {
    const editor = createEditor();

    // Checked at the ProseMirror level because the block model intentionally
    // represents plain content as a bare string, without marks.
    const container = document.createElement("div");
    container.innerHTML = `<p><span class="custom-plain-ic">hello <b>bold</b> <ins data-id="1">inserted</ins></span></p>`;
    const parsed = PMDOMParser.fromSchema(editor.pmSchema).parse(container, {
      topNode: editor.pmSchema.nodes["blockGroup"].create(),
    });

    let plainIC: any;
    parsed.descendants((node) => {
      if (node.type.name === "customPlainIC") {
        plainIC = node;
        return false;
      }
      return true;
    });

    expect(plainIC).toBeDefined();
    expect(plainIC.textContent).toBe("hello bold inserted");

    const markNames = new Set<string>();
    plainIC.forEach((child: any) => {
      child.marks.forEach((mark: any) => markNames.add(mark.type.name));
    });
    expect(markNames.has("insertion")).toBe(true);
    expect(markNames.has("bold")).toBe(false);

    editor._tiptapEditor.destroy();
  });
});
