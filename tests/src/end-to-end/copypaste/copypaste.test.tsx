/* eslint-disable jest/valid-title */
import type { Block, PartialBlock } from "@blocknote/core";
import interStyles from "@blocknote/core/fonts/inter.css?inline";
import { describe, expect } from "vite-plus/test";
import { useBrowserSuiteStyles } from "../../commands/browser/useBrowserSuiteStyles.js";
import { commands, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR } from "../../utils/const.js";
import {
  copyPaste,
  copyPasteAll,
  waitForWithin,
} from "../../utils/copypaste.js";

useBrowserSuiteStyles(interStyles);

// The browser setup installs this fixture but sits outside tests/tsconfig.json.
describe("Check Copy/Paste Functionality", () => {
  const paragraphs = [1, 2, 3].map(() => textBlock("paragraph", "Paragraph"));
  const bullets = listItems("bulletListItem");
  const numbers = listItems("numberedListItem");
  const cases: [name: string, content: PartialBlock[]][] = [
    ["Paragraphs should stay separate", paragraphs],
    [
      "Headings should keep formatting",
      ([1, 2, 3] as const).map((level): PartialBlock => ({
        type: "heading",
        props: { level },
        content: [{ type: "text", text: "Heading", styles: {} }],
        children: [],
      })),
    ],
    ["Unordered lists should keep formatting", bullets],
    ["Ordered lists should keep formatting", numbers],
    ["Nested paragraphs should stay nested", nest(paragraphs)],
    ["Nested unordered lists should stay nested", nest(bullets)],
    ["Nested ordered lists should stay nested", nest(numbers)],
  ];
  for (const [name, initialContent] of cases) {
    it(name, async ({ setupEditor }) => {
      const { editor, rootNode } = await setupEditor({ initialContent });
      const source = editor.document;
      expect(source).toMatchObject(initialContent);
      editor.focus();
      await copyPasteAll(editor, rootNode);

      const result = editor.document;
      const original = result.slice(0, source.length);
      const copied = result.slice(source.length);
      expect(original).toEqual(source);
      expect(copied).toMatchObject(initialContent);
      expect(copied.map(withoutId)).toEqual(source.map(withoutId));
      const ids = result.flatMap(blockIds);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
});

function textBlock(
  type: "paragraph" | "bulletListItem" | "numberedListItem",
  text: string,
): PartialBlock {
  return { type, content: [{ type: "text", text, styles: {} }], children: [] };
}

function listItems(type: "bulletListItem" | "numberedListItem") {
  return [1, 2, 3].map((index) => textBlock(type, `List Item ${index}`));
}

function nest(blocks: PartialBlock[]): PartialBlock[] {
  return blocks.reduceRight<PartialBlock[]>(
    (children, block) => [{ ...block, children }],
    [],
  );
}

type BlockWithoutId = Omit<Block, "id" | "children"> & {
  children: BlockWithoutId[];
};

function withoutId(block: Block): BlockWithoutId {
  const { id: _, children, ...rest } = block;
  return { ...rest, children: children.map(withoutId) };
}

function blockIds(block: Block): string[] {
  return [block.id, ...block.children.flatMap(blockIds)];
}

// Keep the same test title without mounting the unseeded app in this case.
describe("Check Copy/Paste Functionality", () => {
  it("Images should keep props", async ({ setupEditor, onTestFinished }) => {
    onTestFinished(() => commands.mockCustomBlockImages("remove"));
    await commands.mockCustomBlockImages("install");

    const url = "https://placehold.co/800x540.png";
    const { editor, rootNode } = await setupEditor({
      initialContent: [
        { type: "paragraph", content: "paragraph" },
        {
          type: "image",
          props: { name: "800x540.png", url, previewWidth: 573 },
        },
      ],
    });
    const source = editor.document;
    const imageSelector = `img[src="${url}"]`;
    const image = await waitForWithin(rootNode, imageSelector);
    if (!(image instanceof HTMLImageElement)) {
      throw new Error("Expected an image preview");
    }
    await image.decode();

    // Clicking an already embedded image can leave Chrome in the paragraph.
    editor.setTextCursorPosition(editor.document[1]);
    editor.focus();
    await userEvent.click(image);
    await waitForWithin(
      rootNode,
      `${EDITOR_SELECTOR}:focus .ProseMirror-selectednode ${imageSelector}`,
    );

    await copyPaste(editor, rootNode);

    const result = editor.document;
    expect(result).toHaveLength(3);
    expect(result.slice(0, 2)).toEqual(source);
    expect(withoutId(result[2])).toEqual(withoutId(source[1]));
    expect(result[2]).toMatchObject({
      type: "image",
      props: { name: "800x540.png", url, previewWidth: 573 },
    });
    expect(new Set(result.flatMap(blockIds)).size).toBe(3);
  });
});
