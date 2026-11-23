import { createBlockSpec } from "../../../schema/blocks/createSpec.js";
import { layoutSchema } from "./layoutBlocks.fixture.js";

const plainNote = createBlockSpec(
  { type: "plainNote", propSchema: {}, content: "plain" },
  {
    // A titled block: Enter in its text starts its body, and the body's
    // blocks can't be outdented out of it.
    experimental_keyboard: {
      enter: "into-children",
      childrenCanOutdent: false,
      emptyChildEnter: "exit-at-end",
    },
    render() {
      const dom = document.createElement("pre");
      return { dom, contentDOM: dom };
    },
    renderFrame() {
      const dom = document.createElement("section");
      dom.className = "plain-frame";
      const slot = document.createElement("div");
      dom.append(slot);
      return { dom, slot };
    },
  },
)();

export const schema = layoutSchema.extend({ blockSpecs: { plainNote } });

export function plainNoteContent(
  content: string,
): (typeof schema.PartialBlock)[] {
  return [
    {
      id: "note",
      type: "plainNote",
      content,
      children: [{ id: "body", type: "paragraph", content: "Explanation" }],
    },
    { id: "after", type: "paragraph", content: "After" },
  ];
}

export function text(editor: typeof schema.BlockNoteEditor, id: string) {
  const block = editor.getBlock(id)!;
  if (block.type !== "plainNote" && block.type !== "paragraph") {
    throw new Error("Expected a text block");
  }
  return block.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}
