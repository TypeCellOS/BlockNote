import { describe, expect } from "vite-plus/test";

import type { PartialBlock } from "../../../blocks/defaultBlocks.js";
import {
  installHeadlessPlugins,
  pressHeadlessKey,
} from "../../testHeadlessEditor.js";

function paragraph(id: string, text: string, children: PartialBlock[] = []) {
  return {
    id,
    type: "paragraph",
    content: text ? [{ type: "text", text, styles: {} }] : [],
    children,
  } satisfies PartialBlock;
}

describe("Backspace at the start of a block", () => {
  it.for([
    {
      name: "merges into the previous block",
      initialContent: [paragraph("a", "Hello"), paragraph("b", "World")],
      current: "b",
      expected: [paragraph("a", "HelloWorld")],
    },
    {
      name: "merges into the previous block's deepest descendant",
      initialContent: [
        paragraph("a", "Parent", [paragraph("a1", "Nested")]),
        paragraph("b", "World"),
      ],
      current: "b",
      expected: [paragraph("a", "Parent", [paragraph("a1", "NestedWorld")])],
    },
    {
      name: "merges a first child into its parent",
      initialContent: [paragraph("a", "Parent", [paragraph("a1", "Nested")])],
      current: "a1",
      expected: [paragraph("a", "ParentNested")],
    },
    {
      name: "deletes an empty block without deleting its child",
      initialContent: [
        paragraph("a", "Before"),
        paragraph("b", "", [paragraph("b1", "Child")]),
      ],
      current: "b",
      expected: [paragraph("a", "Before"), paragraph("b1", "Child")],
    },
  ])(
    "$name",
    async ({ initialContent, current, expected }, { setupEditor }) => {
      const { editor } = await setupEditor({
        initialContent,
        trailingBlock: false,
      });
      installHeadlessPlugins(editor);
      editor.setTextCursorPosition(current, "start");

      expect(pressHeadlessKey(editor, { key: "Backspace" })).toBe(true);

      expect(editor.document).toMatchObject(expected);
    },
  );
});
