import { BlockNoteEditor } from "../../../../BlockNoteEditor";
import { blockToNode } from "../../../../api/nodeConversions/nodeConversions";
import { mergeCSSClasses } from "../../../../shared/utils";
import {
  Block,
  BlockNoteDOMAttributes,
  BlockSchema,
} from "../../api/blocks/types";
import { InlineContentSchema } from "../../api/inlineContent/types";
import { StyleSchema } from "../../api/styles/types";

// Function that creates a ProseMirror `DOMOutputSpec` for a default block.
// Since all default blocks have the same structure (`blockContent` div with a
// `blockEditable` element inside), this function only needs the block's name
// for the `data-block-content-type` attribute of the `blockContent` element and
// the HTML tag of the `blockEditable` element, as well as any HTML attributes
// to add to those.
export function createDefaultBlockDOMOutputSpec(
  blockName: string,
  htmlTag: string,
  domAttributes: BlockNoteDOMAttributes
) {
  const element = document.createElement(htmlTag);

  // Adds block content, block editable, & custom classes
  element.className = mergeCSSClasses(
    "bn-block-content",
    domAttributes.blockContent?.class || "",
    "bn-block-editable",
    domAttributes.blockEditable?.class || ""
  );
  // Sets content type attribute
  element.setAttribute("data-block-content-type", blockName);
  // Adds custom HTML attributes
  Object.entries({
    ...domAttributes.blockContent,
    ...domAttributes.blockEditable,
  })
    .filter(([key]) => key !== "class")
    .forEach(([attr, value]) => element.setAttribute(attr, value));

  return {
    dom: element,
    contentDOM: element,
  };
}

// Function used to convert default blocks to HTML. It uses the corresponding
// node's `renderHTML` method to do the conversion by using a default
// `DOMSerializer`.
export const defaultBlockToHTML = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  block: Block<BSchema, I, S>,
  editor: BlockNoteEditor<BSchema, I, S>
): {
  dom: HTMLElement;
  contentDOM?: HTMLElement;
} => {
  const node = blockToNode(
    block,
    editor._tiptapEditor.schema,
    editor.styleSchema
  ).firstChild!;
  const toDOM = editor._tiptapEditor.schema.nodes[node.type.name].spec.toDOM;

  if (toDOM === undefined) {
    throw new Error(
      "This block has no default HTML serialization as its corresponding TipTap node doesn't implement `renderHTML`."
    );
  }

  const renderSpec = toDOM(node);

  if (typeof renderSpec !== "object" || !("dom" in renderSpec)) {
    throw new Error(
      "Cannot use this block's default HTML serialization as its corresponding TipTap node's `renderHTML` function does not return an object with the `dom` property."
    );
  }

  return renderSpec as {
    dom: HTMLElement;
    contentDOM?: HTMLElement;
  };
};
