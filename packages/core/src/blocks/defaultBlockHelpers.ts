import { blockToNode } from "../api/nodeConversions/nodeConversions";
import type { BlockNoteEditor } from "../editor/BlockNoteEditor";
import type {
  Block,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema";
import { mergeCSSClasses } from "../util/browser";

// Function that creates a ProseMirror `DOMOutputSpec` for a default block.
// Since all default blocks have the same structure (`blockContent` div with a
// `inlineContent` element inside), this function only needs the block's name
// for the `data-content-type` attribute of the `blockContent` element and the
// HTML tag of the `inlineContent` element, as well as any HTML attributes to
// add to those.
export function createDefaultBlockDOMOutputSpec(
  blockName: string,
  htmlTag: string,
  blockContentHTMLAttributes: Record<string, string>,
  inlineContentHTMLAttributes: Record<string, string>
) {
  const blockContent = document.createElement("div");
  blockContent.className = mergeCSSClasses(
    "bn-block-content",
    blockContentHTMLAttributes.class
  );
  blockContent.setAttribute("data-content-type", blockName);
  for (const [attribute, value] of Object.entries(blockContentHTMLAttributes)) {
    if (attribute !== "class") {
      blockContent.setAttribute(attribute, value);
    }
  }

  const inlineContent = document.createElement(htmlTag);
  inlineContent.className = mergeCSSClasses(
    "bn-inline-content",
    inlineContentHTMLAttributes.class
  );
  for (const [attribute, value] of Object.entries(
    inlineContentHTMLAttributes
  )) {
    if (attribute !== "class") {
      inlineContent.setAttribute(attribute, value);
    }
  }

  blockContent.appendChild(inlineContent);

  return {
    dom: blockContent,
    contentDOM: inlineContent,
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
